"""Adaptador puro entre a camada de serviço e o motor (sem I/O, sem ORM).

``run_simulation`` executa M1→M4 para um cenário (K fixo, horizonte do cenário) e devolve
estruturas prontas para persistir. É o que o benchmark NFR-01 mede.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field, replace
from datetime import date, datetime, timedelta
from fractions import Fraction
from math import ceil
from typing import Any

from escalas.services.engine import personalizado as P
from escalas.services.engine import subsetores as SUB
from escalas.services.engine.catalogo import Catalogo, ModeloEscala
from escalas.services.engine.cobertura import (
    ResultadoCobertura,
    calcular_cobertura,
    ocupacao_horaria,
    visao_reserva,
)
from escalas.services.engine.cobertura_cargos import (
    MinimoCargo,
    ResultadoCargos,
    Substituicao,
    cobertura_por_cargo,
)
from escalas.services.engine.demanda import CurvaDemanda
from escalas.services.engine.dimensionamento import Dimensionamento, dimensionar
from escalas.services.engine.gerador import gerar_escala
from escalas.services.engine.regime_legal import (
    ContextoRegime,
    RegimeLegal,
    k_legal,
    validar_modelo,
)
from escalas.services.engine.shrinkage import Shrinkage
from escalas.services.engine.turmas_k import padrao_k_fixo, simular_k_fixo
from escalas.services.engine.types import FOLGA, RESERVA, Achado, Escala, GrupoTurmas, Padrao, Turno
from escalas.services.engine.version import ENGINE_VERSION


class EntradaInvalida(ValueError):
    """Parâmetros que o motor não aceita (vira 422 na API)."""


@dataclass(frozen=True, slots=True)
class EntradaCargos:
    composicao_por_turma: Sequence[Mapping[str, int]]
    demandas: Mapping[str, CurvaDemanda]
    regras: Sequence[Substituicao]
    minimos: Sequence[MinimoCargo] = ()


@dataclass(frozen=True, slots=True)
class PessoaCadastrada:
    id: str
    nome: str
    cargo: str | None
    subsetor: str | None
    posicao: str | None


@dataclass(frozen=True, slots=True)
class EntradaSimulacao:
    modelo: ModeloEscala | None
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
    padrao: P.PadraoPersonalizado | None = None   # v3.5: construtor / não contínuo
    estrutura: SUB.Estrutura | None = None        # v3.7: subsetores, posições e pools
    pessoas: Mapping[str, Sequence[PessoaCadastrada]] | None = None  # v3.7: por turma
    offsets: tuple[tuple[int, ...], ...] | None = None   # v3.7: offsets do otimizador


@dataclass(frozen=True, slots=True)
class Slot7x24:
    slot_index: int
    required_net: Fraction
    required_gross: Fraction
    scheduled_worst: Fraction
    scheduled_mean: Fraction
    expected_worst: Fraction
    deficit_occurrences: int
    planned_worst: Fraction = Fraction(0)   # v3.6: passagem/reforço na ocorrência pior
    planned_mean: Fraction = Fraction(0)


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
    subsetores: SUB.ResultadoSubsetores | None = None
    pessoas_lotadas: list[SUB.PessoaLotada] = field(default_factory=list)


def padrao_cenario(m: ModeloEscala, k: int,
                   offsets: Sequence[Sequence[int]] | None = None) -> Padrao:
    """Padrão do cenário: offsets do otimizador (``params.offsets``) ou a busca padrão."""
    if offsets:
        try:
            ks = m.distribuir_k(k)
        except ValueError as exc:
            raise EntradaInvalida(str(exc)) from exc
        if (len(offsets) == len(m.sequencias)
                and all(len(o) == kk for o, kk in zip(offsets, ks, strict=True))):
            try:
                return Padrao(m.codigo, tuple(GrupoTurmas(seq, tuple(o)) for seq, o
                                              in zip(m.sequencias, offsets, strict=True)))
            except ValueError as exc:
                raise EntradaInvalida(f"params.offsets inválido: {exc}") from exc
    try:
        return padrao_k_fixo(m, k)
    except ValueError as exc:
        raise EntradaInvalida(str(exc)) from exc


def pessoas_lotadas(estr: SUB.Estrutura, turmas: Sequence[tuple[str, int]],
                    comp: Sequence[Mapping[str, int]] | None,
                    cadastradas: Mapping[str, Sequence[PessoaCadastrada]] | None
                    ) -> tuple[list[SUB.PessoaLotada], dict[str, str]]:
    """Pessoas lotadas por turma (cadastradas quando houver; senão fictícias ``A-01``…)."""
    out: list[SUB.PessoaLotada] = []
    nomes: dict[str, str] = {}
    for ti, (nome, tam) in enumerate(turmas):
        cad = list((cadastradas or {}).get(nome, ()))
        if cad:
            for pc in cad:
                sub = pc.subsetor or (estr.subsetores[0] if estr.subsetores else "")
                out.append(SUB.PessoaLotada(pc.id, ti, sub, pc.posicao, pc.cargo))
                nomes[pc.id] = pc.nome
            continue
        c = comp[ti] if comp and ti < len(comp) else {}
        cargos = [r for r, n in c.items() for _ in range(n)]
        for pe in SUB.distribuir_pessoas(estr, [(nome, max(tam, len(cargos)), cargos)]):
            out.append(SUB.PessoaLotada(pe.id, ti, pe.subsetor, pe.posicao, pe.cargo))
    return out, nomes


def _subsetores(e: EntradaSimulacao, turmas: Sequence[tuple[str, int]],
                ocup: Sequence[Sequence[tuple[int, str]]]
                ) -> tuple[SUB.ResultadoSubsetores, list[SUB.PessoaLotada]]:
    assert e.estrutura is not None
    comp = list(e.cargos.composicao_por_turma) if e.cargos is not None else None
    pes, _ = pessoas_lotadas(e.estrutura, turmas, comp, e.pessoas)
    try:
        return SUB.alocar_horizonte(e.estrutura, pes, ocup, e.inicio, por_pessoa=False), pes
    except ValueError as exc:
        raise EntradaInvalida(str(exc)) from exc


def canonical_hash(snapshot: Mapping[str, Any]) -> str:
    texto = json.dumps(snapshot, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(texto.encode()).hexdigest()


def _agregar(res: ResultadoCobertura, shr: Shrinkage) -> list[Slot7x24]:
    cel: list[list[tuple[Fraction, int, Fraction]]] = [[] for _ in range(168)]
    for h, (c, p) in enumerate(zip(res.cobertura, res.planejado, strict=True)):
        idx = (res.data_inicio + timedelta(days=h // 24)).weekday() * 24 + h % 24
        cel[idx].append((c, res.demanda[h], p))
    out = []
    for i, vals in enumerate(cel):
        s = shr.na_hora(i % 24)
        req = Fraction(vals[0][1]) if vals else Fraction(0)
        covs = [c for c, _, _ in vals] or [Fraction(0)]
        pior = min(covs)
        plan_pior = min((p for c, _, p in vals if c == pior), default=Fraction(0))
        plans = [p for _, _, p in vals] or [Fraction(0)]
        out.append(Slot7x24(
            slot_index=i, required_net=req, required_gross=req / (1 - s),
            scheduled_worst=pior, scheduled_mean=sum(covs, Fraction(0)) / len(covs),
            expected_worst=pior * (1 - s),
            deficit_occurrences=sum(1 for c, r, _ in vals if c < r),
            planned_worst=plan_pior, planned_mean=sum(plans, Fraction(0)) / len(plans)))
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


def _run_generico(e: EntradaSimulacao) -> ResultadoSimulacao:
    """Padrão arbitrário em camadas (K livre, tamanhos por turma, janela de operação)."""
    p = e.padrao
    assert p is not None
    dias = e.semanas * 7
    try:
        r = P.simular(p, e.curva, e.inicio, dias, e.tamanho_turma)
    except ValueError as exc:
        raise EntradaInvalida(str(exc)) from exc
    res = r.cobertura
    achados: list[Achado] = list(r.achados)
    if e.shrinkage.diurno or e.shrinkage.noturno:
        achados += list(visao_reserva(res, e.shrinkage, e.tamanho_turma).achados)
    achados += P.validar_padrao(p, e.regime, e.ctx)
    turmas = r.escala.turmas
    s_max = max(e.shrinkage.diurno, e.shrinkage.noturno)
    tam_res = ceil(Fraction(e.tamanho_turma) / (1 - s_max))
    dim = Dimensionamento(
        k_estrela=r.k_estrela_total, turmas_inteiras=len(turmas), n_meias=None,
        headcount_min=ceil(r.headcount), headcount_min_meias=None,
        tamanho_turma_reserva=tam_res,
        headcount_reserva=ceil(sum((t.tamanho / e.tamanho_turma * tam_res for t in turmas),
                                   Fraction(0))) if e.tamanho_turma else ceil(r.headcount),
        achados=())
    rc = None
    slots_cargo: list[SlotCargo] = []
    if e.cargos is not None:
        comp = list(e.cargos.composicao_por_turma)
        if len(comp) != len(turmas):
            raise EntradaInvalida(f"composição definida para {len(comp)} turmas; padrão tem "
                                  f"{len(turmas)}")
        try:
            rc = cobertura_por_cargo(None, p.turnos, comp[0], e.cargos.demandas,
                                     e.cargos.regras, e.inicio, e.cargos.minimos, dias=dias,
                                     composicao_por_turma=comp, ocupacao=r.ocupacao)
        except ValueError as exc:
            raise EntradaInvalida(str(exc)) from exc
        achados += list(rc.achados)
        slots_cargo = _agregar_cargos(rc, e.inicio)
    rs: SUB.ResultadoSubsetores | None = None
    pes: list[SUB.PessoaLotada] = []
    if e.estrutura is not None:
        rs, pes = _subsetores(e, [(t.nome, ceil(t.tamanho)) for t in turmas], r.ocupacao)
        achados += list(rs.achados)
    return ResultadoSimulacao(
        subsetores=rs, pessoas_lotadas=pes,
        escala=r.escala.como_escala(p.codigo), cobertura=res, dimensionamento=dim,
        slots=_agregar(res, e.shrinkage), cargos=rc, slots_cargo=slots_cargo, achados=achados,
        k_legal=k_legal(e.regime), alcancavel=res.kpis.pct_horas_posto_cobertas,
        extras={"engine_version": ENGINE_VERSION, "generic": True, "turnos": p.turnos,
                "layers": [{"code": c.codigo, "name": c.nome, "mode": c.k_modo, "k": k,
                            "offsets": list(o), "sequence": list(c.efetiva)}
                           for c, k, o in zip(p.camadas, r.escala.ks, r.escala.offsets,
                                              strict=True)],
                "team_layers": {t.nome: t.camada for t in turmas}})


def run_simulation(e: EntradaSimulacao) -> ResultadoSimulacao:
    if e.padrao is not None:
        return _run_generico(e)
    m = e.modelo
    if m is None:
        raise EntradaInvalida("cenário sem modelo nem padrão personalizado")
    if not m.continuo_24x7 or m.motor == "generico":
        # v3.5: não contínuo simula normalmente pelo motor genérico (janela de operação)
        return _run_generico(replace(e, padrao=P.de_modelo(m, e.catalogo.turnos, e.k)))
    padrao = padrao_cenario(m, e.k, e.offsets)
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
    rs: SUB.ResultadoSubsetores | None = None
    pes: list[SUB.PessoaLotada] = []
    if e.estrutura is not None:
        ocup = ocupacao_horaria(padrao, turnos, e.inicio, dias)
        rs, pes = _subsetores(e, [(t.nome, ceil(e.tamanho_turma * t.fracao_posto))
                                  for t in escala.turmas], ocup)
        achados += list(rs.achados)
    return ResultadoSimulacao(
        subsetores=rs, pessoas_lotadas=pes,
        escala=escala, cobertura=res, dimensionamento=dim, slots=_agregar(res, e.shrinkage),
        cargos=rc, slots_cargo=slots_cargo, achados=achados, k_legal=kl,
        alcancavel=res.kpis.pct_horas_posto_cobertas,
        extras={"engine_version": ENGINE_VERSION})


def assignments(escala: Escala, catalogo: Catalogo | Mapping[str, Turno]
                ) -> list[dict[str, Any]]:
    """Turma × dia (FOLGA/RESERVA = folga). Aceita o catálogo ou o mapa de turnos."""
    turnos: Mapping[str, Turno] = (catalogo.turnos if isinstance(catalogo, Catalogo)
                                   else catalogo)
    out = []
    for k, t in enumerate(escala.turmas):
        for j, est in enumerate(escala.estados[k]):
            d = escala.data_ancora + timedelta(days=escala.dia_absoluto_inicial + j)
            if est in (FOLGA, RESERVA) or est not in turnos:
                out.append({"team": t.nome, "work_date": d, "shift_code": None,
                            "is_day_off": True, "starts_at": None, "ends_at": None,
                            "clock_minutes": 0})
                continue
            tt = turnos[est]
            ini = datetime(d.year, d.month, d.day) + timedelta(minutes=tt.inicio_min)
            out.append({"team": t.nome, "work_date": d, "shift_code": est, "is_day_off": False,
                        "starts_at": ini, "ends_at": ini + timedelta(minutes=tt.duracao_min),
                        "clock_minutes": tt.duracao_min})
    return out


def headcount(dim: Dimensionamento) -> int:
    return min(dim.headcount_min, dim.headcount_min_meias or dim.headcount_min)


