"""v3.6 — Matriz mensal pessoa × dia, visão por turno e calendário pessoal (+ exportações).

Reaproveita o motor: regenera a escala turma × dia do mês pedido com a MESMA âncora do
cenário (``horizon_start``), o mesmo K/offsets e os mesmos turnos da simulação, e expande
as turmas em pessoas (fictícias ``A-01``… quando não há colaboradores cadastrados — o MVP
aloca por turma). O dia anterior ao mês entra para mostrar a noite que continua (``← N``).
"""

from __future__ import annotations

import calendar
import csv
import io
import uuid
from collections.abc import Mapping, Sequence
from dataclasses import replace
from datetime import date, datetime, timedelta
from fractions import Fraction
from math import ceil
from typing import TYPE_CHECKING, Any

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session

from app.core.errors import validation
from app.repositories.cadastros import RoleRepo
from app.repositories.scenarios import ScenarioRepo
from app.schemas import scenario as ss
from app.services.engine import matriz_mensal as MM
from app.services.engine import personalizado as P
from app.services.engine.gerador import gerar_escala
from app.services.engine.turmas_k import padrao_k_fixo
from app.services.engine.types import FOLGA, RESERVA, Turno
from app.services.escalas import scenario_service as svc

if TYPE_CHECKING:
    from app.api.deps import Principal

WEEKDAYS = ("seg", "ter", "qua", "qui", "sex", "sáb", "dom")
MAX_MESES = 12
# mesma paleta do frontend (pattern/model.ts): cor + sigla, nunca só cor
FIXED = {"M": "D97706", "T": "0E9384", "N": "4338CA", "D12": "0284C7", "N12": "7C3AED",
         "INT": "BE185D", "ADM": "4D7C0F"}
PALETTE = ("D97706", "0E9384", "4338CA", "0284C7", "7C3AED", "BE185D", "4D7C0F", "B45309",
           "0F766E", "9333EA")


def _hhmm(m: int) -> str:
    m %= 1440
    return f"{m // 60:02d}:{m % 60:02d}"


def faixa(t: Turno) -> str:
    """"06–14", "22–06:20"."""
    def curto(m: int) -> str:
        s = _hhmm(m)
        return s[:2] if m % 60 == 0 else s
    return f"{curto(t.inicio_min)}–{curto(t.fim_min)}"


def parse_month(texto: str) -> date:
    try:
        y, m = (int(x) for x in texto.split("-"))
        return date(y, m, 1)
    except ValueError as exc:
        raise validation("month deve ser YYYY-MM", [{"field": "month", "code": "format",
                                                    "message": texto}]) from exc


def _estados_mes(db: Session, p: Principal, sid: uuid.UUID, inicio: date, dias: int
                 ) -> tuple[list[tuple[str, Fraction]], list[tuple[str, ...]],
                            Mapping[str, Turno], Any, Any]:
    """Turmas (nome, tamanho em pessoas) e estados de ``inicio − 1`` por ``dias + 1`` dias."""
    s = svc._get(db, p, sid)
    svc._require_calc(s)
    e, _, _ = svc._entrada(db, p, s)
    m = e.modelo
    janela = None
    if e.padrao is not None or (m is not None and (not m.continuo_24x7
                                                   or m.motor == "generico")):
        pad = e.padrao if e.padrao is not None else P.de_modelo(m, e.catalogo.turnos, e.k)  # type: ignore[arg-type]
        pad = replace(pad, data_ancora=pad.data_ancora or s.horizon_start)
        layers = (s.result_summary or {}).get("layers") or []
        ks = ([int(x["k"]) for x in layers] if len(layers) == len(pad.camadas)
              else [P.k_inicial(c) for c in pad.camadas])
        esc = P.gerar(pad, ks, inicio - timedelta(days=1), dias + 1,
                      Fraction(e.tamanho_turma))
        turmas = [(t.nome, t.tamanho) for t in esc.turmas]
        turnos: Mapping[str, Turno] = pad.turnos
        janela = pad.janela
        estados = list(esc.estados)
    else:
        assert m is not None
        padrao = padrao_k_fixo(m, e.k)
        g = gerar_escala(padrao, s.horizon_start, dias + 1, inicio - timedelta(days=1))
        turmas = [(t.nome, e.tamanho_turma * t.fracao_posto) for t in g.turmas]
        turnos = e.catalogo.turnos
        estados = list(g.estados)
    return turmas, estados, turnos, e.curva, janela


