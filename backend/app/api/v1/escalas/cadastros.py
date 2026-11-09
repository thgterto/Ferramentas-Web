"""Acordos, operações, postos, curvas de demanda (+ import 168 h) e shrinkage."""

from __future__ import annotations

import uuid
from enum import Enum

from fastapi import APIRouter, Response, UploadFile

from app.api.deps import DB, Current, Writer
from app.api.v1.escalas._common import ERRORS, PageQ, PerPageQ, created
from app.db.models import DemandCurve, Position
from app.repositories.cadastros import (
    DemandCurveRepo,
    LaborAgreementRepo,
    OperationRepo,
    PositionRepo,
    ShrinkageRepo,
)
from app.schemas import cadastros as sc
from app.schemas.common import Envelope, Page, page_of
from app.services.escalas import cadastros_service as svc

router = APIRouter(responses=ERRORS)
T_AG: list[str | Enum] = ["labor-agreements"]
T_OP: list[str | Enum] = ["operations"]
T_DC: list[str | Enum] = ["demand"]
T_SH: list[str | Enum] = ["shrinkage"]


# ---- acordos -----------------------------------------------------------------------------
@router.get("/labor-agreements", response_model=Page[sc.LaborAgreementOut], tags=T_AG)
def list_agreements(p: Current, db: DB, page: PageQ = 1, per_page: PerPageQ = 50) -> object:
    rows, total = LaborAgreementRepo(db, p.org_id).list_page(page, per_page)
    return page_of([sc.LaborAgreementOut.model_validate(r) for r in rows], page, per_page,
                   total, "/api/v1/escalas/labor-agreements")


@router.post("/labor-agreements", response_model=Envelope[sc.LaborAgreementOut], status_code=201,
             tags=T_AG)
def create_agreement(body: sc.LaborAgreementIn, p: Writer, db: DB, response: Response) -> object:
    out = svc.create_agreement(db, p, body)
    created(response, f"/labor-agreements/{out.id}")
    return {"data": out}


@router.get("/labor-agreements/{agreement_id}", response_model=Envelope[sc.LaborAgreementOut],
            tags=T_AG)
def get_agreement(agreement_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": sc.LaborAgreementOut.model_validate(
        LaborAgreementRepo(db, p.org_id).get(agreement_id))}


@router.patch("/labor-agreements/{agreement_id}", response_model=Envelope[sc.LaborAgreementOut],
              tags=T_AG)
def patch_agreement(agreement_id: uuid.UUID, body: sc.LaborAgreementPatch, p: Writer,
                    db: DB) -> object:
    return {"data": svc.patch_agreement(db, p, agreement_id, body)}


@router.delete("/labor-agreements/{agreement_id}", status_code=204, tags=T_AG)
def delete_agreement(agreement_id: uuid.UUID, p: Writer, db: DB) -> Response:
    repo = LaborAgreementRepo(db, p.org_id)
    repo.delete(repo.get(agreement_id))
    svc.commit(db)
    return Response(status_code=204)


# ---- operações ---------------------------------------------------------------------------
@router.get("/operations", response_model=Page[sc.OperationOut], tags=T_OP)
def list_operations(p: Current, db: DB, page: PageQ = 1, per_page: PerPageQ = 50) -> object:
    rows, total = OperationRepo(db, p.org_id).list_page(page, per_page)
    return page_of([sc.OperationOut.model_validate(r) for r in rows], page, per_page, total,
                   "/api/v1/escalas/operations")


@router.post("/operations", response_model=Envelope[sc.OperationOut], status_code=201,
             tags=T_OP)
def create_operation(body: sc.OperationIn, p: Writer, db: DB, response: Response) -> object:
    out = svc.create_operation(db, p, body)
    created(response, f"/operations/{out.id}")
    return {"data": out}


