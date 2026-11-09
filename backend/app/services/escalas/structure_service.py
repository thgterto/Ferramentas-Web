"""v3.7 — CRUD da hierarquia Subsetor → Posição, pools e pessoas; ponte para o motor."""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

from sqlalchemy.orm import Session

from app.core.errors import validation
from app.db.models import Employee, Subsector, SubsectorPool, Workstation
from app.repositories.cadastros import (
    EmployeeRepo,
    OperationRepo,
    PoolRepo,
    RoleRepo,
    SubsectorRepo,
    SubstitutionRepo,
    WorkstationRepo,
)
from app.schemas import structure as st
from app.services.engine import subsetores as SUB
from app.services.engine.cobertura_cargos import Substituicao
from app.services.escalas.cadastros_service import commit
from app.services.escalas.engine_runner import PessoaCadastrada

if TYPE_CHECKING:
    from app.api.deps import Principal


def _role_id(db: Session, p: Principal, code: str | None, field: str) -> int | None:
    if not code:
        return None
    r = RoleRepo(db, p.org_id).by_code(code)
    if r is None:
        raise validation(f"cargo inexistente: {code}",
                         [{"field": field, "code": "not_found", "message": code}])
    return r.id


def _roles(db: Session, p: Principal) -> dict[int, str]:
    return {r.id: r.code for r in RoleRepo(db, p.org_id).find()}


# ---- saída ------------------------------------------------------------------------------
def ws_out(db: Session, p: Principal, w: Workstation, sub: Subsector | None = None
           ) -> st.WorkstationOut:
    sub = sub or SubsectorRepo(db, p.org_id).get_by_id(w.subsector_id)
    vals = [int(x) for x in (w.demand_values or {}).get("values", [0] * 168)]
    return st.WorkstationOut(
        id=w.public_id, subsector_id=sub.public_id, subsector_code=sub.code, code=w.code,
        name=w.name, required_role_code=_roles(db, p).get(w.required_role_id or -1),
        demand_mode=w.demand_mode, demand_values=vals, peak=max(vals, default=0))


def sub_out(db: Session, p: Principal, s: Subsector) -> st.SubsectorOut:
    op = OperationRepo(db, p.org_id).get_by_id(s.operation_id)
    ws = sorted(WorkstationRepo(db, p.org_id).find(Workstation.subsector_id == s.id),
                key=lambda w: (w.sort_order, w.id))
    return st.SubsectorOut(id=s.public_id, operation_id=op.public_id, code=s.code,
                           name=s.name, sort_order=s.sort_order,
                           workstations=[ws_out(db, p, w, s) for w in ws])


def pool_out(db: Session, p: Principal, x: SubsectorPool) -> st.PoolOut:
    op = OperationRepo(db, p.org_id).get_by_id(x.operation_id)
    m = x.members or {}
    return st.PoolOut(id=x.public_id, operation_id=op.public_id, code=x.code, name=x.name,
                      subsector_codes=list(m.get("subsectors", [])), mode=x.mode,
                      allowed_role_codes=list(m.get("roles", [])),
                      max_borrowed_hours_week=x.max_borrowed_hours_week,
                      prefer_home=x.prefer_home)


def emp_out(db: Session, p: Principal, e: Employee) -> st.EmployeeOut:
    op = OperationRepo(db, p.org_id).get_by_id(e.operation_id)
    sub = SubsectorRepo(db, p.org_id).get_by_id(e.home_subsector_id) \
        if e.home_subsector_id else None
    ws = WorkstationRepo(db, p.org_id).get_by_id(e.default_workstation_id) \
        if e.default_workstation_id else None
    return st.EmployeeOut(id=e.public_id, operation_id=op.public_id, name=e.name,
                          team_code=e.team_code,
                          role_code=_roles(db, p).get(e.role_id or -1),
                          home_subsector_code=sub.code if sub else None,
                          default_workstation_code=ws.code if ws else None)


