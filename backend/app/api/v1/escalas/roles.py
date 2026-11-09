"""Cargos, matriz de substituição, mínimos por cargo e K fixo (FR-32, FR-34–36)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Response

from app.api.deps import DB, Current, Writer
from app.api.v1.escalas._common import ERRORS, PageQ, PerPageQ, created
from app.repositories.cadastros import RoleRepo
from app.schemas import cadastros as sc
from app.schemas.common import Envelope, Page, page_of
from app.services.escalas import cadastros_service as svc

router = APIRouter(responses=ERRORS)


@router.get("/roles", response_model=Page[sc.RoleOut], tags=["roles"])
def list_roles(p: Current, db: DB, page: PageQ = 1, per_page: PerPageQ = 50) -> object:
    rows, total = RoleRepo(db, p.org_id).list_page(page, per_page)
    return page_of([sc.RoleOut.model_validate(r) for r in rows], page, per_page, total,
                   "/api/v1/escalas/roles")


@router.post("/roles", response_model=Envelope[sc.RoleOut], status_code=201, tags=["roles"])
def create_role(body: sc.RoleIn, p: Writer, db: DB, response: Response) -> object:
    out = svc.create_role(db, p, body)
    created(response, f"/roles/{out.id}")
    return {"data": out}


@router.get("/roles/{role_id}", response_model=Envelope[sc.RoleOut], tags=["roles"])
def get_role(role_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": sc.RoleOut.model_validate(RoleRepo(db, p.org_id).get(role_id))}


@router.patch("/roles/{role_id}", response_model=Envelope[sc.RoleOut], tags=["roles"])
def patch_role(role_id: uuid.UUID, body: sc.RolePatch, p: Writer, db: DB) -> object:
    return {"data": svc.patch_role(db, p, role_id, body)}


@router.delete("/roles/{role_id}", status_code=204, tags=["roles"])
def delete_role(role_id: uuid.UUID, p: Writer, db: DB) -> Response:
    repo = RoleRepo(db, p.org_id)
    repo.delete(repo.get(role_id))
    svc.commit(db)
    return Response(status_code=204)


@router.get("/substitution-rules", response_model=Envelope[list[sc.SubstitutionRuleOut]],
            tags=["roles"])
def get_substitution(p: Current, db: DB) -> object:
    return {"data": svc.get_substitution(db, p)}


@router.put("/substitution-rules", tags=["roles"],
            response_model=Envelope[list[sc.SubstitutionRuleOut]])
def put_substitution(body: sc.SubstitutionRulesPut, p: Writer, db: DB) -> object:
    """Substitui a matriz atomicamente ("A pode cobrir B"; diagonal implícita = 422)."""
    rows, warnings = svc.put_substitution(db, p, body)
    return {"data": rows, "meta": {"warnings": warnings}}


@router.get("/operations/{operation_id}/role-requirements", tags=["roles"],
            response_model=Envelope[list[sc.RoleRequirementOut]])
def list_requirements(operation_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": svc.list_requirements(db, p, operation_id)}


@router.post("/operations/{operation_id}/role-requirements", status_code=201, tags=["roles"],
             response_model=Envelope[sc.RoleRequirementOut])
def create_requirement(operation_id: uuid.UUID, body: sc.RoleRequirementIn, p: Writer, db: DB,
                       response: Response) -> object:
    out = svc.create_requirement(db, p, operation_id, body)
    created(response, f"/operations/{operation_id}/role-requirements/{out.id}")
    return {"data": out}


@router.delete("/operations/{operation_id}/role-requirements/{requirement_id}",
               status_code=204, tags=["roles"])
def delete_requirement(operation_id: uuid.UUID, requirement_id: uuid.UUID, p: Writer,
                       db: DB) -> Response:
    svc.delete_requirement(db, p, operation_id, requirement_id)
    return Response(status_code=204)


@router.get("/operations/{operation_id}/team-constraints", tags=["team-constraints"],
            response_model=Envelope[list[sc.TeamConstraintOut]])
def get_team_constraints(operation_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": svc.get_team_constraints(db, p, operation_id)}


@router.put("/operations/{operation_id}/team-constraints", tags=["team-constraints"],
            response_model=Envelope[list[sc.TeamConstraintOut]])
def put_team_constraints(operation_id: uuid.UUID, body: sc.TeamConstraintsPut, p: Writer,
                         db: DB) -> object:
    """K fixo por operação (MVP); ``items: []`` remove a restrição."""
    return {"data": svc.put_team_constraints(db, p, operation_id, body)}
