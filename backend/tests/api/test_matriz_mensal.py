"""v3.6: matriz mensal pessoa × dia, exportações e sobreposição de passagem na API."""

from __future__ import annotations

import csv
import io

from openpyxl import load_workbook

from tests.api.conftest import Ctx, setup_operation


def _sim(ctx: Ctx, **kw: object) -> str:
    ids = setup_operation(ctx, **kw)  # type: ignore[arg-type]
    r = ctx.post(f"/scenarios/{ids['scenario']}/simulate")
    assert r.status_code == 200, r.text
    return ids["scenario"]


def test_matriz_mensal_6x2(ctx: Ctx) -> None:
    sid = _sim(ctx)
    r = ctx.get(f"/scenarios/{sid}/monthly-matrix?month=2027-01")
    assert r.status_code == 200, r.text
    mx = r.json()["data"]
    assert mx["month"] == "2027-01" and len(mx["days"]) == 31
    assert mx["days"][0]["holiday"] == "Confraternização Universal"
    assert mx["days"][1]["is_weekend"] and mx["days"][1]["weekday"] == 6  # 02/01/2027 sáb
    # 4 turmas × 3 pessoas (postos = 3) fictícias A-01…D-03
    assert len(mx["people"]) == 12 and mx["people"][0]["id"] == "A-01"
    assert mx["generated_people"] is True
    assert {s["code"] for s in mx["shifts"]} == {"M", "T", "N"}
    assert next(s for s in mx["shifts"] if s["code"] == "N")["night"] is True
    for d in mx["daily"][3:]:   # a partir da âncora (04/01) a escala é a do cenário
        assert d["by_shift"] == {"M": 3, "T": 3, "N": 3} and d["off"] == 3
        assert d["deficit_shifts"] == [] and d["deficit_hours"] == 0
    p = mx["people"][0]
    t = p["totals"]
    assert t["worked_days"] + t["off_days"] == 31
    assert float(t["hours"]) == t["worked_days"] * 8
    # noite que vem do dia anterior aparece como continuação (← N)
    carries = [(i, c) for i, c in enumerate(p["cells"]) if c["carry"] == "N"]
    assert carries and all(p["cells"][i - 1]["code"] == "N" for i, _ in carries if i)
    # coerência com as alocações do horizonte (âncora 2027-01-04)
    asg = ctx.get(f"/scenarios/{sid}/assignments?team=A&limit=7").json()["data"]
    for a, c in zip(asg, p["cells"][3:10], strict=True):
        assert (a["shift_code"] or "F") == c["code"]


def test_matriz_mes_invalido_422(ctx: Ctx) -> None:
    sid = _sim(ctx)
    assert ctx.get(f"/scenarios/{sid}/monthly-matrix?month=2027-13").status_code == 422


def test_matriz_export_xlsx_csv_ics(ctx: Ctx) -> None:
    sid = _sim(ctx)
    r = ctx.get(f"/scenarios/{sid}/monthly-matrix/export?month=2027-01&months=2&format=xlsx")
    assert r.status_code == 200
    wb = load_workbook(io.BytesIO(r.content))
    assert wb.sheetnames == ["2027-01", "2027-02"]
    ws = wb["2027-01"]
    assert ws["A2"].value == "A-01" and ws["D1"].value == "01 sex"
    cell = next(c for c in ws[2][3:34] if c.value in ("M", "T", "N"))
    assert cell.fill.fill_type == "solid" and cell.font.bold
    r = ctx.get(f"/scenarios/{sid}/monthly-matrix/export?month=2027-02&format=csv")
    rows = list(csv.reader(io.StringIO(r.content.decode("utf-8-sig")), delimiter=";"))
    assert rows[0][:4] == ["pessoa", "turma", "cargo", "01 seg"] and len(rows[0]) == 3 + 28 + 5
    assert any(r[0] == "em folga" for r in rows)
    r = ctx.get(f"/scenarios/{sid}/monthly-matrix/export?month=2027-02&format=csv&person=B-02")
    rows = list(csv.reader(io.StringIO(r.content.decode("utf-8-sig")), delimiter=";"))
    assert rows[0][0] == "data" and len(rows) == 29
    r = ctx.get(f"/scenarios/{sid}/monthly-matrix/export?month=2027-02&format=ics&person=B-02")
    assert r.status_code == 200 and b"BEGIN:VEVENT" in r.content


def test_sobreposicao_passagem_status_e_matriz(ctx: Ctx) -> None:
    sid = _sim(ctx, model="6X2_PASSAGEM", teams=4)
    cov = ctx.get(f"/scenarios/{sid}/coverage").json()["data"]
    st = {s["start"]: s["status"] for s in cov["slots"] if s["weekday"] == 3}
    assert st["06:00"] == st["14:00"] == st["22:00"] == "passagem"
    assert st["10:00"] == "exata"
    assert float(cov["kpis"]["excess_post_hours"]) == 0
    assert float(cov["kpis"]["handover_post_hours"]) > 0
    f = ctx.get(f"/scenarios/{sid}/compliance-findings").json()["data"]
    codes = {x["rule_code"] for x in f}
    assert "COB_PASSAGEM_PLANEJADA" in codes and "COB_EXCESSO" not in codes
    sc = ctx.get(f"/scenarios/{sid}").json()["data"]
    assert {s["code"]: s["handover_min"] for s in sc["shifts"]} == {"MP": 20, "TP": 20, "NP": 20}
    mx = ctx.get(f"/scenarios/{sid}/monthly-matrix?month=2027-02").json()["data"]
    assert mx["daily"][0]["handover_hours"] == 3
    p = mx["people"][0]
    worked = p["totals"]["worked_days"]
    assert abs(float(p["totals"]["hours"]) - worked * 500 / 60) < 1e-4  # 8h20 reais


def test_nucleo_pico_generico(ctx: Ctx) -> None:
    sid = _sim(ctx, model="NUCLEO_PICO", teams=5)
    mx = ctx.get(f"/scenarios/{sid}/monthly-matrix?month=2027-01").json()["data"]
    pico = next(s for s in mx["shifts"] if s["code"] == "PICO")
    assert pico["peak"] is True and pico["label"] == "10–18:48"
    assert len({p["team"] for p in mx["people"]}) == 5
    # semanal: o pico trabalha seg–sex
    seg = mx["daily"][3]   # 04/01/2027 = segunda
    assert seg["by_shift"].get("PICO", 0) > 0 and mx["daily"][2]["by_shift"].get("PICO", 0) == 0
