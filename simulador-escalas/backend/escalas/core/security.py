"""Hash de senha (argon2) e JWT de acesso (F0-5)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from escalas.core.config import settings

_ph = PasswordHasher()


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return _ph.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def create_access_token(user_public_id: uuid.UUID, org_public_id: uuid.UUID | None,
                        role: str | None, minutes: int | None = None) -> str:
    now = datetime.now(UTC)
    claims: dict[str, Any] = {
        "sub": str(user_public_id),
        "org": str(org_public_id) if org_public_id else None,
        "roles": [role] if role else [],
        "iat": now,
        "exp": now + timedelta(minutes=minutes or settings.access_token_minutes),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """Levanta ``jwt.PyJWTError`` se inválido/expirado/adulterado."""
    claims: dict[str, Any] = jwt.decode(token, settings.jwt_secret,
                                        algorithms=[settings.jwt_algorithm],
                                        options={"require": ["sub", "exp"]})
    return claims
