"""A07/F2-7: login, 401/403, isolamento org A × org B (filtro no repositório)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import settings
from tests.api.conftest import API, PASSWORD, Ctx, setup_operation


def test_login_e_me(ctx: Ctx) -> None:
    r = ctx.client.post(f"{API}/auth/login", json={"email": "OWNER@a.test",
                                                    "password": PASSWORD})
    assert r.status_code == 200
    tok = r.json()["access_token"]
    me = ctx.client.get(f"{API}/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.status_code == 200
    assert me.json()["data"]["current_role"] == "owner"
    assert me.json()["data"]["current_organization_id"] == str(ctx.orgs["a"])


def test_login_senha_errada_401(ctx: Ctx) -> None:
    r = ctx.client.post(f"{API}/auth/login", json={"email": "owner@a.test", "password": "x"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthenticated"


def test_sem_token_401(ctx: Ctx) -> None:
    r = ctx.client.get(f"{API}/operations")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "unauthenticated"


def test_token_expirado_ou_adulterado_401(ctx: Ctx) -> None:
    claims = jwt.decode(ctx.tokens["a_owner"], options={"verify_signature": False})
    claims["exp"] = datetime.now(UTC) - timedelta(minutes=1)
    expirado = jwt.encode(claims, settings.jwt_secret, algorithm="HS256")
    adulterado = jwt.encode({**claims, "exp": datetime.now(UTC) + timedelta(hours=1)},
                            "outro-segredo-qualquer-com-32-bytes!!", algorithm="HS256")
    for t in (expirado, adulterado, "lixo"):
        r = ctx.client.get(f"{API}/operations", headers={"Authorization": f"Bearer {t}"})
        assert r.status_code == 401


def test_viewer_nao_escreve_403(ctx: Ctx) -> None:
    r = ctx.post("/operations", "a_viewer", json={"name": "X op"})
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "forbidden"
    assert ctx.get("/operations", "a_viewer").status_code == 200
    assert ctx.post("/operations", "a_planner", json={"name": "Y op"}).status_code == 201


def test_header_de_org_sem_vinculo_403(ctx: Ctx) -> None:
    h = {**ctx.h("a_owner"), "X-Organization-Id": str(ctx.orgs["b"])}
    assert ctx.client.get(f"{API}/operations", headers=h).status_code == 403


def test_org_a_nao_le_org_b(ctx: Ctx) -> None:
    ids = setup_operation(ctx, "b_owner")
    assert ctx.client.post(f"{API}/scenarios/{ids['scenario']}/simulate",
                           headers=ctx.h("b_owner")).status_code == 200
    # listas de A vazias
    for path in ("/operations", "/labor-agreements", "/scenarios", "/roles",
                 "/shrinkage-profiles"):
        r = ctx.get(path)
        assert r.status_code == 200 and r.json()["data"] == [], path
    # acesso direto → 404 (nunca 403, para não vazar existência)
    for path in (f"/operations/{ids['operation']}", f"/positions/{ids['position']}",
                 f"/demand-curves/{ids['curve']}", f"/demand-curves/{ids['curve']}/slots",
                 f"/labor-agreements/{ids['agreement']}", f"/scenarios/{ids['scenario']}",
                 f"/scenarios/{ids['scenario']}/coverage",
                 f"/scenarios/{ids['scenario']}/compliance-findings",
                 f"/scenarios/{ids['scenario']}/assignments"):
        r = ctx.get(path)
        assert r.status_code == 404, path
        assert r.json()["error"]["code"] == "not_found"
    assert ctx.post(f"/scenarios/{ids['scenario']}/simulate").status_code == 404
    assert ctx.delete(f"/operations/{ids['operation']}").status_code == 404
    # A não usa recursos de B como referência
    mine = setup_operation(ctx, "a_owner")
    r = ctx.post("/scenarios", json={
        "name": "cruzado", "operation_id": mine["operation"], "schedule_model_code": "6X2",
        "labor_agreement_id": ids["agreement"], "demand_curve_id": mine["curve"],
        "team_count": 4, "horizon_start": "2027-01-04"})
    assert r.status_code == 404
    # B continua vendo o seu
    assert ctx.get(f"/scenarios/{ids['scenario']}", "b_owner").status_code == 200
