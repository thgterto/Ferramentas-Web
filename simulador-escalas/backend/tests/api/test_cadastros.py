"""A22: CRUD de operações/postos/curvas/cenários + upload da curva 168 h (CSV/XLSX)."""

from __future__ import annotations

import io

from openpyxl import Workbook

from tests.api.conftest import Ctx, setup_operation


def _csv(valor: int = 2, pular: int | None = None) -> bytes:
    linhas = ["dia,hora,demanda"]
    for d in range(1, 8):
        for h in range(24):
            if pular is not None and (d - 1) * 24 + h == pular:
                continue
            linhas.append(f"{d},{h},{valor}")
    return "\n".join(linhas).encode()


def test_crud_operacao_e_posto(ctx: Ctx) -> None:
    r = ctx.post("/operations", json={"name": "CD Cajamar", "sector": "logistica"})
    assert r.status_code == 201 and r.headers["Location"].endswith(r.json()["data"]["id"])
    oid = r.json()["data"]["id"]
    assert ctx.post("/operations", json={"name": "CD Cajamar"}).status_code == 409
    assert ctx.patch(f"/operations/{oid}", json={"name": "CD Cajamar 2"}).json()[
        "data"]["name"] == "CD Cajamar 2"
    p = ctx.post(f"/operations/{oid}/positions", json={"name": "Operador",
                                                       "is_mandatory_presence": True})
    assert p.status_code == 201
    lst = ctx.get(f"/operations/{oid}/positions").json()
    assert lst["meta"]["total"] == 1 and lst["links"]["next"] is None
    assert ctx.delete(f"/positions/{p.json()['data']['id']}").status_code == 204
    assert ctx.get(f"/operations/{oid}/positions").json()["meta"]["total"] == 0
    assert ctx.delete(f"/operations/{oid}").status_code == 204
    assert ctx.get(f"/operations/{oid}").status_code == 404


def test_validacao_422_envelope(ctx: Ctx) -> None:
    r = ctx.post("/operations", json={"name": "x", "sector": "marte"})
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "validation_error" and {d["field"] for d in err["details"]} >= {
        "name", "sector"}


def test_acordo_exemplo_05(ctx: Ctx) -> None:
    r = ctx.post("/labor-agreements", json={
        "name": "ACT Petroquímica 2026/2027", "kind": "ACT", "union_name": "Sindiquímica",
        "valid_from": "2026-09-01", "valid_to": "2027-08-31", "night_premium_pct": "0.350000",
        "overtime_pct": "0.600000", "overtime_sunday_pct": "1.000000",
        "hazard_pct": "0.300000", "social_charges_pct": "0.712000",
        "allows_8h_rotating": True, "allows_12x36": True, "sunday_rule_basis": "portaria_mte",
        "sunday_off_max_interval_weeks": 7, "holiday_calendar": "BR-BA-CAMACARI"})
    assert r.status_code == 201, r.text
    d = r.json()["data"]
    assert d["night_hour_factor"] == "1.142857"
    assert d["min_interjornada_hours"] == "11.000000"
    assert d["night_premium_pct"] == "0.350000"
    assert d["rules_version"] == 1


def test_slots_put_e_validacao(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    cid = ids["curve"]
    r = ctx.put(f"/demand-curves/{cid}/slots",
                json={"granularity": "60",
                      "slots": [{"slot_index": i, "required_value": "4.000000"}
                                for i in range(168)]})
    assert r.status_code == 200
    assert r.json()["data"]["slot_count"] == 168 and r.json()["data"]["night_slots"] == 49
    assert ctx.put(f"/demand-curves/{cid}/slots", json={"values": ["1"] * 167}).status_code == 422
    assert ctx.put(f"/demand-curves/{cid}/slots",
                   json={"values": ["1.5"] + ["1"] * 167}).status_code == 422
    slots = ctx.get(f"/demand-curves/{cid}/slots").json()["data"]["slots"]
    assert slots[22] == {"slot_index": 22, "weekday": 1, "start_minute": 1320,
                         "required_value": "4.000000", "is_night": True}


def test_import_csv_e_xlsx(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    url = f"/demand-curves/{ids['curve']}/slots:import"
    r = ctx.post(url, files={"file": ("curva.csv", _csv(2), "text/csv")})
    assert r.status_code == 200, r.text
    assert ctx.get(f"/demand-curves/{ids['curve']}").json()["data"]["source"] == "upload_csv"
    ruim = ctx.post(url, files={"file": ("curva.csv", _csv(2, pular=5), "text/csv")})
    assert ruim.status_code == 422 and "faltam 1 linhas" in ruim.json()["error"]["message"]
    wb = Workbook()
    ws = wb.active
    assert ws is not None
    ws.append(["dia", "hora", "demanda"])
    for i in range(168):
        ws.append([i // 24 + 1, i % 24, 3])
    buf = io.BytesIO()
    wb.save(buf)
    r = ctx.post(url, files={"file": ("curva.xlsx", buf.getvalue(),
                                      "application/vnd.openxmlformats-officedocument."
                                      "spreadsheetml.sheet")})
    assert r.status_code == 200, r.text
    vals = ctx.get(f"/demand-curves/{ids['curve']}/slots").json()["data"]["slots"]
    assert {s["required_value"] for s in vals} == {"3.000000"}
    assert ctx.post(url, files={"file": ("x.pdf", b"%PDF", "application/pdf")}).status_code == 422


def test_cenario_crud_if_match(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    sid = ids["scenario"]
    g = ctx.get(f"/scenarios/{sid}")
    assert g.status_code == 200 and g.headers["ETag"] == '"1"'
    assert g.json()["data"]["status"] == "rascunho"
    assert ctx.patch(f"/scenarios/{sid}", json={"team_count": 5}).status_code == 428
    assert ctx.patch(f"/scenarios/{sid}", json={"team_count": 5},
                     headers={"If-Match": '"9"'}).status_code == 412
    r = ctx.patch(f"/scenarios/{sid}", json={"team_count": 5}, headers={"If-Match": '"1"'})
    assert r.status_code == 200 and r.json()["data"]["team_count"] == 5
    assert r.headers["ETag"] == '"2"'
    assert ctx.post(f"/scenarios/{sid}/simulate").status_code == 200
    v = ctx.get(f"/scenarios/{sid}").json()["data"]["row_version"]
    assert ctx.patch(f"/scenarios/{sid}", json={"team_count": 4},
                     headers={"If-Match": f'"{v}"'}).status_code == 409
    lst = ctx.get("/scenarios?status=calculado").json()
    assert lst["meta"]["total"] == 1
    assert ctx.delete(f"/scenarios/{sid}").status_code == 204
    assert ctx.get(f"/scenarios/{sid}").status_code == 404


def test_cenario_modelo_inexistente_422(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    r = ctx.post("/scenarios", json={
        "name": "x y", "operation_id": ids["operation"], "schedule_model_code": "INEXISTENTE_X",
        "labor_agreement_id": ids["agreement"], "demand_curve_id": ids["curve"],
        "team_count": 4, "horizon_start": "2027-01-04"})
    assert r.status_code == 422
