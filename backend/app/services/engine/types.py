"""Tipos de domínio do motor: dataclasses imutáveis, tempo em minutos absolutos (F1-1).

Convenções (TRD §7): tempo em ``int`` minutos; frações exatas em ``Fraction``;
saída de horas fracionárias em ``Decimal`` (6 casas).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum
from fractions import Fraction
from math import lcm

FOLGA = "F"
"""Estado de folga na sequência de uma turma."""

RESERVA = "R"
"""Estado de reserva/formação (presença sem posto) — usado pela 5T francesa (Fase 2)."""

MINUTOS_DIA = 24 * 60


def para_decimal(valor: Fraction | int, casas: int = 6) -> Decimal:
    """Converte uma fração exata para ``Decimal`` com ``casas`` decimais (ROUND_HALF_UP)."""
    fr = Fraction(valor)
    quantum = Decimal(1).scaleb(-casas)
    return (Decimal(fr.numerator) / Decimal(fr.denominator)).quantize(quantum, ROUND_HALF_UP)


class Severidade(StrEnum):
    """Severidade de um achado (Apêndice A do PRD)."""

    ERRO = "ERRO"
    ALERTA = "ALERTA"
    INFO = "INFO"


@dataclass(frozen=True, slots=True)
class Turno:
    """Turno de trabalho: início e duração em minutos (tempo à disposição)."""

    codigo: str
    inicio_min: int
    duracao_min: int
    intervalo_min: int = 60

    def __post_init__(self) -> None:
        if not 0 <= self.inicio_min < MINUTOS_DIA:
            raise ValueError(f"turno {self.codigo}: início fora de 00:00–23:59")
        if not 60 <= self.duracao_min <= MINUTOS_DIA:
            raise ValueError(f"turno {self.codigo}: duração fora de 60–1440 min")
        if self.codigo in (FOLGA, RESERVA):
            raise ValueError(f"código de turno reservado: {self.codigo}")

    @property
    def fim_min(self) -> int:
        """Fim em minutos a partir da 00:00 do dia de início (pode passar de 1440)."""
        return self.inicio_min + self.duracao_min

    @property
    def cruza_meia_noite(self) -> bool:
        return self.fim_min > MINUTOS_DIA

    @property
    def horas(self) -> Fraction:
        return Fraction(self.duracao_min, 60)


@dataclass(frozen=True, slots=True)
class GrupoTurmas:
    """Turmas que executam a mesma sequência cíclica com offsets distintos.

    Turma ``i`` no dia absoluto ``d`` executa ``sequencia[(d + offsets[i]) mod L]`` (FR-06).
    ``fracao_posto`` = 1/2 para meias-turmas (cada meia cobre metade dos postos).
    """

    sequencia: tuple[str, ...]
    offsets: tuple[int, ...]
    fracao_posto: Fraction = Fraction(1)

    def __post_init__(self) -> None:
        if not self.sequencia:
            raise ValueError("sequência vazia")
        if all(e in (FOLGA, RESERVA) for e in self.sequencia):
            raise ValueError("sequência sem dias trabalhados")
        if any(not 0 <= o < len(self.sequencia) for o in self.offsets):
            raise ValueError("offset fora de [0, L)")

    @property
    def ciclo(self) -> int:
        return len(self.sequencia)

    @property
    def dias_trabalhados(self) -> int:
        return sum(1 for e in self.sequencia if e not in (FOLGA, RESERVA))

    @property
    def turnos(self) -> tuple[str, ...]:
        """Turnos distintos da sequência, na ordem de aparição."""
        vistos: list[str] = []
        for e in self.sequencia:
            if e not in (FOLGA, RESERVA) and e not in vistos:
                vistos.append(e)
        return tuple(vistos)

    @property
    def k_estrela(self) -> Fraction:
        """K* = s × L / w (turmas inteiras equivalentes por posto)."""
        return Fraction(len(self.turnos) * self.ciclo, self.dias_trabalhados)


@dataclass(frozen=True, slots=True)
class Padrao:
    """Padrão de escala materializado: um ou mais grupos de turmas (ex.: 12x36 D + N)."""

    codigo: str
    grupos: tuple[GrupoTurmas, ...]

    @property
    def k_estrela(self) -> Fraction:
        return sum((g.k_estrela for g in self.grupos), Fraction(0))

    @property
    def ciclo_calendario(self) -> int:
        """mmc(L, 7) sobre todos os grupos — período que realinha com a semana."""
        return lcm(7, *(g.ciclo for g in self.grupos))

    @property
    def n_turmas(self) -> int:
        return sum(len(g.offsets) for g in self.grupos)


@dataclass(frozen=True, slots=True)
class Turma:
    """Uma turma gerada: nome (A, B, …), grupo, offset e fração de posto."""

    nome: str
    grupo: int
    offset: int
    fracao_posto: Fraction = Fraction(1)


@dataclass(frozen=True, slots=True)
class Escala:
    """Formato canônico turma × dia: ``estados[i][j]`` = estado da turma i no dia j do horizonte.

    ``dia_absoluto_inicial`` é contado a partir de ``data_ancora`` (nunca dia do mês).
    """

    padrao: str
    data_ancora: date
    dia_absoluto_inicial: int
    turmas: tuple[Turma, ...]
    estados: tuple[tuple[str, ...], ...]

    @property
    def dias(self) -> int:
        return len(self.estados[0]) if self.estados else 0

    def cobertura_dia(self, j: int) -> dict[str, Fraction]:
        """Postos-equivalentes por turno no dia j (soma das frações de posto)."""
        cob: dict[str, Fraction] = {}
        for turma, linha in zip(self.turmas, self.estados, strict=True):
            e = linha[j]
            if e not in (FOLGA, RESERVA):
                cob[e] = cob.get(e, Fraction(0)) + turma.fracao_posto
        return cob


@dataclass(frozen=True, slots=True)
class Achado:
    """Achado (finding) com código canônico do Apêndice A."""

    codigo: str
    severidade: Severidade
    mensagem: str
    contexto: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class Cargo:
    """Cargo (FR-34); matriz de substituição entra no S2."""

    codigo: str
    nome: str
