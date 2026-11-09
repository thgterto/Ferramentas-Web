"""A35: o catálogo reproduz K*/exato/h-sem da 01-PRD §6.1 para os 10 códigos essenciais."""

from __future__ import annotations

from decimal import Decimal
from fractions import Fraction

import pytest

from app.services.engine.catalogo import carregar_catalogo, catalogo_mvp
from app.services.engine.types import para_decimal

ESSENCIAIS = ("6X1_BASE", "5X2", "12X36", "6X2", "4X2", "2X2_12H", "5T", "4X3", "FIXO_D", "FIXO_N")


def test_catalogo_tem_os_10_codigos() -> None:
    assert set(catalogo_mvp().codigos) == set(ESSENCIAIS)


@pytest.mark.parametrize("codigo", ESSENCIAIS)
def test_catalogo_confere_esperado_do_seed(codigo: str) -> None:
    m = catalogo_mvp()[codigo]
    esp = m.esperado or {}
    k = esp["k_estrela"]
    assert m.k_estrela == (None if k is None else Fraction(k))
    assert m.exato == esp["exato"]
    assert [m.horas_semanais(d) for d in m.duracoes_min] == [
        Fraction(h) for h in esp["horas_semanais"]]
    assert m.folgas_7d == Fraction(esp["folgas_7d"])
    assert m.ciclo_calendario == esp["ciclo_calendario"]
    for chave in ("exato_meias", "turmas_inteiras"):
        if chave in esp:
            assert getattr(m, chave) == esp[chave]
    if "excesso" in esp:
        assert m.excesso == Fraction(esp["excesso"])
    if "n_meias" in esp:
        padrao = m.montar_padrao(next(v for v in m.variantes if v.meias))
        assert padrao.n_turmas == esp["n_meias"]


def test_catalogo_horas_em_decimal() -> None:
    assert para_decimal(catalogo_mvp()["4X2"].horas_semanais()) == Decimal("37.333333")
    assert para_decimal(catalogo_mvp()["5T"].horas_semanais()) == Decimal("33.600000")


def test_catalogo_excesso_4x2_5t_11_1_pct() -> None:
    assert para_decimal(catalogo_mvp()["4X2"].excesso or 0, 3) == Decimal("0.111")


def test_catalogo_4x3_nao_continuo() -> None:
    m = catalogo_mvp()["4X3"]
    assert m.k_nao_continuo == 2
    with pytest.raises(ValueError, match="não contínuo"):
        m.montar_padrao()


def test_catalogo_novo_modelo_e_so_dado() -> None:
    """ADR-010: 3x2 entra só como dado e o motor calcula K*=5 exato e 33,6 h."""
    cat = carregar_catalogo({
        "versao": "teste",
        "turnos": {"M": {"inicio": "06:00", "duracao_min": 480},
                   "T": {"inicio": "14:00", "duracao_min": 480},
                   "N": {"inicio": "22:00", "duracao_min": 480}},
        "modelos": [{"codigo": "3X2", "nome": "3x2", "sequencia": ["M", "T", "N", "F", "F"],
                     "duracoes_min": [480], "continuo_24x7": True}],
    })
    m = cat["3X2"]
    assert (m.k_estrela, m.exato, m.horas_semanais()) == (Fraction(5), True, Fraction(168, 5))


def test_catalogo_turno_desconhecido_rejeitado() -> None:
    with pytest.raises(ValueError, match="desconhecidos"):
        carregar_catalogo({"versao": "x", "turnos": {}, "modelos": [
            {"codigo": "Z", "nome": "z", "sequencia": ["Q", "F"], "duracoes_min": [480],
             "continuo_24x7": True}]})
