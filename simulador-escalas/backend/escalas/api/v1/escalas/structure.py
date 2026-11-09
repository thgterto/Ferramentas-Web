"""v3.7 — Subsetores, posições (postos de trabalho), pools de intercambialidade e pessoas."""

from __future__ import annotations

import uuid
from enum import Enum
from typing import Literal

from fastapi import APIRouter, Response, UploadFile

from escalas.api.deps import DB, Current, Writer
from escalas.api.v1.escalas._common import ERRORS, created
from escalas.schemas import structure as st
from escalas.schemas.common import Envelope
from escalas.services.escalas import employee_service as emp
from escalas.services.escalas import structure_service as svc

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


# ---- v3.8: colaboradores ------------------------------------------------------------------
TE: list[str | Enum] = ["employees"]


@router.get("/operations/{operation_id}/employees",
            response_model=Envelope[list[st.EmployeeOut]], tags=TE)
def list_employees(operation_id: uuid.UUID, p: Current, db: DB, q: str | None = None,
                   subsector: str | None = None, workstation: str | None = None,
                   role: str | None = None, team: str | None = None,
                   status: Literal["ativo", "inativo"] | None = None) -> object:
    """Busca por nome/matrícula/habilidade e filtros (subsetor, posição, cargo, turma, status;
    ``team=-`` = sem turma)."""
    return {"data": emp.list_employees(db, p, operation_id, q, subsector, workstation, role,
                                       team, status)}


@router.post("/operations/{operation_id}/employees", response_model=Envelope[st.EmployeeOut],
             status_code=201, tags=TE)
def create_employee(operation_id: uuid.UUID, body: st.EmployeeIn, p: Writer, db: DB,
                    response: Response) -> object:
    out = emp.create_employee(db, p, operation_id, body)
    created(response, f"/employees/{out.id}")
    return {"data": out}


@router.post("/operations/{operation_id}/employees:import",
             response_model=Envelope[st.EmployeeImportOut], tags=TE)
async def import_employees(operation_id: uuid.UUID, file: UploadFile, p: Writer, db: DB,
                           dry_run: bool = False) -> object:
    """CSV (``;`` ou ``,``) ou XLSX com cabeçalho: matricula, nome, cargo, subsetor, posicao,
    turma, admissao, jornada_semanal_h, habilidades, restricoes, pools, status. Valida tudo;
    grava só sem erros (tudo-ou-nada). Matrícula existente = atualização."""
    content = await file.read()
    return {"data": emp.import_employees(db, p, operation_id, file.filename or "", content,
                                         dry_run)}


@router.get("/operations/{operation_id}/employees:export", tags=TE,
            responses={200: {"content": {"text/csv": {}, "application/vnd.openxmlformats-"
                                         "officedocument.spreadsheetml.sheet": {}}}})
def export_employees(operation_id: uuid.UUID, p: Current, db: DB,
                     format: Literal["csv", "xlsx"] = "csv") -> Response:
    data, name, media = emp.export_employees(db, p, operation_id, format)
    return Response(content=data, media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@router.post("/operations/{operation_id}/employees:assign-teams",
             response_model=Envelope[st.TeamAssignOut], tags=TE)
def assign_teams(operation_id: uuid.UUID, body: st.TeamAssignIn, p: Writer, db: DB) -> object:
    """Alocação automática às turmas do cenário (cargo + restrições); ``apply`` grava."""
    return {"data": emp.auto_assign(db, p, operation_id, body)}


@router.get("/employees/{employee_id}", response_model=Envelope[st.EmployeeOut], tags=TE)
def get_employee(employee_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": emp.get_employee(db, p, employee_id)}


@router.patch("/employees/{employee_id}", response_model=Envelope[st.EmployeeOut], tags=TE)
def patch_employee(employee_id: uuid.UUID, body: st.EmployeePatch, p: Writer, db: DB) -> object:
    """Editar, desativar (``active: false``) ou trocar de turma (alocação manual)."""
    return {"data": emp.patch_employee(db, p, employee_id, body)}


@router.delete("/employees/{employee_id}", status_code=204, tags=TE)
def delete_employee(employee_id: uuid.UUID, p: Writer, db: DB) -> Response:
    emp.delete_employee(db, p, employee_id)
    return Response(status_code=204)
