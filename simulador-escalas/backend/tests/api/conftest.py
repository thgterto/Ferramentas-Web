"""Fixtures de integração: SQLite em memória + duas organizações (isolamento A × B)."""

from __future__ import annotations

import os
from collections.abc import Iterator
from dataclasses import dataclass
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker

from escalas.core.security import create_access_token, hash_password
from escalas.db.base import Base
from escalas.db.seeds import seed_globals
from escalas.db.session import get_session, make_engine
from escalas.main import app
from escalas.repositories.tenancy import UserRepository

API = "/api/v1/escalas"
PASSWORD = "s3nha-forte"


@dataclass
class Ctx:
    client: TestClient
    tokens: dict[str, str]
    orgs: dict[str, Any]

    def h(self, who: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.tokens[who]}"}

    def get(self, path: str, who: str = "a_owner", **kw: Any) -> Any:
        return self.client.get(API + path, headers=self.h(who), **kw)

    def post(self, path: str, who: str = "a_owner", **kw: Any) -> Any:
        return self.client.post(API + path, headers=self.h(who), **kw)

    def put(self, path: str, who: str = "a_owner", **kw: Any) -> Any:
        return self.client.put(API + path, headers=self.h(who), **kw)

    def patch(self, path: str, who: str = "a_owner", headers: dict[str, str] | None = None,
              **kw: Any) -> Any:
        return self.client.patch(API + path, headers={**self.h(who), **(headers or {})}, **kw)

    def delete(self, path: str, who: str = "a_owner") -> Any:
        return self.client.delete(API + path, headers=self.h(who))


PG_ADMIN = os.environ.get("TEST_POSTGRES_URL")  # ex.: postgresql+psycopg2://u:p@localhost/db
APP_ROLE = "escalas_app_test"


@pytest.fixture(scope="session")
def pg_urls() -> Iterator[tuple[str, str] | None]:
    """Com ``TEST_POSTGRES_URL``: migra (Alembic + RLS) e cria um login sem BYPASSRLS."""
    if not PG_ADMIN:
        yield None
        return
    from sqlalchemy import make_url

    from tests.db.test_migrations import alembic_upgrade

    admin = make_engine(PG_ADMIN)
    with admin.begin() as c:
        c.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public"))
    alembic_upgrade(PG_ADMIN, "head")
    with admin.begin() as c:
        c.execute(text(f"DROP ROLE IF EXISTS {APP_ROLE}"))
        c.execute(text(f"CREATE ROLE {APP_ROLE} LOGIN PASSWORD '{APP_ROLE}' IN ROLE app_user"))
    admin.dispose()
    url = make_url(PG_ADMIN).set(username=APP_ROLE, password=APP_ROLE)
    yield PG_ADMIN, url.render_as_string(hide_password=False)


@pytest.fixture()
def sm(pg_urls: tuple[str, str] | None) -> Iterator[tuple[sessionmaker[Session], Any]]:
    """(sessões da API, sessões administrativas para fixtures)."""
    if pg_urls is None:
        eng = make_engine("sqlite://")
        Base.metadata.create_all(eng)
        maker = sessionmaker(bind=eng, expire_on_commit=False)
        with maker() as s:
            seed_globals(s)
        yield maker, maker
        eng.dispose()
        return
    admin = make_engine(pg_urls[0])
    app_eng = make_engine(pg_urls[1])
    with admin.begin() as c:
        c.execute(text("DELETE FROM organizations"))
        c.execute(text("DELETE FROM users"))
    yield (sessionmaker(bind=app_eng, expire_on_commit=False),
           sessionmaker(bind=admin, expire_on_commit=False))
    app_eng.dispose()
    admin.dispose()


@pytest.fixture()
def ctx(sm: tuple[sessionmaker[Session], Any]) -> Iterator[Ctx]:
    app_sm, admin_sm = sm
    def _session() -> Iterator[Session]:
        with app_sm() as s:
            yield s

    app.dependency_overrides[get_session] = _session
    tokens: dict[str, str] = {}
    orgs: dict[str, Any] = {}
    with admin_sm() as s:
        repo = UserRepository(s)
        for org_key, users in {"a": ["owner", "viewer", "planner"], "b": ["owner"]}.items():
            org = repo.create_org(f"Org {org_key.upper()}")
            orgs[org_key] = org.public_id
            for role in users:
                u = repo.create_user(f"{role}@{org_key}.test", f"{role} {org_key}",
                                     hash_password(PASSWORD))
                repo.add_membership(org, u, role)
                tokens[f"{org_key}_{role}"] = create_access_token(u.public_id, org.public_id,
                                                                  role)
        s.commit()
    with TestClient(app) as c:
        yield Ctx(c, tokens, orgs)
    app.dependency_overrides.clear()


def setup_operation(c: Ctx, who: str = "a_owner", postos: int = 3,
                    model: str = "6X2", teams: int = 4, **scenario: Any) -> dict[str, str]:
    """Cria acordo + operação + posto + curva 24/7 + cenário; devolve os ids."""
    ag = c.post("/labor-agreements", who, json={
        "name": "CLT padrão", "kind": "CLT_PADRAO", "valid_from": "2026-01-01"}).json()["data"]
    op = c.post("/operations", who, json={"name": "UTI", "sector": "saude"}).json()["data"]
    pos = c.post(f"/operations/{op['id']}/positions", who,
                 json={"name": "Operador"}).json()["data"]
    cur = c.post(f"/positions/{pos['id']}/demand-curves", who,
                 json={"name": "24x7", "values": [str(postos)] * 168}).json()["data"]
    body = {"name": f"{model} {teams}T", "operation_id": op["id"], "schedule_model_code": model,
            "labor_agreement_id": ag["id"], "demand_curve_id": cur["id"],
            "shift_template_codes": ["M", "T", "N"], "team_count": teams,
            "horizon_start": "2027-01-04", "horizon_weeks": 8,
            "legal_regime_code": "CLT_44H_ATUAL", **scenario}
    r = c.post("/scenarios", who, json=body)
    assert r.status_code == 201, r.text
    return {"agreement": ag["id"], "operation": op["id"], "position": pos["id"],
            "curve": cur["id"], "scenario": r.json()["data"]["id"]}