def monthly_matrix(db: Session, p: Principal, sid: uuid.UUID, month: str
                   ) -> ss.MonthlyMatrixOut:
    m0 = parse_month(month)
    n = calendar.monthrange(m0.year, m0.month)[1]
    turmas, estados, turnos, curva, janela = _estados_mes(db, p, sid, m0, n)
    dias = [m0 + timedelta(days=i) for i in range(n)]
    s = svc._get(db, p, sid)
    repo = ScenarioRepo(db, p.org_id)
    teams = {t.code: t for t in repo.teams(s.id)}
    roles = {r.id: r.code for r in RoleRepo(db, p.org_id).find()}
    comp: dict[str, dict[str, int]] = {}
    for c in repo.composition([t.id for t in teams.values()]):
        code = next(k for k, t in teams.items() if t.id == c.team_id)
        comp.setdefault(code, {})[roles.get(c.role_id, "?")] = c.headcount
    pessoas = MM.pessoas_das_turmas(
        [(nome, teams[nome].size_assigned if nome in teams else ceil(tam), comp.get(nome, {}))
         for nome, tam in turmas])
    linha_turma = {nome: estados[i] for i, (nome, _) in enumerate(turmas)}
    linhas = [linha_turma[pe.turma] for pe in pessoas]

    def demanda(d: date, h: int) -> int:
        dow = d.weekday()
        if janela is not None and not janela.aberta(dow, h):
            return 0
        return int(curva.valores[dow * 24 + h])

    resumo = MM.resumo_dias(linhas, dias, turnos, demanda)
    feriados = {**MM.feriados_br(m0.year)}
    usados = sorted({e for lin in estados for e in lin if e in turnos},
                    key=lambda c: (turnos[c].inicio_min, c))

    def celulas(lin: Sequence[str]) -> list[ss.MatrixCell]:
        out = []
        for j in range(n):
            est = lin[j + 1]
            out.append(ss.MatrixCell(code=est if est in turnos else FOLGA,
                                     reserve=est == RESERVA,
                                     carry=MM.continuacao(lin[j], turnos)))
        return out

    def tot(lin: Sequence[str]) -> ss.PersonTotals:
        t = MM.totais(list(lin[1:]), dias, turnos)
        return ss.PersonTotals(worked_days=t.dias_trabalhados, off_days=t.folgas,
                               hours=svc.D(t.horas), sundays_off=t.domingos_folga,
                               nights=t.noites)

    return ss.MonthlyMatrixOut(
        month=f"{m0.year:04d}-{m0.month:02d}", generated_people=True,
        days=[ss.MatrixDay(date=d, weekday=d.weekday() + 1, is_weekend=d.weekday() >= 5,
                           holiday=feriados.get(d)) for d in dias],
        shifts=[ss.MatrixShift(code=c, start=_hhmm(turnos[c].inicio_min),
                               end=_hhmm(turnos[c].fim_min), label=faixa(turnos[c]),
                               duration_min=turnos[c].duracao_min,
                               handover_min=turnos[c].passagem_min, peak=turnos[c].reforco,
                               night=MM.e_noturno(turnos[c]),
                               crosses_midnight=turnos[c].cruza_meia_noite)
                for c in usados],
        people=[ss.MatrixPerson(id=pe.id, name=pe.nome, team=pe.turma, role=pe.cargo,
                                cells=celulas(lin), totals=tot(lin))
                for pe, lin in zip(pessoas, linhas, strict=True)],
        teams=[ss.MatrixTeam(code=nome, size=svc.D(tam), cells=celulas(linha_turma[nome]),
                             totals=tot(linha_turma[nome])) for nome, tam in turmas],
        daily=[ss.MatrixDaily(date=r.data, by_shift=r.por_turno,
                              required_by_shift=r.necessario_por_turno, off=r.folgas,
                              deficit_shifts=list(r.turnos_em_deficit),
                              deficit_hours=r.horas_deficit, handover_hours=r.horas_passagem,
                              required_peak=r.necessario_pico)
               for r in resumo])


# ---- exportações --------------------------------------------------------------------------
def _cor(code: str, todos: Sequence[str]) -> str:
    if code in FIXED:
        return FIXED[code]
    return PALETTE[todos.index(code) % len(PALETTE)] if code in todos else "64748B"


