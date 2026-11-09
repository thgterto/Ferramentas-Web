"""Cenário, simulação e resultados (05 §5.5)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.common import Dec6, In, Schema

Severity = Literal["info", "alerta", "erro"]


class ScenarioCreate(In):
    name: str = Field(min_length=2, max_length=200)
    description: str | None = None
    operation_id: uuid.UUID
    schedule_model_code: str = Field(pattern=r"^[A-Z0-9_]{2,24}$")
    labor_agreement_id: uuid.UUID
    demand_curve_id: uuid.UUID
    shrinkage_profile_id: uuid.UUID | None = None
    shift_template_codes: list[str] = Field(default_factory=list, max_length=8)
    team_count: int = Field(ge=1, le=500)
    horizon_start: date
    horizon_weeks: int = Field(8, ge=1, le=104)
    agreement_8h_confirmed: bool = False
    holiday_policy: Literal["escala_normal"] = "escala_normal"   # folga_coberta: Fase 2
    legal_regime_code: str | None = None
    legal_reference_date: date | None = None
    compensation_agreement_declared: bool = False
    overtime_planned: bool = False
    simulate_transition: bool = False
    is_baseline: bool = False
    params: dict[str, Any] = Field(
        default_factory=dict,
        description="ex.: {\"team_size\": 3} (pessoas por turma; padrão = pico da curva); "
                    "v3.5: {\"pattern\": PatternSpec} = padrão do construtor (camadas, K "
                    "livre, tamanhos por turma, janela de operação)")


class ScenarioPatch(In):
    name: str | None = Field(None, min_length=2, max_length=200)
    description: str | None = None
    schedule_model_code: str | None = Field(None, pattern=r"^[A-Z0-9_]{2,24}$")
    shrinkage_profile_id: uuid.UUID | None = None
    team_count: int | None = Field(None, ge=1, le=500)
    horizon_start: date | None = None
    horizon_weeks: int | None = Field(None, ge=1, le=104)
    legal_regime_code: str | None = None
    legal_reference_date: date | None = None
    compensation_agreement_declared: bool | None = None
    overtime_planned: bool | None = None
    simulate_transition: bool | None = None
    params: dict[str, Any] | None = None


class ScenarioCreated(BaseModel):
    id: uuid.UUID
    lineage_id: uuid.UUID
    version: int
    status: str
    row_version: int


class TeamOut(Schema):
    code: str
    kind: str
    label: str | None
    size_required: Dec6
    size_assigned: int
    cycle_offset_days: int
    composition: dict[str, int] = Field(default_factory=dict)


class KpisOut(BaseModel):
    teams_required: Dec6 | None
    coverage_pct: Dec6 | None
    deficit_post_hours: Dec6 | None
    peak_undercoverage: Dec6 | None
    deficit_hours: int | None
    headcount_min: int | None
    blocking_findings: int
    warnings: int
    total_monthly_cost: None = None


class ScheduleModelRef(BaseModel):
    code: str
    avg_weekly_hours: Dec6


class ShiftInfo(BaseModel):
    code: str
    start: str
    duration_min: int
    handover_min: int = 0
    peak: bool = False
    blocks: list[list[Any]] = Field(default_factory=list)


class LayerInfo(BaseModel):
    code: str
    name: str | None = None
    mode: str
    k: int
    offsets: list[int]
    sequence: list[str]


class ScenarioOut(BaseModel):
    id: uuid.UUID
    lineage_id: uuid.UUID
    name: str
    description: str | None
    version: int
    status: str
    row_version: int
    operation_id: uuid.UUID
    demand_curve_id: uuid.UUID
    labor_agreement_id: uuid.UUID
    shrinkage_profile_id: uuid.UUID | None
    schedule_model: ScheduleModelRef
    team_count: int
    horizon_start: date
    horizon_weeks: int
    legal_regime_code: str | None
    legal_reference_date: date | None
    legal_regime_applied: str | None
    compensation_agreement_declared: bool
    overtime_planned: bool
    simulate_transition: bool
    params: dict[str, Any]
    inputs_hash: str | None
    engine_version: str | None
    rules_version: str | None
    kpis: KpisOut
    teams: list[TeamOut]
    shifts: list[ShiftInfo] = Field(default_factory=list)
    layers: list[LayerInfo] = Field(default_factory=list)
    calculated_at: datetime | None
    created_at: datetime


Stage = Literal["demanda", "gerador", "cobertura", "viabilidade"]
STAGES: tuple[Stage, ...] = ("demanda", "gerador", "cobertura", "viabilidade")


class SimulateIn(In):
    mode: Literal["auto", "sync"] = "auto"
    stages: list[Stage] = Field(default_factory=lambda: list(STAGES))
    assign_employees: Literal[False] = False


class TeamCountOut(BaseModel):
    mode: Literal["fixo", "cenario", "padrao"]
    k_used: int
    k_required: Dec6
    achievable_pct: Dec6


class RoleCoverageKpi(BaseModel):
    role: str
    pct_hours_covered: Dec6
    own_post_hours: Dec6
    substituted_post_hours: Dec6
    deficit_post_hours: Dec6
    unqualified_hours: int


class FindingBrief(BaseModel):
    rule_code: str
    severity: Severity
    message: str
    team: str | None = None
    details: dict[str, str] = {}


class SimulateOut(BaseModel):
    scenario_id: uuid.UUID
    status: str
    inputs_hash: str
    engine_version: str
    rules_version: str
    catalog_version: str
    legal_regime: str
    kpis: KpisOut
    team_count: TeamCountOut
    coverage_by_role: list[RoleCoverageKpi]
    findings: list[FindingBrief]
    elapsed_ms: int


class PeakOut(BaseModel):
    value: Dec6
    at: str


class CoverageKpis(BaseModel):
    pct_hours_covered: Dec6
    deficit_post_hours: Dec6
    peak_undercoverage: PeakOut | None
    deficit_hours: int
    excess_post_hours: Dec6
    handover_post_hours: Dec6 = Decimal(0)
    break_gap_post_hours: Dec6
    headcount_min: int | None
    teams_required: Dec6 | None


class CoverageSlot(BaseModel):
    slot_index: int
    weekday: int
    start: str
    required_net: Dec6
    required_gross: Dec6
    scheduled_worst: Dec6
    scheduled_mean: Dec6
    expected_worst: Dec6
    break_gap: Dec6
    deficit_occurrences: int
    gap: Dec6
    handover: Dec6 = Decimal(0)
    status: Literal["deficit", "exata", "excesso", "passagem"]


class CoverageOut(BaseModel):
    granularity: str
    view: Literal["postos", "reserva"]
    agg: Literal["pior", "media"]
    role: str | None = None
    kpis: CoverageKpis
    slots: list[CoverageSlot]


class SizingIn(In):
    team_size: int | None = Field(None, ge=1, le=500)
    team_count: int | None = Field(None, ge=1, le=500)


class SizingOut(BaseModel):
    schedule_model: str
    team_size: int
    k_required: Dec6
    whole_teams: int
    half_teams: int | None
    headcount_min: int
    headcount_min_half_teams: int | None
    team_size_with_reserve: int
    headcount_with_reserve: int
    k_legal: Dec6
    k_effective: Dec6
    legal_regime: str
    findings: list[FindingBrief]


class FindingOut(BaseModel):
    id: uuid.UUID
    rule_code: str
    severity: Severity
    legal_reference: str
    team: str | None
    employee_id: None = None
    occurs_on: date | None
    message: str
    details: dict[str, Any]
    waived: bool


class AssignmentOut(BaseModel):
    team: str | None
    work_date: date
    shift_code: str | None
    is_day_off: bool
    starts_at: datetime | None
    ends_at: datetime | None
    clock_minutes: int


class CompositionPut(In):
    composition: dict[str, int] = Field(description="{\"ENF\": 1, \"TEC_ENF\": 4}")


class TransitionIn(In):
    regimes: list[str] | None = None
    recommend: bool = True
    allow_half_teams: bool = True


class TransitionOption(BaseModel):
    code: str
    variant: str
    half_teams: bool
    teams_required: Dec6
    headcount: int
    avg_weekly_hours: Dec6
    delta_headcount_vs_first: int | None = None


class TransitionScenarioModel(BaseModel):
    code: str
    compliant: bool
    teams: Dec6
    headcount: int
    avg_weekly_hours: Dec6
    findings: list[FindingBrief]


class TransitionPhase(BaseModel):
    regime: str
    k_legal: Dec6
    k_legal_half_teams: Dec6
    min_headcount_legal: int
    scenario_model: TransitionScenarioModel | None
    recommended: TransitionOption | None
    alternatives: list[TransitionOption]


class TransitionOut(BaseModel):
    team_size: int
    phases: list[TransitionPhase]


ExportSheet = Literal["Escala", "Cobertura168h", "KPIs", "Violacoes", "Parametros"]


class ExportOptions(In):
    sheets: list[ExportSheet] | None = Field(
        None, description="CSV: a 1ª aba da lista (padrão Cobertura168h); XLSX: todas")


class ExportIn(In):
    format: Literal["csv", "xlsx"] = "xlsx"
    options: ExportOptions = Field(default_factory=lambda: ExportOptions(sheets=None))


# ---- v3.6: matriz mensal / por turno / pessoa ------------------------------------------
class MatrixDay(BaseModel):
    date: date
    weekday: int = Field(description="1 = segunda … 7 = domingo")
    is_weekend: bool
    holiday: str | None = None


class MatrixShift(BaseModel):
    code: str
    start: str
    end: str
    label: str
    duration_min: int
    handover_min: int = 0
    peak: bool = False
    night: bool = False
    crosses_midnight: bool = False


class MatrixCell(BaseModel):
    code: str = Field(description="sigla do turno ou F (folga)")
    reserve: bool = False
    carry: str | None = Field(None, description="turno da véspera que continua pela 00:00")


class PersonTotals(BaseModel):
    worked_days: int
    off_days: int
    hours: Dec6
    sundays_off: int
    nights: int


class MatrixPerson(BaseModel):
    id: str
    name: str
    team: str
    role: str | None = None
    cells: list[MatrixCell]
    totals: PersonTotals


class MatrixTeam(BaseModel):
    code: str
    size: Dec6
    cells: list[MatrixCell]
    totals: PersonTotals


class MatrixDaily(BaseModel):
    date: date
    by_shift: dict[str, int]
    required_by_shift: dict[str, int]
    off: int
    deficit_shifts: list[str]
    deficit_hours: int
    handover_hours: int
    required_peak: int


class MonthlyMatrixOut(BaseModel):
    month: str
    generated_people: bool = Field(
        description="pessoas fictícias por turma (A-01…) — o MVP aloca por turma")
    days: list[MatrixDay]
    shifts: list[MatrixShift]
    people: list[MatrixPerson]
    teams: list[MatrixTeam]
    daily: list[MatrixDaily]
