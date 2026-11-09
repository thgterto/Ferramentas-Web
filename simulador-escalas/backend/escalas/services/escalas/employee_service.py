"""v3.8 — Cadastro de colaboradores: CRUD, busca/filtros, importação CSV/XLSX com relatório
de erros, exportação e alocação (manual/automática) às turmas de um cenário."""

from __future__ import annotations

import csv
import io
import uuid
from collections.abc import Iterable, Mapping, Sequence
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from math import ceil
from typing import TYPE_CHECKING, Any

from openpyxl import Workbook, load_workbook
from pydantic import ValidationError
from sqlalchemy.orm import Session

from escalas.core.errors import validation
from escalas.db.models import Employee, Subsector, SubsectorPool, Workstation
from escalas.repositories.cadastros import (
    EmployeeRepo,
    OperationRepo,
    PoolRepo,
    RoleRepo,
    SubsectorRepo,
    WorkstationRepo,
)
from escalas.schemas import structure as st
from escalas.services.engine import matriz_mensal as MM
from escalas.services.escalas.cadastros_service import commit
from escalas.services.escalas.engine_runner import PessoaCadastrada

if TYPE_CHECKING:
    from escalas.api.deps import Principal

COLUMNS = ("matricula", "nome", "cargo", "subsetor", "posicao", "turma", "admissao",
           "jornada_semanal_h", "habilidades", "restricoes", "pools", "status")
_ALIASES = {"matrícula": "matricula", "registration": "matricula", "name": "nome",
            "role": "cargo", "role_code": "cargo", "subsector": "subsetor",
            "posição": "posicao", "workstation": "posicao", "team": "turma",
            "admissão": "admissao", "hire_date": "admissao", "jornada": "jornada_semanal_h",
            "skills": "habilidades", "restrições": "restricoes", "restrictions": "restricoes",
            "pool": "pools", "pool_codes": "pools", "ativo": "status"}
MAX_IMPORT_ROWS = 5000


# ---- leitura / saída ----------------------------------------------------------------------
class _Lookup:
    """Códigos ↔ ids da operação (cargos, subsetores, posições, pools)."""

    def __init__(self, db: Session, p: Principal, op_id: int) -> None:
        self.roles = {r.code: r.id for r in RoleRepo(db, p.org_id).find()}
        self.role_code = {v: k for k, v in self.roles.items()}
        subs = SubsectorRepo(db, p.org_id).find(Subsector.operation_id == op_id)
        self.subs = {s.code: s for s in subs}
        self.sub_code = {s.id: s.code for s in subs}
        ws = WorkstationRepo(db, p.org_id).find(
            Workstation.subsector_id.in_([s.id for s in subs])) if subs else []
        self.ws = list(ws)
        self.ws_code = {w.id: w.code for w in ws}
        self.pools = {x.code for x in PoolRepo(db, p.org_id).find(
            SubsectorPool.operation_id == op_id)}


def _out(e: Employee, op_public: uuid.UUID, lk: _Lookup) -> st.EmployeeOut:
    return st.EmployeeOut(
        id=e.public_id, operation_id=op_public, name=e.name, registration=e.registration,
        team_code=e.team_code, role_code=lk.role_code.get(e.role_id or -1),
        home_subsector_code=lk.sub_code.get(e.home_subsector_id or -1),
        default_workstation_code=lk.ws_code.get(e.default_workstation_id or -1),
        skills=list(e.skills or []), hire_date=e.hire_date,
        contract_weekly_hours=e.contract_weekly_hours,
        restrictions=list(e.restrictions or []), pool_codes=list(e.pool_codes or []),
        active=bool(e.active))


def _norm(t: str | None) -> str:
    return (t or "").strip().casefold()


