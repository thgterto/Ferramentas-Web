"""Erros de domínio → envelope ``{"error": {...}}`` (05 §5.3), só sob /api/v1/escalas."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

PREFIX = "/api/v1/escalas"


class AppError(Exception):
    def __init__(self, status: int, code: str, message: str,
                 details: list[dict[str, Any]] | None = None,
                 headers: dict[str, str] | None = None) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details or []
        self.headers = headers


def not_found(what: str = "recurso") -> AppError:
    return AppError(404, "not_found", f"{what} não encontrado")


def unauthenticated(msg: str = "token ausente ou inválido") -> AppError:
    return AppError(401, "unauthenticated", msg, headers={"WWW-Authenticate": "Bearer"})


def forbidden(msg: str = "papel insuficiente") -> AppError:
    return AppError(403, "forbidden", msg)


def validation(msg: str, details: list[dict[str, Any]] | None = None,
               code: str = "validation_error") -> AppError:
    return AppError(422, code, msg, details)


def conflict(code: str, msg: str) -> AppError:
    return AppError(409, code, msg)


def _body(code: str, message: str, details: list[dict[str, Any]]) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "request_id": str(uuid.uuid4()),
                      "details": details}}


def install_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(_body(exc.code, exc.message, exc.details), status_code=exc.status,
                            headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        if not request.url.path.startswith(PREFIX):
            return await request_validation_exception_handler(request, exc)
        details = [{"field": ".".join(str(p) for p in e["loc"][1:]) or str(e["loc"][0]),
                    "code": e["type"], "message": e["msg"]} for e in exc.errors()]
        return JSONResponse(_body("validation_error", "Request validation failed", details),
                            status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        if not request.url.path.startswith(PREFIX):
            return await http_exception_handler(request, exc)  # type: ignore[return-value]
        code = {404: "not_found", 405: "method_not_allowed", 401: "unauthenticated",
                403: "forbidden"}.get(exc.status_code, "http_error")
        return JSONResponse(_body(code, str(exc.detail), []), status_code=exc.status_code)
