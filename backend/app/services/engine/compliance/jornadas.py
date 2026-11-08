"""Construção de jornadas absolutas a partir de uma sequência cíclica."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

from app.services.engine.types import FOLGA, MINUTOS_DIA, RESERVA, Turno


@dataclass(frozen=True, slots=True)
class Jornada:
    """Jornada em minutos absolutos; ``dia`` = dia absoluto de início."""

    ini: int
    fim: int
    turno: str
    dia: int


def jornadas_da_sequencia(sequencia: tuple[str, ...], turnos: Mapping[str, Turno],
                          dias: int, offset: int = 0) -> list[Jornada]:
    """Desenrola ``dias`` dias da sequência (estado do dia d = ``seq[(d+offset) mod L]``)."""
    out: list[Jornada] = []
    L = len(sequencia)
    for d in range(dias):
        e = sequencia[(d + offset) % L]
        if e in (FOLGA, RESERVA):
            continue
        t = turnos[e]
        ini = d * MINUTOS_DIA + t.inicio_min
        out.append(Jornada(ini, ini + t.duracao_min, e, d))
    return out
