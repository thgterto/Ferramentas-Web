from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import DB, Current
from app.api.v1.escalas._common import ERRORS
from app.schemas.auth import LoginIn, MeOut, TokenOut
from app.schemas.common import Envelope
from app.services.escalas import auth_service

router = APIRouter(tags=["auth"], responses=ERRORS)


@router.post("/auth/login", response_model=TokenOut)
def login(body: LoginIn, db: DB) -> TokenOut:
    """E-mail/senha → JWT de acesso (refresh: Fase 2)."""
    return auth_service.login(db, body)


@router.get("/me", response_model=Envelope[MeOut])
def me(p: Current) -> dict[str, object]:
    return {"data": auth_service.me(p)}
