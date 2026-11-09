"""v3.7 — Subsetores, posições (postos de trabalho), pools de intercambialidade e pessoas."""

from __future__ import annotations

import uuid
from enum import Enum

from fastapi import APIRouter, Response

from app.api.deps import DB, Current, Writer
from app.api.v1.escalas._common import ERRORS, created
from app.schemas import structure as st
from app.schemas.common import Envelope
from app.services.escalas import structure_service as svc

router = APIRouter(responses=ERRORS)
T: list[str | Enum] = ["structure"]


@router.get("/operations/{operation_id}/structure", response_model=Envelope[st.StructureOut],
            tags=T)
def get_structure(operation_id: uuid.UUID, p: Current, db: DB) -> object:
    """Árvore Operação → Subsetores → Posições + pools (uma chamada para o wizard/visões)."""
    return {"data": svc.structure(db, p, operation_id)}


@router.get("/operations/{operation_id}/subsectors",
            response_model=Envelope[list[st.SubsectorOut]], tags=T)
def list_subsectors(operation_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": svc.list_subsectors(db, p, operation_id)}


@router.post("/operations/{operation_id}/subsectors", response_model=Envelope[st.SubsectorOut],
             status_code=201, tags=T)
def create_subsector(operation_id: uuid.UUID, body: st.SubsectorIn, p: Writer, db: DB,
                     response: Response) -> object:
    out = svc.create_subsector(db, p, operation_id, body)
    created(response, f"/subsectors/{out.id}")
    return {"data": out}


@router.patch("/subsectors/{subsector_id}", response_model=Envelope[st.SubsectorOut], tags=T)
def patch_subsector(subsector_id: uuid.UUID, body: st.SubsectorPatch, p: Writer,
                    db: DB) -> object:
    return {"data": svc.patch_subsector(db, p, subsector_id, body)}


@router.delete("/subsectors/{subsector_id}", status_code=204, tags=T)
def delete_subsector(subsector_id: uuid.UUID, p: Writer, db: DB) -> Response:
    svc.delete_subsector(db, p, subsector_id)
    return Response(status_code=204)


@router.post("/subsectors/{subsector_id}/workstations",
             response_model=Envelope[st.WorkstationOut], status_code=201, tags=T)
def create_workstation(subsector_id: uuid.UUID, body: st.WorkstationIn, p: Writer, db: DB,
                       response: Response) -> object:
    out = svc.create_workstation(db, p, subsector_id, body)
    created(response, f"/workstations/{out.id}")
    return {"data": out}


@router.patch("/workstations/{workstation_id}", response_model=Envelope[st.WorkstationOut],
              tags=T)
def patch_workstation(workstation_id: uuid.UUID, body: st.WorkstationPatch, p: Writer,
                      db: DB) -> object:
    return {"data": svc.patch_workstation(db, p, workstation_id, body)}


@router.delete("/workstations/{workstation_id}", status_code=204, tags=T)
def delete_workstation(workstation_id: uuid.UUID, p: Writer, db: DB) -> Response:
    svc.delete_workstation(db, p, workstation_id)
    return Response(status_code=204)


@router.get("/operations/{operation_id}/subsector-pools",
            response_model=Envelope[list[st.PoolOut]], tags=T)
def list_pools(operation_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": svc.list_pools(db, p, operation_id)}


@router.post("/operations/{operation_id}/subsector-pools", response_model=Envelope[st.PoolOut],
             status_code=201, tags=T)
def create_pool(operation_id: uuid.UUID, body: st.PoolIn, p: Writer, db: DB,
                response: Response) -> object:
    """Pool = subsetores cujos funcionários são intercambiáveis (total ou por cargo)."""
    out = svc.create_pool(db, p, operation_id, body)
    created(response, f"/subsector-pools/{out.id}")
    return {"data": out}


@router.patch("/subsector-pools/{pool_id}", response_model=Envelope[st.PoolOut], tags=T)
def patch_pool(pool_id: uuid.UUID, body: st.PoolPatch, p: Writer, db: DB) -> object:
    return {"data": svc.patch_pool(db, p, pool_id, body)}


@router.delete("/subsector-pools/{pool_id}", status_code=204, tags=T)
def delete_pool(pool_id: uuid.UUID, p: Writer, db: DB) -> Response:
    svc.delete_pool(db, p, pool_id)
    return Response(status_code=204)


@router.get("/operations/{operation_id}/employees",
            response_model=Envelope[list[st.EmployeeOut]], tags=T)
def list_employees(operation_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": svc.list_employees(db, p, operation_id)}


@router.post("/operations/{operation_id}/employees", response_model=Envelope[st.EmployeeOut],
             status_code=201, tags=T)
def create_employee(operation_id: uuid.UUID, body: st.EmployeeIn, p: Writer, db: DB,
                    response: Response) -> object:
    out = svc.create_employee(db, p, operation_id, body)
    created(response, f"/employees/{out.id}")
    return {"data": out}


@router.delete("/employees/{employee_id}", status_code=204, tags=T)
def delete_employee(employee_id: uuid.UUID, p: Writer, db: DB) -> Response:
    svc.delete_employee(db, p, employee_id)
    return Response(status_code=204)
