"""Adaptador puro entre a camada de serviço e o motor (sem I/O, sem ORM).

``run_simulation`` executa M1→M4 para um cenário (K fixo, horizonte do cenário) e devolve
estruturas prontas para persistir. É o que o benchmark NFR-01 mede.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from fractions import Fraction
from typing import Any

from app.services.engine.catalogo import Catalogo, ModeloEscala
from app.services.engine.cobertura import ResultadoCobertura, calcular_cobertura, visao_reserva
from app.services.engine.cobertura_cargos import (
    MinimoCargo,
    ResultadoCargos,
    Substituicao,
    cobertura_por_cargo,
)
from app.services.engine.demanda import CurvaDemanda
from app.services.engine.dimensionamento import Dimensionamento, dimensionar
from app.services.engine.gerador import gerar_escala
from app.services.engine.regime_legal import (
    ContextoRegime,
    RegimeLegal,
    k_legal,
    validar_modelo,
)
from app.services.engine.shrinkage import Shrinkage
from app.services.engine.turmas_k import padrao_k_fixo, simular_k_fixo
from app.services.engine.types import FOLGA, RESERVA, Achado, Escala
from app.services.engine.version import ENGINE_VERSION


class EntradaInvalida(ValueError):
    """Parâmetros que o motor não aceita (vira 422 na API)."""


@dataclass(frozen=True, slots=True)
class EntradaCargos:
    composicao_por_turma: Sequence[Mapping[str, int]]
    demandas: Mapping[str, CurvaDemanda]
    regras: Sequence[Substituicao]
    minimos: Sequence[MinimoCargo] = ()


@dataclass(frozen=True, slots=True)
class EntradaSimulacao:
    modelo: ModeloEscala
    catalogo: Catalogo
    curva: CurvaDemanda
    tamanho_turma: int
    k: int
    k_fixo_operacao: bool
    inicio: date
    semanas: int
    shrinkage: Shrinkage
    regime: RegimeLegal
    ctx: ContextoRegime
    cargos: EntradaCargos | None = None


@dataclass(frozen=True, slots=True)
class Slot7x24:
    slot_index: int
    required_net: Fraction
    required_gross: Fraction
    scheduled_worst: Fraction
    scheduled_mean: Fraction
    expected_worst: Fraction
    deficit_occurrences: int


@dataclass(frozen=True, slots=True)
class SlotCargo:
    cargo: str
    slot_index: int
    demanda: int
    proprio: int
    substituicao: int


@dataclass(slots=True)
class ResultadoSimulacao:
    escala: Escala
    cobertura: ResultadoCobertura
    dimensionamento: Dimensionamento
    slots: list[Slot7x24]
    cargos: ResultadoCargos | None
    slots_cargo: list[SlotCargo]
    achados: list[Achado]
    k_legal: Fraction
    alcancavel: Fraction
    extras: dict[str, Any] = field(default_factory=dict)


def canonical_hash(snapshot: Mapping[str, Any]) -> str:
    texto = json.dumps(snapshot, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(texto.encode()).hexdigest()


def _agregar(res: ResultadoCobertura, shr: Shrinkage) -> list[Slot7x24]:
    cel: list[list[tuple[Fraction, int]]] = [[] for _ in range(168)]
    for h, c in enumerate(res.cobertura):
        idx = (res.data_inicio + timedelta(days=h // 24)).weekday() * 24 + h % 24
        cel[idx].append((c, res.demanda[h]))
    out = []
    for i, vals in enumerate(cel):
        s = shr.na_hora(i % 24)
        req = Fraction(vals[0][1]) if vals else Fraction(0)
        covs = [c for c, _ in vals] or [Fraction(0)]
        out.append(Slot7x24(
            slot_index=i, required_net=req, required_gross=req / (1 - s),
            scheduled_worst=min(covs), scheduled_mean=sum(covs, Fraction(0)) / len(covs),
            expected_worst=min(covs) * (1 - s),
            deficit_occurrences=sum(1 for c, r in vals if c < r)))
    return out


def _agregar_cargos(rc: ResultadoCargos, inicio: date) -> list[SlotCargo]:
    out: list[SlotCargo] = []
    for b, cargo in enumerate(rc.cargos):
        pior: dict[int, tuple[int, int, int, int]] = {}
        for h, linha in enumerate(rc.horas):
            idx = (inicio + timedelta(days=h // 24)).weekday() * 24 + h % 24
            dem, prop, sub, defi = linha[b]
            if idx not in pior or defi > pior[idx][3]:
                pior[idx] = (dem, prop, sub, defi)
        for idx in range(168):
            dem, prop, sub, _ = pior.get(idx, (0, 0, 0, 0))
            out.append(SlotCargo(cargo, idx, dem, prop, sub))
    return out


def run_simulation(e: EntradaSimulacao) -> ResultadoSimulacao:
    m = e.modelo
    if not m.continuo_24x7:
        raise EntradaInvalida(f"{m.codigo}: modelo não contínuo — simulação 24/7 indisponível "
                              "no MVP")
    try:
        padrao = padrao_k_fixo(m, e.k)
    except ValueError as exc:
        raise EntradaInvalida(str(exc)) from exc
    turnos = e.catalogo.turnos
    dias = e.semanas * 7
    res = calcular_cobertura(padrao, turnos, e.curva, e.tamanho_turma, e.inicio, dias=dias)
    dim = dimensionar(m, e.tamanho_turma, e.k, e.shrinkage)
    kl = k_legal(e.regime)
    achados: list[Achado] = [*res.achados, *dim.achados]
    if e.k_fixo_operacao:
        kf = simular_k_fixo(m, e.k, turnos, e.curva, e.tamanho_turma, e.inicio, kl)
        achados += list(kf.achados)
    if e.shrinkage.diurno or e.shrinkage.noturno:
        achados += list(visao_reserva(res, e.shrinkage, e.tamanho_turma).achados)
    achados += validar_modelo(m, turnos, e.regime, e.ctx)
    rc = None
    slots_cargo: list[SlotCargo] = []
    if e.cargos is not None:
        comp = list(e.cargos.composicao_por_turma)
        n = sum(len(g.offsets) for g in padrao.grupos)
        if len(comp) != n:
            raise EntradaInvalida(f"composição definida para {len(comp)} turmas; padrão tem {n}")
        try:
            rc = cobertura_por_cargo(padrao, turnos, comp[0], e.cargos.demandas,
                                     e.cargos.regras, e.inicio, e.cargos.minimos, dias=dias,
                                     composicao_por_turma=comp)
        except ValueError as exc:
            raise EntradaInvalida(str(exc)) from exc
        achados += list(rc.achados)
        slots_cargo = _agregar_cargos(rc, e.inicio)
    escala = gerar_escala(padrao, e.inicio, dias)
    return ResultadoSimulacao(
        escala=escala, cobertura=res, dimensionamento=dim, slots=_agregar(res, e.shrinkage),
        cargos=rc, slots_cargo=slots_cargo, achados=achados, k_legal=kl,
        alcancavel=res.kpis.pct_horas_posto_cobertas,
        extras={"engine_version": ENGINE_VERSION})


def assignments(escala: Escala, catalogo: Catalogo) -> list[dict[str, Any]]:
    """Turma × dia (FOLGA/RESERVA = folga)."""
    out = []
    for k, t in enumerate(escala.turmas):
        for j, est in enumerate(escala.estados[k]):
            d = escala.data_ancora + timedelta(days=escala.dia_absoluto_inicial + j)
            if est in (FOLGA, RESERVA) or est not in catalogo.turnos:
                out.append({"team": t.nome, "work_date": d, "shift_code": None,
                            "is_day_off": True, "starts_at": None, "ends_at": None,
                            "clock_minutes": 0})
                continue
            tt = catalogo.turnos[est]
            ini = datetime(d.year, d.month, d.day) + timedelta(minutes=tt.inicio_min)
            out.append({"team": t.nome, "work_date": d, "shift_code": est, "is_day_off": False,
                        "starts_at": ini, "ends_at": ini + timedelta(minutes=tt.duracao_min),
                        "clock_minutes": tt.duracao_min})
    return out


def headcount(dim: Dimensionamento) -> int:
    return min(dim.headcount_min, dim.headcount_min_meias or dim.headcount_min)