def list_employees(db: Session, p: Principal, oid: uuid.UUID, q: str | None = None,
                   subsector: str | None = None, workstation: str | None = None,
                   role: str | None = None, team: str | None = None,
                   status: str | None = None) -> list[st.EmployeeOut]:
    """Busca (nome/matrícula/habilidade) e filtros por subsetor/posição/cargo/turma/status."""
    op = OperationRepo(db, p.org_id).get(oid)
    lk = _Lookup(db, p, op.id)
    rows = [_out(e, op.public_id, lk) for e in
            EmployeeRepo(db, p.org_id).find(Employee.operation_id == op.id)]
    if q:
        n = _norm(q)
        rows = [r for r in rows if n in _norm(r.name) or n in _norm(r.registration)
                or any(n in _norm(s) for s in r.skills)]
    if subsector:
        rows = [r for r in rows if r.home_subsector_code == subsector]
    if workstation:
        rows = [r for r in rows if r.default_workstation_code == workstation]
    if role:
        rows = [r for r in rows if r.role_code == role]
    if team:
        rows = [r for r in rows if (r.team_code or "-") == team]
    if status in ("ativo", "inativo"):
        rows = [r for r in rows if r.active == (status == "ativo")]
    return sorted(rows, key=lambda r: (_norm(r.name), r.registration or ""))


def get_employee(db: Session, p: Principal, eid: uuid.UUID) -> st.EmployeeOut:
    e = EmployeeRepo(db, p.org_id).get(eid)
    op = OperationRepo(db, p.org_id).get_by_id(e.operation_id)
    return _out(e, op.public_id, _Lookup(db, p, op.id))


# ---- escrita -------------------------------------------------------------------------------
def _resolver(lk: _Lookup, vals: Mapping[str, Any], atual: Employee | None
              ) -> dict[str, Any]:
    """Valida códigos e devolve as colunas; erros como ``validation`` com o campo."""
    out: dict[str, Any] = {}

    def erro(field: str, msg: str) -> None:
        raise validation(msg, [{"field": field, "code": "not_found", "message": msg}])

    if "role_code" in vals:
        rc = vals["role_code"]
        if rc and rc not in lk.roles:
            erro("role_code", f"cargo inexistente: {rc}")
        out["role_id"] = lk.roles.get(rc) if rc else None
    sub = None
    if "home_subsector_code" in vals:
        sc = vals["home_subsector_code"]
        if sc and sc not in lk.subs:
            erro("home_subsector_code", f"subsetor inexistente: {sc}")
        sub = lk.subs.get(sc) if sc else None
        out["home_subsector_id"] = sub.id if sub else None
    elif atual is not None and atual.home_subsector_id:
        sub = next((s for s in lk.subs.values() if s.id == atual.home_subsector_id), None)
    if "default_workstation_code" in vals:
        wc = vals["default_workstation_code"]
        if wc:
            cand = [w for w in lk.ws if w.code == wc
                    and (sub is None or w.subsector_id == sub.id)]
            if not cand:
                erro("default_workstation_code", f"posição inexistente: {wc}")
            out["default_workstation_id"] = cand[0].id
            if sub is None:
                out["home_subsector_id"] = cand[0].subsector_id
        else:
            out["default_workstation_id"] = None
    if "pool_codes" in vals and vals["pool_codes"] is not None:
        faltam = [c for c in vals["pool_codes"] if c not in lk.pools]
        if faltam:
            erro("pool_codes", f"pool inexistente: {', '.join(faltam)}")
    for k in ("name", "registration", "team_code", "skills", "hire_date",
              "contract_weekly_hours", "restrictions", "pool_codes", "active"):
        if k in vals and not (k in ("skills", "restrictions", "pool_codes", "active", "name")
                              and vals[k] is None):
            out[k] = vals[k]
    if "skills" in out:
        out["skills"] = sorted({s.strip() for s in out["skills"] if s.strip()})
    if "registration" in out and out["registration"] is not None:
        out["registration"] = str(out["registration"]).strip() or None
    return out


def _check_registration(repo: EmployeeRepo, op_id: int, reg: str | None,
                        proprio: int | None) -> None:
    if not reg:
        return
    dup = [e for e in repo.find(Employee.operation_id == op_id, Employee.registration == reg)
           if e.id != proprio]
    if dup:
        raise validation(f"matrícula já cadastrada: {reg}",
                         [{"field": "registration", "code": "duplicate", "message": reg}])


