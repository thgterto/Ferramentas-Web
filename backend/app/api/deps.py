"""Dependências: sessão, usuário corrente (JWT), tenant e papéis (F0-5, F2-7)."""

from __future__ import annotations

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import forbidden, unauthenticated
from app.core.security import decode_access_token
from app.db.models import Organization, User
from app.db.session import get_session, set_tenant
from app.repositories.tenancy import UserRepository

WRITE_ROLES = frozenset({"owner", "admin", "planner"})

_bearer = HTTPBearer(auto_error=False)
DB = Annotated[Session, Depends(get_session)]


@dataclass(frozen=True, slots=True)
class Principal:
    user: User
    org: Organization
    role: str

    @property
    def org_id(self) -> int:
        return self.org.id


def current_principal(
    db: DB,
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    x_organization_id: Annotated[uuid.UUID | None, Header()] = None,
) -> Principal:
    if cred is None or cred.scheme.lower() != "bearer":
        raise unauthenticated()
    try:
        claims = decode_access_token(cred.credentials)
        user_pid = uuid.UUID(str(claims["sub"]))
        org_claim = uuid.UUID(claims["org"]) if claims.get("org") else None
    except (jwt.PyJWTError, ValueError, KeyError) as exc:
        raise unauthenticated("token inválido ou expirado") from exc
    repo = UserRepository(db)
    user = repo.by_public_id(user_pid)
    if user is None:
        raise unauthenticated("usuário inexistente")
    m = repo.membership(user.id, x_organization_id or org_claim)
    if m is None:
        raise forbidden("sem vínculo com a organização")
    set_tenant(db, m.organization_id, user.id)
    return Principal(user, m.organization, m.role)


Current = Annotated[Principal, Depends(current_principal)]


def require_roles(*roles: str) -> Callable[[Principal], Principal]:
    allowed = frozenset(roles)

    def _dep(p: Current) -> Principal:
        if p.role not in allowed:
            raise forbidden(f"papel '{p.role}' não pode executar esta ação")
        return p

    return _dep


Writer = Annotated[Principal, Depends(require_roles(*WRITE_ROLES))]
