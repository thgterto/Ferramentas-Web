"""v3.7 — Hierarquia Operação/Setor → Subsetor → Posição, pools e pessoas cadastradas."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from escalas.db.base import Base, BigId, Json, created_at, fk_org, pk, public_id, updated_at


class Subsector(Base):
    __tablename__ = "subsectors"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    operation_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("operations.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(24), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
    __table_args__ = (UniqueConstraint("operation_id", "code"),)


class Workstation(Base):
    """Posição / posto de trabalho ("Caldeira 1", "Leito 3", "Doca 2")."""

    __tablename__ = "workstations"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    subsector_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("subsectors.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(24), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    required_role_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("roles.id"))
    demand_mode: Mapped[str] = mapped_column(String(16), nullable=False, default="postos_fixos")
    demand_values: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
    __table_args__ = (
        UniqueConstraint("subsector_id", "code"),
        CheckConstraint("demand_mode IN ('postos_fixos','curva_168h')", name="demand_mode"),
    )


class SubsectorPool(Base):
    """Grupo de subsetores com funcionários intercambiáveis."""

    __tablename__ = "subsector_pools"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    operation_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("operations.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(24), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    members: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
    mode: Mapped[str] = mapped_column(String(10), nullable=False, default="total")
    max_borrowed_hours_week: Mapped[int | None] = mapped_column(Integer)
    prefer_home: Mapped[bool] = mapped_column(nullable=False, default=True)
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
    __table_args__ = (
        UniqueConstraint("operation_id", "code"),
        CheckConstraint("mode IN ('total','restrito')", name="mode"),
        CheckConstraint("max_borrowed_hours_week IS NULL OR max_borrowed_hours_week >= 0",
                        name="max_borrowed"),
    )


class Employee(Base):
    """Pessoa cadastrada: turma, cargo, subsetor de lotação e posição padrão."""

    __tablename__ = "employees"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    organization_id: Mapped[int] = fk_org()
    operation_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("operations.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    team_code: Mapped[str | None] = mapped_column(String(3))
    role_id: Mapped[int | None] = mapped_column(BigId, ForeignKey("roles.id"))
    home_subsector_id: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("subsectors.id", ondelete="SET NULL"))
    default_workstation_id: Mapped[int | None] = mapped_column(
        BigId, ForeignKey("workstations.id", ondelete="SET NULL"))
    # v3.8 — tela de colaboradores
    registration: Mapped[str | None] = mapped_column(String(40), index=True)
    skills: Mapped[list[str]] = mapped_column(Json, nullable=False, default=list)
    hire_date: Mapped[date | None] = mapped_column(Date)
    contract_weekly_hours: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    restrictions: Mapped[list[str]] = mapped_column(Json, nullable=False, default=list)
    pool_codes: Mapped[list[str]] = mapped_column(Json, nullable=False, default=list)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
