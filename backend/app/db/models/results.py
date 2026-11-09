"""Resultados persistidos do cálculo (05 §3.9, §3.12, §3.13)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, BigId, created_at, fk_org, pk, public_id

D = Decimal
STATUS_CK = "status IN ('deficit','exata','excesso')"


class CoverageResult(Base):
    __tablename__ = "coverage_results"
    organization_id: Mapped[int] = fk_org()
    scenario_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("scenarios.id", ondelete="CASCADE"), primary_key=True)
    slot_index: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    required_net: Mapped[D] = mapped_column(nullable=False)
    required_gross: Mapped[D] = mapped_column(nullable=False)
    scheduled_worst: Mapped[D] = mapped_column(nullable=False)
    scheduled_mean: Mapped[D] = mapped_column(nullable=False)
    expected_worst: Mapped[D] = mapped_column(nullable=False)
    break_gap: Mapped[D] = mapped_column(nullable=False, default=D(0))
    deficit_occurrences: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    gap: Mapped[D] = mapped_column(nullable=False)          # GENERATED no DDL; gravado no MVP
    gap_mean: Mapped[D] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(String(8), nullable=False)
    status_mean: Mapped[str] = mapped_column(String(8), nullable=False)
    __table_args__ = (CheckConstraint(STATUS_CK, name="status"),)


class CoverageRoleResult(Base):
    __tablename__ = "coverage_role_results"
    organization_id: Mapped[int] = fk_org()
    scenario_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("scenarios.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[int] = mapped_column(BigId, ForeignKey("roles.id"), primary_key=True)
    slot_index: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    required_worst: Mapped[D] = mapped_column(nullable=False)
    own_worst: Mapped[D] = mapped_column(nullable=False)
    substituted_worst: Mapped[D] = mapped_column(nullable=False)
    qualified_present: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(8), nullable=False)
    __table_args__ = (CheckConstraint(STATUS_CK, name="status"),)


class ComplianceFinding(Base):
    __tablename__ = "compliance_findings"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    scenario_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    rule_code: Mapped[str] = mapped_column(String(64), ForeignKey("compliance_rules.code"),
                                           nullable=False)
    severity: Mapped[str] = mapped_column(String(8), nullable=False)
    legal_reference: Mapped[str] = mapped_column(Text, nullable=False)
    team_code: Mapped[str | None] = mapped_column(String(3))
    occurs_on: Mapped[date | None] = mapped_column(Date)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
    waived: Mapped[bool] = mapped_column(nullable=False, default=False)
    created_at: Mapped[datetime] = created_at()
    __table_args__ = (
        CheckConstraint("severity IN ('info','alerta','erro')", name="severity"),
        Index("ix_findings_scenario_sev", "scenario_id", "severity", "rule_code"),
    )


class ScenarioTransitionResult(Base):
    __tablename__ = "scenario_transition_results"
    scenario_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("scenarios.id", ondelete="CASCADE"), primary_key=True)
    organization_id: Mapped[int] = fk_org()
    legal_regime_id: Mapped[int] = mapped_column(BigId, ForeignKey("legal_regimes.id"),
                                                 primary_key=True)
    phase_order: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    scenario_model_code: Mapped[str] = mapped_column(Text, nullable=False)
    scenario_model_compliant: Mapped[bool] = mapped_column(nullable=False)
    recommended_model_code: Mapped[str | None] = mapped_column(Text)
    teams_required: Mapped[D] = mapped_column(nullable=False)
    headcount: Mapped[int] = mapped_column(nullable=False)
    avg_weekly_hours: Mapped[D] = mapped_column(nullable=False)
    k_legal: Mapped[D] = mapped_column(nullable=False)
    findings_summary: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
