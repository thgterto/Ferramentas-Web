"""Envelope ``{data, meta, links}``, decimais como string (NUMERIC(18,6)) e paginação (05 §5.1)."""

from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, WithJsonSchema

T = TypeVar("T")


def _fmt(d: Decimal) -> str:
    return f"{d.quantize(Decimal('0.000001')):f}"


Dec6 = Annotated[
    Decimal,
    Field(max_digits=18, decimal_places=6),
    PlainSerializer(_fmt, return_type=str, when_used="json"),
    WithJsonSchema({"type": "string", "pattern": r"^-?\d+(\.\d{1,6})?$",
                    "examples": ["0.200000"]}, mode="serialization"),
]


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class In(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Envelope(BaseModel, Generic[T]):
    data: T


class PageMeta(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class PageLinks(BaseModel):
    self: str
    next: str | None = None


class Page(BaseModel, Generic[T]):
    data: list[T]
    meta: PageMeta
    links: PageLinks


class CursorMeta(BaseModel):
    limit: int
    has_next: bool
    next_cursor: str | None = None


class CursorPage(BaseModel, Generic[T]):
    data: list[T]
    meta: CursorMeta


class ErrorDetail(BaseModel):
    field: str | None = None
    code: str
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    request_id: str
    details: list[ErrorDetail] = []


class ErrorResponse(BaseModel):
    error: ErrorBody


def page_of(items: list[Any], page: int, per_page: int, total: int, path: str) -> dict[str, Any]:
    pages = max(1, -(-total // per_page))
    nxt = f"{path}?page={page + 1}&per_page={per_page}" if page < pages else None
    return {"data": items,
            "meta": {"page": page, "per_page": per_page, "total": total, "total_pages": pages},
            "links": {"self": f"{path}?page={page}&per_page={per_page}", "next": nxt}}
