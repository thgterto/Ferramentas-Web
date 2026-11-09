"""v3.7 — Otimizadores expostos na API (POST /scenarios/{id}/optimize e …/optimize/apply).

Síncrono, com *time limit* configurável (padrão 5 s). Resolve sobre as mesmas entradas da
simulação (``scenario_service._entrada``): demanda do cenário — ou de um subsetor/pool —,
modelo, tamanho de turma, regime e estrutura de subsetores.
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from fractions import Fraction
from math import ceil
from typing import TYPE_CHECKING, Any

from sqlalchemy.orm import Session

from app.core.errors import conflict, validation
from app.repositories.catalog import CatalogRepo
from app.repositories.scenarios import ScenarioRepo
from app.schemas import pattern as sp
from app.schemas import scenario as ss
from app.services.engine import otimizadores as O
from app.services.engine import personalizado as P
from app.services.engine import subsetores as SUB
from app.services.engine.regime_legal import Selo, selo, validar_modelo
from app.services.engine.types import FOLGA, RESERVA
from app.services.escalas import pattern_service
from app.services.escalas import scenario_service as svc
from app.services.escalas.engine_runner import (
    EntradaSimulacao,
    padrao_cenario,
    pessoas_lotadas,
)

if TYPE_CHECKING:
    from app.api.deps import Principal

_KEYS = set(ss.OptimizeMetrics.model_fields)


def _met(d: dict[str, Any]) -> ss.OptimizeMetrics:
    return ss.OptimizeMetrics(**{k: v for k, v in d.items() if k in _KEYS})


def _escopo(e: EntradaSimulacao, body: ss.OptimizeIn) -> tuple[list[int], str, list[str]]:
    """Demanda 168 h do escopo + rótulo + subsetores do escopo."""
    estr = e.estrutura
    if body.pool or body.subsector:
        if estr is None:
            raise validation("operação sem subsetores/posições cadastrados")
        if body.pool:
            pool = next((x for x in estr.pools if x.codigo == body.pool), None)
            if pool is None:
                raise validation(f"pool inexistente: {body.pool}")
            return list(estr.demanda_total(pool.subsetores)), f"pool {pool.codigo}", \
                list(pool.subsetores)
        if body.subsector not in estr.subsetores:
            raise validation(f"subsetor inexistente: {body.subsector}")
        assert body.subsector is not None
        return list(estr.demanda_total([body.subsector])), f"subsetor {body.subsector}", \
            [body.subsector]
    return list(e.curva.valores), "operação", []


def _modelo_ciclico(e: EntradaSimulacao) -> Any:
    m = e.modelo
    if e.padrao is not None or m is None or not m.continuo_24x7 or m.motor == "generico":
        raise validation("este otimizador exige um modelo cíclico contínuo do catálogo "
                         "(use 'best_model' para comparar com padrões personalizados)")
    return m


def _legal(e: EntradaSimulacao, m: Any, body: ss.OptimizeIn) -> tuple[bool, str]:
    sl = selo(validar_modelo(m, e.catalogo.turnos, e.regime, e.ctx))
    ok = sl == Selo.CONFORME or (body.include_act and sl == Selo.SO_COM_ACT) \
        or sl == Selo.REGIME_ESPECIAL
    return ok, sl.value


def _antes(e: EntradaSimulacao, m: Any, dem: list[int]) -> dict[str, Any]:
    pad = padrao_cenario(m, e.k, e.offsets)
    offs = [list(g.offsets) for g in pad.grupos]
    d = O.metricas_offsets(m, e.catalogo.turnos, dem, e.inicio, offs, e.tamanho_turma)
    return {**d, "headcount": e.k * e.tamanho_turma, "team_count": e.k}


def optimize(db: Session, p: Principal, sid: uuid.UUID, body: ss.OptimizeIn) -> ss.OptimizeOut:
    s = svc._get(db, p, sid)
    e, _, _ = svc._entrada(db, p, s)
    dem, escopo, subs = _escopo(e, body)
    tl = body.time_limit_s
    alvo = Fraction(str(body.target_coverage))
    w = body.weights
    notas: list[str] = []
    antes: dict[str, Any] = {}
    patch: dict[str, Any] | None = None
    if body.objective in ("min_headcount", "offsets", "fairness"):
        m = _modelo_ciclico(e)
        ok, sl = _legal(e, m, body)
        antes = _antes(e, m, dem)
        if body.legal_hard and not ok:
            return ss.OptimizeOut(
                objective=body.objective, status="inviavel_regime", optimal=False,
                objective_value=None, best_bound=None, gap=None, elapsed_ms=0,
                solver=O.SOLVER, scope=escopo, before=_met(antes), after=ss.OptimizeMetrics(),
                solution={"compliance": sl},
                notes=[f"{m.codigo} é '{sl}' no regime {e.regime.ref}; desligue 'regras do "
                       "regime como restrições duras' ou aceite ACT/CCT"])
        if body.objective == "min_headcount":
            tam = e.tamanho_turma if body.team_size_mode == "fixo" else None
            if tam is None and body.half_teams:
                raise validation("meias-turmas só com tamanho fixo")
            r = O.min_turmas(m, e.catalogo.turnos, dem, e.inicio, tam, body.half_teams, alvo, tl)
            sol = r.solucao
            if sol:
                r.metricas.update(headcount=sol["headcount"], team_count=sol["team_count"])
                ts = sol["team_size"]
                if tam is not None and float(ts).is_integer():
                    patch = {"schedule_model_code": m.codigo, "team_count": sol["units"],
                             "params": {"team_size": int(ts), "offsets": sol["offsets"]}}
                elif tam is None:
                    big = max(sol["team_sizes"] or [1])
                    patch = {"schedule_model_code": m.codigo, "team_count": sol["team_count"],
                             "params": {"team_size": big, "offsets": sol["offsets"]}}
                    notas.append(f"tamanho livre: turmas de {sol['team_sizes']} pessoas; o "
                                 f"cenário aplicado usa turmas uniformes de {big}")
                else:
                    notas.append("meia-turma com tamanho ímpar: aplique manualmente")
            if body.pool and e.estrutura is not None and sol:
                sep = 0
                for sb in subs:
                    rr = O.min_turmas(m, e.catalogo.turnos, list(e.estrutura.demanda_total([sb])),
                                      e.inicio, tam, body.half_teams, alvo, tl / 2)
                    sep += int(rr.solucao.get("headcount", 0))
                sol["headcount_separate_subsectors"] = sep
                notas.append(f"pool {body.pool}: {sol['headcount']} pessoas vs {sep} com "
                             "subsetores separados")
        else:
            k = body.team_count or e.k
            r = O.offsets_otimos(m, e.catalogo.turnos, dem, e.inicio, k, e.tamanho_turma,
                                 w.deficit, w.excess,
                                 w.fairness if body.objective == "fairness" else 0,
                                 time_limit=tl)
            if r.solucao:
                r.metricas.update(headcount=k * e.tamanho_turma, team_count=k)
                patch = {"team_count": k, "params": {"offsets": r.solucao["offsets"]}}
        if not ok:
            notas.append(f"atenção: modelo '{sl}' no regime {e.regime.ref}")
    elif body.objective == "best_model":
        extras = _personalizados(db, p, e, dem)
        r = O.ranking_modelos(e.catalogo, dem, e.inicio, e.tamanho_turma, e.regime, e.ctx,
                              alvo, body.legal_hard, body.include_act, tl, extras,
                              body.max_candidates)
        if e.modelo is not None and e.padrao is None and e.modelo.continuo_24x7 \
                and e.modelo.motor != "generico":
            antes = _antes(e, e.modelo, dem)
        if r.solucao and "offsets" in r.solucao and float(r.solucao["team_size"]).is_integer():
            patch = {"schedule_model_code": r.solucao["code"],
                     "team_count": r.solucao["team_count"],
                     "params": {"team_size": int(r.solucao["team_size"]),
                                "offsets": r.solucao["offsets"]}}
        r.metricas.update(headcount=r.solucao.get("headcount"),
                          team_count=r.solucao.get("team_count"))
    else:  # pool_allocation
        r, antes = _pool(e, body, subs)
    r.notas = [*r.notas, *notas]
    return ss.OptimizeOut(
        objective=body.objective, status=r.status,  # type: ignore[arg-type]
        optimal=r.status == "otimo", objective_value=r.valor, best_bound=r.limitante,
        gap=r.gap, elapsed_ms=r.tempo_ms, solver=O.SOLVER, scope=escopo, before=_met(antes),
        after=_met(r.metricas), solution=r.solucao, candidates=r.candidatos,
        scenario_patch=patch, notes=r.notas)


def _personalizados(db: Session, p: Principal, e: EntradaSimulacao, dem: list[int]
                    ) -> list[dict[str, Any]]:
    """Padrões salvos do construtor avaliados como estão (K inicial de cada camada)."""
    from app.services.engine.demanda import CurvaDemanda

    out = []
    curva = CurvaDemanda(tuple(dem))
    for row in pattern_service.PatternRepo(db, p.org_id).find():
        try:
            pad = pattern_service.to_engine(sp.PatternSpec.model_validate(row.spec))
            r = P.simular(pad, curva, e.inicio, 28, e.tamanho_turma)
        except (ValueError, Exception):
            continue
        k = r.cobertura.kpis
        sl = selo(P.validar_padrao(pad, e.regime, e.ctx)).value
        out.append({"code": f"custom:{row.name}", "name": row.name, "compliance": sl,
                    "eligible": sl in ("conforme", "so_com_act", "regime_especial"),
                    "status": "avaliado", "team_count": len(r.escala.turmas),
                    "team_size": e.tamanho_turma, "half_teams": False,
                    "headcount": ceil(r.headcount),
                    "coverage_pct": float(k.pct_horas_posto_cobertas),
                    "deficit_post_hours_week": float(k.deficit_hp_semana),
                    "excess_post_hours_week": float(k.excesso_hp / 4),
                    "deficit_hours": k.horas_com_deficit, "custom": True})
    return out


def _pool(e: EntradaSimulacao, body: ss.OptimizeIn, subs: list[str]
          ) -> tuple[O.ResultadoOtim, dict[str, Any]]:
    estr = e.estrutura
    if estr is None or not estr.pools:
        raise validation("alocação por pool exige subsetores, posições e ao menos um pool")
    m = e.modelo
    dias = min(28, e.semanas * 7)
    if e.padrao is None and m is not None and m.continuo_24x7 and m.motor != "generico":
        from app.services.engine.cobertura import ocupacao_horaria
        from app.services.engine.gerador import gerar_escala

        pad = padrao_cenario(m, e.k, e.offsets)
        esc = gerar_escala(pad, e.inicio, dias + 1, e.inicio - timedelta(days=1))
        turnos = e.catalogo.turnos
        turmas = [(t.nome, ceil(e.tamanho_turma * t.fracao_posto)) for t in esc.turmas]
        estados = [lin for lin in esc.estados]   # índice 0 = véspera
        ocup = ocupacao_horaria(pad, turnos, e.inicio, dias)
    else:
        pp = e.padrao if e.padrao is not None else P.de_modelo(m, e.catalogo.turnos, e.k)  # type: ignore[arg-type]
        res = P.simular(pp, e.curva, e.inicio, dias, e.tamanho_turma)
        turnos = pp.turnos
        turmas = [(t.nome, ceil(t.tamanho)) for t in res.escala.turmas]
        estados = [(FOLGA, *lin) for lin in res.escala.estados]   # véspera desconhecida
        ocup = res.ocupacao
    comp = list(e.cargos.composicao_por_turma) if e.cargos is not None else None
    pes, _ = pessoas_lotadas(estr, turmas, comp, e.pessoas)
    if subs:
        estr = SUB.Estrutura(estr.subsetores, tuple(x for x in estr.posicoes
                                                    if x.subsetor in subs),
                             tuple(x for x in estr.pools if set(x.subsetores) & set(subs)),
                             estr.regras, estr.nomes)
        pes = [x for x in pes if x.subsetor in subs]
    base = SUB.alocar_horizonte(estr, pes, ocup, e.inicio, comparar_sem_pool=True,
                                por_pessoa=False)
    antes = {"deficit_post_hours": base.deficit_hp, "moved_hours": base.horas_remanejadas}

    def turno_do_dia(i: int, d: int) -> str | None:
        est = estados[pes[i].turma][d + 1]
        return None if est in (FOLGA, RESERVA) or est not in turnos else est

    w = body.weights
    r = O.alocacao_pool(estr, pes, turno_do_dia, turnos, e.inicio, dias, w.deficit * 10,
                        w.moves, w.fairness, body.time_limit_s, antes)
    if base.deficit_sem_pool_hp is not None:
        r.solucao["deficit_without_pool"] = base.deficit_sem_pool_hp
    r.solucao["window"] = [e.inicio.isoformat(), (e.inicio + timedelta(days=dias - 1)).isoformat()]
    r.notas.append("horário de cada pessoa = o da turma (interjornada/DSR preservados); "
                   "só a posição muda")
    return r, antes


def apply(db: Session, p: Principal, sid: uuid.UUID, body: ss.OptimizeApplyIn
          ) -> ss.OptimizeApplyOut:
    s = svc._get(db, p, sid)
    allowed = {"schedule_model_code", "team_count", "params"}
    extra = set(body.patch) - allowed
    if extra:
        raise validation(f"campos não aplicáveis: {', '.join(sorted(extra))}")
    params = {**s.params, **(body.patch.get("params") or {})}
    if "schedule_model_code" in body.patch and body.patch["schedule_model_code"] != "PERSONALIZADO":
        params.pop("pattern", None)
    created = body.mode == "create"
    if created:
        model = svc._model(db, body.patch.get("schedule_model_code")
                           or CatalogRepo(db, p.org_id).schedule_model_by_id(
                               s.schedule_model_id).code)
        repo = ScenarioRepo(db, p.org_id)
        novo = repo.add(
            operation_id=s.operation_id, name=body.name or f"{s.name} (otimizado)",
            description=f"criado pelo otimizador a partir de {s.name}",
            schedule_model_id=model.id, labor_agreement_id=s.labor_agreement_id,
            shrinkage_profile_id=s.shrinkage_profile_id, demand_curve_id=s.demand_curve_id,
            team_count=int(body.patch.get("team_count") or s.team_count),
            horizon_start=s.horizon_start, horizon_weeks=s.horizon_weeks,
            agreement_8h_confirmed=s.agreement_8h_confirmed, holiday_policy=s.holiday_policy,
            params=params, legal_regime_id=s.legal_regime_id,
            legal_reference_date=s.legal_reference_date,
            compensation_agreement_declared=s.compensation_agreement_declared,
            overtime_planned=s.overtime_planned, simulate_transition=s.simulate_transition,
            created_by=p.user.id, parent_scenario_id=s.id)
        db.commit()
        target = novo.public_id
    else:
        if s.status in ("homologado", "em_revisao"):
            raise conflict("scenario_immutable", "cenário em revisão/homologado")
        if "schedule_model_code" in body.patch:
            s.schedule_model_id = svc._model(db, body.patch["schedule_model_code"]).id
        if "team_count" in body.patch:
            s.team_count = int(body.patch["team_count"])
        s.params = params
        s.row_version += 1
        db.commit()
        target = s.public_id
    sim = svc.simulate(db, p, target, ss.SimulateIn())
    return ss.OptimizeApplyOut(scenario_id=target, created=created, simulation=sim)
