from __future__ import annotations

import uuid

from pydantic import BaseModel, Field

from app.schemas.common import In


class LoginIn(In):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=200)
    organization_id: uuid.UUID | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class MembershipOut(BaseModel):
    organization_id: uuid.UUID
    organization_name: str
    role: str


class MeOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    current_organization_id: uuid.UUID
    current_role: str
    memberships: list[MembershipOut]
