"""Usuários e vínculos (fora da RLS de tenant: o login precisa achar o usuário)."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from escalas.db.models import Membership, Organization, User
from escalas.db.session import set_user


class UserRepository:
    def __init__(self, session: Session) -> None:
        self.s = session

    def by_email(self, email: str) -> User | None:
        return self.s.scalar(select(User).where(User.email == email.strip().lower(),
                                                User.deleted_at.is_(None)))

    def by_public_id(self, pid: uuid.UUID) -> User | None:
        return self.s.scalar(select(User).where(User.public_id == pid,
                                                User.deleted_at.is_(None)))

    def membership(self, user_id: int, org_public_id: uuid.UUID | None) -> Membership | None:
        set_user(self.s, user_id)
        q = (select(Membership).join(Organization)
             .where(Membership.user_id == user_id, Organization.deleted_at.is_(None)))
        if org_public_id is not None:
            q = q.where(Organization.public_id == org_public_id)
        return self.s.scalars(q.order_by(Membership.id)).first()

    def create_org(self, name: str) -> Organization:
        org = Organization(name=name)
        self.s.add(org)
        self.s.flush()
        return org

    def create_user(self, email: str, full_name: str, password_hash: str) -> User:
        u = User(email=email.strip().lower(), full_name=full_name, password_hash=password_hash)
        self.s.add(u)
        self.s.flush()
        return u

    def add_membership(self, org: Organization, user: User, role: str) -> Membership:
        m = Membership(organization_id=org.id, user_id=user.id, role=role)
        self.s.add(m)
        self.s.flush()
        return m
