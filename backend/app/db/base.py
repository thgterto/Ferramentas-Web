"""Base declarativa e tipos portáveis (PostgreSQL em produção, SQLite nos testes)."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import JSON, BigInteger, DateTime, Integer, MetaData, Numeric, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

BigId = BigInteger().with_variant(Integer(), "sqlite")
Json = JSON().with_variant(JSONB(), "postgresql")  # type: ignore[no-untyped-call]
Dec = Numeric(18, 6, asdecimal=True)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)
    type_annotation_map = {  # noqa: RUF012 (API do SQLAlchemy)
        dict[str, Any]: Json, Decimal: Dec, uuid.UUID: Uuid}


def pk() -> Mapped[int]:
    return mapped_column(BigId, primary_key=True, autoincrement=True)


def public_id() -> Mapped[uuid.UUID]:
    return mapped_column(Uuid, unique=True, nullable=False, default=uuid.uuid4)


def created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


def updated_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                         onupdate=func.now())


def fk_org() -> Mapped[int]:
    from sqlalchemy import ForeignKey

    return mapped_column(BigId, ForeignKey("organizations.id", ondelete="CASCADE"),
                         nullable=False, index=True)
