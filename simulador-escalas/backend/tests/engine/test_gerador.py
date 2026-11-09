from __future__ import annotations

from datetime import date, timedelta
from fractions import Fraction

import pytest

from escalas.services.engine.catalogo import catalogo_mvp
from escalas.services.engine.gerador import (
    buscar_offsets,
    dia_absoluto,
    gerar_escala,
    nome_turma,
    offsets_uniformes,
)
from escalas.services.engine.types import GrupoTurmas, Padrao


def test_dia_absoluto_ignora_dia_do_mes() -> None:
    ancora = date(2026, 1, 1)
    assert dia_absoluto(date(2026, 1, 31), ancora) == 30
    assert dia_absoluto(date(2026, 2, 1), ancora) == 31


def test_12x36_dia_do_mes_mod_2_falharia_na_virada() -> None:
    """Documenta o bug do PRD v2 (d mod 2 com dia do mês): 31 e 1 ímpares."""
    assert 31 % 2 == 1 % 2
    padrao = catalogo_mvp()["12X36"].montar_padrao()
    esc = gerar_escala(padrao, date(2026, 1, 1), 2, date(2026, 1, 31))
    for linha in esc.estados:
        assert linha[0] != linha[1]  # alterna trabalho/folga na virada


def test_offsets_uniformes() -> None:
    assert offsets_uniformes(8, 4) == (0, 2, 4, 6)
    assert offsets_uniformes(6, 4) is None
    assert offsets_uniformes(6, 0) is None


def test_buscar_offsets_valida_entrada() -> None:
    with pytest.raises(ValueError):
        buscar_offsets(("M", "F"), 0)
    assert buscar_offsets(("M", "F"), 1) == (0,)



def test_buscar_offsets_heuristica_rapida_em_l_k_grandes() -> None:
    """v3.5: L/K grandes usam guloso + busca local com limite de tempo (sem 'grande demais')."""
    import time

    seq = tuple("M" * 40 + "F" * 2)
    t0 = time.perf_counter()
    offs = buscar_offsets(seq, 9)
    assert time.perf_counter() - t0 < 2.0
    assert len(offs) == 9 and len(set(offs)) == 9
    # 84 posições, 12 turmas (busca exaustiva seria C(83, 11) ≈ 10^13)
    seq84 = tuple(("M" * 4 + "T" * 4 + "N" * 4 + "F" * 9) * 4)
    t0 = time.perf_counter()
    offs84 = buscar_offsets(seq84, 12)
    assert time.perf_counter() - t0 < 2.0 and len(offs84) == 12
    # mais turmas que posições: offsets repetidos
    assert len(buscar_offsets(("M", "F"), 3)) == 3


def test_nome_turma() -> None:
    assert [nome_turma(i) for i in (0, 3, 25, 26, 27)] == ["A", "D", "Z", "AA", "AB"]


def test_horizonte_invalido() -> None:
    with pytest.raises(ValueError):
        gerar_escala(catalogo_mvp()["6X2"].montar_padrao(), date(2026, 1, 1), 0)


def test_6x2_ciclo_calendario_56_dias() -> None:
    padrao = catalogo_mvp()["6X2"].montar_padrao()
    assert padrao.ciclo_calendario == 56
    assert padrao.k_estrela == 4
    esc = gerar_escala(padrao, date(2026, 1, 5), 112)
    assert all(esc.estados[i][j] == esc.estados[i][j + 56] for i in range(4) for j in range(56))


def test_grupo_invalido() -> None:
    with pytest.raises(ValueError):
        GrupoTurmas(("F", "F"), (0,))
    with pytest.raises(ValueError):
        GrupoTurmas(("M", "F"), (2,))
    with pytest.raises(ValueError):
        GrupoTurmas((), ())


def test_meias_turmas_somam_meio_posto() -> None:
    g = GrupoTurmas(tuple("MMMMFFTTTTFFNNNNFF"), tuple(range(0, 18, 2)), Fraction(1, 2))
    esc = gerar_escala(Padrao("4X2", (g,)), date(2026, 1, 5), 1)
    assert esc.cobertura_dia(0) == {"M": 1, "T": 1, "N": 1}
    assert date(2026, 1, 5) + timedelta(days=esc.dias - 1) == date(2026, 1, 5)