def create_employee(db: Session, p: Principal, oid: uuid.UUID, body: st.EmployeeIn
                    ) -> st.EmployeeOut:
    op = OperationRepo(db, p.org_id).get(oid)
    lk = _Lookup(db, p, op.id)
    vals = _resolver(lk, body.model_dump(), None)
    repo = EmployeeRepo(db, p.org_id)
    _check_registration(repo, op.id, vals.get("registration"), None)
    e = repo.add(operation_id=op.id, **vals)
    commit(db, "colaborador")
    return _out(e, op.public_id, lk)


def patch_employee(db: Session, p: Principal, eid: uuid.UUID, body: st.EmployeePatch
                   ) -> st.EmployeeOut:
    repo = EmployeeRepo(db, p.org_id)
    e = repo.get(eid)
    op = OperationRepo(db, p.org_id).get_by_id(e.operation_id)
    lk = _Lookup(db, p, op.id)
    vals = _resolver(lk, body.model_dump(exclude_unset=True), e)
    if "registration" in vals:
        _check_registration(repo, op.id, vals["registration"], e.id)
    repo.update(e, vals)
    commit(db, "colaborador")
    return _out(e, op.public_id, lk)


def delete_employee(db: Session, p: Principal, eid: uuid.UUID) -> None:
    repo = EmployeeRepo(db, p.org_id)
    repo.delete(repo.get(eid))
    commit(db)


# ---- importação / exportação ---------------------------------------------------------------
def _ler_planilha(nome: str, dados: bytes) -> list[dict[str, str]]:
    if nome.lower().endswith((".xlsx", ".xlsm")):
        try:
            wb = load_workbook(io.BytesIO(dados), read_only=True, data_only=True)
        except Exception as exc:
            raise validation(f"XLSX inválido: {exc}") from exc
        ws = wb.worksheets[0]
        linhas = [["" if c is None else (c.date().isoformat() if isinstance(c, datetime)
                                         else str(c)) for c in r]
                  for r in ws.iter_rows(values_only=True)]
    else:
        texto = dados.decode("utf-8-sig", errors="replace")
        amostra = texto[:2048]
        sep = ";" if amostra.count(";") >= amostra.count(",") else ","
        linhas = list(csv.reader(io.StringIO(texto), delimiter=sep))
    linhas = [r for r in linhas if any(str(c).strip() for c in r)]
    if not linhas:
        return []
    head = [_ALIASES.get(_norm(h), _norm(h)) for h in linhas[0]]
    if "nome" not in head:
        raise validation("planilha sem a coluna 'nome'",
                         [{"field": "nome", "code": "missing_column", "message": "nome"}])
    return [{h: str(v).strip() for h, v in zip(head, r, strict=False) if h}
            for r in linhas[1:]]


def _lista(t: str) -> list[str]:
    return [x.strip() for x in t.replace(";", ",").replace("|", ",").split(",") if x.strip()]


def _linha_para_in(r: Mapping[str, str]) -> dict[str, Any]:
    d: dict[str, Any] = {"name": r.get("nome", "")}
    if r.get("matricula"):
        d["registration"] = r["matricula"]
    for col, campo in (("cargo", "role_code"), ("subsetor", "home_subsector_code"),
                       ("posicao", "default_workstation_code")):
        if r.get(col):
            d[campo] = r[col]
    if r.get("turma"):
        d["team_code"] = r["turma"].upper()
    if r.get("admissao"):
        txt = r["admissao"]
        try:
            d["hire_date"] = (date.fromisoformat(txt[:10]) if "-" in txt
                              else datetime.strptime(txt, "%d/%m/%Y").date())
        except ValueError as exc:
            raise ValueError(f"admissao: data inválida '{txt}' (use AAAA-MM-DD ou "
                             "DD/MM/AAAA)") from exc
    if r.get("jornada_semanal_h"):
        try:
            d["contract_weekly_hours"] = Decimal(r["jornada_semanal_h"].replace(",", "."))
        except InvalidOperation as exc:
            raise ValueError(f"jornada_semanal_h: número inválido "
                             f"'{r['jornada_semanal_h']}'") from exc
    if r.get("habilidades"):
        d["skills"] = _lista(r["habilidades"])
    if r.get("restricoes"):
        d["restrictions"] = [x.replace(" ", "_").casefold() for x in _lista(r["restricoes"])]
    if r.get("pools"):
        d["pool_codes"] = _lista(r["pools"])
    if r.get("status"):
        s = _norm(r["status"])
        if s not in ("ativo", "inativo", "true", "false", "1", "0", "sim", "não", "nao"):
            raise ValueError(f"status: use ativo/inativo (recebido '{r['status']}')")
        d["active"] = s in ("ativo", "true", "1", "sim")
    return d


