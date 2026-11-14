"""v3.9 — calculadora de quadro: indisponibilidade composta e regra prática 24/7."""

from __future__ import annotations

from fractions import Fraction as F

import pytest

from escalas.services.engine import quadro as Q
from escalas.services.engine.shrinkage import ErroShrinkage


def test_regra_pratica_dois_postos_42h_16pct() -> None:
    q = Q.dimensionar_quadro(2 * 168, 42, F(16, 100))
    assert (q.equipe_minima, q.equipe_recomendada, q.reserva) == (8, 10, 2)
    assert q.fator_cobertura == F(336) / (42 * F(84, 100))       # 9,52 pessoas


def test_posto_24x7_1728_horas_uteis() -> None:
    # 8.760 h do posto ÷ 1.728 h úteis ≈ 5,07 → 6 pessoas
    taxa = 1 - F(1728) / (42 * Q.SEMANAS_ANO)
    q = Q.dimensionar_quadro(168, 42, taxa)
    assert q.horas_posto_ano == 8760 and q.horas_uteis_ano == 1728
    assert round(float(q.fator_cobertura), 2) == 5.07
    assert (q.equipe_minima, q.equipe_recomendada) == (4, 6)


def test_sem_indisponibilidade_minima_igual_recomendada() -> None:
    q = Q.dimensionar_quadro(168, 42)
    assert q.equipe_minima == q.equipe_recomendada == 4 and q.reserva == 0
    assert q.fator_cobertura == 4


def test_taxa_composta_soma_componentes() -> None:
    ind = Q.Indisponibilidade(ferias_dias=F(30), feriados_dias=F(12), absenteismo=F(3, 100),
                              treinamento_h=F(40), passagem_min=F(10))
    t = Q.taxa_indisponibilidade(ind, F(40), F(8))
    por = {c.codigo: c for c in t.componentes}
    ano = 40 * Q.SEMANAS_ANO
    assert por["ferias"].taxa == F(30, 365)
    assert por["feriados"].taxa == F(96) / ano and por["feriados"].horas_ano == 96
    assert por["treinamento"].horas_ano == 40
    assert por["passagem"].taxa == F(10, 480)
    assert t.taxa == sum(c.taxa for c in t.componentes)
    assert 0.18 < float(t.taxa) < 0.20


def test_limites() -> None:
    with pytest.raises(ErroShrinkage):
        Q.dimensionar_quadro(168, 42, F(6, 10))
    with pytest.raises(ErroShrinkage):
        Q.taxa_indisponibilidade(Q.Indisponibilidade(absenteismo=F(7, 10)), F(40), F(8))
    with pytest.raises(ValueError):
        Q.dimensionar_quadro(168, 0)
    with pytest.raises(ValueError):
        Q.taxa_indisponibilidade(Q.Indisponibilidade(ferias_dias=F(-1)), F(40), F(8))
