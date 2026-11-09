"""CRUD dos cadastros (sem cálculo): acordos, operações, postos, curvas, shrinkage, cargos,
matriz de substituição, mínimos por cargo e K fixo por operação."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError, conflict, validation
from app.db.models import DemandCurve, Position, RoleCoverageRequirement
from app.repositories.cadastros import (
    DemandCurveRepo,
    LaborAgreementRepo,
    OperationRepo,
    PositionRepo,
    RoleRepo,
    RoleRequirementRepo,
    ShrinkageRepo,
    SubstitutionRepo,
    TeamConstraintRepo,
)
from app.schemas import cadastros as sc
from app.services.escalas import demand_service

if TYPE_CHECKING:
    from app.api.deps import Principal


def commit(db: Session, what: str = "registro") -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise conflict("duplicate", f"{what} já existente ou referência inválida") from exc


# ---- acordos ---------------------------------------------------------------------------
def create_agreement(db: Session, p: Principal, body: sc.LaborAgreementIn) -> sc.LaborAgreementOut:
    obj = LaborAgreementRepo(db, p.org_id).add(**body.model_dump())
    commit(db, "acordo")
    return sc.LaborAgreementOut.model_validate(obj)


def patch_agreement(db: Session, p: Principal, aid: uuid.UUID,
                    body: sc.LaborAgreementPatch) -> sc.LaborAgreementOut:
    repo = LaborAgreementRepo(db, p.org_id)
    obj = repo.update(repo.get(aid), body.model_dump(exclude_unset=True))
    commit(db, "acordo")
    return sc.LaborAgreementOut.model_validate(obj)


# ---- operações --------------------------------------------------------------------------
def create_operation(db: Session, p: Principal, body: sc.OperationIn) -> sc.OperationOut:
    data = body.model_dump(exclude={"default_agreement_id"})
    if body.default_agreement_id:
        data["default_agreement_id"] = LaborAgreementRepo(db, p.org_id).get(
            body.default_agreement_id).id
    obj = OperationRepo(db, p.org_id).add(**data)
    commit(db, "operação")
    return sc.OperationOut.model_validate(obj)


def patch_operation(db: Session, p: Principal, oid: uuid.UUID,
                    body: sc.OperationPatch) -> sc.OperationOut:
    repo = OperationRepo(db, p.org_id)
    obj = repo.update(repo.get(oid), body.model_dump(exclude_unset=True))
    commit(db, "operação")
    return sc.OperationOut.model_validate(obj)


# ---- postos -----------------------------------------------------------------------------
def _role_id(db: Session, p: Principal, code: str | None) -> int | None:
    if code is None:
        return None
    r = RoleRepo(db, p.org_id).by_code(code)
    if r is None:
        raise validation(f"cargo inexistente: {code}",
                         [{"field": "required_role_code", "code": "not_found", "message": code}])
    return r.id


def position_out(db: Session, p: Principal, obj: Position) -> sc.PositionOut:
    op = OperationRepo(db, p.org_id).get_by_id(obj.operation_id)
    role = RoleRepo(db, p.org_id).get_by_id(obj.required_role_id) if obj.required_role_id \
        else None
    return sc.PositionOut(id=obj.public_id, operation_id=op.public_id, name=obj.name,
                          cbo_code=obj.cbo_code, monthly_hours=obj.monthly_hours,
                          is_mandatory_presence=obj.is_mandatory_presence,
                          required_role_code=role.code if role else None)


def create_position(db: Session, p: Principal, oid: uuid.UUID,
                    body: sc.PositionIn) -> sc.PositionOut:
    op = OperationRepo(db, p.org_id).get(oid)
    data = body.model_dump(exclude={"required_role_code"})
    obj = PositionRepo(db, p.org_id).add(operation_id=op.id,
                                         required_role_id=_role_id(db, p, body.required_role_code),
                                         **data)
    commit(db, "posto")
    return position_out(db, p, obj)


def patch_position(db: Session, p: Principal, pid: uuid.UUID,
                   body: sc.PositionPatch) -> sc.PositionOut:
    repo = PositionRepo(db, p.org_id)
    vals = body.model_dump(exclude_unset=True)
    if "required_role_code" in vals:
        vals["required_role_id"] = _role_id(db, p, vals.pop("required_role_code"))
    obj = repo.update(repo.get(pid), vals)
    commit(db, "posto")
    return position_out(db, p, obj)


# ---- curvas -------------------------------------------------------------------------------
def curve_out(db: Session, p: Principal, c: DemandCurve) -> sc.DemandCurveOut:
    pos = PositionRepo(db, p.org_id).get_by_id(c.position_id)
    n = len(DemandCurveRepo(db, p.org_id).slots(c.id))
    return sc.DemandCurveOut(id=c.public_id, position_id=pos.public_id, name=c.name,
                             mode=c.mode, granularity=c.granularity, source=c.source,
                             checksum=c.checksum, version=c.version, slot_count=n)


def _write_slots(db: Session, p: Principal, c: DemandCurve, values: list[Decimal],
                 source: str) -> sc.SlotsSummary:
    rows = demand_service.slot_rows(values)
    DemandCurveRepo(db, p.org_id).replace_slots(c.id, rows)
    c.checksum = demand_service.checksum(values)
    c.source = source
    c.version += 1
    commit(db, "curva")
    return sc.SlotsSummary(checksum=c.checksum, slot_count=len(rows),
                           night_slots=sum(1 for r in rows if r["is_night"]))


def create_curve(db: Session, p: Principal, pid: uuid.UUID,
                 body: sc.DemandCurveIn) -> sc.DemandCurveOut:
    pos = PositionRepo(db, p.org_id).get(pid)
    c = DemandCurveRepo(db, p.org_id).add(position_id=pos.id, name=body.name, mode=body.mode,
                                          granularity=body.granularity, created_by=p.user.id)
    if body.values is not None:
        _write_slots(db, p, c, list(body.values), "manual")
        c.version = 1
    commit(db, "curva")
    return curve_out(db, p, c)


def put_slots(db: Session, p: Principal, cid: uuid.UUID, body: sc.SlotsPut) -> sc.SlotsSummary:
    c = DemandCurveRepo(db, p.org_id).get(cid)
    if body.values is not None:
        values = list(body.values)
    else:
        assert body.slots is not None
        idx = sorted(s.slot_index for s in body.slots)
        if idx != list(range(168)):
            raise validation("slots devem cobrir 0..167 exatamente uma vez",
                             [{"field": "slots", "code": "count", "message": "168 índices"}])
        values = [s.required_value for s in sorted(body.slots, key=lambda s: s.slot_index)]
    return _write_slots(db, p, c, values, "manual")


def get_slots(db: Session, p: Principal, cid: uuid.UUID) -> sc.SlotsOut:
    c = DemandCurveRepo(db, p.org_id).get(cid)
    slots = DemandCurveRepo(db, p.org_id).slots(c.id)
    return sc.SlotsOut(granularity=c.granularity, checksum=c.checksum,
                       slots=[sc.SlotOut.model_validate(s) for s in slots])


def import_slots(db: Session, p: Principal, cid: uuid.UUID, filename: str,
                 content: bytes) -> sc.SlotsSummary:
    c = DemandCurveRepo(db, p.org_id).get(cid)
    values, fonte = demand_service.parse_upload(filename, content)
    return _write_slots(db, p, c, values, fonte)


# ---- shrinkage ----------------------------------------------------------------------------
def create_shrinkage(db: Session, p: Principal, body: sc.ShrinkageIn) -> sc.ShrinkageOut:
    op_id = OperationRepo(db, p.org_id).get(body.operation_id).id if body.operation_id else None
    obj = ShrinkageRepo(db, p.org_id).add(
        name=body.name, operation_id=op_id, day_pct=body.day_pct, night_pct=body.night_pct,
        breakdown={k: str(v) for k, v in body.breakdown.items()})
    commit(db, "perfil")
    return sc.ShrinkageOut.model_validate(obj)


# ---- cargos --------------------------------------------------------------------------------
def create_role(db: Session, p: Principal, body: sc.RoleIn) -> sc.RoleOut:
    repo = RoleRepo(db, p.org_id)
    if repo.by_code(body.code):
        raise conflict("duplicate", f"cargo {body.code} já existe")
    obj = repo.add(**body.model_dump())
    commit(db, "cargo")
    return sc.RoleOut.model_validate(obj)


def patch_role(db: Session, p: Principal, rid: uuid.UUID, body: sc.RolePatch) -> sc.RoleOut:
    repo = RoleRepo(db, p.org_id)
    obj = repo.update(repo.get(rid), body.model_dump(exclude_unset=True))
    commit(db, "cargo")
    return sc.RoleOut.model_validate(obj)


def _roles_by_code(db: Session, p: Principal) -> dict[str, Any]:
    return {r.code: r for r in RoleRepo(db, p.org_id).find()}


def get_substitution(db: Session, p: Principal) -> list[sc.SubstitutionRuleOut]:
    by_id = {r.id: r.code for r in RoleRepo(db, p.org_id).find()}
    return [sc.SubstitutionRuleOut(from_role=by_id.get(r.from_role_id, "?"),
                                   to_role=by_id.get(r.to_role_id, "?"),
                                   coverage_factor=r.coverage_factor, priority=r.priority,
                                   counts_for_minimum=r.counts_for_minimum)
            for r in SubstitutionRepo(db, p.org_id).find()]


def put_substitution(db: Session, p: Principal, body: sc.SubstitutionRulesPut
                     ) -> tuple[list[sc.SubstitutionRuleOut], list[str]]:
    roles = _roles_by_code(db, p)
    rows, details, pares = [], [], set()
    for i, r in enumerate(body.rules):
        for campo in ("from_role", "to_role"):
            if getattr(r, campo) not in roles:
                details.append({"field": f"rules[{i}].{campo}", "code": "not_found",
                                "message": f"cargo inexistente: {getattr(r, campo)}"})
        if (r.from_role, r.to_role) in pares:
            details.append({"field": f"rules[{i}]", "code": "duplicate",
                            "message": "par repetido"})
        pares.add((r.from_role, r.to_role))
    if details:
        raise validation("matriz de substituição inválida", details, code="validation_failed")
    for r in body.rules:
        rows.append({"from_role_id": roles[r.from_role].id, "to_role_id": roles[r.to_role].id,
                     "coverage_factor": r.coverage_factor, "priority": r.priority,
                     "counts_for_minimum": r.counts_for_minimum})
    SubstitutionRepo(db, p.org_id).replace_all(rows)
    commit(db, "matriz")
    warnings = [f"ciclo {a}↔{b}" for a, b in sorted(pares) if (b, a) in pares and a < b]
    return get_substitution(db, p), warnings


def requirement_out(db: Session, p: Principal, r: RoleCoverageRequirement
                    ) -> sc.RoleRequirementOut:
    role = RoleRepo(db, p.org_id).get_by_id(r.role_id)
    return sc.RoleRequirementOut(id=r.public_id, kind=r.kind, role_code=role.code,
                                 min_count=r.min_count, accepts_substitute=r.accepts_substitute,
                                 shift_codes=r.shift_codes, weekdays=r.weekdays,
                                 severity=r.severity)


def create_requirement(db: Session, p: Principal, oid: uuid.UUID,
                       body: sc.RoleRequirementIn) -> sc.RoleRequirementOut:
    op = OperationRepo(db, p.org_id).get(oid)
    role_id = _role_id(db, p, body.role_code)
    pos_id = PositionRepo(db, p.org_id).get(body.position_id).id if body.position_id else None
    obj = RoleRequirementRepo(db, p.org_id).add(
        operation_id=op.id, position_id=pos_id, kind=body.kind, role_id=role_id,
        min_count=body.min_count, accepts_substitute=body.accepts_substitute,
        shift_codes=body.shift_codes, weekdays=body.weekdays, severity=body.severity)
    commit(db, "mínimo")
    return requirement_out(db, p, obj)


def list_requirements(db: Session, p: Principal, oid: uuid.UUID) -> list[sc.RoleRequirementOut]:
    op = OperationRepo(db, p.org_id).get(oid)
    return [requirement_out(db, p, r) for r in RoleRequirementRepo(db, p.org_id).find(
        RoleCoverageRequirement.operation_id == op.id)]


def delete_requirement(db: Session, p: Principal, oid: uuid.UUID, rid: uuid.UUID) -> None:
    op = OperationRepo(db, p.org_id).get(oid)
    repo = RoleRequirementRepo(db, p.org_id)
    obj = repo.get(rid)
    if obj.operation_id != op.id:
        raise AppError(404, "not_found", "mínimo por cargo não encontrado")
    repo.delete(obj)
    commit(db)


def get_team_constraints(db: Session, p: Principal, oid: uuid.UUID
                         ) -> list[sc.TeamConstraintOut]:
    op = OperationRepo(db, p.org_id).get(oid)
    tc = TeamConstraintRepo(db, p.org_id).for_operation(op.id)
    return [sc.TeamConstraintOut.model_validate(tc)] if tc else []


def put_team_constraints(db: Session, p: Principal, oid: uuid.UUID,
                         body: sc.TeamConstraintsPut) -> list[sc.TeamConstraintOut]:
    op = OperationRepo(db, p.org_id).get(oid)
    TeamConstraintRepo(db, p.org_id).replace_for_operation(
        op.id, [i.model_dump() for i in body.items])
    commit(db, "restrição")
    return get_team_constraints(db, p, oid)