# ---- subsetores -------------------------------------------------------------------------
def list_subsectors(db: Session, p: Principal, oid: uuid.UUID) -> list[st.SubsectorOut]:
    op = OperationRepo(db, p.org_id).get(oid)
    rows = SubsectorRepo(db, p.org_id).find(Subsector.operation_id == op.id)
    return [sub_out(db, p, s) for s in sorted(rows, key=lambda s: (s.sort_order, s.id))]


def create_subsector(db: Session, p: Principal, oid: uuid.UUID, body: st.SubsectorIn
                     ) -> st.SubsectorOut:
    op = OperationRepo(db, p.org_id).get(oid)
    s = SubsectorRepo(db, p.org_id).add(operation_id=op.id, **body.model_dump())
    commit(db, "subsetor")
    return sub_out(db, p, s)


def patch_subsector(db: Session, p: Principal, sid: uuid.UUID, body: st.SubsectorPatch
                    ) -> st.SubsectorOut:
    repo = SubsectorRepo(db, p.org_id)
    s = repo.update(repo.get(sid), body.model_dump(exclude_unset=True))
    commit(db, "subsetor")
    return sub_out(db, p, s)


def delete_subsector(db: Session, p: Principal, sid: uuid.UUID) -> None:
    repo = SubsectorRepo(db, p.org_id)
    s = repo.get(sid)
    for w in WorkstationRepo(db, p.org_id).find(Workstation.subsector_id == s.id):
        db.delete(w)
    for x in PoolRepo(db, p.org_id).find(SubsectorPool.operation_id == s.operation_id):
        subs = [c for c in (x.members or {}).get("subsectors", []) if c != s.code]
        x.members = {**(x.members or {}), "subsectors": subs}
    repo.delete(s)
    commit(db)


# ---- posições ---------------------------------------------------------------------------
def create_workstation(db: Session, p: Principal, sid: uuid.UUID, body: st.WorkstationIn
                       ) -> st.WorkstationOut:
    sub = SubsectorRepo(db, p.org_id).get(sid)
    w = WorkstationRepo(db, p.org_id).add(
        subsector_id=sub.id, code=body.code, name=body.name, sort_order=body.sort_order,
        required_role_id=_role_id(db, p, body.required_role_code, "required_role_code"),
        demand_mode=body.demand.mode, demand_values={"values": body.demand.curve()})
    commit(db, "posição")
    return ws_out(db, p, w, sub)


def patch_workstation(db: Session, p: Principal, wid: uuid.UUID, body: st.WorkstationPatch
                      ) -> st.WorkstationOut:
    repo = WorkstationRepo(db, p.org_id)
    w = repo.get(wid)
    vals = body.model_dump(exclude_unset=True, exclude={"demand", "required_role_code"})
    if "required_role_code" in body.model_fields_set:
        vals["required_role_id"] = _role_id(db, p, body.required_role_code,
                                            "required_role_code")
    if body.demand is not None:
        vals["demand_mode"] = body.demand.mode
        vals["demand_values"] = {"values": body.demand.curve()}
    repo.update(w, vals)
    commit(db, "posição")
    return ws_out(db, p, w)


def delete_workstation(db: Session, p: Principal, wid: uuid.UUID) -> None:
    repo = WorkstationRepo(db, p.org_id)
    repo.delete(repo.get(wid))
    commit(db)


# ---- pools ------------------------------------------------------------------------------
def _check_pool(db: Session, p: Principal, op_id: int, codes: Sequence[str],
                roles: Sequence[str], mode: str, own: int | None = None) -> None:
    subs = {s.code for s in SubsectorRepo(db, p.org_id).find(Subsector.operation_id == op_id)}
    falt = [c for c in codes if c not in subs]
    if falt:
        raise validation(f"subsetor inexistente: {', '.join(falt)}",
                         [{"field": "subsector_codes", "code": "not_found",
                           "message": ",".join(falt)}])
    for x in PoolRepo(db, p.org_id).find(SubsectorPool.operation_id == op_id):
        if x.id != own and set(codes) & set((x.members or {}).get("subsectors", [])):
            raise validation("subsetor já pertence a outro pool",
                             [{"field": "subsector_codes", "code": "overlap",
                               "message": x.code}])
    if mode == "restrito" and not roles:
        raise validation("modo restrito exige allowed_role_codes")
    for r in roles:
        _role_id(db, p, r, "allowed_role_codes")


