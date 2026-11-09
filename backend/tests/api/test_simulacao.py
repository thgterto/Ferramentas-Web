"""A23/A40/A46: simulate, coverage, sizing, findings, hash; cargos, K fixo, regimes, transição."""

from __future__ import annotations

from typing import Any

from tests.api.conftest import Ctx, setup_operation


def _sim(ctx: Ctx, sid: str) -> dict[str, Any]:
    r = ctx.post(f"/scenarios/{sid}/simulate", json={"mode": "auto"})
    assert r.status_code == 200, r.text
    data: dict[str, Any] = r.json()["data"]
    return data


def test_simulate_6x2_4t_cobre_100(ctx: Ctx) -> None:
    ids = setup_operation(ctx, postos=3)
    d = _sim(ctx, ids["scenario"])
    assert d["status"] == "calculado"
    assert d["kpis"]["coverage_pct"] == "1.000000"
    assert d["kpis"]["teams_required"] == "4.000000"
    assert d["kpis"]["headcount_min"] == 12
    assert d["kpis"]["blocking_findings"] == 0
    assert len(d["inputs_hash"]) == 64 and d["engine_version"] and d["rules_version"]
    assert d["legal_regime"] == "CLT_44H_ATUAL@1"
    cov = ctx.get(f"/scenarios/{ids['scenario']}/coverage").json()["data"]
    assert len(cov["slots"]) == 168
    s22 = cov["slots"][22]
    assert s22["weekday"] == 1 and s22["start"] == "22:00" and s22["status"] == "exata"
    assert s22["required_net"] == "3.000000" and s22["gap"] == "0.000000"
    assert cov["kpis"]["peak_undercoverage"] is None
    det = ctx.get(f"/scenarios/{ids['scenario']}").json()["data"]
    assert [t["code"] for t in det["teams"]] == ["A", "B", "C", "D"]
    assert det["teams"][0]["size_required"] == "3.000000"
    asg = ctx.get(f"/scenarios/{ids['scenario']}/assignments?team=A&limit=10").json()
    assert len(asg["data"]) == 10 and asg["meta"]["has_next"] is True
    nxt = ctx.get(f"/scenarios/{ids['scenario']}/assignments",
                  params={"team": "A", "cursor": asg["meta"]["next_cursor"]}).json()
    assert len(nxt["data"]) == 56 - 10


