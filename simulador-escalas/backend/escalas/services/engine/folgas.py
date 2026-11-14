"""v3.9 — Folgas e indicadores por colaborador no mês (FR-52) e fechamento (FR-53).

A folga é tratada como **restrição de agenda** por pessoa, não só como média do ciclo::

    folgas mínimas no mês = floor(dias do mês × folgas por semana ÷ 7)
    folgas pendentes      = max(0, folgas mínimas − folgas concedidas)

e o limite de dias consecutivos de trabalho é medido na agenda real, incluindo a sequência
que vem do mês anterior. Reserva/formação (``R``) é presença: não conta como folga.

Índice de equidade = ``1 − desvio-padrão ÷ média`` (1 = distribuição igual), limitado a
[0, 1]. O fechamento da escala fica bloqueado enquanto houver folgas pendentes, dias
consecutivos acima do limite ou cobertura abaixo da mínima.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from fractions import Fraction
from math import sqrt

FOL_FOLGAS_PENDENTES = "FOL_FOLGAS_PENDENTES"
FOL_DIAS_CONSECUTIVOS = "FOL_DIAS_CONSECUTIVOS"
FOL_COBERTURA_ABAIXO_MINIMA = "FOL_COBERTURA_ABAIXO_MINIMA"

FOLGAS_SEMANA_MINIMO = Fraction(2)
"""Piso do produto: toda escala tem pelo menos 2 folgas semanais na média mensal; modelos
com mais folgas (4x3, 12x36, 5 turmas…) são válidos e podem ser exigidos como regra."""


@dataclass(frozen=True, slots=True)
class RegraFolgas:
    folgas_semana: Fraction = FOLGAS_SEMANA_MINIMO
    max_consecutivos: int = 6

    def __post_init__(self) -> None:
        if not FOLGAS_SEMANA_MINIMO <= self.folgas_semana <= 6:
            raise ValueError("folgas por semana fora de 2–6 (mínimo de 2 folgas semanais)")
        if not 1 <= self.max_consecutivos <= 31:
            raise ValueError("máximo de dias consecutivos fora de 1–31")


def folgas_minimas_mes(dias: int, folgas_semana: Fraction) -> int:
    """Média mensal: ``floor(dias × folgas/semana ÷ 7)`` — 8 folgas em qualquer mês com 2."""
    return int(Fraction(dias) * folgas_semana / 7)


@dataclass(frozen=True, slots=True)
class IndicadoresPessoa:
    dias_trabalhados: int
    folgas: int
    folgas_minimas: int
    folgas_pendentes: int
    max_consecutivos: int
    excede_consecutivos: bool
    domingos_trabalhados: int
    feriados_trabalhados: int
    noites: int
    fins_de_semana_folga: int


def consecutivos_no_fim(trabalha: Sequence[bool]) -> int:
    """Dias trabalhados em sequência no fim do período (carrega para o mês seguinte)."""
    n = 0
    for t in reversed(trabalha):
        if not t:
            break
        n += 1
    return n


def indicadores(trabalha: Sequence[bool], noite: Sequence[bool], dias: Sequence[date],
                feriados: frozenset[date] | set[date], regra: RegraFolgas,
                consecutivos_antes: int = 0) -> IndicadoresPessoa:
    """Indicadores do mês. ``trabalha[j]``/``noite[j]`` referem-se a ``dias[j]``;
    ``consecutivos_antes`` = dias trabalhados em sequência até a véspera do mês."""
    if not len(trabalha) == len(noite) == len(dias):
        raise ValueError("trabalha, noite e dias devem ter o mesmo tamanho")
    folgas = sum(1 for t in trabalha if not t)
    minimas = folgas_minimas_mes(len(dias), regra.folgas_semana)
    seq = maior = consecutivos_antes
    for t in trabalha:
        seq = seq + 1 if t else 0
        maior = max(maior, seq)
    if not any(trabalha):
        maior = 0
    livres = {d for d, t in zip(dias, trabalha, strict=True) if not t}
    fds = sum(1 for d in dias if d.weekday() == 5 and d in livres
              and d.toordinal() + 1 in {x.toordinal() for x in livres})
    return IndicadoresPessoa(
        dias_trabalhados=len(trabalha) - folgas, folgas=folgas, folgas_minimas=minimas,
        folgas_pendentes=max(0, minimas - folgas), max_consecutivos=maior,
        excede_consecutivos=maior > regra.max_consecutivos,
        domingos_trabalhados=sum(1 for d, t in zip(dias, trabalha, strict=True)
                                 if t and d.weekday() == 6),
        feriados_trabalhados=sum(1 for d, t in zip(dias, trabalha, strict=True)
                                 if t and d in feriados),
        noites=sum(1 for t, n in zip(trabalha, noite, strict=True) if t and n),
        fins_de_semana_folga=fds)


@dataclass(frozen=True, slots=True)
class Equidade:
    minimo: Fraction
    maximo: Fraction
    media: Fraction
    indice: Fraction


def equidade(valores: Sequence[Fraction | int]) -> Equidade:
    """``1 − CV`` em [0, 1]; lista vazia ou média zero = distribuição igual (1)."""
    if not valores:
        return Equidade(Fraction(0), Fraction(0), Fraction(0), Fraction(1))
    vs = [Fraction(v) for v in valores]
    media = sum(vs, Fraction(0)) / len(vs)
    if media == 0:
        return Equidade(min(vs), max(vs), media, Fraction(1))
    var = sum(((v - media) ** 2 for v in vs), Fraction(0)) / len(vs)
    cv = Fraction(sqrt(float(var))).limit_denominator(10**6) / media
    return Equidade(min(vs), max(vs), media, max(Fraction(0), min(Fraction(1), 1 - cv)))


@dataclass(frozen=True, slots=True)
class Bloqueio:
    codigo: str
    quantidade: int
    mensagem: str


def bloqueios_fechamento(pessoas: Sequence[IndicadoresPessoa], horas_deficit: int,
                         regra: RegraFolgas) -> tuple[Bloqueio, ...]:
    """Pendências que impedem fechar a escala do mês (vazio = pode fechar)."""
    out: list[Bloqueio] = []
    pend = [p for p in pessoas if p.folgas_pendentes > 0]
    if pend:
        total = sum(p.folgas_pendentes for p in pend)
        out.append(Bloqueio(FOL_FOLGAS_PENDENTES, len(pend),
                            f"{len(pend)} pessoa(s) com folgas pendentes ({total} folga(s) "
                            "abaixo do mínimo do mês)"))
    cons = [p for p in pessoas if p.excede_consecutivos]
    if cons:
        pior = max(p.max_consecutivos for p in cons)
        out.append(Bloqueio(FOL_DIAS_CONSECUTIVOS, len(cons),
                            f"{len(cons)} pessoa(s) com mais de {regra.max_consecutivos} dias "
                            f"consecutivos de trabalho (máx. {pior})"))
    if horas_deficit > 0:
        out.append(Bloqueio(FOL_COBERTURA_ABAIXO_MINIMA, horas_deficit,
                            f"{horas_deficit} hora(s) do mês com cobertura abaixo da mínima"))
    return tuple(out)


def indice_cobertura(disponiveis: int, minimo: int) -> Fraction | None:
    """Pessoas disponíveis ÷ cobertura mínima (< 1 déficit, = 1 mínimo, > 1 folga operacional)."""
    return Fraction(disponiveis, minimo) if minimo > 0 else None
