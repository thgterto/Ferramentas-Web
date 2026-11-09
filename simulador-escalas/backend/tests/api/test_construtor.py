"""v3.5 — construtor de padrões, K livre, camadas e templates (FR-29–FR-33) pela API."""

from __future__ import annotations

from typing import Any

from tests.api.conftest import Ctx, setup_operation

M = {"code": "M", "start": "06:00", "duration_min": 480}
T = {"code": "T", "start": "14:00", "duration_min": 480}
N = {"code": "N", "start": "22:00", "duration_min": 480}


def _pattern(**layer: Any) -> dict[str, Any]:
    base = {"code": "NUCLEO", "sequence": ["M", "M", "T", "T", "N", "N", "F", "F", "F", "F"]}
    return {"name": "5 turmas custom", "shifts": [M, T, N], "layers": [{**base, **layer}]}


def _scenario(ctx: Ctx, pattern: dict[str, Any], postos: int = 3, **kw: Any) -> dict[str, str]:
    return setup_operation(ctx, postos=postos, model="PERSONALIZADO", teams=5,
                           params={"pattern": pattern}, **kw)


def test_derivar_modelo_do_catalogo(ctx: Ctx) -> None:
    r = ctx.get("/schedule-models/12X36/pattern?team_size=2")
    assert r.status_code == 200, r.text
    p = r.json()["data"]
    assert p["derived_from"] == "12X36"
    assert [(x["code"], x["sequence"], x["k"]) for x in p["layers"]] == [
        ("D12", ["D12", "F"], 2), ("N12", ["N12", "F"], 2)]
    nc = ctx.get("/schedule-models/4X3/pattern").json()["data"]
    assert nc["operating_window"] == {"weekdays": [0, 1, 2, 3, 4, 5, 6], "start": "07:00",
                                      "end": "17:00"}
    assert ctx.get("/schedule-models/NAOEXISTE/pattern").status_code == 404


def test_validar_em_tempo_real(ctx: Ctx) -> None:
    body = {"pattern": _pattern(sequence=["M", "M", "T", "T", "N", "N", "F", "F", "F"], k=5),
            "postos": 3}
    r = ctx.post("/schedule-patterns:validate", json=body)
    assert r.status_code == 200, r.text
    v = r.json()["data"]
    lay = v["layers"][0]
    assert lay["k_required"] == "4.500000" and lay["k_suggested"] == 5
    assert lay["exact"] is False and lay["exact_with_half_teams"] is True
    assert v["teams_total"] == 5 and len(v["slots"]) == 168
    assert "COB_PADRAO_NAO_EXATO" in {f["rule_code"] for f in v["findings"]}
    assert v["elapsed_ms"] < 1500
    # rotação para trás: N → T no dia seguinte ⇒ interjornada de 8 h (aviso, não bloqueio)
    tras = ctx.post("/schedule-patterns:validate", json={
        "pattern": _pattern(sequence=["M", "M", "T", "T", "N", "N", "F", "F"], k=4,
                            rotation="tras")}).json()["data"]
    assert tras["layers"][0]["min_rest_between_shifts_hours"] == "8.000000"
    assert "CLT_INTERJORNADA" in {f["rule_code"] for f in tras["findings"]}


def test_padrao_invalido_422(ctx: Ctx) -> None:
    bad = _pattern(sequence=["M", "X9", "F"])
    assert ctx.post("/schedule-patterns:validate", json={"pattern": bad}).status_code == 422
    ids = setup_operation(ctx)
    r = ctx.post("/scenarios", json={
        "name": "inv", "operation_id": ids["operation"], "schedule_model_code": "PERSONALIZADO",
        "labor_agreement_id": ids["agreement"], "demand_curve_id": ids["curve"],
        "team_count": 3, "horizon_start": "2027-01-04", "params": {"pattern": bad}})
    assert r.status_code == 422


def test_cenario_personalizado_k5_tamanhos_por_turma(ctx: Ctx) -> None:
    """Sequência livre de 10 dias, K = 5 fixo, turma E com 4 pessoas (tamanhos diferentes)."""
    ids = _scenario(ctx, _pattern(k=5, team_sizes=[3, 3, 3, 3, 4]))
    r = ctx.post(f"/scenarios/{ids['scenario']}/simulate")
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["team_count"]["k_used"] == 5 and d["kpis"]["coverage_pct"] == "1.000000"
    sc = ctx.get(f"/scenarios/{ids['scenario']}").json()["data"]
    assert [t["size_assigned"] for t in sc["teams"]] == [3, 3, 3, 3, 4]
    assert {s["code"] for s in sc["shifts"]} == {"M", "T", "N"}
    assert sc["layers"][0]["k"] == 5 and sc["schedule_model"]["code"] == "PERSONALIZADO"
    asg = ctx.get(f"/scenarios/{ids['scenario']}/assignments?limit=1000").json()["data"]
    assert {a["team"] for a in asg} == {"A", "B", "C", "D", "E"}
    n = next(a for a in asg if a["shift_code"] == "N")
    assert n["starts_at"].endswith("22:00:00") and n["clock_minutes"] == 480