@router.get("/operations/{operation_id}", response_model=Envelope[sc.OperationOut], tags=T_OP)
def get_operation(operation_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": sc.OperationOut.model_validate(OperationRepo(db, p.org_id).get(operation_id))}


@router.patch("/operations/{operation_id}", response_model=Envelope[sc.OperationOut], tags=T_OP)
def patch_operation(operation_id: uuid.UUID, body: sc.OperationPatch, p: Writer,
                    db: DB) -> object:
    return {"data": svc.patch_operation(db, p, operation_id, body)}


@router.delete("/operations/{operation_id}", status_code=204, tags=T_OP)
def delete_operation(operation_id: uuid.UUID, p: Writer, db: DB) -> Response:
    repo = OperationRepo(db, p.org_id)
    repo.delete(repo.get(operation_id))
    svc.commit(db)
    return Response(status_code=204)


# ---- postos --------------------------------------------------------------------------------
@router.get("/operations/{operation_id}/positions", response_model=Page[sc.PositionOut],
            tags=T_OP)
def list_positions(operation_id: uuid.UUID, p: Current, db: DB, page: PageQ = 1,
                   per_page: PerPageQ = 50) -> object:
    op = OperationRepo(db, p.org_id).get(operation_id)
    rows, total = PositionRepo(db, p.org_id).list_page(page, per_page,
                                                       Position.operation_id == op.id)
    return page_of([svc.position_out(db, p, r) for r in rows], page, per_page, total,
                   f"/api/v1/escalas/operations/{operation_id}/positions")


@router.post("/operations/{operation_id}/positions", response_model=Envelope[sc.PositionOut],
             status_code=201, tags=T_OP)
def create_position(operation_id: uuid.UUID, body: sc.PositionIn, p: Writer, db: DB,
                    response: Response) -> object:
    out = svc.create_position(db, p, operation_id, body)
    created(response, f"/positions/{out.id}")
    return {"data": out}


@router.get("/positions/{position_id}", response_model=Envelope[sc.PositionOut], tags=T_OP)
def get_position(position_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": svc.position_out(db, p, PositionRepo(db, p.org_id).get(position_id))}


@router.patch("/positions/{position_id}", response_model=Envelope[sc.PositionOut], tags=T_OP)
def patch_position(position_id: uuid.UUID, body: sc.PositionPatch, p: Writer,
                   db: DB) -> object:
    return {"data": svc.patch_position(db, p, position_id, body)}


@router.delete("/positions/{position_id}", status_code=204, tags=T_OP)
def delete_position(position_id: uuid.UUID, p: Writer, db: DB) -> Response:
    repo = PositionRepo(db, p.org_id)
    repo.delete(repo.get(position_id))
    svc.commit(db)
    return Response(status_code=204)


# ---- curvas de demanda --------------------------------------------------------------------
@router.get("/positions/{position_id}/demand-curves", response_model=Page[sc.DemandCurveOut],
            tags=T_DC)
def list_curves(position_id: uuid.UUID, p: Current, db: DB, page: PageQ = 1,
                per_page: PerPageQ = 50) -> object:
    pos = PositionRepo(db, p.org_id).get(position_id)
    rows, total = DemandCurveRepo(db, p.org_id).list_page(page, per_page,
                                                          DemandCurve.position_id == pos.id)
    return page_of([svc.curve_out(db, p, r) for r in rows], page, per_page, total,
                   f"/api/v1/escalas/positions/{position_id}/demand-curves")


@router.post("/positions/{position_id}/demand-curves", response_model=Envelope[sc.DemandCurveOut],
             status_code=201, tags=T_DC)
def create_curve(position_id: uuid.UUID, body: sc.DemandCurveIn, p: Writer, db: DB,
                 response: Response) -> object:
    out = svc.create_curve(db, p, position_id, body)
    created(response, f"/demand-curves/{out.id}")
    return {"data": out}


@router.get("/demand-curves/{curve_id}", response_model=Envelope[sc.DemandCurveOut], tags=T_DC)
def get_curve(curve_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": svc.curve_out(db, p, DemandCurveRepo(db, p.org_id).get(curve_id))}


@router.delete("/demand-curves/{curve_id}", status_code=204, tags=T_DC)
def delete_curve(curve_id: uuid.UUID, p: Writer, db: DB) -> Response:
    repo = DemandCurveRepo(db, p.org_id)
    repo.delete(repo.get(curve_id))
    svc.commit(db)
    return Response(status_code=204)


@router.get("/demand-curves/{curve_id}/slots", response_model=Envelope[sc.SlotsOut], tags=T_DC)
def get_slots(curve_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": svc.get_slots(db, p, curve_id)}


@router.put("/demand-curves/{curve_id}/slots", response_model=Envelope[sc.SlotsSummary],
            tags=T_DC)
def put_slots(curve_id: uuid.UUID, body: sc.SlotsPut, p: Writer, db: DB) -> object:
    """Substitui os 168 slots (``slots`` ou ``values``)."""
    return {"data": svc.put_slots(db, p, curve_id, body)}


@router.post("/demand-curves/{curve_id}/slots:import", response_model=Envelope[sc.SlotsSummary],
             tags=T_DC)
async def import_slots(curve_id: uuid.UUID, file: UploadFile, p: Writer, db: DB) -> object:
    """Upload CSV/XLSX ``dia(1-7),hora(0-23),demanda`` — 168 linhas, tudo-ou-nada."""
    content = await file.read()
    return {"data": svc.import_slots(db, p, curve_id, file.filename or "", content)}


# ---- shrinkage -------------------------------------------------------------------------------
@router.get("/shrinkage-profiles", response_model=Page[sc.ShrinkageOut], tags=T_SH)
def list_shrinkage(p: Current, db: DB, page: PageQ = 1, per_page: PerPageQ = 50) -> object:
    rows, total = ShrinkageRepo(db, p.org_id).list_page(page, per_page)
    return page_of([sc.ShrinkageOut.model_validate(r) for r in rows], page, per_page, total,
                   "/api/v1/escalas/shrinkage-profiles")


@router.post("/shrinkage-profiles", response_model=Envelope[sc.ShrinkageOut], status_code=201,
             tags=T_SH)
def create_shrinkage(body: sc.ShrinkageIn, p: Writer, db: DB, response: Response) -> object:
    out = svc.create_shrinkage(db, p, body)
    created(response, f"/shrinkage-profiles/{out.id}")
    return {"data": out}


@router.get("/shrinkage-profiles/{profile_id}", response_model=Envelope[sc.ShrinkageOut],
            tags=T_SH)
def get_shrinkage(profile_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": sc.ShrinkageOut.model_validate(ShrinkageRepo(db, p.org_id).get(profile_id))}


@router.delete("/shrinkage-profiles/{profile_id}", status_code=204, tags=T_SH)
def delete_shrinkage(profile_id: uuid.UUID, p: Writer, db: DB) -> Response:
    repo = ShrinkageRepo(db, p.org_id)
    repo.delete(repo.get(profile_id))
    svc.commit(db)
    return Response(status_code=204)
