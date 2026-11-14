"""v3.9: calculadora de quadro (staffing) e relatório de folgas por colaborador."""

from __future__ import annotations

from tests.api.conftest import Ctx, setup_operation


def _sim(ctx: Ctx, **kw: object) -> str:
    ids = setup_operation(ctx, **kw)  # type: ignore[arg-type]
    r = ctx.post(f"/scenarios/{ids['scenario']}/simulate")
    assert r.status_code == 200, r.text
    return ids["scenario"]


def test_staffing_regra_pratica_2_postos(ctx: Ctx) -> None:
    sid = _sim(ctx, postos=2)                    # 6x2 8 h: 42 h/sem por pessoa
    r = ctx.post(f"/scenarios/{sid}/staffing",
                 json={"vacation_days": "0", "absenteeism_pct": "0.16"})
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["post_hours_week"] == "336.000000" and d["weekly_hours"] == "42.000000"
    assert d["weekly_hours_source"] == "modelo" and d["shift_hours"] == "8.000000"
    assert (d["headcount_min"], d["headcount_recommended"], d["reserve"]) == (8, 10, 2)
    assert d["headcount_current"] == 8 and d["headcount_gap"] == 2
    assert d["status"] == "sem_reserva" and d["unavailability_rate"] == "0.160000"
    assert d["people_per_post"] == "4.761905" and d["legal_regime"] == "CLT_44H_ATUAL@1"


def test_staffing_padrao_e_horas_informadas(ctx: Ctx) -> None:
    sid = _sim(ctx, postos=1)
    d = ctx.post(f"/scenarios/{sid}/staffing").json()["data"]     # só férias de 30 dias
    assert d["unavailability_rate"] == "0.082192" and d["headcount_min"] == 4
    assert d["headcount_recommended"] == 5 and d["status"] == "sem_reserva"
    assert [c["code"] for c in d["components"]] == [
        "ferias", "feriados", "absenteismo", "treinamento", "passagem"]
    inf = ctx.post(f"/scenarios/{sid}/staffing",
                   json={"weekly_hours": "40", "vacation_days": "0"}).json()["data"]
    assert inf["weekly_hours_source"] == "informado" and inf["headcount_min"] == 5
    assert inf["status"] == "insuficiente"
    alto = ctx.post(f"/scenarios/{sid}/staffing",
                    json={"absenteeism_pct": "0.55", "vacation_days": "30"})
    assert alto.status_code == 422


def test_rest_report_6x2(ctx: Ctx) -> None:
    sid = _sim(ctx)
    r = ctx.get(f"/scenarios/{sid}/rest-report?month=2027-02")
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["rule"] == {"weekly_rest_days": "1.000000", "max_consecutive_days": 6,
                         "min_rest_days_month": 4, "source": "regime",
                         "legal_regime": "CLT_44H_ATUAL@1"}
    assert len(d["people"]) == 12 and d["can_close"] is True and d["blockers"] == []
    for pe in d["people"]:
        assert pe["worked_days"] + pe["rest_days"] == 28 and pe["rest_days"] in (6, 7, 8)
        assert pe["pending_rest_days"] == 0 and pe["max_consecutive_days"] == 6
        assert pe["alerts"] == []
    assert d["coverage"]["deficit_hours"] == 0
    assert d["coverage"]["coverage_index_min"] == "1.000000"
    eq = {e["metric"]: e for e in d["equity"]}
    assert set(eq) == {"rest_days", "sundays_worked", "holidays_worked", "nights", "hours"}
    assert eq["rest_days"]["mean"] == "7.000000" and 0.8 < float(eq["rest_days"]["index"]) < 1
    assert sum(pe["rest_days"] for pe in d["people"]) == 12 * 7      # 2 folgas a cada 8 dias
    # exigindo 2 folgas/semana na média mensal (8 no mês): turmas com 6 folgas ficam pendentes
    r2 = ctx.get(f"/scenarios/{sid}/rest-report",
                 params={"month": "2027-02", "weekly_rest_days": 2})
    d2 = r2.json()["data"]
    assert d2["rule"]["source"] == "informado" and d2["rule"]["min_rest_days_month"] == 8
    assert d2["can_close"] is False
    assert [b["code"] for b in d2["blockers"]] == ["FOL_FOLGAS_PENDENTES"]
    assert {pe["pending_rest_days"] for pe in d2["people"]} == {0, 2}
    assert d2["blockers"][0]["count"] == sum(1 for pe in d2["people"] if pe["rest_days"] < 8)
    r3 = ctx.get(f"/scenarios/{sid}/rest-report",
                 params={"month": "2027-02", "max_consecutive_days": 5}).json()["data"]
    assert [b["code"] for b in r3["blockers"]] == ["FOL_DIAS_CONSECUTIVOS"]


def test_rest_report_deficit_bloqueia(ctx: Ctx) -> None:
    sid = _sim(ctx, model="4X2", teams=4)
    d = ctx.get(f"/scenarios/{sid}/rest-report?month=2027-02").json()["data"]
    assert d["coverage"]["deficit_hours"] > 0 and d["can_close"] is False
    assert "FOL_COBERTURA_ABAIXO_MINIMA" in [b["code"] for b in d["blockers"]]
    assert float(d["coverage"]["coverage_index_min"]) < 1


def test_rest_report_exige_simulacao(ctx: Ctx) -> None:
    ids = setup_operation(ctx)
    assert ctx.get(f"/scenarios/{ids['scenario']}/rest-report?month=2027-02").status_code == 409
