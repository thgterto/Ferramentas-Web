"""Cenário, simulação e resultados (05 §5.5)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field

from escalas.schemas.common import Dec6, In, Schema

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
    moved_hours: int | None = Field(None, description="v3.7: horas remanejadas entre subsetores")
    subsector_deficit_post_hours: int | None = None
    subsector_deficit_without_pool: int | None = None


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


class SubsectorKpi(BaseModel):
    code: str
    demand_post_hours: int
    own_post_hours: int
    received_post_hours: int
    lent_post_hours: int
    deficit_post_hours: int
    pct_hours_covered: Dec6


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
    subsectors: list[SubsectorKpi] = Field(default_factory=list)
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
    borrowed: Dec6 = Field(default=Decimal(0),
                           description="v3.7: pessoas remanejadas de outro subsetor")
    status: Literal["deficit", "exata", "excesso", "passagem"]


class CoverageOut(BaseModel):
    granularity: str
    view: Literal["postos", "reserva"]
    agg: Literal["pior", "media"]
    role: str | None = None
    subsector: str | None = None
    workstation: str | None = None
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
    workstation: str | None = Field(None, description="v3.7: posição trabalhada no dia")
    subsector: str | None = Field(None, description="v3.7: subsetor de destino se remanejado")
    moved: bool = Field(False, description="v3.7: trabalhou fora do subsetor de lotação")


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
    subsector: str | None = Field(None, description="v3.7: subsetor de lotação")
    workstation: str | None = Field(None, description="v3.7: posição padrão")
    moved_days: int = 0
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
    by_subsector: dict[str, int] = Field(default_factory=dict)


class MatrixSubsector(BaseModel):
    code: str
    name: str


class MatrixWorkstation(BaseModel):
    code: str
    name: str
    subsector: str
    role: str | None = None


class MonthlyMatrixOut(BaseModel):
    month: str
    generated_people: bool = Field(
        description="pessoas fictícias por turma (A-01…) — o MVP aloca por turma")
    days: list[MatrixDay]
    shifts: list[MatrixShift]
    people: list[MatrixPerson]
    teams: list[MatrixTeam]
    daily: list[MatrixDaily]
    subsectors: list[MatrixSubsector] = Field(default_factory=list)
    workstations: list[MatrixWorkstation] = Field(default_factory=list)
    pool_allocation_applied: int = Field(
        default=0, description="células com a alocação do otimizador de pools aplicada (v3.8)")
    moved_hours: int = 0
    generated_people_note: str | None = None


# ---- v3.7: otimizadores ------------------------------------------------------------------
Objective = Literal["min_headcount", "offsets", "best_model", "pool_allocation", "fairness"]


class OptimizeWeights(In):
    deficit: int = Field(default=100, ge=0, le=100000)
    excess: int = Field(default=1, ge=0, le=100000)
    moves: int = Field(default=10, ge=0, le=100000)
    fairness: int = Field(default=5, ge=0, le=100000)


class OptimizeIn(In):
    objective: Objective = "min_headcount"
    target_coverage: Decimal = Field(default=Decimal(1), ge=0, le=1,
                                     description="cobertura alvo (1 = 100 %)")
    subsector: str | None = Field(default=None, description="escopo: demanda de um subsetor")
    pool: str | None = Field(default=None, description="escopo: demanda somada de um pool")
    team_size_mode: Literal["fixo", "livre"] = Field(default=
        "fixo", description="fixo = tamanho do cenário; livre = pessoas por offset")
    half_teams: bool = False
    team_count: int | None = Field(default=None, ge=1, le=500, description="K (offsets/fairness)")
    time_limit_s: float = Field(default=5.0, gt=0, le=60)
    legal_hard: bool = Field(default=True, description="regras do regime como restrições duras")
    include_act: bool = Field(default=False, description="aceita modelos viáveis só com ACT/CCT")
    weights: OptimizeWeights = Field(default_factory=lambda: OptimizeWeights())
    max_candidates: int = Field(default=40, ge=1, le=100)


class OptimizeMetrics(BaseModel):
    coverage_pct: float | None = None
    deficit_post_hours_week: float | None = None
    excess_post_hours_week: float | None = None
    deficit_hours: int | None = None
    headcount: int | None = None
    team_count: int | None = None
    sundays_off_spread: int | None = None
    nights_spread: int | None = None
    deficit_post_hours: int | None = None
    moved_hours: int | None = None
    max_borrowed_hours_person: int | None = None


class OptimizeOut(BaseModel):
    objective: Objective
    status: Literal["otimo", "viavel", "inviavel", "sem_solucao", "inviavel_regime"]
    optimal: bool
    objective_value: float | None
    best_bound: float | None
    gap: float | None
    elapsed_ms: int
    solver: str
    scope: str
    before: OptimizeMetrics
    after: OptimizeMetrics
    solution: dict[str, Any]
    candidates: list[dict[str, Any]] = Field(default_factory=list)
    scenario_patch: dict[str, Any] | None = Field(
        default=None, description="campos para criar/aplicar cenário (POST …/optimize/apply)")
    notes: list[str] = Field(default_factory=list)


class OptimizeApplyIn(In):
    mode: Literal["create", "apply"] = "create"
    name: str | None = Field(default=None, min_length=2, max_length=200)
    patch: dict[str, Any]


class OptimizeApplyOut(BaseModel):
    scenario_id: uuid.UUID
    created: bool
    simulation: SimulateOut
