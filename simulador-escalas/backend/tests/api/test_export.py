"""A31: export CSV/XLSX com round-trip (FR-23)."""

from __future__ import annotations

import csv
import io

from openpyxl import load_workbook

from tests.api.conftest import Ctx, setup_operation


def _simulated(ctx: Ctx, **kw: object) -> str:
    ids = setup_operation(ctx, **kw)  # type: ignore[arg-type]
    assert ctx.post(f"/scenarios/{ids['scenario']}/simulate").status_code == 200
    return ids["scenario"]


def test_export_csv_round_trip(ctx: Ctx) -> None:
    sid = _simulated(ctx)
    r = ctx.post(f"/scenarios/{sid}/exports", json={"format": "csv"})
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers["content-disposition"]
    text = r.content.decode("utf-8-sig")
    rows = list(csv.reader(io.StringIO(text), delimiter=";"))
    assert rows[0][:3] == ["slot", "dia", "hora"]
    assert len(rows) == 169
    cov = ctx.get(f"/scenarios/{sid}/coverage").json()["data"]["slots"]
    for row, slot in zip(rows[1:], cov, strict=True):
        assert int(row[0]) == slot["slot_index"]
        assert row[3] == slot["required_net"] and row[7] == slot["status"]


def test_export_csv_escala(ctx: Ctx) -> None:
    sid = _simulated(ctx)
    r = ctx.post(f"/scenarios/{sid}/exports",
                 json={"format": "csv", "options": {"sheets": ["Escala"]}})
    rows = list(csv.reader(io.StringIO(r.content.decode("utf-8-sig")), delimiter=";"))
    assert rows[0][0] == "turma" and len(rows) == 1 + 4 * 56


def test_export_xlsx_round_trip(ctx: Ctx) -> None:
    sid = _simulated(ctx, model="4X2", teams=4)
    r = ctx.post(f"/scenarios/{sid}/exports", json={"format": "xlsx"})
    assert r.status_code == 200
    wb = load_workbook(io.BytesIO(r.content))
    assert wb.sheetnames == ["Escala", "Cobertura168h", "KPIs", "Violacoes", "Parametros"]
    cov = list(wb["Cobertura168h"].iter_rows(values_only=True))
    assert len(cov) == 169 and any(row[7] == "deficit" for row in cov[1:])
    viol = list(wb["Violacoes"].iter_rows(values_only=True))
    api = ctx.get(f"/scenarios/{sid}/compliance-findings").json()["data"]
    assert {row[0] for row in viol[1:]} == {f["rule_code"] for f in api}
    params = dict(wb["Parametros"].iter_rows(values_only=True))
    assert params["modelo"] == "4X2" and params["turmas"] == 4


def test_export_antes_de_simular_409(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    assert ctx.post(f"/scenarios/{ids['scenario']}/exports", json={}).status_code == 409


def test_export_isolado_por_org(ctx: Ctx) -> None:
    sid = _simulated(ctx)
    assert ctx.post(f"/scenarios/{sid}/exports", "b_owner", json={}).status_code == 404
