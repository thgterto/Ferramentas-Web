from __future__ import annotations

from typing import Annotated, Any

from fastapi import Query, Response

from app.schemas.common import ErrorResponse

PREFIX = "/api/v1/escalas"
PageQ = Annotated[int, Query(ge=1)]
PerPageQ = Annotated[int, Query(ge=1, le=200)]
LimitQ = Annotated[int, Query(ge=1, le=1000)]

ERRORS: dict[int | str, dict[str, Any]] = {
    401: {"model": ErrorResponse, "description": "unauthenticated"},
    403: {"model": ErrorResponse, "description": "forbidden"},
    404: {"model": ErrorResponse, "description": "not_found (inclui outro tenant)"},
    422: {"model": ErrorResponse, "description": "validation_error"},
}


def created(response: Response, path: str) -> None:
    response.status_code = 201
    response.headers["Location"] = PREFIX + path


def csv_list(v: str | None) -> list[str] | None:
    return [x for x in v.split(",") if x] if v else None
