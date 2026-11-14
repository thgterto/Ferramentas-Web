"""v3.9 — folgas por colaborador, dias consecutivos, equidade e bloqueios de fechamento."""

from __future__ import annotations

from datetime import date, timedelta
from fractions import Fraction as F

import pytest

from escalas.services.engine import folgas as FG


def _mes(n: int = 28, ini: date = date(2027, 2, 1)) -> list[date]:   # 01/02/2027 = segunda
    return [ini + timedelta(days=i) for i in range(n)]


def _ciclo(seq: str, n: int) -> list[bool]:
    return [seq[i % len(seq)] == "X" for i in range(n)]


def test_folgas_minimas_media_mensal() -> None:
    assert [FG.folgas_minimas_mes(d, F(2)) for d in (28, 29, 30, 31)] == [8, 8, 8, 8]
    assert FG.folgas_minimas_mes(31, F(1)) == 4 and FG.folgas_minimas_mes(30, F(3)) == 12


def test_5x2_cumpre_duas_folgas() -> None:
    dias = _mes()
    ind = FG.indicadores(_ciclo("XXXXXFF", 28), [False] * 28, dias, set(), FG.RegraFolgas())
    assert (ind.folgas, ind.folgas_minimas, ind.folgas_pendentes) == (8, 8, 0)
    assert ind.max_consecutivos == 5 and not ind.excede_consecutivos
    assert ind.domingos_trabalhados == 0 and ind.fins_de_semana_folga == 4


def test_6x1_fica_com_folgas_pendentes() -> None:
    ind = FG.indicadores(_ciclo("XXXXXXF", 28), [False] * 28, _mes(), set(), FG.RegraFolgas())
    assert (ind.folgas, ind.folgas_pendentes, ind.max_consecutivos) == (4, 4, 6)
    um = FG.indicadores(_ciclo("XXXXXXF", 28), [False] * 28, _mes(), set(),
                        FG.RegraFolgas(F(1)))
    assert um.folgas_pendentes == 0


def test_consecutivos_atravessam_o_mes() -> None:
    trab = [True, True, False] + [False] * 25
    regra = FG.RegraFolgas()
    assert FG.indicadores(trab, [False] * 28, _mes(), set(), regra, 5).max_consecutivos == 7
    assert FG.indicadores(trab, [False] * 28, _mes(), set(), regra, 5).excede_consecutivos
    assert FG.indicadores(trab, [False] * 28, _mes(), set(), regra).max_consecutivos == 2
    assert FG.consecutivos_no_fim([False, True, True]) == 2
    assert FG.consecutivos_no_fim([True, False]) == 0


def test_domingos_feriados_e_noites() -> None:
    dias = _mes()
    trab = [d.weekday() in (5, 6) or d.day == 9 for d in dias]     # 09/02/2027 = Carnaval
    noite = [d.weekday() == 6 for d in dias]
    ind = FG.indicadores(trab, noite, dias, {date(2027, 2, 9)}, FG.RegraFolgas())
    assert (ind.domingos_trabalhados, ind.feriados_trabalhados, ind.noites) == (4, 1, 4)
    assert ind.fins_de_semana_folga == 0


def test_equidade() -> None:
    assert FG.equidade([8, 8, 8]).indice == 1
    assert FG.equidade([]).indice == 1 and FG.equidade([0, 0]).indice == 1
    e = FG.equidade([4, 12])
    assert (e.minimo, e.maximo, e.media) == (F(4), F(12), F(8)) and e.indice == F(1, 2)
    assert FG.equidade([0, 100]).indice == 0


def test_bloqueios_de_fechamento() -> None:
    regra = FG.RegraFolgas()
    ok = FG.indicadores(_ciclo("XXXXXFF", 28), [False] * 28, _mes(), set(), regra)
    ruim = FG.indicadores(_ciclo("XXXXXXXF", 28), [False] * 28, _mes(), set(), regra)
    assert FG.bloqueios_fechamento([ok], 0, regra) == ()
    cods = [b.codigo for b in FG.bloqueios_fechamento([ok, ruim], 3, regra)]
    assert cods == [FG.FOL_FOLGAS_PENDENTES, FG.FOL_DIAS_CONSECUTIVOS,
                    FG.FOL_COBERTURA_ABAIXO_MINIMA]


def test_indice_cobertura_e_validacao() -> None:
    assert FG.indice_cobertura(2, 3) == F(2, 3) and FG.indice_cobertura(3, 0) is None
    with pytest.raises(ValueError):
        FG.RegraFolgas(F(8))
    with pytest.raises(ValueError):
        FG.indicadores([True], [False, False], _mes(1), set(), FG.RegraFolgas())
