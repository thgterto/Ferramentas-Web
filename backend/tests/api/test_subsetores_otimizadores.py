"""v3.7: subsetores/posições, pools (remanejamento), matriz com colunas e otimizadores."""

from __future__ import annotations

import csv
import io

from tests.api.conftest import Ctx, setup_operation


def _janela(ini: int, fim: int) -> list[int]:
    return [1 if ini <= h % 24 < fim else 0 for h in range(168)]


def _estrutura(ctx: Ctx, op: str, pool: bool = True) -> None:
    sa = ctx.post(f"/operations/{op}/subsectors", json={"code": "SA", "name": "Sub A"})
    assert sa.status_code == 201, sa.text
    sb = ctx.post(f"/operations/{op}/subsectors", json={"code": "SB", "name": "Sub B"}).json()
    sa_id, sb_id = sa.json()["data"]["id"], sb["data"]["id"]
    for sid, code, dem in ((sa_id, "A1", {"mode": "postos_fixos", "posts": 1}),
                           (sa_id, "A2", {"mode": "curva_168h", "values": _janela(6, 14)}),
                           (sb_id, "B1", {"mode": "postos_fixos", "posts": 1}),
                           (sb_id, "B2", {"mode": "curva_168h", "values": _janela(14, 22)})):
        r = ctx.post(f"/subsectors/{sid}/workstations",
                     json={"code": code, "name": f"Posição {code}", "demand": dem})
        assert r.status_code == 201, r.text
    if pool:
        r = ctx.post(f"/operations/{op}/subsector-pools",
                     json={"code": "P1", "name": "Pool A+B", "subsector_codes": ["SA", "SB"]})
        assert r.status_code == 201, r.text


