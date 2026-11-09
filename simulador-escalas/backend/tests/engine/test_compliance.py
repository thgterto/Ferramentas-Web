"""A17/A18 — interjornada, DSR 35 h, 7º dia, hora noturna 8/7 (FR-15, FR-16, FR-20)."""

from __future__ import annotations

from fractions import Fraction

from escalas.services.engine.catalogo import catalogo_mvp
from escalas.services.engine.compliance import (
    Jornada,
    validar_dsr_35h,
    validar_interjornada,
    validar_jornada_diaria,
    validar_sequencia,
    validar_setimo_dia,
)
from escalas.services.engine.noturno import jornada_computada_horas, minutos_noturnos
from escalas.services.engine.types import para_decimal

CAT = catalogo_mvp()
H = 60
D = 24 * H


def test_interjornada_n_06h_para_t_14h_mesmo_dia() -> None:
    js = [Jornada(22 * H, D + 6 * H, "N", 0), Jornada(D + 14 * H, D + 22 * H, "T", 1)]
    a = validar_interjornada(js)
    assert a[0].codigo == "CLT_INTERJORNADA" and a[0].contexto["descanso_h"] == "8.000000"


def test_interjornada_t_22h_para_m_06h() -> None:
    js = [Jornada(14 * H, 22 * H, "T", 0), Jornada(D + 6 * H, D + 14 * H, "M", 1)]
    assert validar_interjornada(js)[0].contexto["descanso_h"] == "8.000000"


def test_interjornada_m_depois_t_no_dia_seguinte_ok() -> None:
    js = [Jornada(6 * H, 14 * H, "M", 0), Jornada(D + 14 * H, D + 22 * H, "T", 1)]
    assert validar_interjornada(js) == []


def test_rotacao_para_tras_na_sequencia() -> None:
    codigos = {a.codigo for a in validar_sequencia(("N", "T", "F", "F"), CAT.turnos)}
    assert "CLT_INTERJORNADA" in codigos


def test_6x2_sem_erros_de_sequencia() -> None:
    achados = validar_sequencia(CAT["6X2"].sequencias[0], CAT.turnos)
    assert {a.codigo for a in achados} == {"CLT_JORNADA_DIARIA"}  # N 22–06 = 9,14 h (ALERTA)
    assert all(a.severidade == "ALERTA" for a in achados)


def test_sete_dias_seguidos() -> None:
    js = [Jornada(d * D + 6 * H, d * D + 14 * H, "M", d) for d in range(7)]
    assert validar_setimo_dia(js)[0].codigo == "CLT_SETIMO_DIA"
    assert validar_dsr_35h(js)[0].codigo == "CLT_DSR_35H"
    assert validar_setimo_dia(js[:6]) == [] and validar_dsr_35h(js[:6]) == []


def test_dsr_folga_curta_sem_35h() -> None:
    # N (22–06) seguido de folga e M às 06h: repouso de 24 h < 35 h; não há 7º dia.
    seq = ("N", "N", "N", "F", "M", "M", "M", "M", "F", "F")
    codigos = {a.codigo for a in validar_sequencia(seq, CAT.turnos)}
    assert "CLT_DSR_35H" in codigos and "CLT_SETIMO_DIA" not in codigos


def test_hora_noturna_22_05_e_22_06() -> None:
    assert para_decimal(jornada_computada_horas(22 * H, 29 * H)) == para_decimal(8)
    assert str(para_decimal(jornada_computada_horas(22 * H, 30 * H))) == "9.142857"
    assert jornada_computada_horas(22 * H, 30 * H) == Fraction(64, 7)
    assert jornada_computada_horas(22 * H, 30 * H, sumula60=False) == 9


def test_sumula60_19_07() -> None:
    assert minutos_noturnos(19 * H, 31 * H) == 9 * H
    assert minutos_noturnos(19 * H, 31 * H, sumula60=False) == 7 * H
    assert minutos_noturnos(23 * H, 31 * H) == 6 * H  # não cobriu 22–05 integralmente


def test_jornada_diaria_22_06_alerta() -> None:
    a = validar_jornada_diaria([Jornada(22 * H, 30 * H, "N", 0)])
    assert a[0].codigo == "CLT_JORNADA_DIARIA" and a[0].severidade == "ALERTA"
    a = validar_jornada_diaria([Jornada(7 * H, 19 * H, "D12", 0)])
    assert a[0].severidade == "ERRO"
    assert validar_jornada_diaria([Jornada(7 * H, 19 * H, "D12", 0)], regime_12x36=True) == []
