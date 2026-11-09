"""Acordos (mínimo), operações, postos, demanda e shrinkage (05 §3.3–3.4)."""

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
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from escalas.db.base import Base, BigId, created_at, fk_org, pk, public_id, updated_at

D = Decimal


class LaborAgreement(Base):
    __tablename__ = "labor_agreements"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    name: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(12), nullable=False)
    union_name: Mapped[str | None] = mapped_column(Text)
    registration_number: Mapped[str | None] = mapped_column(Text)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_to: Mapped[date | None] = mapped_column(Date)
    night_premium_pct: Mapped[D] = mapped_column(nullable=False, default=D("0.2"))
    night_hour_factor: Mapped[D] = mapped_column(nullable=False, default=D("1.142857"))
    apply_sumula_60: Mapped[bool] = mapped_column(nullable=False, default=True)
    overtime_pct: Mapped[D] = mapped_column(nullable=False, default=D("0.5"))
    overtime_sunday_pct: Mapped[D] = mapped_column(nullable=False, default=D("1"))
    hazard_pct: Mapped[D] = mapped_column(nullable=False, default=D("0"))
    unhealthy_pct: Mapped[D] = mapped_column(nullable=False, default=D("0"))
    social_charges_pct: Mapped[D] = mapped_column(nullable=False, default=D("0.68"))
    weekly_hours_limit: Mapped[D] = mapped_column(nullable=False, default=D("44"))
    daily_overtime_max_hours: Mapped[D] = mapped_column(nullable=False, default=D("2"))
    allows_8h_rotating: Mapped[bool] = mapped_column(nullable=False, default=False)
    allows_12x36: Mapped[bool] = mapped_column(nullable=False, default=True)
    min_interjornada_hours: Mapped[D] = mapped_column(nullable=False, default=D("11"))
    min_weekly_rest_hours: Mapped[D] = mapped_column(nullable=False, default=D("35"))
    sunday_rule_basis: Mapped[str] = mapped_column(String(24), nullable=False,
                                                   default="lei_605_1949")
    sunday_off_max_interval_weeks: Mapped[int] = mapped_column(SmallInteger, nullable=False,
                                                               default=7)
    holiday_calendar: Mapped[str] = mapped_column(Text, nullable=False, default="BR-NACIONAL")
    extra_rules: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
    rules_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        CheckConstraint("kind IN ('CLT_PADRAO','CCT','ACT')", name="kind"),
        CheckConstraint("valid_to IS NULL OR valid_to >= valid_from", name="valid"),
        CheckConstraint("min_interjornada_hours >= 11", name="interjornada"),
    )


class Operation(Base):
    __tablename__ = "operations"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sector: Mapped[str] = mapped_column(String(20), nullable=False, default="outro")
    is_24x7: Mapped[bool] = mapped_column(nullable=False, default=True)
    timezone: Mapped[str] = mapped_column(Text, nullable=False, default="America/Sao_Paulo")
    city_ibge_code: Mapped[str | None] = mapped_column(String(7))
    default_agreement_id: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("labor_agreements.id"))
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint("organization_id", "name"),
        CheckConstraint("sector IN ('saude','logistica','industria','varejo','ti_noc',"
                        "'contact_center','saneamento','outro')", name="sector"),
    )


class Position(Base):
    __tablename__ = "positions"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    operation_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("operations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    cbo_code: Mapped[str | None] = mapped_column(String(6))
    monthly_hours: Mapped[D] = mapped_column(nullable=False, default=D("220"))
    is_mandatory_presence: Mapped[bool] = mapped_column(nullable=False, default=False)
    required_role_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("roles.id"))
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint("operation_id", "name"),)


class DemandCurve(Base):
    __tablename__ = "demand_curves"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    position_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("positions.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[str] = mapped_column(String(16), nullable=False, default="postos_fixos")
    granularity: Mapped[str] = mapped_column(String(2), nullable=False, default="60")
    params: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
    source: Mapped[str] = mapped_column(String(12), nullable=False, default="manual")
    checksum: Mapped[str | None] = mapped_column(String(64))
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by: Mapped[int | None] = mapped_column(BigId, ForeignKey("users.id"))
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        CheckConstraint("mode IN ('postos_fixos','curva_168h')", name="mode_mvp"),
        CheckConstraint("granularity IN ('60')", name="granularity_mvp"),
        CheckConstraint("source IN ('manual','upload_csv','upload_xlsx','api')", name="source"),
    )


class DemandSlot(Base):
    __tablename__ = "demand_slots"
    organization_id: Mapped[int] = fk_org()
    demand_curve_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("demand_curves.id", ondelete="CASCADE"), primary_key=True)
    slot_index: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    weekday: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    start_minute: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    required_value: Mapped[D] = mapped_column(nullable=False)
    is_night: Mapped[bool] = mapped_column(nullable=False)
    __table_args__ = (
        CheckConstraint("slot_index BETWEEN 0 AND 167", name="slot"),
        CheckConstraint("required_value >= 0", name="value"),
    )


class ShrinkageProfile(Base):
    __tablename__ = "shrinkage_profiles"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    operation_id: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("operations.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    day_pct: Mapped[D] = mapped_column(nullable=False)
    night_pct: Mapped[D] = mapped_column(nullable=False)
    breakdown: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        CheckConstraint("day_pct >= 0 AND day_pct < 0.6", name="day"),
        CheckConstraint("night_pct >= 0 AND night_pct < 0.6", name="night"),
    )
