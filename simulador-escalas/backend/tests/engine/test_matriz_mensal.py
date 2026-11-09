"""v3.6 — matriz mensal (motor puro): feriados, noturno, continuação, totais e resumo diário."""

from __future__ import annotations

from datetime import date, timedelta

from escalas.services.engine import matriz_mensal as MM
from escalas.services.engine.catalogo import catalogo_mvp

T = catalogo_mvp().turnos


def test_feriados_moveis_2027() -> None:
    f = MM.feriados_br(2027)
    assert MM.pascoa(2027) == date(2027, 3, 28)
    assert f[date(2027, 3, 26)] == "Sexta-feira Santa" and f[date(2027, 2, 9)] == "Carnaval"
    assert f[date(2027, 11, 20)] == "Consciência Negra"


def test_noturno_e_continuacao() -> None:
    assert MM.e_noturno(T["N"]) and MM.e_noturno(T["N12P"]) and MM.e_noturno(T["NP"])
    assert not MM.e_noturno(T["TP"]) and not MM.e_noturno(T["M"])
    assert MM.continuacao("N", T) == "N" and MM.continuacao("M", T) is None
    assert MM.continuacao("F", T) is None


def test_pessoas_ficticias_com_cargo() -> None:
    ps = MM.pessoas_das_turmas([("A", 2, {"ENF": 1, "TEC": 1}), ("B", 1, {})])
    assert [(p.id, p.cargo) for p in ps] == [("A-01", "ENF"), ("A-02", "TEC"), ("B-01", None)]


def test_totais_e_resumo_com_noite_anterior() -> None:
    dias = [date(2027, 2, 1) + timedelta(days=i) for i in range(4)]   # seg..qui
    a = ("N", "N", "F", "F", "M")      # véspera = N → 00–06 do dia 1 coberto
    b = ("F", "M", "N", "N", "F")
    t = MM.totais(a[1:], dias, T)
    assert (t.dias_trabalhados, t.folgas, t.minutos, t.noites) == (2, 2, 960, 1)
    res = MM.resumo_dias([a, b], dias, T, lambda d, h: 1)
    assert res[0].por_turno == {"M": 1, "N": 1} and res[0].folgas == 0
    assert res[0].horas_deficit == 8          # 14–22 sem ninguém
    assert res[1].turnos_em_deficit == ("M",)  # M necessário 1, ninguém