def test_inputs_hash_reprodutivel(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    h1 = _sim(ctx, ids["scenario"])["inputs_hash"]
    h2 = _sim(ctx, ids["scenario"])["inputs_hash"]
    assert h1 == h2
    ctx.put(f"/demand-curves/{ids['curve']}/slots", json={"values": ["2"] * 168})
    assert _sim(ctx, ids["scenario"])["inputs_hash"] != h1


def test_4x2_4t_turmas_insuficientes(ctx: Ctx) -> None:
    ids = setup_operation(ctx, model="4X2", teams=4)
    d = _sim(ctx, ids["scenario"])
    codes = {f["rule_code"] for f in d["findings"]}
    assert {"COB_TURMAS_INSUFICIENTES", "COB_DEFICIT"} <= codes
    assert d["kpis"]["blocking_findings"] >= 1
    assert d["kpis"]["coverage_pct"] != "1.000000"
    sid = ids["scenario"]
    err = ctx.get(f"/scenarios/{sid}/compliance-findings?severity=erro").json()
    assert err["data"] and all(f["severity"] == "erro" for f in err["data"])
    one = ctx.get(f"/scenarios/{sid}/compliance-findings",
                  params={"rule_code": "COB_TURMAS_INSUFICIENTES"}).json()["data"]
    assert len(one) == 1 and one[0]["legal_reference"] == "FR-08"
    cov = ctx.get(f"/scenarios/{sid}/coverage?agg=media").json()["data"]
    assert any(s["status"] == "deficit" for s in cov["slots"])
    assert cov["kpis"]["peak_undercoverage"]["at"].startswith("2027-01-")
    sz = ctx.post(f"/scenarios/{sid}/sizing", json={}).json()["data"]
    assert sz["k_required"] == "4.500000" and sz["whole_teams"] == 5
    assert sz["half_teams"] is None  # 3 postos: meias exigem postos pares
    sz2 = ctx.post(f"/scenarios/{sid}/sizing", json={"team_size": 4}).json()["data"]
    assert sz2["half_teams"] == 9 and sz2["headcount_min_half_teams"] == 18


def test_k_fixo_3_no_6x2(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    r = ctx.put(f"/operations/{ids['operation']}/team-constraints",
                json={"items": [{"scope": "operacao", "mode": "fixo", "k_min": 3, "k_max": 3,
                                 "source_note": "ACT 2026 cl. 12"}]})
    assert r.status_code == 200 and r.json()["data"][0]["k_min"] == 3
    bad = ctx.put(f"/operations/{ids['operation']}/team-constraints",
                  json={"items": [{"mode": "fixo", "k_min": 3, "k_max": 4}]})
    assert bad.status_code == 422
    d = _sim(ctx, ids["scenario"])
    assert d["team_count"]["mode"] == "fixo" and d["team_count"]["k_used"] == 3
    assert d["team_count"]["achievable_pct"] == "0.750000"
    assert "COB_K_INSUFICIENTE" in {f["rule_code"] for f in d["findings"]}


def test_shrinkage_visao_reserva(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    shr = ctx.post("/shrinkage-profiles", json={"name": "UTI", "day_pct": "0.100000",
                                                "night_pct": "0.150000"}).json()["data"]
    v = ctx.get(f"/scenarios/{ids['scenario']}").headers["ETag"]
    ctx.patch(f"/scenarios/{ids['scenario']}", json={"shrinkage_profile_id": shr["id"]},
              headers={"If-Match": v})
    d = _sim(ctx, ids["scenario"])
    assert "COB_DEFICIT_ESPERADO_SHRINKAGE" in {f["rule_code"] for f in d["findings"]}
    cov = ctx.get(f"/scenarios/{ids['scenario']}/coverage?view=reserva").json()["data"]
    assert cov["view"] == "reserva"
    assert cov["slots"][10]["expected_worst"] == "2.700000"
    assert cov["slots"][10]["status"] == "deficit"
    assert cov["slots"][10]["required_gross"] == "3.333333"


def test_regime_pec_40h_6x2(ctx: Ctx) -> None:
    ids = setup_operation(ctx, legal_regime_code="PEC_40H")
    d = _sim(ctx, ids["scenario"])
    codes = {f["rule_code"] for f in d["findings"]}
    assert {"CLT_CARGA_SEMANAL_EXCEDIDA", "CLT_FOLGAS_SEMANAIS_INSUFICIENTES",
            "INFO_REGIME_PREMISSA"} <= codes
    det = ctx.get(f"/scenarios/{ids['scenario']}").json()["data"]
    assert det["legal_regime_applied"] == "PEC_40H@1"


def test_regime_nao_resolvido_sem_d0(ctx: Ctx) -> None:
    ids = setup_operation(ctx, legal_regime_code=None, legal_reference_date="2028-03-01")
    r = ctx.post(f"/scenarios/{ids['scenario']}/simulate")
    assert r.status_code == 422 and r.json()["error"]["code"] == "REGIME_NAO_RESOLVIDO"


def test_legal_regimes_endpoints(ctx: Ctx) -> None:
    lst = ctx.get("/legal-regimes").json()["data"]
    assert [r["code"] for r in lst] == ["CLT_44H_ATUAL", "TRANSICAO_42H", "PEC_40H"]
    pec = ctx.get("/legal-regimes/PEC_40H").json()["data"]
    assert pec["weekly_hours_max"] == "40.000000" and pec["min_rest_days_per_week"] == \
        "2.000000"
    assert pec["anchor"] == "promulgacao" and pec["anchor_offset_from"] == "14 months"
    assert pec["special_regimes"] == {"12X36": "autorizado_pendente_lei"}
    assert ctx.get("/legal-regimes:resolve?date=2027-01-01").status_code == 422
    assert ctx.get("/legal-regimes/NAO_EXISTE").status_code == 404


def test_legal_regimes_resolve_com_d0(ctx: Ctx, monkeypatch: object) -> None:
    from datetime import date

    from app.core.config import settings

    monkeypatch.setattr(settings, "legal_d0", date(2026, 12, 1))  # type: ignore[attr-defined]
    r = ctx.get("/legal-regimes:resolve?date=2028-03-01").json()["data"]
    assert r["code"] == "PEC_40H" and r["resolved_valid_from"] == "2028-02-01"
    assert ctx.get("/legal-regimes:resolve?date=2027-01-29").json()["data"]["code"] == \
        "CLT_44H_ATUAL"
    assert ctx.get("/legal-regimes:resolve?date=2027-01-30").json()["data"]["code"] == \
        "TRANSICAO_42H"


def test_catalogo_e_regras(ctx: Ctx) -> None:
    ms = ctx.get("/schedule-models?regime=PEC_40H").json()["data"]
    assert len(ms) == 37  # v3.5: catálogo completo (PERSONALIZADO não é listado)
    m = next(x for x in ms if x["code"] == "6X2")
    assert m["regime_compliance"] == {"PEC_40H": {"status": "nao_conforme"}}
    assert m["avg_weekly_hours"] == "42.000000" and m["teams_24x7"] == "4.000000"
    assert ctx.get("/schedule-models/12X36").json()["data"]["calendar_cycle_days"] == 14
    rules = {r["code"] for r in ctx.get("/compliance-rules").json()["data"]}
    assert {"CLT_INTERJORNADA", "CLT_ESCALA_6X1_VEDADA", "COB_K_INSUFICIENTE"} <= rules
    st = ctx.get("/shift-templates").json()["data"]
    assert {t["code"] for t in st} >= {"M", "T", "N", "D12", "N12"}
    assert all(t["scope"] == "global" for t in st)


def test_transicao_gt_reg_05(ctx: Ctx) -> None:
    """10 postos 24/7, 6x2 4T → 40/40/45 (05 §5.5, GT-REG-05)."""
    ids = setup_operation(ctx, postos=10)
    r = ctx.post(f"/scenarios/{ids['scenario']}/transition",
                 json={"regimes": ["CLT_44H_ATUAL", "TRANSICAO_42H", "PEC_40H"],
                       "recommend": True, "allow_half_teams": True})
    assert r.status_code == 200, r.text
    ph = r.json()["data"]["phases"]
    assert [p["regime"] for p in ph] == ["CLT_44H_ATUAL@1", "TRANSICAO_42H@1", "PEC_40H@1"]
    assert [p["k_legal"] for p in ph] == ["4.000000", "4.000000", "5.000000"]
    assert ph[2]["k_legal_half_teams"] == "4.500000"
    assert [p["scenario_model"]["headcount"] for p in ph] == [40, 40, 40]
    assert [p["scenario_model"]["compliant"] for p in ph] == [True, True, False]
    pec = {f["rule_code"] for f in ph[2]["scenario_model"]["findings"]}
    assert {"CLT_CARGA_SEMANAL_EXCEDIDA", "CLT_FOLGAS_SEMANAIS_INSUFICIENTES"} <= pec
    rec = ph[2]["recommended"]
    assert rec["code"] == "4X2" and rec["headcount"] == 45 and rec["half_teams"] is True
    assert rec["teams_required"] == "4.500000" and rec["delta_headcount_vs_first"] == 5
    assert rec["avg_weekly_hours"] == "37.333333"
    assert any(a["code"] == "5T" and a["headcount"] == 50 for a in ph[2]["alternatives"])


def test_cargos_matriz_e_composicao_uti(ctx: Ctx) -> None:
    for code, name in (("ENF", "Enfermeiro"), ("TEC_ENF", "Técnico")):
        assert ctx.post("/roles", json={"code": code, "name": name}).status_code == 201
    assert ctx.post("/roles", json={"code": "ENF", "name": "dup"}).status_code == 409
    diag = ctx.put("/substitution-rules",
                   json={"rules": [{"from_role": "ENF", "to_role": "ENF"}]})
    assert diag.status_code == 422
    fator = ctx.put("/substitution-rules", json={"rules": [
        {"from_role": "ENF", "to_role": "TEC_ENF", "coverage_factor": "0.500000"}]})
    assert fator.status_code == 422
    inex = ctx.put("/substitution-rules",
                   json={"rules": [{"from_role": "ENF", "to_role": "MEDICO"}]})
    assert inex.status_code == 422
    ok = ctx.put("/substitution-rules", json={"rules": [
        {"from_role": "ENF", "to_role": "TEC_ENF", "priority": 2}]})
    assert ok.status_code == 200 and ok.json()["data"][0]["coverage_factor"] == "1.000000"

    ids = setup_operation(ctx, postos=4)
    ctx.patch(f"/positions/{ids['position']}", json={"required_role_code": "TEC_ENF"})
    req = ctx.post(f"/operations/{ids['operation']}/role-requirements",
                   json={"kind": "minimo", "role_code": "ENF", "min_count": 1,
                         "accepts_substitute": False, "severity": "erro"})
    assert req.status_code == 201
    sid = ids["scenario"]
    assert ctx.put(f"/scenarios/{sid}/teams/A/composition",
                   json={"composition": {"ENF": 1}}).status_code == 404  # sem turmas ainda
    _sim(ctx, sid)
    for code, comp in {"A": {"ENF": 1, "TEC_ENF": 3}, "B": {"ENF": 1, "TEC_ENF": 3},
                       "C": {"ENF": 1, "TEC_ENF": 3}, "D": {"ENF": 0, "TEC_ENF": 4}}.items():
        r = ctx.put(f"/scenarios/{sid}/teams/{code}/composition", json={"composition": comp})
        assert r.status_code == 200 and r.json()["data"]["composition"] == comp
    assert ctx.put(f"/scenarios/{sid}/teams/A/composition",
                   json={"composition": {"XX": 1}}).status_code == 422
    d = _sim(ctx, sid)
    codes = {f["rule_code"] for f in d["findings"]}
    assert "COB_CARGO_SEM_QUALIFICADO" in codes  # turma D sem enfermeiro
    by_role = {c["role"]: c for c in d["coverage_by_role"]}
    assert by_role["TEC_ENF"]["deficit_post_hours"] == "0.000000"
    assert by_role["ENF"]["unqualified_hours"] > 0
    cov = ctx.get(f"/scenarios/{sid}/coverage?role=TEC_ENF").json()["data"]
    assert cov["role"] == "TEC_ENF" and len(cov["slots"]) == 168
    assert ctx.get(f"/scenarios/{sid}/coverage?role=NADA").status_code == 404


def test_coverage_antes_de_simular_409(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    assert ctx.get(f"/scenarios/{ids['scenario']}/coverage").status_code == 409


def test_modelo_nao_continuo_simula_com_janela(ctx: Ctx) -> None:
    """v3.5: 4x3 (não contínuo) simula normalmente; demanda fora da janela 07–17 = 0."""
    ids = setup_operation(ctx, model="4X3", teams=2)
    r = ctx.post(f"/scenarios/{ids['scenario']}/simulate")
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["team_count"]["mode"] == "padrao" and d["team_count"]["k_used"] == 2
    assert d["kpis"]["coverage_pct"] == "1.000000"
