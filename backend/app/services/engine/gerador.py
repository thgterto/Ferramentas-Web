"""M2 — Gerador cíclico genérico de turmas (FR-05, FR-06).

Turma ``i`` no dia absoluto ``d`` executa ``seq[(d + offset_i) mod L]``, com ``d`` contado
a partir da **data-âncora** do cenário — nunca o dia do mês (TRD §5.3, correção do 12x36).
Nenhum modelo tem código próprio aqui: todos chegam como dados (ADR-010, ``catalogo.py``).
"""

from __future__ import annotations

from datetime import date
from fractions import Fraction
from itertools import combinations
from math import comb
from string import ascii_uppercase

from app.services.engine.types import FOLGA, RESERVA, Escala, GrupoTurmas, Padrao, Turma

MAX_COMBINACOES_BUSCA = 200_000


def dia_absoluto(data: date, data_ancora: date) -> int:
    """Dias desde a data-âncora (pode ser negativo; o gerador aplica ``mod L``)."""
    return (data - data_ancora).days


def estado(grupo: GrupoTurmas, offset: int, d_abs: int) -> str:
    """Estado da turma com ``offset`` no dia absoluto ``d_abs``."""
    return grupo.sequencia[(d_abs + offset) % grupo.ciclo]


def offsets_uniformes(ciclo: int, n_turmas: int) -> tuple[int, ...] | None:
    """Offsets ``i·L/K`` quando ``L/K`` é inteiro; senão ``None``."""
    if n_turmas <= 0 or ciclo % n_turmas:
        return None
    passo = ciclo // n_turmas
    return tuple(i * passo for i in range(n_turmas))


def cobertura_grupo(
    sequencia: tuple[str, ...], offsets: tuple[int, ...], fracao: Fraction, dias: int
) -> list[dict[str, Fraction]]:
    """Postos-equivalentes por turno em cada dia absoluto 0..dias-1."""
    L = len(sequencia)
    turnos = [e for e in dict.fromkeys(sequencia) if e not in (FOLGA, RESERVA)]
    saida: list[dict[str, Fraction]] = []
    for d in range(dias):
        cob = {t: Fraction(0) for t in turnos}
        for o in offsets:
            e = sequencia[(d + o) % L]
            if e in cob:
                cob[e] += fracao
        saida.append(cob)
    return saida


def cobre_exatamente(grupo: GrupoTurmas, dias: int) -> bool:
    """True se cada turno-dia tem exatamente 1 posto-equivalente em ``dias`` dias."""
    return all(
        v == 1
        for cob in cobertura_grupo(grupo.sequencia, grupo.offsets, grupo.fracao_posto, dias)
        for v in cob.values()
    )


def buscar_offsets(
    sequencia: tuple[str, ...], n_turmas: int, fracao: Fraction = Fraction(1)
) -> tuple[int, ...]:
    """Busca exaustiva (offset da 1ª turma = 0) para padrões não exatos.

    Critério lexicográfico: maximizar a cobertura mínima por turno-dia; depois minimizar
    ``Σ|cob − 1|``. Determinística (primeira combinação ótima em ordem lexicográfica).
    """
    L = len(sequencia)
    if n_turmas < 1:
        raise ValueError("n_turmas deve ser ≥ 1")
    if n_turmas == 1:
        return (0,)
    if comb(L - 1, n_turmas - 1) > MAX_COMBINACOES_BUSCA:
        raise ValueError(f"busca de offsets grande demais (L={L}, K={n_turmas})")
    melhor: tuple[int, ...] = ()
    melhor_chave: tuple[Fraction, Fraction] | None = None
    for resto in combinations(range(1, L), n_turmas - 1):
        offs = (0, *resto)
        cobs = cobertura_grupo(sequencia, offs, fracao, L)
        valores = [v for c in cobs for v in c.values()]
        chave = (-min(valores), sum((abs(v - 1) for v in valores), Fraction(0)))
        if melhor_chave is None or chave < melhor_chave:
            melhor, melhor_chave = offs, chave
    return melhor


def montar_grupo(
    sequencia: tuple[str, ...], n_turmas: int, fracao: Fraction = Fraction(1)
) -> GrupoTurmas:
    """Grupo com offsets uniformes se cobrem exatamente; senão com offsets buscados."""
    unif = offsets_uniformes(len(sequencia), n_turmas)
    if unif is not None:
        g = GrupoTurmas(sequencia, unif, fracao)
        if cobre_exatamente(g, len(sequencia)):
            return g
    return GrupoTurmas(sequencia, buscar_offsets(sequencia, n_turmas, fracao), fracao)


def nome_turma(i: int) -> str:
    """A, B, …, Z, AA, AB, …"""
    nome = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        nome = ascii_uppercase[r] + nome
    return nome


def gerar_escala(padrao: Padrao, data_ancora: date, dias: int,
                 data_inicio: date | None = None) -> Escala:
    """Gera a escala turma × dia de ``data_inicio`` (padrão: a âncora) por ``dias`` dias."""
    if dias < 1:
        raise ValueError("horizonte deve ter ≥ 1 dia")
    d0 = dia_absoluto(data_inicio or data_ancora, data_ancora)
    turmas: list[Turma] = []
    estados: list[tuple[str, ...]] = []
    for gi, g in enumerate(padrao.grupos):
        for o in g.offsets:
            turmas.append(Turma(nome_turma(len(turmas)), gi, o, g.fracao_posto))
            estados.append(tuple(estado(g, o, d0 + j) for j in range(dias)))
    return Escala(padrao.codigo, data_ancora, d0, tuple(turmas), tuple(estados))
