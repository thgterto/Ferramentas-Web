"""M4 — Hora noturna reduzida (CLT art. 73 §1º) e jornada computada (FR-20).

Fator exato ``8/7`` (52min30s = 1 h ficta). Janela noturna urbana 22h–05h. Súmula 60, II
TST: se a jornada cumpriu **integralmente** 22h–05h e prorrogou, as horas após 05h também
são noturnas (parâmetro ``sumula60``, padrão ``True``). Tempo em minutos absolutos.
"""

from __future__ import annotations

from fractions import Fraction

from escalas.services.engine.types import MINUTOS_DIA, para_decimal

FATOR_NOTURNO = Fraction(8, 7)
NOITE_INI = 22 * 60
NOITE_FIM = 5 * 60 + MINUTOS_DIA  # 05h do dia seguinte, relativo à 00h do dia da janela


def _janelas(ini: int, fim: int) -> list[tuple[int, int]]:
    """Janelas 22h–05h (absolutas) que podem intersectar ``[ini, fim)``."""
    d0 = ini // MINUTOS_DIA - 1
    d1 = fim // MINUTOS_DIA + 1
    return [(d * MINUTOS_DIA + NOITE_INI, d * MINUTOS_DIA + NOITE_FIM) for d in range(d0, d1)]


def minutos_noturnos(ini: int, fim: int, sumula60: bool = True) -> int:
    """Minutos de relógio noturnos em ``[ini, fim)``, incluindo prorrogação (Súmula 60)."""
    if fim < ini:
        raise ValueError("fim antes do início")
    total = 0
    for a, b in _janelas(ini, fim):
        total += max(0, min(fim, b) - max(ini, a))
        if sumula60 and ini <= a and fim > b:
            prox = min(fim, b + (MINUTOS_DIA - (NOITE_FIM - NOITE_INI)))  # até a próxima 22h
            total += prox - b
    return total


def jornada_computada_min(ini: int, fim: int, sumula60: bool = True) -> Fraction:
    """Jornada computada em minutos: diurnos + noturnos × 8/7 (exato)."""
    noturno = minutos_noturnos(ini, fim, sumula60)
    return (fim - ini - noturno) + noturno * FATOR_NOTURNO


def horas_fictas(min_noturnos: int) -> Fraction:
    return Fraction(min_noturnos, 60) * FATOR_NOTURNO


def jornada_computada_horas(ini: int, fim: int, sumula60: bool = True) -> Fraction:
    return jornada_computada_min(ini, fim, sumula60) / 60


__all__ = ["FATOR_NOTURNO", "horas_fictas", "jornada_computada_horas", "jornada_computada_min",
           "minutos_noturnos", "para_decimal"]
