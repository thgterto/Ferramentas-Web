"""organizations, users, memberships (05 §3.2)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from escalas.db.base import Base, BigId, created_at, pk, public_id, updated_at

MEMBER_ROLES = ("owner", "admin", "planner", "legal_reviewer", "viewer")


class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    name: Mapped[str] = mapped_column(Text, nullable=False)
    cnpj: Mapped[str | None] = mapped_column(String(14), unique=True)
    timezone: Mapped[str] = mapped_column(Text, nullable=False, default="America/Sao_Paulo")
    settings: Mapped[dict[str, Any]] = mapped_column(nullable=False, default=dict)
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (CheckConstraint("length(name) BETWEEN 2 AND 200", name="name_len"),)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = pk()
    public_id: Mapped[uuid.UUID] = public_id()
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)  # citext no PG
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text)
    is_superuser: Mapped[bool] = mapped_column(nullable=False, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = created_at()
    updated_at: Mapped[datetime] = updated_at()
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    memberships: Mapped[list[Membership]] = relationship(back_populates="user", lazy="select")


class Membership(Base):
    __tablename__ = "memberships"
    id: Mapped[int] = pk()
    organization_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(BigId, ForeignKey("users.id", ondelete="CASCADE"),
                                         nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="viewer")
    created_at: Mapped[datetime] = created_at()
    user: Mapped[User] = relationship(back_populates="memberships")
    organization: Mapped[Organization] = relationship(lazy="joined")
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id"),
        CheckConstraint(f"role IN {MEMBER_ROLES}", name="role"),
    )
