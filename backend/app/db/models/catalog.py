"""Catálogos: turnos, modelos de escala, padrões, regras de compliance, regimes (05 §3.5, §3.9,
§3.12, §3.13). ``schedule_models``, ``compliance_rules`` e ``legal_regimes`` são globais."""

from __future__ import annotations

import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, BigId, Json, created_at, pk, public_id


class ShiftTemplate(Base):
    __tablename__ = "shift_templates"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)  # NULL = global
    code: Mapped[str] = mapped_column(String(12), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    break_minutes: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=60)
    break_policy: Mapped[str] = mapped_column(String(24), nullable=False,
                                              default="computado_rendicao")
    night_clock_minutes: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    color_hex: Mapped[str | None] = mapped_column(String(7))
    created_at: Mapped[datetime] = created_at()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint("organization_id", "code"),
        CheckConstraint("duration_minutes BETWEEN 60 AND 1440", name="duration"),
    )


class ScheduleModel(Base):
    __tablename__ = "schedule_models"
    id: Mapped[int] = pk()
    code: Mapped[str] = mapped_column(String(24), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    work_days: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    off_days: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    cycle_length_days: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    typical_teams: Mapped[list[int]] = mapped_column(Json, nullable=False, default=list)
    calendar_cycle_days: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    daily_hours: Mapped[Decimal] = mapped_column(nullable=False)
    avg_weekly_hours: Mapped[Decimal] = mapped_column(nullable=False)
    is_continuous_24x7: Mapped[bool] = mapped_column(nullable=False)
    is_rotating: Mapped[bool] = mapped_column(nullable=False, default=False)
    requires_agreement: Mapped[bool] = mapped_column(nullable=False, default=False)
    legal_basis: Mapped[str | None] = mapped_column(Text)
    default_params: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    catalog_group: Mapped[str] = mapped_column(String(16), nullable=False, default="continuo")
    shifts_per_day: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=3)
    teams_24x7: Mapped[Decimal | None] = mapped_column()
    exact_24x7: Mapped[bool] = mapped_column(nullable=False, default=False)
    exact_alternative: Mapped[str | None] = mapped_column(Text)
    teams_non_continuous: Mapped[Decimal | None] = mapped_column()
    legal_status: Mapped[str] = mapped_column(String(16), nullable=False, default="viavel")
    cycle_unit: Mapped[str] = mapped_column(String(8), nullable=False, default="days")
    phase: Mapped[str] = mapped_column(String(8), nullable=False, default="mvp")
    regime_compliance: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)


class RotationPattern(Base):
    __tablename__ = "rotation_patterns"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    schedule_model_id: Mapped[int] = mapped_column(BigId, ForeignKey("schedule_models.id"),
                                                   nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    cycle_length_days: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    team_count: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    matrix: Mapped[dict[str, Any]] = mapped_column(nullable=False)
    team_offsets: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
    is_generated: Mapped[bool] = mapped_column(nullable=False, default=False)
    created_at: Mapped[datetime] = created_at()


class ComplianceRule(Base):
    __tablename__ = "compliance_rules"
    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    default_severity: Mapped[str] = mapped_column(String(8), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    legal_reference: Mapped[str] = mapped_column(Text, nullable=False)
    rules_version: Mapped[str] = mapped_column(Text, nullable=False)
    is_blocking: Mapped[bool] = mapped_column(nullable=False, default=False)
    __table_args__ = (
        CheckConstraint("default_severity IN ('info','alerta','erro')", name="severity"),)


class LegalRegime(Base):
    __tablename__ = "legal_regimes"
    id: Mapped[int] = pk()
    code: Mapped[str] = mapped_column(String(40), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(10), nullable=False)
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    anchor: Mapped[str | None] = mapped_column(String(16))
    anchor_offset_from: Mapped[str | None] = mapped_column(Text)   # interval no PG ('60 days')
    anchor_offset_to: Mapped[str | None] = mapped_column(Text)
    weekly_hours_max: Mapped[Decimal] = mapped_column(nullable=False)
    daily_hours_max: Mapped[Decimal] = mapped_column(nullable=False)
    min_rest_days_per_week: Mapped[Decimal] = mapped_column(nullable=False)
    rest_days_criterion: Mapped[str] = mapped_column(String(16), nullable=False)
    allows_6x1: Mapped[bool] = mapped_column(nullable=False)
    allows_compensation_agreement: Mapped[bool] = mapped_column(nullable=False, default=True)
    special_regimes: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
    legal_reference: Mapped[str] = mapped_column(Text, nullable=False)
    assumption_note: Mapped[str | None] = mapped_column(Text)
    supersedes_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("legal_regimes.id"))
    created_at: Mapped[datetime] = created_at()
    __table_args__ = (
        UniqueConstraint("code", "version"),
        CheckConstraint("status IN ('vigente','previsto','premissa')", name="status"),
        CheckConstraint("valid_from IS NOT NULL OR anchor IS NOT NULL", name="vigencia"),
    )
