"""Construtor de padrões (FR-29–FR-33, v3.5): turnos livres, camadas, K livre, templates."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import Dec6, In

HHMM = r"^([01]\d|2[0-3]):[0-5]\d$"
SHIFT_CODE = r"^[A-Z][A-Z0-9_]{0,7}$"
Weekday = Annotated[int, Field(ge=0, le=6)]


class ShiftIn(In):
    code: str = Field(pattern=SHIFT_CODE, description="Sigla do turno (≠ F e R)")
    name: str | None = Field(None, max_length=60)
    start: str = Field(pattern=HHMM, examples=["06:00"])
    duration_min: int = Field(ge=60, le=1440, description="Tempo à disposição (min)")
    break_min: int = Field(60, ge=0, le=240)
    blocks: list[tuple[str, int]] | None = Field(
        None, max_length=3, description="Jornada fracionada: [[\"07:00\", 240], [\"17:00\", 240]]")
    color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    handover_min: int = Field(0, ge=0, le=240, description=(
        "v3.6 — minutos finais sobrepostos ao turno seguinte (passagem de turno): contam na "
        "cobertura como excesso planejado, não ociosidade"))
    peak: bool = Field(False, description="v3.6 — turno de reforço de pico sobre o núcleo")

    @field_validator("code")
    @classmethod
    def _reservado(cls, v: str) -> str:
        if v in ("F", "R"):
            raise ValueError("F (folga) e R (reserva) são reservados")
        return v


class LayerIn(In):
    code: str = Field(pattern=r"^[A-Z0-9_]{1,16}$", examples=["NUCLEO"])
    name: str | None = Field(None, max_length=80)
    sequence: list[str] = Field(min_length=1, max_length=366,
                                examples=[["M", "M", "T", "T", "N", "N", "F", "F"]])
    rotation: Literal["frente", "tras"] = "frente"
    team_mode: Literal["fixo", "minimo", "faixa", "sugerir"] = "fixo"
    k: int | None = Field(None, ge=1, le=60)
    k_min: int | None = Field(None, ge=1, le=60)
    k_max: int | None = Field(None, ge=1, le=60)
    offsets: list[int] | None = Field(None, max_length=60,
                                      description="Offsets manuais por turma (None = auto)")
    team_sizes: list[Decimal] | None = Field(
        None, max_length=60, description="Pessoas por turma (0,5 = meia-turma de 1 posto)")
    fixed_off_weekdays: list[Weekday] = Field(default_factory=list)
    active_weekdays: list[Weekday] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])
    weekly_anchor: bool = Field(False, description="Dia 0 do ciclo = segunda-feira")
    role_code: str | None = None

    @model_validator(mode="after")
    def _k(self) -> LayerIn:
        if self.team_mode == "faixa" and (self.k_min is None or self.k_max is None
                                          or self.k_min > self.k_max):
            raise ValueError("faixa exige k_min ≤ k_max")
        if any(v <= 0 for v in self.team_sizes or ()):
            raise ValueError("team_sizes deve ser > 0")
        if any(o < 0 for o in self.offsets or ()):
            raise ValueError("offsets devem ser ≥ 0")
        return self


class WindowIn(In):
    weekdays: list[Weekday] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    start: str = Field("08:00", pattern=HHMM)
    end: str = Field("18:00", pattern=HHMM)


class PatternSpec(In):
    """Padrão de escala completo — o mesmo JSON vai em ``scenario.params.pattern``."""

    name: str = Field("Padrão personalizado", min_length=1, max_length=120)
    derived_from: str | None = Field(None, pattern=r"^[A-Z0-9_]{2,24}$")
    shifts: list[ShiftIn] = Field(min_length=1, max_length=24)
    layers: list[LayerIn] = Field(min_length=1, max_length=8)
    anchor_date: date | None = None
    operating_window: WindowIn | None = None

    @model_validator(mode="after")
    def _refs(self) -> PatternSpec:
        codes = [s.code for s in self.shifts]
        if len(set(codes)) != len(codes):
            raise ValueError("siglas de turno repetidas")
        lc = [layer.code for layer in self.layers]
        if len(set(lc)) != len(lc):
            raise ValueError("códigos de camada repetidos")
        for layer in self.layers:
            falt = sorted(set(layer.sequence) - set(codes) - {"F", "R"})
            if falt:
                raise ValueError(f"camada {layer.code}: turnos não definidos {falt}")
            if all(e in ("F", "R") for e in layer.sequence):
                raise ValueError(f"camada {layer.code}: sequência sem dias trabalhados")
        return self


class PatternValidateIn(In):
    pattern: PatternSpec
    postos: int = Field(3, ge=1, le=500, description="Demanda plana 24/7 da pré-visualização")
    demand: list[int] | None = Field(None, min_length=168, max_length=168,
                                     description="Curva 168 h (seg 00h…dom 23h)")
    team_size: int | None = Field(None, ge=1, le=500)
    legal_regime_code: str | None = None
    weeks: int = Field(4, ge=1, le=12)


class LayerReport(BaseModel):
    code: str
    cycle_length: int
    k_required: Dec6
    k_suggested: int
    k_used: int
    offsets: list[int]
    exact: bool
    exact_with_half_teams: bool
    avg_weekly_hours: Dec6
    rest_days_per_7: Dec6
    max_consecutive_work_days: int
    min_rest_between_shifts_hours: Dec6 | None
    team_sizes: list[Dec6]


class FindingLite(BaseModel):
    rule_code: str
    severity: Literal["info", "alerta", "erro"]
    message: str
    layer: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class PreviewSlot(BaseModel):
    slot_index: int
    required: Dec6
    scheduled_worst: Dec6
    gap_worst: Dec6
    handover: Dec6 = Decimal(0)


class PatternValidation(BaseModel):
    layers: list[LayerReport]
    teams_total: int
    headcount: Dec6
    k_required_total: Dec6
    coverage_pct: Dec6
    deficit_post_hours_week: Dec6
    excess_pct: Dec6
    handover_post_hours_week: Dec6 = Decimal(0)
    slots: list[PreviewSlot]
    findings: list[FindingLite]
    legal_regime: str
    elapsed_ms: int


class PatternTemplateIn(In):
    name: str = Field(min_length=2, max_length=120)
    pattern: PatternSpec
    is_shared: bool = True


class PatternTemplatePut(In):
    name: str | None = Field(None, min_length=2, max_length=120)
    pattern: PatternSpec | None = None


class PatternDuplicateIn(In):
    name: str | None = Field(None, min_length=2, max_length=120)


class PatternTemplateOut(BaseModel):
    id: uuid.UUID
    name: str
    derived_from_code: str | None
    current_version: int
    is_shared: bool
    pattern: PatternSpec
    validation: dict[str, Any]
    created_at: datetime
    updated_at: datetime | None
