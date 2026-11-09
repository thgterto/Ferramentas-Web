"""M3 — Dimensionamento (FR-08): ``K* = s·L/w``, headcount mínimo com/sem reserva.

``COB_TURMAS_INSUFICIENTES`` (ERRO) quando o K informado no cenário é menor que K*
(pré-checagem; distinto de ``COB_K_INSUFICIENTE``, que é a restrição da operação — FR-32).
"""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from math import ceil

from escalas.services.engine.catalogo import ModeloEscala
from escalas.services.engine.shrinkage import Shrinkage
from escalas.services.engine.types import Achado, Severidade

COB_TURMAS_INSUFICIENTES = "COB_TURMAS_INSUFICIENTES"


@dataclass(frozen=True, slots=True)
class Dimensionamento:
    k_estrela: Fraction
    turmas_inteiras: int
    n_meias: int | None              # nº de meias-turmas, se cobrem exato e postos pares
    headcount_min: int               # ceil(K*) × postos
    headcount_min_meias: int | None  # n_meias × postos/2
    tamanho_turma_reserva: int       # ceil(postos / (1 − S_max))
    headcount_reserva: int
    achados: tuple[Achado, ...]


def dimensionar(modelo: ModeloEscala, postos: int, k_informado: int | None = None,
                shr: Shrinkage | None = None) -> Dimensionamento:
    k = modelo.k_estrela
    if k is None:
        raise ValueError(f"{modelo.codigo}: modelo não contínuo — sem K* 24/7")
    inteiras = ceil(k)
    n_meias = None
    if modelo.exato_meias and (2 * k).denominator == 1 and postos % 2 == 0 and not modelo.exato:
        n_meias = int(2 * k)
    s_max = max(shr.diurno, shr.noturno) if shr else Fraction(0)
    tam = ceil(Fraction(postos) / (1 - s_max))
    achados: tuple[Achado, ...] = ()
    if k_informado is not None and k_informado < k:
        alt = f"{inteiras} turmas" + (f" ou {n_meias} meias-turmas" if n_meias else "")
        achados = (Achado(COB_TURMAS_INSUFICIENTES, Severidade.ERRO,
                          f"{k_informado} turmas < K* = {float(k):g}; use {alt}",
                          {"k_informado": str(k_informado), "k_estrela": str(k),
                           "sugestao_turmas": str(inteiras),
                           "sugestao_meias": str(n_meias or "")}),)
    return Dimensionamento(
        k_estrela=k,
        turmas_inteiras=inteiras,
        n_meias=n_meias,
        headcount_min=inteiras * postos,
        headcount_min_meias=n_meias * postos // 2 if n_meias else None,
        tamanho_turma_reserva=tam,
        headcount_reserva=inteiras * tam,
        achados=achados,
    )