def list_pools(db: Session, p: Principal, oid: uuid.UUID) -> list[st.PoolOut]:
    op = OperationRepo(db, p.org_id).get(oid)
    return [pool_out(db, p, x) for x in
            PoolRepo(db, p.org_id).find(SubsectorPool.operation_id == op.id)]


def create_pool(db: Session, p: Principal, oid: uuid.UUID, body: st.PoolIn) -> st.PoolOut:
    op = OperationRepo(db, p.org_id).get(oid)
    _check_pool(db, p, op.id, body.subsector_codes, body.allowed_role_codes, body.mode)
    x = PoolRepo(db, p.org_id).add(
        operation_id=op.id, code=body.code, name=body.name, mode=body.mode,
        members={"subsectors": body.subsector_codes, "roles": body.allowed_role_codes},
        max_borrowed_hours_week=body.max_borrowed_hours_week, prefer_home=body.prefer_home)
    commit(db, "pool")
    return pool_out(db, p, x)


def patch_pool(db: Session, p: Principal, pid: uuid.UUID, body: st.PoolPatch) -> st.PoolOut:
    repo = PoolRepo(db, p.org_id)
    x = repo.get(pid)
    m = dict(x.members or {})
    codes = body.subsector_codes if body.subsector_codes is not None else m.get("subsectors", [])
    roles = body.allowed_role_codes if body.allowed_role_codes is not None else m.get("roles", [])
    mode = body.mode or x.mode
    _check_pool(db, p, x.operation_id, codes, roles, mode, x.id)
    vals: dict[str, Any] = body.model_dump(exclude_unset=True,
                                           exclude={"subsector_codes", "allowed_role_codes"})
    vals["members"] = {"subsectors": list(codes), "roles": list(roles)}
    repo.update(x, vals)
    commit(db, "pool")
    return pool_out(db, p, x)


def delete_pool(db: Session, p: Principal, pid: uuid.UUID) -> None:
    repo = PoolRepo(db, p.org_id)
    repo.delete(repo.get(pid))
    commit(db)


# ---- pessoas ----------------------------------------------------------------------------
def list_employees(db: Session, p: Principal, oid: uuid.UUID) -> list[st.EmployeeOut]:
    op = OperationRepo(db, p.org_id).get(oid)
    return [emp_out(db, p, e) for e in
            EmployeeRepo(db, p.org_id).find(Employee.operation_id == op.id)]


def create_employee(db: Session, p: Principal, oid: uuid.UUID, body: st.EmployeeIn
                    ) -> st.EmployeeOut:
    op = OperationRepo(db, p.org_id).get(oid)
    subs = {s.code: s for s in SubsectorRepo(db, p.org_id).find(Subsector.operation_id == op.id)}
    sub = subs.get(body.home_subsector_code or "")
    if body.home_subsector_code and sub is None:
        raise validation(f"subsetor inexistente: {body.home_subsector_code}")
    ws_id = None
    if body.default_workstation_code:
        cand = [w for w in WorkstationRepo(db, p.org_id).find(
            Workstation.code == body.default_workstation_code)
            if w.subsector_id in {s.id for s in subs.values()}
            and (sub is None or w.subsector_id == sub.id)]
        if not cand:
            raise validation(f"posição inexistente: {body.default_workstation_code}")
        ws_id = cand[0].id
        if sub is None:
            sub = next(s for s in subs.values() if s.id == cand[0].subsector_id)
    e = EmployeeRepo(db, p.org_id).add(
        operation_id=op.id, name=body.name, team_code=body.team_code,
        role_id=_role_id(db, p, body.role_code, "role_code"),
        home_subsector_id=sub.id if sub else None, default_workstation_id=ws_id)
    commit(db, "pessoa")
    return emp_out(db, p, e)


def delete_employee(db: Session, p: Principal, eid: uuid.UUID) -> None:
    repo = EmployeeRepo(db, p.org_id)
    repo.delete(repo.get(eid))
    commit(db)


