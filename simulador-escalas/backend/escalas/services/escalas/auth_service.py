"""Login (e-mail/senha → JWT de acesso) e ``/me``."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from escalas.core.config import settings
from escalas.core.errors import AppError, unauthenticated
from escalas.core.security import create_access_token, verify_password
from escalas.repositories.tenancy import UserRepository
from escalas.schemas.auth import LoginIn, MembershipOut, MeOut, TokenOut

if TYPE_CHECKING:
    from escalas.api.deps import Principal


def login(db: Session, body: LoginIn) -> TokenOut:
    repo = UserRepository(db)
    user = repo.by_email(body.email)
    if user is None or not verify_password(body.password, user.password_hash):
        raise unauthenticated("credenciais inválidas")
    m = repo.membership(user.id, body.organization_id)
    if m is None:
        raise AppError(403, "forbidden", "usuário sem vínculo com a organização")
    user.last_login_at = datetime.now(UTC)
    db.commit()
    token = create_access_token(user.public_id, m.organization.public_id, m.role)
    return TokenOut(access_token=token, expires_in=settings.access_token_minutes * 60)


def me(p: Principal) -> MeOut:
    return MeOut(
        id=p.user.public_id, email=p.user.email, full_name=p.user.full_name,
        current_organization_id=p.org.public_id, current_role=p.role,
        memberships=[MembershipOut(organization_id=m.organization.public_id,
                                   organization_name=m.organization.name, role=m.role)
                     for m in p.user.memberships])
