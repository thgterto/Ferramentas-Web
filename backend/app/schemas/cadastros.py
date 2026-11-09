"""Schemas dos cadastros MVP (acordos, operações, postos, curvas, shrinkage, cargos, K)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.schemas.common import Dec6, In, Schema

Sector = Literal["saude", "logistica", "industria", "varejo", "ti_noc", "contact_center",
                 "saneamento", "outro"]


# ---- acordos ---------------------------------------------------------------------
class LaborAgreementIn(In):
    name: str = Field(min_length=2, max_length=200)
    kind: Literal["CLT_PADRAO", "CCT", "ACT"]
    union_name: str | None = None
    registration_number: str | None = None
    valid_from: date
    valid_to: date | None = None
    night_premium_pct: Dec6 = Decimal("0.2")
    overtime_pct: Dec6 = Decimal("0.5")
    overtime_sunday_pct: Dec6 = Decimal("1")
    hazard_pct: Dec6 = Decimal("0")
    unhealthy_pct: Dec6 = Decimal("0")
    social_charges_pct: Dec6 = Decimal("0.68")
    weekly_hours_limit: Dec6 = Decimal("44")
    allows_8h_rotating: bool = False
    allows_12x36: bool = True
    apply_sumula_60: bool = True
    min_interjornada_hours: Dec6 = Field(Decimal("11"), ge=11)
    min_weekly_rest_hours: Dec6 = Decimal("35")
    sunday_rule_basis: Literal["lei_10101_comercio", "lei_605_1949", "portaria_mte",
                               "cct_especifica"] = "lei_605_1949"
    sunday_off_max_interval_weeks: int = Field(7, ge=1, le=12)
    holiday_calendar: str = "BR-NACIONAL"

    @model_validator(mode="after")
    def _vigencia(self) -> LaborAgreementIn:
        if self.valid_to and self.valid_to < self.valid_from:
            raise ValueError("valid_to < valid_from")
        if not Decimal("0.2") <= self.night_premium_pct <= 1:
            raise ValueError("night_premium_pct deve estar entre 0.2 e 1")
        return self


class LaborAgreementPatch(In):
    name: str | None = Field(None, min_length=2, max_length=200)
    union_name: str | None = None
    valid_to: date | None = None
    allows_8h_rotating: bool | None = None
    allows_12x36: bool | None = None


class LaborAgreementOut(Schema):
    id: uuid.UUID = Field(validation_alias="public_id")
    name: str
    kind: str
    union_name: str | None
    valid_from: date
    valid_to: date | None
    night_premium_pct: Dec6
    night_hour_factor: Dec6
    overtime_pct: Dec6
    weekly_hours_limit: Dec6
    min_interjornada_hours: Dec6
    min_weekly_rest_hours: Dec6
    allows_8h_rotating: bool
    allows_12x36: bool
    sunday_rule_basis: str
    holiday_calendar: str
    rules_version: int
    created_at: datetime


# ---- operações / postos ----------------------------------------------------------------
class OperationIn(In):
    name: str = Field(min_length=2, max_length=200)
    sector: Sector = "outro"
    is_24x7: bool = True
    timezone: str = "America/Sao_Paulo"
    city_ibge_code: str | None = Field(None, pattern=r"^\d{7}$")
    default_agreement_id: uuid.UUID | None = None


class OperationPatch(In):
    name: str | None = Field(None, min_length=2, max_length=200)
    sector: Sector | None = None
    is_24x7: bool | None = None


class OperationOut(Schema):
    id: uuid.UUID = Field(validation_alias="public_id")
    name: str
    sector: str
    is_24x7: bool
    timezone: str
    created_at: datetime


class PositionIn(In):
    name: str = Field(min_length=2, max_length=200)
    cbo_code: str | None = Field(None, pattern=r"^\d{6}$")
    monthly_hours: Dec6 = Decimal("220")
    is_mandatory_presence: bool = False
    required_role_code: str | None = None


class PositionPatch(In):
    name: str | None = Field(None, min_length=2, max_length=200)
    is_mandatory_presence: bool | None = None
    required_role_code: str | None = None


class PositionOut(Schema):
    id: uuid.UUID
    operation_id: uuid.UUID
    name: str
    cbo_code: str | None
    monthly_hours: Dec6
    is_mandatory_presence: bool
    required_role_code: str | None


# ---- curvas -----------------------------------------------------------------------------
class DemandCurveIn(In):
    name: str = Field(min_length=1, max_length=200)
    mode: Literal["postos_fixos", "curva_168h"] = "curva_168h"
    granularity: Literal["60"] = "60"
    values: list[Dec6] | None = Field(None, description="168 valores opcionais")


class DemandCurveOut(Schema):
    id: uuid.UUID
    position_id: uuid.UUID
    name: str
    mode: str
    granularity: str
    source: str
    checksum: str | None
    version: int
    slot_count: int


class SlotIn(In):
    slot_index: int = Field(ge=0, le=167)
    required_value: Dec6 = Field(ge=0)


class SlotsPut(In):
    granularity: Literal["60"] = "60"
    slots: list[SlotIn] | None = None
    values: list[Dec6] | None = None

    @model_validator(mode="after")
    def _um(self) -> SlotsPut:
        if (self.slots is None) == (self.values is None):
            raise ValueError("informe 'slots' ou 'values'")
        return self


class SlotOut(Schema):
    slot_index: int
    weekday: int
    start_minute: int
    required_value: Dec6
    is_night: bool


class SlotsSummary(Schema):
    checksum: str
    slot_count: int
    night_slots: int


class SlotsOut(Schema):
    granularity: str
    checksum: str | None
    slots: list[SlotOut]


# ---- shrinkage ---------------------------------------------------------------------------
class ShrinkageIn(In):
    name: str = Field(min_length=1, max_length=200)
    operation_id: uuid.UUID | None = None
    day_pct: Dec6 = Field(ge=0, lt=Decimal("0.6"))
    night_pct: Dec6 = Field(ge=0, lt=Decimal("0.6"))
    breakdown: dict[str, Dec6] = Field(default_factory=dict)


class ShrinkageOut(Schema):
    id: uuid.UUID = Field(validation_alias="public_id")
    name: str
    day_pct: Dec6
    night_pct: Dec6
    breakdown: dict[str, str]


# ---- cargos / matriz / mínimos / K -------------------------------------------------------
Code = Field(pattern=r"^[A-Z0-9_]{2,24}$")


class RoleIn(In):
    code: str = Code
    name: str = Field(min_length=1, max_length=200)
    hierarchy_level: int = Field(1, ge=1, le=9)
    cbo_code: str | None = Field(None, pattern=r"^\d{6}$")


class RolePatch(In):
    name: str | None = Field(None, min_length=1, max_length=200)
    hierarchy_level: int | None = Field(None, ge=1, le=9)


class RoleOut(Schema):
    id: uuid.UUID = Field(validation_alias="public_id")
    code: str
    name: str
    hierarchy_level: int


class SubstitutionRuleIn(In):
    from_role: str
    to_role: str
    coverage_factor: Dec6 = Decimal("1")
    priority: int = Field(1, ge=1, le=9)
    counts_for_minimum: bool = False

    @field_validator("coverage_factor")
    @classmethod
    def _fator(cls, v: Decimal) -> Decimal:
        if not 0 < v <= 1:
            raise ValueError("coverage_factor deve estar em (0, 1]")
        if v != 1:
            raise ValueError("substituição parcial (fator < 1) é Fase 2")
        return v

    @model_validator(mode="after")
    def _diag(self) -> SubstitutionRuleIn:
        if self.from_role == self.to_role:
            raise ValueError("diagonal da matriz é implícita (from_role = to_role)")
        return self


class SubstitutionRulesPut(In):
    rules: list[SubstitutionRuleIn]


class SubstitutionRuleOut(Schema):
    from_role: str
    to_role: str
    coverage_factor: Dec6
    priority: int
    counts_for_minimum: bool


class RoleRequirementIn(In):
    kind: Literal["minimo"] = "minimo"
    role_code: str
    min_count: int = Field(ge=1)
    accepts_substitute: bool = False
    shift_codes: list[str] | None = None
    weekdays: list[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5, 6, 7])
    severity: Literal["info", "alerta", "erro"] = "erro"
    position_id: uuid.UUID | None = None


class RoleRequirementOut(Schema):
    id: uuid.UUID
    kind: str
    role_code: str
    min_count: int
    accepts_substitute: bool
    shift_codes: list[str] | None
    weekdays: list[int]
    severity: str


class TeamConstraintIn(In):
    scope: Literal["operacao"] = "operacao"
    mode: Literal["fixo"] = "fixo"
    k_min: int = Field(ge=1, le=12)
    k_max: int = Field(ge=1, le=12)
    team_size_min: int | None = Field(None, ge=0)
    team_size_max: int | None = Field(None, ge=1)
    allow_half_teams: bool = True
    source_note: str | None = None

    @model_validator(mode="after")
    def _fixo(self) -> TeamConstraintIn:
        if self.k_min != self.k_max:
            raise ValueError("modo fixo exige k_min = k_max (faixa/mínimo: Fase 2)")
        return self


class TeamConstraintsPut(In):
    items: list[TeamConstraintIn] = Field(max_length=1)


class TeamConstraintOut(Schema):
    scope: str
    mode: str
    k_min: int | None
    k_max: int | None
    team_size_min: int | None
    team_size_max: int | None
    allow_half_teams: bool
    source_note: str | None