def _clara(hexa: str) -> str:
    """Mistura 30 % da cor com branco (fundo legível, texto escuro)."""
    r, g, b = (int(hexa[i:i + 2], 16) for i in (0, 2, 4))
    return "".join(f"{round(255 - (255 - c) * 0.3):02X}" for c in (r, g, b))


def _cell_txt(c: ss.MatrixCell) -> str:
    base = "R" if c.reserve else c.code
    return f"←{c.carry} {base}" if c.carry and base == FOLGA else base


def matrix_rows(mx: ss.MonthlyMatrixOut, person: str | None = None) -> list[list[Any]]:
    """Tabela da matriz (cabeçalho + pessoas + rodapé por turno/folga) — usada no CSV/XLSX."""
    head = ["pessoa", "turma", "cargo",
            *[f"{d.date.day:02d} {WEEKDAYS[d.weekday - 1]}" for d in mx.days],
            "dias_trab", "folgas", "horas", "domingos_folga", "noites"]
    rows: list[list[Any]] = [head]
    for pe in mx.people:
        if person and pe.id != person:
            continue
        t = pe.totals
        rows.append([pe.name, pe.team, pe.role or "", *[_cell_txt(c) for c in pe.cells],
                     t.worked_days, t.off_days, float(t.hours), t.sundays_off, t.nights])
    if person:
        return rows
    for sh in mx.shifts:
        rows.append([f"em {sh.code} ({sh.label})", "", "",
                     *[d.by_shift.get(sh.code, 0) for d in mx.daily], "", "", "", "", ""])
        if any(sh.code in d.required_by_shift for d in mx.daily):
            rows.append([f"necessário {sh.code}", "", "",
                         *[d.required_by_shift.get(sh.code, "") for d in mx.daily],
                         "", "", "", "", ""])
    rows.append(["em folga", "", "", *[d.off for d in mx.daily], "", "", "", "", ""])
    rows.append(["horas c/ déficit", "", "", *[d.deficit_hours for d in mx.daily],
                 "", "", "", "", ""])
    return rows


def person_rows(mx: ss.MonthlyMatrixOut, person: str) -> list[list[Any]]:
    """Calendário individual (uma linha por dia)."""
    pe = next((x for x in mx.people if x.id == person), None)
    if pe is None:
        raise validation(f"pessoa inexistente: {person}",
                         [{"field": "person", "code": "not_found", "message": person}])
    info = {s.code: s for s in mx.shifts}
    rows: list[list[Any]] = [["data", "dia", "turno", "inicio", "fim", "horas", "continua_de",
                              "feriado"]]
    for d, c in zip(mx.days, pe.cells, strict=True):
        sh = info.get(c.code)
        rows.append([d.date.isoformat(), WEEKDAYS[d.weekday - 1], c.code if sh else "F",
                     sh.start if sh else "", sh.end if sh else "",
                     round(sh.duration_min / 60, 2) if sh else 0, c.carry or "",
                     d.holiday or ""])
    return rows


def to_csv(rows: list[list[Any]]) -> bytes:
    buf = io.StringIO()
    csv.writer(buf, delimiter=";", lineterminator="\n").writerows(rows)
    return ("﻿" + buf.getvalue()).encode("utf-8")


