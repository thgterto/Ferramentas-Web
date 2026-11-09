"""Export CSV/XLSX do cenário (FR-23, A31) — síncrono no MVP (job/URL assinada: Fase 2)."""

from __future__ import annotations

import csv
import io
import uuid
from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

from openpyxl import Workbook
from sqlalchemy.orm import Session

from escalas.schemas import scenario as ss
from escalas.services.escalas import scenario_service as svc

if TYPE_CHECKING:
    from escalas.api.deps import Principal

SHEETS: tuple[str, ...] = ("Escala", "Cobertura168h", "KPIs", "Violacoes", "Parametros")
WEEKDAYS = ("seg", "ter", "qua", "qui", "sex", "sab", "dom")


def _all_assignments(db: Session, p: Principal, sid: uuid.UUID) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    cursor: str | None = None
    while True:
        page = svc.assignments_page(db, p, sid, None, 1000, cursor)
        out.extend(a.model_dump() for a in page["data"])
        if not page["meta"]["has_next"]:
            return out
        cursor = page["meta"]["next_cursor"]


def _all_findings(db: Session, p: Principal, sid: uuid.UUID) -> list[ss.FindingOut]:
    out: list[ss.FindingOut] = []
    cursor: str | None = None
    while True:
        page = svc.findings(db, p, sid, None, None, 1000, cursor)
        out.extend(page["data"])
        if not page["meta"]["has_next"]:
            return out
        cursor = page["meta"]["next_cursor"]


def build_tables(db: Session, p: Principal, sid: uuid.UUID,
                 sheets: Sequence[str]) -> dict[str, list[list[Any]]]:
    """Cada aba = cabeçalho + linhas (valores simples, já serializáveis)."""
    sc = svc.scenario_out(db, p, svc._get(db, p, sid))
    svc._require_calc(svc._get(db, p, sid))
    tables: dict[str, list[list[Any]]] = {}
    if "Escala" in sheets:
        rows: list[list[Any]] = [["turma", "data", "turno", "folga", "inicio", "fim", "minutos"]]
        for a in _all_assignments(db, p, sid):
            rows.append([a["team"] or "", a["work_date"].isoformat(), a["shift_code"] or "",
                         "sim" if a["is_day_off"] else "nao",
                         a["starts_at"].isoformat() if a["starts_at"] else "",
                         a["ends_at"].isoformat() if a["ends_at"] else "", a["clock_minutes"]])
        tables["Escala"] = rows
    if "Cobertura168h" in sheets or "KPIs" in sheets:
        cov = svc.coverage(db, p, sid, "postos", "pior", None)
        if "Cobertura168h" in sheets:
            rows = [["slot", "dia", "hora", "necessario", "escalados_pior", "escalados_media",
                     "diferenca", "status", "ocorrencias_deficit"]]
            for s in cov.slots:
                rows.append([s.slot_index, WEEKDAYS[s.weekday - 1], s.start, str(s.required_net),
                             str(s.scheduled_worst), str(s.scheduled_mean), str(s.gap), s.status,
                             s.deficit_occurrences])
            tables["Cobertura168h"] = rows
        if "KPIs" in sheets:
            k = cov.kpis
            tables["KPIs"] = [
                ["kpi", "valor"],
                ["pct_horas_posto_cobertas", str(k.pct_hours_covered)],
                ["horas_posto_deficit", str(k.deficit_post_hours)],
                ["horas_com_deficit", k.deficit_hours],
                ["pico_subcobertura", str(k.peak_undercoverage.value) if k.peak_undercoverage
                 else ""],
                ["pico_em", k.peak_undercoverage.at if k.peak_undercoverage else ""],
                ["horas_posto_excesso", str(k.excess_post_hours)],
                ["headcount_min", k.headcount_min if k.headcount_min is not None else ""],
                ["turmas_necessarias", str(k.teams_required) if k.teams_required is not None
                 else ""],
            ]
    if "Violacoes" in sheets:
        rows = [["codigo", "severidade", "fundamento", "turma", "data", "mensagem"]]
        for f in _all_findings(db, p, sid):
            rows.append([f.rule_code, f.severity, f.legal_reference, f.team or "",
                         f.occurs_on.isoformat() if f.occurs_on else "", f.message])
        tables["Violacoes"] = rows
    if "Parametros" in sheets:
        tables["Parametros"] = [
            ["parametro", "valor"], ["cenario", sc.name], ["versao", sc.version],
            ["modelo", sc.schedule_model.code], ["turmas", sc.team_count],
            ["inicio_horizonte", sc.horizon_start.isoformat()],
            ["semanas", sc.horizon_weeks], ["regime_aplicado", sc.legal_regime_applied or ""],
            ["inputs_hash", sc.inputs_hash or ""], ["engine_version", sc.engine_version or ""],
            ["rules_version", sc.rules_version or ""]]
    return tables


def to_csv(rows: list[list[Any]]) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";", lineterminator="\n")
    w.writerows(rows)
    return ("﻿" + buf.getvalue()).encode("utf-8")  # BOM: abre acentuado no Excel pt-BR


def to_xlsx(tables: dict[str, list[list[Any]]]) -> bytes:
    wb = Workbook()
    wb.remove(wb.active)  # type: ignore[arg-type, unused-ignore]
    for name, rows in tables.items():
        ws = wb.create_sheet(name)
        for r in rows:
            ws.append(r)
        ws.freeze_panes = "A2"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def export(db: Session, p: Principal, sid: uuid.UUID,
           body: ss.ExportIn) -> tuple[bytes, str, str]:
    sheets: list[str] = [s for s in (body.options.sheets or SHEETS) if s in SHEETS]
    if body.format == "csv":
        sheet = sheets[0] if body.options.sheets else "Cobertura168h"
        tables = build_tables(db, p, sid, [sheet])
        return to_csv(tables[sheet]), "text/csv; charset=utf-8", f"cenario-{sid}-{sheet}.csv"
    tables = build_tables(db, p, sid, sheets)
    return (to_xlsx(tables),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            f"cenario-{sid}.xlsx")
