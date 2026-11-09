"""Cenários, turmas e alocações por turma (05 §3.7–3.8, §3.13)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from escalas.db.base import Base, BigId, created_at, fk_org, pk, public_id, updated_at

SCENARIO_STATUS = ("rascunho", "calculando", "calculado", "em_revisao", "homologado",
                   "arquivado", "erro")


class Scenario(Base):
    __tablename__ = "scenarios"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    operation_id: Mapped[int] = mapped_column(BigId, ForeignKey("operations.id"), nullable=False)
    lineage_id: Mapped[uuid.UUID] = mapped_column(nullable=False, default=uuid.uuid4)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    parent_scenario_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("scenarios.id"))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_baseline: Mapped[bool] = mapped_column(nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(12), nullable=False, default="rascunho")
    schedule_model_id: Mapped[int] = mapped_column(BigId, ForeignKey("schedule_models.id"),
                                                   nullable=False)
    labor_agreement_id: Mapped[int] = mapped_column(BigId, ForeignKey("labor_agreements.id"),
                                                    nullable=False)
    shrinkage_profile_id: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("shrinkage_profiles.id"))
    demand_curve_id: Mapped[int] = mapped_column(BigId, ForeignKey("demand_curves.id"),
                                                 nullable=False)
    rotation_pattern_id: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("rotation_patterns.id"))
    team_count: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    horizon_start: Mapped[date] = mapped_column(Date, nullable=False)
    horizon_weeks: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=8)
    agreement_8h_confirmed: Mapped[bool] = mapped_column(nullable=False, default=False)
    holiday_policy: Mapped[str] = mapped_column(String(16), nullable=False,
                                                default="escala_normal")
    floater_count: Mapped[int | None] = mapped_column(SmallInteger)
    params: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
    inputs_snapshot: Mapped[dict[str, Any] | None] = mapped_column()
    inputs_hash: Mapped[str | None] = mapped_column(String(64))
    engine_version: Mapped[str | None] = mapped_column(Text)
    rules_version: Mapped[str | None] = mapped_column(Text)
    coverage_pct: Mapped[Decimal | None] = mapped_column()
    deficit_post_hours: Mapped[Decimal | None] = mapped_column()
    peak_undercoverage: Mapped[Decimal | None] = mapped_column()
    deficit_hours: Mapped[int | None] = mapped_column(Integer)
    headcount_min: Mapped[int | None] = mapped_column(Integer)
    teams_required: Mapped[Decimal | None] = mapped_column()
    blocking_findings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    substitution_post_hours: Mapped[Decimal | None] = mapped_column()
    unqualified_hours: Mapped[int | None] = mapped_column(Integer)
    team_count_achievable_pct: Mapped[Decimal | None] = mapped_column()
    # MVP: KPIs extras do último cálculo (pico com data/hora, excesso, K usado, por cargo)
    result_summary: Mapped[dict[str, Any] | None] = mapped_column()
    legal_regime_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("legal_regimes.id"))
    legal_reference_date: Mapped[date | None] = mapped_column(Date)
    legal_regime_resolved_id: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("legal_regimes.id"))
    compensation_agreement_declared: Mapped[bool] = mapped_column(nullable=False, default=False)
    overtime_planned: Mapped[bool] = mapped_column(nullable=False, default=False)
    simulate_transition: Mapped[bool] = mapped_column(nullable=False, default=False)
    calculated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[int | None] = mapped_column(BigId, ForeignKey("users.id"))
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
    row_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    __table_args__ = (
        UniqueConstraint("lineage_id", "version"),
        CheckConstraint(f"status IN {SCENARIO_STATUS}", name="status"),
        CheckConstraint("team_count BETWEEN 1 AND 500", name="team_count"),
        CheckConstraint("horizon_weeks BETWEEN 1 AND 104", name="horizon"),
        Index("ix_scenarios_org_op_status", "organization_id", "operation_id", "status"),
        Index("ix_scenarios_inputs_hash", "organization_id", "inputs_hash"),
    )


class ScenarioShiftTemplate(Base):
    __tablename__ = "scenario_shift_templates"
    scenario_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("scenarios.id", ondelete="CASCADE"), primary_key=True)
    shift_template_id: Mapped[int] = mapped_column(BigId, ForeignKey("shift_templates.id"),
                                                   primary_key=True)
    organization_id: Mapped[int] = fk_org()


class Team(Base):
    __tablename__ = "teams"
    id: Mapped[int] = pk()
    organization_id: Mapped[int] = fk_org()
    scenario_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(3), nullable=False)
    kind: Mapped[str] = mapped_column(String(10), nullable=False, default="regular")
    label: Mapped[str | None] = mapped_column(Text)
    cycle_offset_days: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    size_required: Mapped[Decimal] = mapped_column(nullable=False, default=Decimal(0))
    size_assigned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    __table_args__ = (UniqueConstraint("scenario_id", "code"),)


class Assignment(Base):
    """MVP: alocação por **turma** × dia (sem colaborador nominal; partição HASH só no PG
    de produção — Fase 2c)."""

    __tablename__ = "assignments"
    id: Mapped[int] = pk()
    organization_id: Mapped[int] = fk_org()
    scenario_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    team_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("teams.id", ondelete="CASCADE"))
    work_date: Mapped[date] = mapped_column(Date, nullable=False)
    shift_code: Mapped[str | None] = mapped_column(String(12))   # NULL = folga
    is_day_off: Mapped[bool] = mapped_column(nullable=False, default=False)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    clock_minutes: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    source: Mapped[str] = mapped_column(String(16), nullable=False, default="engine")
    __table_args__ = (
        CheckConstraint("is_day_off = (shift_code IS NULL)", name="day_off"),
        Index("ix_assign_team_day", "scenario_id", "team_id", "work_date"),
    )