def to_xlsx(mats: Sequence[ss.MonthlyMatrixOut], person: str | None = None) -> bytes:
    """Uma aba por mês, células coloridas por turno (com a sigla), fins de semana/feriados."""
    wb = Workbook()
    wb.remove(wb.active)  # type: ignore[arg-type, unused-ignore]
    fino = Side(style="thin", color="CBD5E1")
    borda = Border(left=fino, right=fino, top=fino, bottom=fino)
    for mx in mats:
        ws = wb.create_sheet(mx.month)
        codes = [s.code for s in mx.shifts]
        rows = person_rows(mx, person) if person else matrix_rows(mx)
        for r in rows:
            ws.append(r)
        ws.freeze_panes = "B2" if person else "D2"
        for c in ws[1]:
            c.font = Font(bold=True)
            c.alignment = Alignment(horizontal="center", wrap_text=True)
        if person:
            for row in ws.iter_rows(min_row=2):
                code = str(row[2].value)
                if code in codes:
                    row[2].fill = PatternFill("solid", fgColor=_clara(_cor(code, codes)))
            continue
        n_people = len(mx.people)
        for j, d in enumerate(mx.days):
            col = 4 + j
            ws.column_dimensions[get_column_letter(col)].width = 6.5
            head = ws.cell(row=1, column=col)
            if d.holiday or d.is_weekend:
                head.fill = PatternFill("solid", fgColor="FDE68A" if d.holiday else "E2E8F0")
            for i in range(n_people):
                cell = ws.cell(row=2 + i, column=col)
                cell.alignment = Alignment(horizontal="center")
                cell.border = borda
                txt = str(cell.value or "")
                code = txt.split()[-1] if txt else ""
                if code in codes:
                    cell.fill = PatternFill("solid", fgColor=_clara(_cor(code, codes)))
                    cell.font = Font(bold=True)
                elif d.is_weekend or d.holiday:
                    cell.fill = PatternFill("solid", fgColor="F1F5F9")
            daily = mx.daily[j]
            for ri in range(2 + n_people, ws.max_row + 1):
                lbl = str(ws.cell(row=ri, column=1).value or "")
                if any(lbl.startswith(f"em {c} ") for c in daily.deficit_shifts):
                    ws.cell(row=ri, column=col).fill = PatternFill("solid", fgColor="FECACA")
        ws.column_dimensions["A"].width = 22
        legenda = ws.max_row + 2
        ws.cell(row=legenda, column=1, value="Legenda").font = Font(bold=True)
        for i, sh in enumerate(mx.shifts):
            c = ws.cell(row=legenda + 1 + i, column=1,
                        value=f"{sh.code} {sh.label}"
                        + (f" (passagem {sh.handover_min} min)" if sh.handover_min else "")
                        + (" (reforço de pico)" if sh.peak else ""))
            c.fill = PatternFill("solid", fgColor=_clara(_cor(sh.code, codes)))
        ws.cell(row=legenda + 1 + len(mx.shifts), column=1, value="F folga · ←X continua de ontem")
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def to_ics(mx_list: Sequence[ss.MonthlyMatrixOut], person: str) -> bytes:
    """Calendário pessoal (iCalendar) — base para assinar no celular."""
    out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ferramentas-Web//Escalas v3.6//PT-BR"]
    for mx in mx_list:
        info = {s.code: s for s in mx.shifts}
        pe = next((x for x in mx.people if x.id == person), None)
        if pe is None:
            raise validation(f"pessoa inexistente: {person}")
        for d, c in zip(mx.days, pe.cells, strict=True):
            sh = info.get(c.code)
            if sh is None:
                continue
            ini = datetime(d.date.year, d.date.month, d.date.day,
                           int(sh.start[:2]), int(sh.start[3:]))
            fim = ini + timedelta(minutes=sh.duration_min)
            out += ["BEGIN:VEVENT", f"UID:{person}-{d.date.isoformat()}@escalas",
                    f"DTSTART:{ini:%Y%m%dT%H%M%S}", f"DTEND:{fim:%Y%m%dT%H%M%S}",
                    f"SUMMARY:Turno {sh.code} {sh.label}", "END:VEVENT"]
    out.append("END:VCALENDAR")
    return ("\r\n".join(out) + "\r\n").encode("utf-8")


def export(db: Session, p: Principal, sid: uuid.UUID, month: str, months: int, fmt: str,
           person: str | None) -> tuple[bytes, str, str]:
    m0 = parse_month(month)
    mats = []
    for i in range(max(1, min(MAX_MESES, months))):
        y, mm = divmod(m0.month - 1 + i, 12)
        mats.append(monthly_matrix(db, p, sid, f"{m0.year + y:04d}-{mm + 1:02d}"))
    sufixo = f"-{person}" if person else ""
    nome = f"matriz-mensal-{mats[0].month}{sufixo}"
    if fmt == "csv":
        rows = person_rows(mats[0], person) if person else matrix_rows(mats[0])
        return to_csv(rows), "text/csv; charset=utf-8", f"{nome}.csv"
    if fmt == "ics":
        if not person:
            raise validation("ICS exige person (calendário individual)")
        return to_ics(mats, person), "text/calendar; charset=utf-8", f"{nome}.ics"
    return (to_xlsx(mats, person),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"{nome}.xlsx")