def structure(db: Session, p: Principal, oid: uuid.UUID) -> st.StructureOut:
    op = OperationRepo(db, p.org_id).get(oid)
    return st.StructureOut(
        operation_id=op.public_id, subsectors=list_subsectors(db, p, oid),
        pools=list_pools(db, p, oid),
        employees=len(EmployeeRepo(db, p.org_id).find(Employee.operation_id == op.id)))


# ---- ponte para o motor -----------------------------------------------------------------
def engine_structure(db: Session, p: Principal, op_id: int
                     ) -> tuple[SUB.Estrutura | None, dict[str, list[PessoaCadastrada]] | None,
                                dict[str, Any] | None]:
    """(estrutura, pessoas cadastradas por turma, snapshot) da operação — ``None`` se a
    operação não tem subsetores com posições."""
    subs = sorted(SubsectorRepo(db, p.org_id).find(Subsector.operation_id == op_id),
                  key=lambda s: (s.sort_order, s.id))
    if not subs:
        return None, None, None
    roles = _roles(db, p)
    by_id = {s.id: s for s in subs}
    ws = sorted(WorkstationRepo(db, p.org_id).find(
        Workstation.subsector_id.in_(list(by_id))),
        key=lambda w: (by_id[w.subsector_id].sort_order, by_id[w.subsector_id].id,
                       w.sort_order, w.id))
    if not ws:
        return None, None, None
    posicoes = tuple(SUB.Posicao(
        codigo=w.code if sum(1 for x in ws if x.code == w.code) == 1
        else f"{by_id[w.subsector_id].code}/{w.code}",
        subsetor=by_id[w.subsector_id].code,
        demanda=tuple(int(v) for v in (w.demand_values or {}).get("values", [0] * 168)),
        cargo=roles.get(w.required_role_id or -1), nome=w.name) for w in ws)
    pools = tuple(SUB.Pool(
        codigo=x.code, nome=x.name,
        subsetores=tuple(c for c in (x.members or {}).get("subsectors", [])
                         if c in {s.code for s in subs}),
        cargos=tuple((x.members or {}).get("roles", [])) if x.mode == "restrito" else (),
        max_horas_semana=x.max_borrowed_hours_week, preferir_origem=x.prefer_home)
        for x in PoolRepo(db, p.org_id).find(SubsectorPool.operation_id == op_id))
    regras = tuple(Substituicao(roles[r.from_role_id], roles[r.to_role_id], r.priority)
                   for r in SubstitutionRepo(db, p.org_id).find()
                   if r.from_role_id in roles and r.to_role_id in roles)
    estr = SUB.Estrutura(tuple(s.code for s in subs), posicoes,
                         tuple(pl for pl in pools if len(pl.subsetores) >= 2), regras,
                         tuple((s.code, s.name) for s in subs))
    ws_code = {w.id: pos.codigo for w, pos in zip(ws, posicoes, strict=True)}
    pessoas: dict[str, list[PessoaCadastrada]] = {}
    for e in EmployeeRepo(db, p.org_id).find(Employee.operation_id == op_id):
        if not e.team_code:
            continue
        pessoas.setdefault(e.team_code, []).append(PessoaCadastrada(
            id=str(e.public_id)[:8], nome=e.name, cargo=roles.get(e.role_id or -1),
            subsetor=by_id[e.home_subsector_id].code if e.home_subsector_id in by_id else None,
            posicao=ws_code.get(e.default_workstation_id or -1)))
    snap = {"subsectors": [[s.code, s.name] for s in subs],
            "workstations": [[x.codigo, x.subsetor, x.cargo, list(x.demanda)] for x in posicoes],
            "pools": [[x.codigo, list(x.subsetores), list(x.cargos), x.max_horas_semana,
                       x.preferir_origem] for x in estr.pools],
            "employees": sorted([t, pc.id, pc.cargo, pc.subsetor, pc.posicao]
                                for t, lst in pessoas.items() for pc in lst)}
    return estr, pessoas or None, snap