def import_employees(db: Session, p: Principal, oid: uuid.UUID, filename: str, data: bytes,
                     dry_run: bool) -> st.EmployeeImportOut:
    """Valida todas as linhas; grava só se não houver erro (tudo-ou-nada) e não for dry-run.
    Linha com matrícula existente = atualização."""
    op = OperationRepo(db, p.org_id).get(oid)
    lk = _Lookup(db, p, op.id)
    linhas = _ler_planilha(filename, data)
    if len(linhas) > MAX_IMPORT_ROWS:
        raise validation(f"máximo de {MAX_IMPORT_ROWS} linhas por importação")
    repo = EmployeeRepo(db, p.org_id)
    existentes = {e.registration: e for e in repo.find(Employee.operation_id == op.id)
                  if e.registration}
    erros: list[st.ImportError_] = []
    plano: list[tuple[Employee | None, dict[str, Any]]] = []
    vistas: dict[str, int] = {}
    for i, r in enumerate(linhas, start=2):
        try:
            body = st.EmployeeIn.model_validate(_linha_para_in(r))
        except ValueError as exc:
            if isinstance(exc, ValidationError):
                for err in exc.errors():
                    loc = ".".join(str(x) for x in err["loc"])
                    erros.append(st.ImportError_(row=i, field=loc or None, message=err["msg"]))
            else:
                campo, _, msg = str(exc).partition(": ")
                erros.append(st.ImportError_(row=i, field=campo, message=msg or str(exc)))
            continue
        reg = body.registration
        if reg and reg in vistas:
            erros.append(st.ImportError_(row=i, field="matricula",
                                         message=f"matrícula repetida (linha {vistas[reg]})"))
            continue
        if reg:
            vistas[reg] = i
        atual = existentes.get(reg) if reg else None
        try:
            dump = body.model_dump(exclude_unset=True) if atual else body.model_dump()
            vals = _resolver(lk, dump, atual)
        except Exception as exc:  # AppError de validação → relatório
            det = getattr(exc, "details", None) or [{}]
            erros.append(st.ImportError_(row=i, field=det[0].get("field"),
                                         message=getattr(exc, "message", str(exc))))
            continue
        plano.append((atual, vals))
    criados = sum(1 for a, _ in plano if a is None)
    atualizados = len(plano) - criados
    salvos: list[st.EmployeeOut] = []
    if not erros and not dry_run:
        for atual, vals in plano:
            e = repo.update(atual, vals) if atual else repo.add(operation_id=op.id, **vals)
            salvos.append(_out(e, op.public_id, lk))
        commit(db, "colaborador")
    return st.EmployeeImportOut(dry_run=dry_run or bool(erros), total_rows=len(linhas),
                                created=criados, updated=atualizados, errors=erros,
                                employees=salvos)


def export_rows(emps: Sequence[st.EmployeeOut]) -> list[list[Any]]:
    rows: list[list[Any]] = [list(COLUMNS)]
    for e in emps:
        rows.append([e.registration or "", e.name, e.role_code or "",
                     e.home_subsector_code or "", e.default_workstation_code or "",
                     e.team_code or "", e.hire_date.isoformat() if e.hire_date else "",
                     "" if e.contract_weekly_hours is None
                     else f"{float(e.contract_weekly_hours):g}",
                     ", ".join(e.skills), ", ".join(e.restrictions), ", ".join(e.pool_codes),
                     "ativo" if e.active else "inativo"])
    return rows


