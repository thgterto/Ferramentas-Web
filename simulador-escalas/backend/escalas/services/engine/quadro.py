"""v3.9 — Calculadora de quadro (FR-51): horas do posto × horas úteis por colaborador.

Separa as três variáveis do dimensionamento: **demanda** (horas-posto/semana da curva),
**disponibilidade líquida** (carga semanal × (1 − taxa de indisponibilidade)) e as
restrições (que continuam em ``regime_legal``/``compliance``).

Taxa de indisponibilidade = soma dos componentes sobre as horas contratadas do ano::

    férias       = dias corridos / 365
    feriados     = dias não trabalhados × jornada / horas contratadas
    absenteísmo  = taxa histórica
    treinamento  = horas / horas contratadas
    passagem     = minutos por turno / jornada

Dimensionamento (regra prática 24/7 generalizada para qualquer curva)::

    equipe mínima      = ceil(horas-posto/semana ÷ horas semanais por pessoa)
    equipe recomendada = ceil(equipe mínima ÷ (1 − taxa))
    fator de cobertura = horas anuais do posto ÷ horas úteis anuais por colaborador

A indisponibilidade entra **uma vez** (na recomendada); o fator de cobertura é a mesma
conta em base contínua, sem os dois arredondamentos. Aritmética exata em ``Fraction``.
"""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from math import ceil

from escalas.services.engine.shrinkage import LIMITE_SHRINKAGE, ErroShrinkage

DIAS_ANO = 365
SEMANAS_ANO = Fraction(DIAS_ANO, 7)


@dataclass(frozen=True, slots=True)
class Indisponibilidade:
    """Afastamentos previsíveis de um colaborador ao longo do ano."""

    ferias_dias: Fraction = Fraction(0)       # dias corridos de férias por ano
    feriados_dias: Fraction = Fraction(0)     # feriados não trabalhados por ano
    absenteismo: Fraction = Fraction(0)       # faltas, atestados e licenças (0..1)
    treinamento_h: Fraction = Fraction(0)     # horas de capacitação por ano
    passagem_min: Fraction = Fraction(0)      # minutos de passagem por turno


@dataclass(frozen=True, slots=True)
class Componente:
    codigo: str
    taxa: Fraction
    horas_ano: Fraction


@dataclass(frozen=True, slots=True)
class TaxaIndisponibilidade:
    taxa: Fraction
    componentes: tuple[Componente, ...]


def taxa_indisponibilidade(ind: Indisponibilidade, horas_semanais: Fraction,
                           jornada_h: Fraction) -> TaxaIndisponibilidade:
    """Soma dos componentes; rejeita taxa ≥ 60 % (mesmo limite do shrinkage)."""
    if horas_semanais <= 0 or jornada_h <= 0:
        raise ValueError("horas semanais e jornada devem ser positivas")
    if min(ind.ferias_dias, ind.feriados_dias, ind.absenteismo, ind.treinamento_h,
           ind.passagem_min) < 0:
        raise ValueError("componentes de indisponibilidade não podem ser negativos")
    horas_ano = horas_semanais * SEMANAS_ANO
    taxas = (("ferias", ind.ferias_dias / DIAS_ANO),
             ("feriados", ind.feriados_dias * jornada_h / horas_ano),
             ("absenteismo", ind.absenteismo),
             ("treinamento", ind.treinamento_h / horas_ano),
             ("passagem", ind.passagem_min / (jornada_h * 60)))
    comps = tuple(Componente(c, t, t * horas_ano) for c, t in taxas)
    total = sum((c.taxa for c in comps), Fraction(0))
    if total >= LIMITE_SHRINKAGE:
        raise ErroShrinkage(f"indisponibilidade {float(total):.2%} fora de 0 ≤ taxa < 60%")
    return TaxaIndisponibilidade(total, comps)


@dataclass(frozen=True, slots=True)
class Quadro:
    horas_posto_semana: Fraction
    horas_posto_ano: Fraction
    horas_semanais: Fraction
    horas_contratadas_ano: Fraction
    horas_uteis_ano: Fraction
    taxa: Fraction
    fator_cobertura: Fraction       # pessoas necessárias, em base contínua
    equipe_minima: int              # sem indisponibilidade
    equipe_recomendada: int         # com indisponibilidade
    reserva: int                    # recomendada − mínima


def dimensionar_quadro(horas_posto_semana: Fraction | int, horas_semanais: Fraction | int,
                       taxa: Fraction | int = 0) -> Quadro:
    hps, h, t = Fraction(horas_posto_semana), Fraction(horas_semanais), Fraction(taxa)
    if hps < 0 or h <= 0:
        raise ValueError("horas do posto ≥ 0 e horas semanais por pessoa > 0")
    if not 0 <= t < LIMITE_SHRINKAGE:
        raise ErroShrinkage(f"indisponibilidade {float(t):.2%} fora de 0 ≤ taxa < 60%")
    contratadas = h * SEMANAS_ANO
    uteis = contratadas * (1 - t)
    minima = ceil(hps / h)
    recomendada = ceil(Fraction(minima) / (1 - t))
    return Quadro(
        horas_posto_semana=hps, horas_posto_ano=hps * SEMANAS_ANO, horas_semanais=h,
        horas_contratadas_ano=contratadas, horas_uteis_ano=uteis, taxa=t,
        fator_cobertura=hps * SEMANAS_ANO / uteis, equipe_minima=minima,
        equipe_recomendada=recomendada, reserva=recomendada - minima)
