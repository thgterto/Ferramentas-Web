"""M1b — Shrinkage diurno/noturno (FR-03): ``N_bruto = ceil(N_req / (1 − S))``.

Aritmética exata com ``Fraction`` (sem epsilon de float). Hora noturna para o
shrinkage = 22h–05h, i.e. células das horas 22, 23, 0, 1, 2, 3, 4.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from decimal import Decimal
from fractions import Fraction
from math import ceil

from escalas.services.engine.demanda import CurvaDemanda

HORAS_NOTURNAS = frozenset({22, 23, 0, 1, 2, 3, 4})
LIMITE_SHRINKAGE = Fraction(3, 5)  # 60 %: rejeitado (bloqueia divisão explosiva)


class ErroShrinkage(ValueError):
    """Shrinkage fora de 0 ≤ S < 60 %."""


def _fracao(valor: Decimal | Fraction | int | str) -> Fraction:
    if isinstance(valor, float):
        raise TypeError("use Decimal/str/Fraction, não float")
    return Fraction(valor)


def validar(s: Fraction) -> Fraction:
    if not 0 <= s < LIMITE_SHRINKAGE:
        raise ErroShrinkage(f"shrinkage {float(s):.2%} fora de 0 ≤ S < 60%")
    return s


def combinar(componentes: Iterable[Decimal | Fraction | int | str]) -> Fraction:
    """Combina componentes independentes: ``S = 1 − Π(1 − s_i)`` (absenteísmo, férias, …)."""
    resto = Fraction(1)
    for c in componentes:
        resto *= 1 - _fracao(c)
    return validar(1 - resto)


@dataclass(frozen=True, slots=True)
class Shrinkage:
    """Shrinkage diurno e noturno (frações 0..0,6)."""

    diurno: Fraction = Fraction(0)
    noturno: Fraction = Fraction(0)

    @classmethod
    def de(cls, diurno: Decimal | Fraction | int | str = 0,
           noturno: Decimal | Fraction | int | str = 0) -> Shrinkage:
        return cls(validar(_fracao(diurno)), validar(_fracao(noturno)))

    def na_hora(self, hora: int) -> Fraction:
        return self.noturno if hora in HORAS_NOTURNAS else self.diurno


def n_bruto(n_req: int, s: Fraction) -> int:
    """``ceil(n_req / (1 − s))`` exato."""
    return ceil(Fraction(n_req) / (1 - validar(s)))


def aplicar(curva: CurvaDemanda, shr: Shrinkage) -> CurvaDemanda:
    """Curva bruta hora a hora (ressalva TRD §5.2: ceil por hora superdimensiona)."""
    valores = tuple(n_bruto(v, shr.na_hora(i % 24)) for i, v in enumerate(curva.valores))
    return CurvaDemanda(valores, curva.criticas)


def fte_liquido(curva: CurvaDemanda, shr: Shrinkage) -> tuple[Fraction, ...]:
    """FTE fracionário por hora (sem arredondar), para relatórios."""
    return tuple(Fraction(v) / (1 - shr.na_hora(i % 24)) for i, v in enumerate(curva.valores))
