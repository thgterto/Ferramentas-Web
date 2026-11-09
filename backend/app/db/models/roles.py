"""Cargos, matriz de substituição, mínimos por cargo e K como restrição (05 §3.12)."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, BigId, Json, created_at, fk_org, pk, public_id


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    code: Mapped[str] = mapped_column(String(24), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    hierarchy_level: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    cbo_code: Mapped[str | None] = mapped_column(String(6))
    created_at: Mapped[datetime] = created_at()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint("organization_id", "code"),
        CheckConstraint("hierarchy_level BETWEEN 1 AND 9", name="level"),
    )


class SubstitutionRule(Base):
    __tablename__ = "substitution_rules"
    id: Mapped[int] = pk()
    organization_id: Mapped[int] = fk_org()
    from_role_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    to_role_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    coverage_factor: Mapped[Decimal] = mapped_column(nullable=False, default=Decimal(1))
    priority: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    counts_for_minimum: Mapped[bool] = mapped_column(nullable=False, default=False)
    __table_args__ = (
        UniqueConstraint("from_role_id", "to_role_id"),
        CheckConstraint("from_role_id <> to_role_id", name="diagonal"),
        CheckConstraint("coverage_factor > 0 AND coverage_factor <= 1", name="factor"),
        CheckConstraint("priority BETWEEN 1 AND 9", name="priority"),
    )


class RoleCoverageRequirement(Base):
    __tablename__ = "role_coverage_requirements"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    operation_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("operations.id", ondelete="CASCADE"), nullable=False)
    position_id: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("positions.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(10), nullable=False, default="minimo")
    role_id: Mapped[int] = mapped_column(BigId, ForeignKey("roles.id"), nullable=False)
    min_count: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    accepts_substitute: Mapped[bool] = mapped_column(nullable=False, default=False)
    shift_codes: Mapped[list[str] | None] = mapped_column(Json)
    weekdays: Mapped[list[int]] = mapped_column(Json, nullable=False,
                                                default=lambda: [1, 2, 3, 4, 5, 6, 7])
    severity: Mapped[str] = mapped_column(String(8), nullable=False, default="erro")
    __table_args__ = (
        CheckConstraint("kind IN ('minimo')", name="kind_mvp"),
        CheckConstraint("min_count >= 1", name="min"),
    )


class TeamConstraint(Base):
    __tablename__ = "team_constraints"
    id: Mapped[int] = pk()
    organization_id: Mapped[int] = fk_org()
    operation_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("operations.id", ondelete="CASCADE"), nullable=False)
    scope: Mapped[str] = mapped_column(String(10), nullable=False, default="operacao")
    mode: Mapped[str] = mapped_column(String(8), nullable=False, default="fixo")
    k_min: Mapped[int | None] = mapped_column(SmallInteger)
    k_max: Mapped[int | None] = mapped_column(SmallInteger)
    team_size_min: Mapped[int | None] = mapped_column(Integer)
    team_size_max: Mapped[int | None] = mapped_column(Integer)
    allow_half_teams: Mapped[bool] = mapped_column(nullable=False, default=True)
    source_note: Mapped[str | None] = mapped_column(Text)
    __table_args__ = (
        UniqueConstraint("operation_id", "scope"),
        CheckConstraint("scope IN ('operacao')", name="scope_mvp"),
        CheckConstraint("mode IN ('fixo')", name="mode_mvp"),
        CheckConstraint("mode <> 'fixo' OR k_min = k_max", name="fixo"),
        CheckConstraint("k_min IS NULL OR k_min BETWEEN 1 AND 12", name="kmin"),
    )


class TeamRoleComposition(Base):
    __tablename__ = "team_role_composition"
    organization_id: Mapped[int] = fk_org()
    team_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("teams.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[int] = mapped_column(BigId, ForeignKey("roles.id"), primary_key=True)
    headcount: Mapped[int] = mapped_column(Integer, nullable=False)
    __table_args__ = (CheckConstraint("headcount >= 0", name="hc"),)


