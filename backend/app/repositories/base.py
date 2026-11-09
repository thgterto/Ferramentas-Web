"""``TenantRepository``: filtro obrigatório por ``organization_id`` (defesa em profundidade
sobre a RLS do PostgreSQL; nos testes SQLite é o único isolamento)."""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any, Generic, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import conflict, not_found
from app.db.base import Base

M = TypeVar("M", bound=Base)


class TenantRepository(Generic[M]):
    model: type[M]
    label: str = "recurso"
    soft_delete: bool = True

    def __init__(self, session: Session, org_id: int) -> None:
        self.s = session
        self.org_id = org_id

    # ---- consultas ------------------------------------------------------------
    def _base(self) -> Select[tuple[M]]:
        m: Any = self.model
        q = select(self.model).where(m.organization_id == self.org_id)
        if self.soft_delete and hasattr(m, "deleted_at"):
            q = q.where(m.deleted_at.is_(None))
        return q

    def get(self, public_id: uuid.UUID) -> M:
        m: Any = self.model
        obj = self.s.scalar(self._base().where(m.public_id == public_id))
        if obj is None:
            raise not_found(self.label)
        return obj

    def get_by_id(self, id_: int) -> M:
        m: Any = self.model
        obj = self.s.scalar(self._base().where(m.id == id_))
        if obj is None:
            raise not_found(self.label)
        return obj

    def list_page(self, page: int, per_page: int, *filters: Any,
                  order_by: Any = None) -> tuple[Sequence[M], int]:
        m: Any = self.model
        q = self._base().where(*filters)
        total = self.s.scalar(select(func.count()).select_from(q.subquery())) or 0
        q = q.order_by(order_by if order_by is not None else m.id)
        rows = self.s.scalars(q.offset((page - 1) * per_page).limit(per_page)).all()
        return rows, total

    def find(self, *filters: Any) -> Sequence[M]:
        return self.s.scalars(self._base().where(*filters)).all()

    # ---- escrita --------------------------------------------------------------
    def add(self, **values: Any) -> M:
        obj = self.model(organization_id=self.org_id, **values)
        self.s.add(obj)
        self._flush()
        return obj

    def _flush(self) -> None:
        try:
            self.s.flush()
        except IntegrityError as exc:
            self.s.rollback()
            raise conflict("duplicate", f"{self.label} já existente") from exc

    def update(self, obj: M, values: dict[str, Any]) -> M:
        for k, v in values.items():
            setattr(obj, k, v)
        self._flush()
        return obj

    def delete(self, obj: M) -> None:
        if self.soft_delete and hasattr(obj, "deleted_at"):
            obj.deleted_at = datetime.now(UTC)
        else:
            self.s.delete(obj)
        self.s.flush()