def export_employees(db: Session, p: Principal, oid: uuid.UUID, fmt: str
                     ) -> tuple[bytes, str, str]:
    rows = export_rows(list_employees(db, p, oid))
    if fmt == "xlsx":
        wb = Workbook()
        ws = wb.active
        assert ws is not None
        ws.title = "colaboradores"
        for r in rows:
            ws.append(r)
        buf = io.BytesIO()
        wb.save(buf)
        return (buf.getvalue(), "colaboradores.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    sio = io.StringIO()
    csv.writer(sio, delimiter=";", lineterminator="\n").writerows(rows)
    return ("﻿" + sio.getvalue()).encode("utf-8"), "colaboradores.csv", "text/csv"


# ---- ponte para o motor / matriz -------------------------------------------------------------
def team_people(db: Session, p: Principal, op_id: int) -> dict[str, list[PessoaCadastrada]]:
    """Colaboradores ATIVOS com turma, por turma (para a matriz quando não há estrutura)."""
    roles = {r.id: r.code for r in RoleRepo(db, p.org_id).find()}
    out: dict[str, list[PessoaCadastrada]] = {}
    for e in sorted(EmployeeRepo(db, p.org_id).find(Employee.operation_id == op_id),
                    key=lambda e: (_norm(e.name), e.id)):
        if not e.team_code or not e.active:
            continue
        out.setdefault(e.team_code, []).append(PessoaCadastrada(
            id=str(e.public_id)[:8], nome=e.name, cargo=roles.get(e.role_id or -1),
            subsetor=None, posicao=None))
    return out


def pessoas_matriz(turmas: Sequence[tuple[str, int, Mapping[str, int]]],
                   cad: Mapping[str, Sequence[PessoaCadastrada]]
                   ) -> tuple[list[MM.Pessoa], dict[str, str]]:
    """Cadastradas na turma quando houver; fictícias (``A-01``…) só como fallback."""
    pessoas: list[MM.Pessoa] = []
    nomes: dict[str, str] = {}
    for nome, tam, comp in turmas:
        lst = cad.get(nome) or []
        if lst:
            for pc in lst:
                pessoas.append(MM.Pessoa(pc.id, pc.nome, nome, pc.cargo))
                nomes[pc.id] = pc.nome
        else:
            pessoas += MM.pessoas_das_turmas([(nome, tam, comp)])
    return pessoas, nomes


# ---- alocação automática às turmas -----------------------------------------------------------
def _perfil_turmas(db: Session, p: Principal, sid: uuid.UUID
                   ) -> list[tuple[str, int, dict[str, int], bool, bool, bool]]:
    """(turma, tamanho, composição por cargo, faz noite, faz fim de semana, tem > 10 h)."""
    from escalas.repositories.scenarios import ScenarioRepo
    from escalas.services.escalas import matrix_service as mx
    from escalas.services.escalas import scenario_service as svc

    s = svc._get(db, p, sid)
    inicio = s.horizon_start
    dias = 28
    turmas, estados, turnos, _, _, _ = mx._estados_mes(db, p, sid, inicio, dias)
    repo = ScenarioRepo(db, p.org_id)
    teams = {t.code: t for t in repo.teams(s.id)}
    roles = {r.id: r.code for r in RoleRepo(db, p.org_id).find()}
    comp: dict[str, dict[str, int]] = {}
    for c in repo.composition([t.id for t in teams.values()]):
        code = next(k for k, t in teams.items() if t.id == c.team_id)
        comp.setdefault(code, {})[roles.get(c.role_id, "?")] = c.headcount
    out = []
    for i, (nome, tam) in enumerate(turmas):
        lin = estados[i][1:]
        trab = [(j, e) for j, e in enumerate(lin) if e in turnos]
        noite = any(MM.e_noturno(turnos[e]) for _, e in trab)
        fds = any((inicio + timedelta(days=j)).weekday() >= 5 for j, _ in trab)
        longo = any(turnos[e].duracao_min > 600 for _, e in trab)
        size = teams[nome].size_assigned if nome in teams else ceil(tam)
        out.append((nome, int(size), comp.get(nome, {}), noite, fds, longo))
    return out


def _compativel(e: Employee, noite: bool, fds: bool, longo: bool) -> bool:
    r = set(e.restrictions or [])
    return not ((noite and "nao_noturno" in r) or (fds and "nao_fim_de_semana" in r)
                or (longo and "nao_12h" in r))


def auto_assign(db: Session, p: Principal, oid: uuid.UUID, body: st.TeamAssignIn
                ) -> st.TeamAssignOut:
    """Aloca colaboradores ativos às turmas do cenário respeitando cargo (composição da
    turma, quando definida) e restrições (não faz noite / fim de semana / 12 h).

    Heurística determinística "mais restrito primeiro": cada pessoa (ordem: nº de turmas
    compatíveis, nome) vai para a turma compatível com mais vagas do seu cargo em aberto;
    sem composição, as vagas são genéricas (tamanho da turma)."""
    op = OperationRepo(db, p.org_id).get(oid)
    perfis = _perfil_turmas(db, p, body.scenario_id)
    roles = {r.id: r.code for r in RoleRepo(db, p.org_id).find()}
    emps = [e for e in EmployeeRepo(db, p.org_id).find(Employee.operation_id == op.id)
            if e.active]
    vagas: dict[str, dict[str | None, int]] = {}
    for nome, size, comp, *_ in perfis:
        v: dict[str | None, int] = {k: n for k, n in comp.items() if n > 0}
        resto = size - sum(v.values())
        if resto > 0:
            v[None] = resto
        vagas[nome] = v
    info = {nome: (noite, fds, longo) for nome, _, _, noite, fds, longo in perfis}
    atrib: dict[int, str] = {}
    fixos = [e for e in emps if body.only_unassigned and e.team_code in vagas]
    for e in fixos:
        _ocupar(vagas[e.team_code or ""], roles.get(e.role_id or -1))
        atrib[e.id] = e.team_code or ""
    livres = [e for e in emps if e.id not in atrib]

    def compat(e: Employee) -> list[str]:
        cargo = roles.get(e.role_id or -1)
        return [t for t in vagas if _compativel(e, *info[t])
                and (vagas[t].get(cargo, 0) > 0 or vagas[t].get(None, 0) > 0)]

    notas: list[str] = []
    for e in sorted(livres, key=lambda e: (len(compat(e)), _norm(e.name), e.id)):
        cand = compat(e)
        if not cand:
            continue
        cargo = roles.get(e.role_id or -1)
        t = max(cand, key=lambda t: (vagas[t].get(cargo, 0), sum(vagas[t].values()),
                                     t == e.team_code, -list(vagas).index(t)))
        _ocupar(vagas[t], cargo)
        atrib[e.id] = t
    por_id = {e.id: e for e in emps}
    teams_out = []
    for nome, size, comp, noite, fds, _ in perfis:
        ids = [por_id[i].public_id for i, t in atrib.items() if t == nome]
        teams_out.append(st.TeamSlotOut(team=nome, size=size, works_night=noite,
                                        works_weekend=fds, roles=comp, assigned=ids,
                                        missing=max(0, sum(vagas[nome].values()))))
    sem = [e.public_id for e in emps if e.id not in atrib]
    if sem:
        notas.append(f"{len(sem)} colaborador(es) sem turma compatível ou sem vaga")
    faltam = sum(t.missing for t in teams_out)
    if faltam:
        notas.append(f"{faltam} vaga(s) sem colaborador — a matriz completa com fictícios")
    if body.apply:
        for e in emps:
            e.team_code = atrib.get(e.id)
        commit(db, "colaborador")
    return st.TeamAssignOut(applied=body.apply, teams=teams_out,
                            assignments={str(por_id[i].public_id): t for i, t in atrib.items()},
                            unassigned=sem, notes=notas)


def _ocupar(v: dict[str | None, int], cargo: str | None) -> None:
    if v.get(cargo, 0) > 0 and cargo is not None:
        v[cargo] -= 1
    elif v.get(None, 0) > 0:
        v[None] -= 1


def bulk_team(db: Session, p: Principal, ids: Iterable[uuid.UUID], team: str | None) -> int:
    """Alocação manual em lote (mesma turma para vários colaboradores)."""
    repo = EmployeeRepo(db, p.org_id)
    n = 0
    for i in ids:
        repo.update(repo.get(i), {"team_code": team})
        n += 1
    commit(db, "colaborador")
    return n
