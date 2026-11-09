"""v3.7 — Subsetores, posições (postos de trabalho), pools e pessoas cadastradas."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from escalas.schemas.common import In

Code = Field(pattern=r"^[A-Za-z0-9_\-]{1,24}$")


class WorkstationDemand(In):
    mode: Literal["postos_fixos", "curva_168h"] = "postos_fixos"
    posts: int | None = Field(default=1, ge=0, le=500, description="postos fixos (todas as horas)")
    values: list[int] | None = Field(default=None, description="168 inteiros ≥ 0 (curva_168h)")

    @model_validator(mode="after")
    def _check(self) -> WorkstationDemand:
        if self.mode == "curva_168h":
            if self.values is None or len(self.values) != 168 or min(self.values) < 0:
                raise ValueError("curva_168h exige values com 168 inteiros ≥ 0")
        elif self.posts is None:
            raise ValueError("postos_fixos exige posts")
        return self

    def curve(self) -> list[int]:
        if self.mode == "curva_168h":
            assert self.values is not None
            return list(self.values)
        return [int(self.posts or 0)] * 168


class SubsectorIn(In):
    code: str = Code
    name: str = Field(min_length=1, max_length=200)
    sort_order: int = 0


class SubsectorPatch(In):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    sort_order: int | None = None


class WorkstationIn(In):
    code: str = Code
    name: str = Field(min_length=1, max_length=200)
    required_role_code: str | None = None
    demand: WorkstationDemand = Field(default_factory=lambda: WorkstationDemand())
    sort_order: int = 0


class WorkstationPatch(In):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    required_role_code: str | None = None
    demand: WorkstationDemand | None = None


class WorkstationOut(BaseModel):
    id: uuid.UUID
    subsector_id: uuid.UUID
    subsector_code: str
    code: str
    name: str
    required_role_code: str | None
    demand_mode: str
    demand_values: list[int]
    peak: int


class SubsectorOut(BaseModel):
    id: uuid.UUID
    operation_id: uuid.UUID
    code: str
    name: str
    sort_order: int
    workstations: list[WorkstationOut] = Field(default_factory=list)


class PoolIn(In):
    code: str = Code
    name: str = Field(min_length=1, max_length=200)
    subsector_codes: list[str] = Field(min_length=2, max_length=50)
    mode: Literal["total", "restrito"] = "total"
    allowed_role_codes: list[str] = Field(default_factory=list,
                                          description="modo restrito: cargos intercambiáveis")
    max_borrowed_hours_week: int | None = Field(default=None, ge=0, le=168)
    prefer_home: bool = True


class PoolPatch(In):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    subsector_codes: list[str] | None = Field(default=None, min_length=2, max_length=50)
    mode: Literal["total", "restrito"] | None = None
    allowed_role_codes: list[str] | None = None
    max_borrowed_hours_week: int | None = Field(default=None, ge=0, le=168)
    prefer_home: bool | None = None


class PoolOut(BaseModel):
    id: uuid.UUID
    operation_id: uuid.UUID
    code: str
    name: str
    subsector_codes: list[str]
    mode: str
    allowed_role_codes: list[str]
    max_borrowed_hours_week: int | None
    prefer_home: bool


RESTRICTIONS = ("nao_noturno", "nao_fim_de_semana", "nao_12h", "nao_hora_extra")
Restriction = Literal["nao_noturno", "nao_fim_de_semana", "nao_12h", "nao_hora_extra"]


class EmployeeIn(In):
    """v3.8: cadastro completo (matrícula, habilidades, admissão, jornada, restrições, pools)."""

    name: str = Field(min_length=1, max_length=200)
    registration: str | None = Field(default=None, max_length=40, description="matrícula")
    team_code: str | None = Field(default=None, pattern=r"^[A-Z]{1,3}$")
    role_code: str | None = None
    home_subsector_code: str | None = None
    default_workstation_code: str | None = None
    skills: list[str] = Field(default_factory=list, max_length=50,
                              description="certificações/habilidades")
    hire_date: date | None = None
    contract_weekly_hours: Decimal | None = Field(default=None, ge=0, le=60)
    restrictions: list[Restriction] = Field(default_factory=list)
    pool_codes: list[str] = Field(default_factory=list, description="pools que pode cobrir")
    active: bool = True


class EmployeePatch(In):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    registration: str | None = Field(default=None, max_length=40)
    team_code: str | None = Field(default=None, pattern=r"^[A-Z]{1,3}$")
    role_code: str | None = None
    home_subsector_code: str | None = None
    default_workstation_code: str | None = None
    skills: list[str] | None = Field(default=None, max_length=50)
    hire_date: date | None = None
    contract_weekly_hours: Decimal | None = Field(default=None, ge=0, le=60)
    restrictions: list[Restriction] | None = None
    pool_codes: list[str] | None = None
    active: bool | None = None


class EmployeeOut(BaseModel):
    id: uuid.UUID
    operation_id: uuid.UUID
    name: str
    registration: str | None = None
    team_code: str | None
    role_code: str | None
    home_subsector_code: str | None
    default_workstation_code: str | None
    skills: list[str] = Field(default_factory=list)
    hire_date: date | None = None
    contract_weekly_hours: Decimal | None = None
    restrictions: list[str] = Field(default_factory=list)
    pool_codes: list[str] = Field(default_factory=list)
    active: bool = True


class ImportError_(BaseModel):
    row: int
    field: str | None = None
    message: str


class EmployeeImportOut(BaseModel):
    dry_run: bool
    total_rows: int
    created: int
    updated: int
    errors: list[ImportError_]
    employees: list[EmployeeOut] = Field(default_factory=list)


class TeamAssignIn(In):
    scenario_id: uuid.UUID
    mode: Literal["auto"] = "auto"
    apply: bool = Field(default=False, description="grava a turma em cada colaborador")
    only_unassigned: bool = Field(default=False,
                                  description="mantém quem já tem turma; aloca só os demais")


class TeamSlotOut(BaseModel):
    team: str
    size: int
    works_night: bool
    works_weekend: bool
    roles: dict[str, int] = Field(default_factory=dict)
    assigned: list[uuid.UUID] = Field(default_factory=list)
    missing: int = 0


class TeamAssignOut(BaseModel):
    applied: bool
    teams: list[TeamSlotOut]
    assignments: dict[str, str] = Field(default_factory=dict,
                                        description="employee_id → turma")
    unassigned: list[uuid.UUID] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class StructureOut(BaseModel):
    operation_id: uuid.UUID
    subsectors: list[SubsectorOut]
    pools: list[PoolOut]
    employees: int