def test_k_sugerir_e_faixa(ctx: Ctx) -> None:
    seq = ["M", "M", "T", "T", "N", "N", "F", "F", "F"]   # K* = 4,5
    ids = _scenario(ctx, _pattern(sequence=seq, team_mode="sugerir"))
    d = ctx.post(f"/scenarios/{ids['scenario']}/simulate").json()["data"]
    assert d["team_count"]["k_used"] == 5 and d["kpis"]["coverage_pct"] == "1.000000"
    assert "COB_K_SUGERIDO" in {f["rule_code"] for f in d["findings"]}
    r = ctx.post("/scenarios", json={
        "name": "faixa", "operation_id": ids["operation"], "schedule_model_code": "PERSONALIZADO",
        "labor_agreement_id": ids["agreement"], "demand_curve_id": ids["curve"],
        "team_count": 3, "horizon_start": "2027-01-04", "legal_regime_code": "CLT_44H_ATUAL",
        "params": {"pattern": _pattern(sequence=seq, team_mode="faixa", k_min=2, k_max=3)}})
    d2 = ctx.post(f"/scenarios/{r.json()['data']['id']}/simulate").json()["data"]
    assert d2["team_count"]["k_used"] == 3
    assert "COB_K_INSUFICIENTE" in {f["rule_code"] for f in d2["findings"]}


def test_offsets_manuais_e_folga_fixa(ctx: Ctx) -> None:
    ids = _scenario(ctx, _pattern(sequence=["M", "M", "T", "T", "N", "N", "F", "F"], k=4,
                                  offsets=[0, 2, 4, 6], fixed_off_weekdays=[6]))
    d = ctx.post(f"/scenarios/{ids['scenario']}/simulate").json()["data"]
    sc = ctx.get(f"/scenarios/{ids['scenario']}").json()["data"]
    assert [t["cycle_offset_days"] for t in sc["teams"]] == [0, 2, 4, 6]
    # domingo fixo de folga sobre o 6x2: cobertura de domingo cai (déficit, nunca bloqueio)
    assert d["kpis"]["coverage_pct"] < "1.000000"
    cov = ctx.get(f"/scenarios/{ids['scenario']}/coverage").json()["data"]["slots"]
    assert all(s["status"] == "deficit" for s in cov
               if s["weekday"] == 7 and s["slot_index"] % 24 >= 6)


def test_camadas_nucleo_12x36_mais_reforco(ctx: Ctx) -> None:
    """FR-30: núcleo 12x36 (2 postos) + reforço 5x2 INT 10–18 (1 posto) = exato 168/168."""
    ids = setup_operation(ctx, postos=2)
    cur = ctx.post(f"/positions/{ids['position']}/demand-curves", json={
        "name": "pico", "values": [str(3 if d < 5 and 10 <= h < 18 else 2)
                                   for d in range(7) for h in range(24)]}).json()["data"]
    pattern = {
        "name": "Núcleo + reforço", "derived_from": "12X36",
        "shifts": [{"code": "D12", "start": "07:00", "duration_min": 720},
                   {"code": "N12", "start": "19:00", "duration_min": 720},
                   {"code": "INT", "start": "10:00", "duration_min": 480}],
        "layers": [
            {"code": "D", "sequence": ["D12", "F"], "k": 2, "team_sizes": [2, 2]},
            {"code": "N", "sequence": ["N12", "F"], "k": 2, "team_sizes": [2, 2]},
            {"code": "REFORCO", "sequence": ["INT"] * 5 + ["F", "F"], "k": 1,
             "team_sizes": [1], "weekly_anchor": True}]}
    r = ctx.post("/scenarios", json={
        "name": "mix", "operation_id": ids["operation"], "schedule_model_code": "PERSONALIZADO",
        "labor_agreement_id": ids["agreement"], "demand_curve_id": cur["id"],
        "team_count": 5, "horizon_start": "2027-01-04", "params": {"pattern": pattern},
        "legal_regime_code": "CLT_44H_ATUAL"})
    assert r.status_code == 201, r.text
    sid = r.json()["data"]["id"]
    rs = ctx.post(f"/scenarios/{sid}/simulate")
    assert rs.status_code == 200, rs.text
    d = rs.json()["data"]
    assert d["kpis"]["coverage_pct"] == "1.000000"
    cov = ctx.get(f"/scenarios/{sid}/coverage").json()["data"]
    assert cov["kpis"]["excess_post_hours"] == "0.000000"
    teams = ctx.get(f"/scenarios/{sid}").json()["data"]["teams"]
    assert teams[-1]["label"] == "Turma E · REFORCO"


def test_templates_crud_duplicar_e_isolamento(ctx: Ctx) -> None:
    body = {"name": "6x2 UTI", "pattern": {**_pattern(), "derived_from": "6X2"}}
    r = ctx.post("/schedule-patterns", json=body)
    assert r.status_code == 201, r.text
    t = r.json()["data"]
    assert t["current_version"] == 1 and t["derived_from_code"] == "6X2"
    assert t["validation"]["layers"][0]["k_required"] == "5.000000"
    assert ctx.post("/schedule-patterns", json=body).status_code == 409
    up = ctx.put(f"/schedule-patterns/{t['id']}",
                 json={"pattern": _pattern(sequence=["M", "T", "N", "F"])}).json()["data"]
    assert up["current_version"] == 2 and up["pattern"]["layers"][0]["sequence"][0] == "M"
    dup = ctx.post(f"/schedule-patterns/{t['id']}/duplicate", json={})
    assert dup.status_code == 201 and dup.json()["data"]["name"] == "6x2 UTI (cópia)"
    assert len(ctx.get("/schedule-patterns").json()["data"]) == 2
    assert ctx.get("/schedule-patterns", who="b_owner").json()["data"] == []
    assert ctx.get(f"/schedule-patterns/{t['id']}", who="b_owner").status_code == 404
    assert ctx.delete(f"/schedule-patterns/{t['id']}").status_code == 204
    assert ctx.get(f"/schedule-patterns/{t['id']}").status_code == 404
