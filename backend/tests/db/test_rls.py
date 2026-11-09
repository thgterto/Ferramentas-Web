"""A21/F2-7: RLS no PostgreSQL — com app.org_id = A nenhuma linha de B é visível/gravável."""

from __future__ import annotations

import os

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db.models import TENANT_TABLES
from app.db.session import make_engine

PG = os.environ.get("TEST_POSTGRES_URL")
pytestmark = pytest.mark.skipif(not PG, reason="TEST_POSTGRES_URL não definido")


@pytest.mark.usefixtures("pg_urls")
def test_rls_isola_tenants(pg_urls: tuple[str, str]) -> None:
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import sessionmaker

    from app.core.security import create_access_token, hash_password
    from app.db.session import get_session
    from app.main import app
    from app.repositories.tenancy import UserRepository
    from tests.api.conftest import Ctx, setup_operation

    admin = make_engine(pg_urls[0])
    app_eng = make_engine(pg_urls[1])
    with admin.begin() as c:
        c.execute(text("DELETE FROM organizations"))
        c.execute(text("DELETE FROM users"))
    asm = sessionmaker(bind=admin, expire_on_commit=False)
    tokens, orgs = {}, {}
    with asm() as s:
        repo = UserRepository(s)
        for k in ("a", "b"):
            org = repo.create_org(f"Org {k}")
            u = repo.create_user(f"rls@{k}.test", k, hash_password("x"))
            repo.add_membership(org, u, "owner")
            tokens[f"{k}_owner"] = create_access_token(u.public_id, org.public_id, "owner")
            orgs[k] = org.id
        s.commit()

    def _session():  # type: ignore[no-untyped-def]
        with sessionmaker(bind=app_eng, expire_on_commit=False)() as s:
            yield s

    app.dependency_overrides[get_session] = _session
    try:
        with TestClient(app) as cl:
            cx = Ctx(cl, tokens, {})
            for who in ("a_owner", "b_owner"):
                ids = setup_operation(cx, who)
                assert cx.post(f"/scenarios/{ids['scenario']}/simulate", who).status_code == 200
    finally:
        app.dependency_overrides.clear()

    with app_eng.connect() as conn:
        tx = conn.begin()
        conn.execute(text("SELECT set_config('app.org_id', :o, true)"), {"o": str(orgs["a"])})
        for t in TENANT_TABLES:
            vistos = {r[0] for r in conn.execute(text(f"SELECT DISTINCT organization_id FROM {t}"))}
            assert orgs["b"] not in vistos, t
        tem_a = conn.execute(text("SELECT count(*) FROM scenarios")).scalar_one()
        assert tem_a == 1
        assert conn.execute(text("SELECT count(*) FROM organizations")).scalar_one() == 1
        tx.rollback()
        # sem tenant: nada visível
        assert conn.execute(text("SELECT count(*) FROM scenarios")).scalar_one() == 0
        conn.rollback()
        tx = conn.begin()
        conn.execute(text("SELECT set_config('app.org_id', :o, true)"), {"o": str(orgs["a"])})
        with pytest.raises(DBAPIError):
            conn.execute(text("INSERT INTO operations (public_id, organization_id, name, sector,"
                              " is_24x7, timezone, created_at, updated_at) VALUES "
                              "(gen_random_uuid(), :b, 'invasão', 'outro', true, 'x', now(), "
                              "now())"), {"b": orgs["b"]})
        tx.rollback()
        with pytest.raises(DBAPIError):
            conn.execute(text("UPDATE schedule_models SET name = 'x'"))
        conn.rollback()
    with admin.begin() as c:
        assert c.execute(text("SELECT count(*) FROM scenarios")).scalar_one() == 2
    admin.dispose()
    app_eng.dispose()
