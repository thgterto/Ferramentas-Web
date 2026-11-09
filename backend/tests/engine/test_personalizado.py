"""v3.5 — motor genérico: blocos, rotação, janela, validações e desempenho (FR-29–FR-33)."""

from __future__ import annotations

import time
from datetime import date
from fractions import Fraction

import pytest

from app.services.engine import demanda
from app.services.engine import personalizado as P
from app.services.engine.catalogo import catalogo_mvp

CAT = catalogo_mvp()


def test_gerar_por_blocos_e_rotacao() -> None:
    assert P.gerar_por_blocos(["M", "T", "N"], 2, 2) == tuple("MMTTNNFF")
    assert P.gerar_por_blocos(["M", "T", "N"], 2, 2, rotacao="tras") == tuple("NNTTMMFF")
    assert P.gerar_por_blocos(["M", "N"], 1, 1, folga_entre=1) == ("M", "F", "N", "F")
    with pytest.raises(ValueError):
        P.gerar_por_blocos([], 1, 1)


def test_janela_cruza_meia_noite() -> None:
    j = P.Janela(frozenset({4}), 22 * 60, 6 * 60)   # sexta 22h → sábado 06h
    assert j.aberta(4, 23) and j.aberta(5, 3) and not j.aberta(5, 7) and not j.aberta(4, 21)
    assert P.Janela(frozenset({0}), 0, 0).aberta(0, 13)


def test_camada_validacoes() -> None:
    with pytest.raises(ValueError, match="sem dias"):
        P.Camada("A", ("F", "F"))
    with pytest.raises(ValueError, match="faixa"):
        P.Camada("A", ("M", "F"), k_modo="faixa", k_min=3)
    with pytest.raises(ValueError, match="não definidos"):
        P.PadraoPersonalizado("X", dict(CAT.turnos), (P.Camada("A", ("Q", "F")),))
    p = P.PadraoPersonalizado("X", dict(CAT.turnos),
                              (P.Camada("A", ("M", "F"), k=3, offsets=(0, 1)),))
    with pytest.raises(ValueError, match="offsets manuais"):
        P.simular(p, demanda.postos_24x7(1), date(2027, 1, 4), 7, 1)


def test_relatorio_e_meias() -> None:
    r = P.relatorio_camada(P.Camada("A", tuple("MMTTNNFFF")), CAT.turnos)
    assert (r.k_estrela, r.exato, r.meias_exato) == (Fraction(9, 2), False, True)
    assert r.maior_sequencia_trabalho == 6 and r.menor_interjornada_min == 16 * 60


def test_desempenho_ciclo_longo_k_grande() -> None:
    """L = 84 e K até 12 em modo 'sugerir' simula 8 semanas em poucos segundos."""
    seq = tuple(("M" * 4 + "T" * 4 + "N" * 4 + "F" * 9) * 4)
    p = P.PadraoPersonalizado("BIG", dict(CAT.turnos), (P.Camada("A", seq, k_modo="sugerir"),))
    t0 = time.perf_counter()
    r = P.simular(p, demanda.postos_24x7(3), date(2027, 1, 4), 56, 3)
    assert time.perf_counter() - t0 < 10
    assert r.cobertura.kpis.pct_horas_posto_cobertas == 1