def test_crud_estrutura_e_validacoes(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    _estrutura(ctx, ids["operation"])
    st = ctx.get(f"/operations/{ids['operation']}/structure").json()["data"]
    assert [s["code"] for s in st["subsectors"]] == ["SA", "SB"]
    assert [w["code"] for w in st["subsectors"][0]["workstations"]] == ["A1", "A2"]
    assert st["subsectors"][0]["workstations"][1]["peak"] == 1
    assert st["pools"][0]["subsector_codes"] == ["SA", "SB"]
    # subsetor em dois pools / inexistente / demanda inválida → 422
    r = ctx.post(f"/operations/{ids['operation']}/subsector-pools",
                 json={"code": "P2", "name": "x", "subsector_codes": ["SA", "SB"]})
    assert r.status_code == 422
    r = ctx.post(f"/operations/{ids['operation']}/subsector-pools",
                 json={"code": "P3", "name": "x", "subsector_codes": ["SA", "ZZ"]})
    assert r.status_code == 422
    sa = st["subsectors"][0]["id"]
    r = ctx.post(f"/subsectors/{sa}/workstations",
                 json={"code": "X", "name": "x", "demand": {"mode": "curva_168h", "values": [1]}})
    assert r.status_code == 422
    # isolamento entre organizações
    assert ctx.get(f"/operations/{ids['operation']}/structure", "b_owner").status_code == 404
    # pessoa cadastrada com lotação/posição
    r = ctx.post(f"/operations/{ids['operation']}/employees",
                 json={"name": "Ana", "team_code": "A", "default_workstation_code": "B1"})
    assert r.status_code == 201, r.text
    assert r.json()["data"]["home_subsector_code"] == "SB"
    pool = st["pools"][0]["id"]
    r = ctx.patch(f"/subsector-pools/{pool}", json={"max_borrowed_hours_week": 8})
    assert r.status_code == 200 and r.json()["data"]["max_borrowed_hours_week"] == 8


def test_remanejamento_pool_kpis_matriz_heatmap(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    _estrutura(ctx, ids["operation"])
    sid = ids["scenario"]
    r = ctx.post(f"/scenarios/{sid}/simulate")
    assert r.status_code == 200, r.text
    k = r.json()["data"]["kpis"]
    assert k["moved_hours"] > 0 and k["subsector_deficit_post_hours"] == 0
    assert k["subsector_deficit_without_pool"] > 0
    codes = {f["rule_code"] for f in r.json()["data"]["findings"]}
    assert "COB_REMANEJAMENTO_SUBSETOR" in codes
    sc = ctx.get(f"/scenarios/{sid}").json()["data"]
    sb = next(x for x in sc["subsectors"] if x["code"] == "SB")
    assert sb["received_post_hours"] > 0 and sb["deficit_post_hours"] == 0
    # heatmap / KPIs filtrados
    cov = ctx.get(f"/scenarios/{sid}/coverage?subsector=SB").json()["data"]
    assert cov["subsector"] == "SB" and len(cov["slots"]) == 168
    assert any(float(s["borrowed"]) > 0 for s in cov["slots"])
    cov = ctx.get(f"/scenarios/{sid}/coverage?workstation=B2").json()["data"]
    assert float(cov["kpis"]["pct_hours_covered"]) == 1
    assert ctx.get(f"/scenarios/{sid}/coverage?subsector=ZZ").status_code == 404
    # matriz: colunas subsetor/posição, células remanejadas e rodapé por subsetor
    mx = ctx.get(f"/scenarios/{sid}/monthly-matrix?month=2027-02").json()["data"]
    assert [s["code"] for s in mx["subsectors"]] == ["SA", "SB"]
    assert {w["code"] for w in mx["workstations"]} == {"A1", "A2", "B1", "B2"}
    p0 = mx["people"][0]
    assert p0["subsector"] == "SA" and p0["workstation"] == "A1"
    moved = [c for pe in mx["people"] for c in pe["cells"] if c["moved"]]
    assert moved and all(c["subsector"] == "SB" and c["workstation"] == "B2" for c in moved)
    assert mx["moved_hours"] > 0
    assert all(sum(d["by_subsector"].values()) == sum(d["by_shift"].values())
               for d in mx["daily"])
    r = ctx.get(f"/scenarios/{sid}/monthly-matrix/export?month=2027-02&format=csv")
    rows = list(csv.reader(io.StringIO(r.content.decode("utf-8-sig")), delimiter=";"))
    assert rows[0][3:5] == ["subsetor", "posição"]
    assert any("→ SB/B2" in c for row in rows for c in row)
    assert any(row[0] == "no subsetor Sub B" for row in rows)


def test_sem_pool_tem_deficit(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    _estrutura(ctx, ids["operation"], pool=False)
    r = ctx.post(f"/scenarios/{ids['scenario']}/simulate").json()["data"]
    assert r["kpis"]["moved_hours"] == 0 and r["kpis"]["subsector_deficit_post_hours"] > 0
    assert "COB_DEFICIT_SUBSETOR" in {f["rule_code"] for f in r["findings"]}


def test_otimizar_min_headcount_offsets_e_aplicar(ctx: Ctx) -> None:
    ids = setup_operation(ctx, postos=1, teams=5)
    sid = ids["scenario"]
    r = ctx.post(f"/scenarios/{sid}/optimize",
                 json={"objective": "min_headcount", "time_limit_s": 5})
    assert r.status_code == 200, r.text
    o = r.json()["data"]
    assert o["status"] == "otimo" and o["optimal"] and o["gap"] == 0
    assert o["solution"]["units"] == 4 and o["after"]["headcount"] == 4
    assert o["before"]["team_count"] == 5 and o["scenario_patch"]["team_count"] == 4
    a = ctx.post(f"/scenarios/{sid}/optimize/apply",
                 json={"mode": "create", "patch": o["scenario_patch"]})
    assert a.status_code == 200, a.text
    d = a.json()["data"]
    assert d["created"] and d["scenario_id"] != sid
    assert float(d["simulation"]["kpis"]["coverage_pct"]) == 1
    assert d["simulation"]["team_count"]["k_used"] == 4
    r = ctx.post(f"/scenarios/{sid}/optimize", json={"objective": "fairness", "team_count": 4})
    o = r.json()["data"]
    assert o["status"] in ("otimo", "viavel") and o["after"]["deficit_post_hours_week"] == 0
    assert "sundays_off_spread" in o["after"]


def test_otimizar_ranking_e_regime(ctx: Ctx) -> None:
    ids = setup_operation(ctx, postos=1)
    r = ctx.post(f"/scenarios/{ids['scenario']}/optimize",
                 json={"objective": "best_model", "time_limit_s": 4})
    assert r.status_code == 200, r.text
    o = r.json()["data"]
    ok = [c for c in o["candidates"] if c["eligible"]]
    assert ok[0]["rank"] == 1 and ok[0]["headcount"] <= 4
    assert all(c["compliance"] in ("conforme", "regime_especial") for c in ok)
    assert any(c["status"] == "excluido_regime" for c in o["candidates"])


def test_otimizar_regime_restricao_dura(ctx: Ctx) -> None:
    # PEC 40 h: 6x2 (42 h/sem) é não conforme → inviável com restrição dura
    ids2 = setup_operation(ctx, postos=1, legal_regime_code="PEC_40H")
    o = ctx.post(f"/scenarios/{ids2['scenario']}/optimize",
                 json={"objective": "min_headcount"}).json()["data"]
    assert o["status"] == "inviavel_regime"
    o = ctx.post(f"/scenarios/{ids2['scenario']}/optimize",
                 json={"objective": "min_headcount", "legal_hard": False}).json()["data"]
    assert o["status"] == "otimo"


def test_otimizar_pool_e_alocacao(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    _estrutura(ctx, ids["operation"])
    sid = ids["scenario"]
    o = ctx.post(f"/scenarios/{sid}/optimize",
                 json={"objective": "min_headcount", "pool": "P1",
                       "team_size_mode": "livre"}).json()["data"]
    assert o["status"] == "otimo"
    assert o["solution"]["headcount"] < o["solution"]["headcount_separate_subsectors"]
    o = ctx.post(f"/scenarios/{sid}/optimize",
                 json={"objective": "pool_allocation", "time_limit_s": 5}).json()["data"]
    assert o["status"] in ("otimo", "viavel")
    assert o["after"]["deficit_post_hours"] == 0
    assert o["after"]["moved_hours"] <= o["before"]["moved_hours"]
    assert o["solution"]["deficit_without_pool"] > 0
    assert ctx.post(f"/scenarios/{sid}/optimize",
                    json={"objective": "min_headcount", "pool": "ZZ"}).status_code == 422
