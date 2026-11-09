"""A13/A14/A15/A37 — cobertura, KPIs, reserva, dimensionamento e K fixo (FR-08/09/11/14/32)."""

from __future__ import annotations

from datetime import date
from fractions import Fraction

from escalas.services.engine.catalogo import Variante, catalogo_mvp
from escalas.services.engine.cobertura import (
    ResultadoCobertura,
    Status,
    calcular_cobertura,
    visao_reserva,
)
from escalas.services.engine.demanda import Faixa, postos_24x7, postos_fixos
from escalas.services.engine.dimensionamento import dimensionar
from escalas.services.engine.regime_legal import k_legal, regimes_mvp
from escalas.services.engine.shrinkage import Shrinkage
from escalas.services.engine.turmas_k import simular_k_fixo

CAT = catalogo_mvp()
SEG = date(2026, 1, 5)  # segunda-feira


def _cob(codigo: str, postos: int, variante: Variante | None = None,
         **kw: object) -> ResultadoCobertura:
    m = CAT[codigo]
    return calcular_cobertura(m.montar_padrao(variante), CAT.turnos, postos_24x7(postos),
                              postos, SEG, **kw)  # type: ignore[arg-type]


def test_12x36_2_postos_168_de_168() -> None:
    r = _cob("12X36", 2)
    assert r.kpis.pct_horas_posto_cobertas == 1
    assert r.kpis.deficit_hp == 0 and r.kpis.excesso_hp == 0
    assert all(s == Status.EXATO for linha in r.status_pior for s in linha)
    assert r.achados == ()


def test_12x36_ancora_fora_da_segunda_e_virada_de_mes() -> None:
    m = CAT["12X36"]
    r = calcular_cobertura(m.montar_padrao(), CAT.turnos, postos_24x7(2), 2, date(2026, 1, 31),
                           dias=28)
    assert r.kpis.deficit_hp == 0


def test_4x2_4_turmas_deficit_11_1_pct() -> None:
    r = _cob("4X2", 1, Variante("4T", 4))
    assert r.kpis.pct_horas_posto_cobertas == Fraction(8, 9)
    assert 1 - r.kpis.pct_horas_posto_cobertas == Fraction(1, 9)  # 11,1% turnos-dia
    assert "COB_DEFICIT" in {a.codigo for a in r.achados}
    assert any(s == Status.DEFICIT for linha in r.status_pior for s in linha)


def test_4x2_5_turmas_excesso() -> None:
    r = _cob("4X2", 1, Variante("5T", 5))
    assert r.kpis.deficit_hp == 0
    assert r.kpis.pct_excesso == Fraction(1, 9)
    assert {a.codigo for a in r.achados} == {"COB_EXCESSO"}


def test_kpis_batem_com_celulas_e_7x24() -> None:
    r = _cob("4X2", 1, Variante("4T", 4))
    gap = r.gap
    assert r.kpis.deficit_hp == sum(-g for g in gap if g < 0)
    assert r.kpis.horas_com_deficit == sum(1 for g in gap if g < 0)
    assert r.kpis.excesso_hp == sum(g for g in gap if g > 0)
    assert r.kpis.pico is not None and r.kpis.pico.valor == max(-g for g in gap)
    assert min(min(linha) for linha in r.heat_pior) == min(gap)
    semanas = len(gap) // 168
    assert sum(sum(linha) for linha in r.heat_media) * semanas == sum(gap)


def test_posto_critico_vira_erro() -> None:
    curva = postos_fixos([Faixa(tuple(range(7)), 0, 24, 1, critico=True)])
    m = CAT["4X2"]
    r = calcular_cobertura(m.montar_padrao(Variante("4T", 4)), CAT.turnos, curva, 1, SEG)
    assert "COB_DEFICIT_POSTO_CRITICO" in {a.codigo for a in r.achados}


def test_reserva_fr11_6x2_noturno_10pct() -> None:
    r = _cob("6X2", 3)
    v = visao_reserva(r, Shrinkage.de(0, "0.10"), 3)
    for h, d in enumerate(v.deficit_esperado):
        esperado = Fraction(3, 10) if h % 24 in {22, 23, 0, 1, 2, 3, 4} else Fraction(0)
        assert d == esperado
    assert v.pessoas_extras_por_turma == 1
    assert v.achados[0].codigo == "COB_DEFICIT_ESPERADO_SHRINKAGE"


def test_dimensionamento_6x2_3_postos() -> None:
    d = dimensionar(CAT["6X2"], 3)
    assert d.k_estrela == 4 and d.headcount_min == 12 and d.achados == ()
    assert dimensionar(CAT["6X2"], 3, shr=Shrinkage.de(0, "0.10")).headcount_reserva == 16


def test_dimensionamento_4x2_4t_turmas_insuficientes() -> None:
    d = dimensionar(CAT["4X2"], 2, k_informado=4)
    assert d.achados[0].codigo == "COB_TURMAS_INSUFICIENTES"
    assert d.achados[0].severidade == "ERRO"
    assert (d.turmas_inteiras, d.n_meias, d.headcount_min_meias) == (5, 9, 9)


def test_k_fixo_6x2_k3_126_horas_posto() -> None:
    r = simular_k_fixo(CAT["6X2"], 3, CAT.turnos, postos_24x7(3), 3, SEG)
    assert r.cobertura.kpis.pct_horas_posto_cobertas == Fraction(3, 4)
    assert r.cobertura.kpis.deficit_hp_semana == 126
    assert r.achados[0].codigo == "COB_K_INSUFICIENTE"
    assert "K = 4" in r.achados[0].mensagem


def test_k_fixo_4_em_pec_40h_k_legal() -> None:
    kl = k_legal(regimes_mvp()["PEC_40H"])
    r = simular_k_fixo(CAT["6X2"], 4, CAT.turnos, postos_24x7(3), 3, SEG, k_legal=kl)
    assert r.cobertura.kpis.deficit_hp == 0
    assert [a.contexto.get("origem") for a in r.achados] == ["regime"]
