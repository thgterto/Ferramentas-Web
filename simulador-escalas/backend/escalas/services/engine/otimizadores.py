"""v3.7 — Otimizadores (OR-Tools CP-SAT, versão fixada em ``pyproject``: ortools==9.14.6206).

Todos são funções puras, síncronas e com *time limit*; devolvem :class:`ResultadoOtim` com
status (``otimo`` | ``viavel`` | ``inviavel`` | ``sem_solucao``), valor, limitante e gap.

a. :func:`min_turmas` — mínimo de turmas/pessoas para uma cobertura alvo (100 % ou %):
   ``x[g,o] ∈ ℤ≥0`` = unidades (turma inteira, meia-turma ou pessoa) no offset ``o`` do grupo
   ``g``; ``cob[h] = u·Σ x[g,o]·a[g,o,h]``; ``déficit[h] ≥ dem[h] − cob[h]``;
   ``Σ déficit ≤ (1 − alvo)·Σ dem``. Minimiza ``Σ x`` (headcount), depois excesso.
b. :func:`offsets_otimos` — dado K (e tamanho), distribuição ótima dos offsets: ``Σ_o x[g,o] =
   K_g``; minimiza ``W_def·déficit + W_exc·excesso [+ W_fair·espalhamento]`` (e. fairness:
   espalhamento máx−mín de domingos de folga / noites entre as turmas usadas no horizonte).
c. :func:`ranking_modelos` — avalia cada modelo do catálogo (+ personalizados) com (a) e
   ranqueia por conformidade, déficit, headcount e excesso.
d. :func:`alocacao_pool` — pessoa × dia → posição dentro do pool (turno inteiro na mesma
   posição): minimiza déficit, depois horas remanejadas e o máximo emprestado por pessoa;
   respeita cargos (matriz) e o limite de horas emprestadas/semana (duro). Interjornada e
   DSR não mudam: o horário de cada pessoa é o da sua turma (só a posição muda).

Complexidade: ``a``/``b`` têm ``Σ_g L_g`` variáveis inteiras e uma restrição por **perfil
horário distinto** (horas com o mesmo conjunto de offsets ativos e a mesma demanda são
agrupadas) — no máximo ``mmc(L,7)·24`` linhas; ``d`` tem ``Σ dias trabalhados × posições
elegíveis`` booleanas. Os exemplos do catálogo resolvem em < 1 s.
"""

from __future__ import annotations

import time
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date, timedelta
from fractions import Fraction
from math import ceil
from typing import Any

from ortools.sat.python import cp_model

from escalas.services.engine.catalogo import Catalogo, ModeloEscala
from escalas.services.engine.cobertura import ocupacao_horaria
from escalas.services.engine.cobertura_cargos import Substituicao
from escalas.services.engine.gerador import gerar_escala
from escalas.services.engine.matriz_mensal import e_noturno
from escalas.services.engine.regime_legal import (
    ContextoRegime,
    RegimeLegal,
    Selo,
    selo,
    validar_modelo,
)
from escalas.services.engine.subsetores import CUSTO_EMPRESTIMO, Estrutura, PessoaLotada
from escalas.services.engine.types import FOLGA, RESERVA, GrupoTurmas, Padrao, Turno

SOLVER = "OR-Tools CP-SAT 9.14"
ESCALA = 2          # demanda × 2 para aceitar meias-turmas em inteiros


@dataclass(slots=True)
class ResultadoOtim:
    objetivo: str
    status: str
    valor: float | None = None
    limitante: float | None = None
    gap: float | None = None
    tempo_ms: int = 0
    solucao: dict[str, Any] = field(default_factory=dict)
    metricas: dict[str, Any] = field(default_factory=dict)
    candidatos: list[dict[str, Any]] = field(default_factory=list)
    notas: list[str] = field(default_factory=list)


def _status(st: Any) -> str:
    return {cp_model.OPTIMAL: "otimo", cp_model.FEASIBLE: "viavel",
            cp_model.INFEASIBLE: "inviavel"}.get(st, "sem_solucao")


def _gap(valor: float, bound: float) -> float:
    return 0.0 if abs(valor) < 1e-9 and abs(bound) < 1e-9 else \
        abs(valor - bound) / max(1e-9, abs(valor))


def _solver(time_limit: float) -> cp_model.CpSolver:
    s = cp_model.CpSolver()
    s.parameters.max_time_in_seconds = max(0.05, time_limit)
    s.parameters.num_workers = 4
    s.parameters.random_seed = 7
    return s


# ---------------------------------------------------------------- presença ------------
@dataclass(frozen=True, slots=True)
class Presenca:
    """``a[(g, o)]`` = horas (índices do horizonte) em que o offset ``o`` do grupo ``g`` está
    em turno; ``dias`` = horizonte; ``chaves`` em ordem determinística."""

    chaves: tuple[tuple[int, int], ...]
    a: Mapping[tuple[int, int], frozenset[int]]
    dias: int
    sequencias: tuple[tuple[str, ...], ...]


def presenca(modelo: ModeloEscala, turnos: Mapping[str, Turno], inicio: date,
             dias: int | None = None) -> Presenca:
    dias = dias or modelo.ciclo_calendario
    grupos = tuple(GrupoTurmas(seq, tuple(range(len(seq)))) for seq in modelo.sequencias)
    pad = Padrao(modelo.codigo, grupos)
    ocup = ocupacao_horaria(pad, turnos, inicio, dias)
    chaves = tuple((g, o) for g, seq in enumerate(modelo.sequencias) for o in range(len(seq)))
    horas: dict[tuple[int, int], set[int]] = {c: set() for c in chaves}
    for h, lst in enumerate(ocup):
        for k, _ in lst:
            horas[chaves[k]].add(h)
    return Presenca(chaves, {c: frozenset(v) for c, v in horas.items()}, dias,
                    modelo.sequencias)


def demanda_horizonte(dem168: Sequence[int], inicio: date, dias: int) -> list[int]:
    return [int(dem168[(inicio + timedelta(days=h // 24)).weekday() * 24 + h % 24])
            for h in range(dias * 24)]


def _perfis(pres: Presenca, dem: Sequence[int]) -> list[tuple[tuple[int, ...], int, int]]:
    """Agrupa horas com o mesmo conjunto de chaves ativas e a mesma demanda: (ativos, dem,
    multiplicidade)."""
    cont: dict[tuple[tuple[int, ...], int], int] = {}
    idx = {c: i for i, c in enumerate(pres.chaves)}
    ativos_h: list[list[int]] = [[] for _ in dem]
    for c, hs in pres.a.items():
        for h in hs:
            ativos_h[h].append(idx[c])
    for h, d in enumerate(dem):
        key = (tuple(sorted(ativos_h[h])), int(d))
        cont[key] = cont.get(key, 0) + 1
    return [(k[0], k[1], n) for k, n in sorted(cont.items())]


def _metricas_cob(pres: Presenca, x: Mapping[tuple[int, int], int], unidade: Fraction,
                  dem: Sequence[int]) -> dict[str, Any]:
    cob = [Fraction(0)] * len(dem)
    for c, n in x.items():
        if n:
            for h in pres.a[c]:
                cob[h] += unidade * n
    req = sum(dem)
    defi = sum((max(Fraction(0), d - c) for c, d in zip(cob, dem, strict=True)), Fraction(0))
    exc = sum((max(Fraction(0), c - d) for c, d in zip(cob, dem, strict=True)), Fraction(0))
    semanas = Fraction(len(dem), 168)
    return {"coverage_pct": float(1 - defi / req) if req else 1.0,
            "deficit_post_hours_week": float(defi / semanas),
            "excess_post_hours_week": float(exc / semanas),
            "deficit_hours": sum(1 for c, d in zip(cob, dem, strict=True) if c < d)}


def _offsets_lista(pres: Presenca, x: Mapping[tuple[int, int], int]) -> list[list[int]]:
    out: list[list[int]] = [[] for _ in pres.sequencias]
    for (g, o), n in sorted(x.items()):
        out[g] += [o] * n
    return out


# ---------------------------------------------------------------- (a) mínimo de K -----
def min_turmas(modelo: ModeloEscala, turnos: Mapping[str, Turno], dem168: Sequence[int],
               inicio: date, tamanho: int | None = 1, meias: bool = False,
               alvo: Fraction = Fraction(1), time_limit: float = 5.0,
               k_max: int = 200) -> ResultadoOtim:
    """``tamanho`` = pessoas por turma (None = tamanho livre por offset: cada unidade é uma
    pessoa e a turma do offset tem o tamanho ``x[o]``). ``meias``: unidades de meia-turma."""
    t0 = time.perf_counter()
    pres = presenca(modelo, turnos, inicio)
    dem = demanda_horizonte(dem168, inicio, pres.dias)
    unidade = Fraction(1) if tamanho is None else Fraction(tamanho, 2 if meias else 1)
    m = cp_model.CpModel()
    ub = max(1, ceil(max(dem, default=0) / unidade)) if dem else 1
    x = {c: m.NewIntVar(0, min(k_max, ub), f"x{c[0]}_{c[1]}") for c in pres.chaves}
    perfis = _perfis(pres, dem)
    escala = (unidade * ESCALA).denominator
    u_num = int(unidade * ESCALA * escala)
    defs = []
    excs = []
    total_dem = 0
    for ativos, d, n in perfis:
        cob = sum(x[pres.chaves[i]] for i in ativos) * u_num if ativos else 0
        d2 = d * ESCALA * escala
        df = m.NewIntVar(0, d2, "d")
        ex = m.NewIntVar(0, u_num * ub * max(1, len(ativos)), "e")
        m.Add(cob + df - ex == d2)
        defs.append(df * n)
        excs.append(ex * n)
        total_dem += d2 * n
    m.Add(sum(defs) <= int((1 - alvo) * total_dem))
    if len(modelo.sequencias) > 1:     # cada grupo (ex.: 12x36 D/N) precisa existir
        for g in range(len(modelo.sequencias)):
            m.Add(sum(v for c, v in x.items() if c[0] == g) >= 1)
    peso = total_dem + 1
    m.Minimize(peso * sum(x.values()) + sum(excs))
    sol = _solver(time_limit)
    st = sol.Solve(m)
    r = ResultadoOtim("min_headcount", _status(st))
    if _status(st) in ("otimo", "viavel"):
        xv = {c: int(sol.Value(v)) for c, v in x.items()}
        n_unid = sum(xv.values())
        lb = sol.BestObjectiveBound() // peso
        r.valor, r.limitante = float(n_unid), float(lb)
        r.gap = _gap(n_unid, lb)
        hc = unidade * n_unid
        r.solucao = {
            "units": n_unid, "unit": "pessoa" if tamanho is None else
            ("meia-turma" if meias else "turma"),
            "team_count": sum(1 for v in xv.values() if v) if tamanho is None else n_unid,
            "team_size": tamanho if tamanho is None else (tamanho / 2 if meias else tamanho),
            "team_sizes": [v for _, v in sorted(xv.items()) if v] if tamanho is None else None,
            "headcount": ceil(hc), "offsets": _offsets_lista(pres, xv)
            if tamanho is not None else [[o for (g, o), v in sorted(xv.items())
                                          if g == gg and v]
                                         for gg in range(len(pres.sequencias))],
            "k_star": str(modelo.k_estrela) if modelo.k_estrela is not None else None}
        r.metricas = _metricas_cob(pres, xv, unidade, dem)
    r.tempo_ms = int((time.perf_counter() - t0) * 1000)
    return r


# ---------------------------------------------------------------- (b)/(e) offsets -----
def _justica_offsets(pres: Presenca, turnos: Mapping[str, Turno], inicio: date,
                     dias: int) -> dict[tuple[int, int], tuple[int, int, int]]:
    """Por offset: (domingos de folga, noites, folgas) no horizonte ``dias``."""
    out = {}
    datas = [inicio + timedelta(days=j) for j in range(dias)]
    for g, o in pres.chaves:
        seq = pres.sequencias[g]
        grupo = GrupoTurmas(seq, (o,))
        est = gerar_escala(Padrao("x", (grupo,)), inicio, dias).estados[0]
        dom = sum(1 for e, d in zip(est, datas, strict=True)
                  if d.weekday() == 6 and e not in turnos)
        noi = sum(1 for e in est if e in turnos and e_noturno(turnos[e]))
        fol = sum(1 for e in est if e in (FOLGA, RESERVA) or e not in turnos)
        out[(g, o)] = (dom, noi, fol)
    return out


def offsets_otimos(modelo: ModeloEscala, turnos: Mapping[str, Turno], dem168: Sequence[int],
                   inicio: date, k: int, tamanho: int = 1, w_deficit: int = 100,
                   w_excesso: int = 1, w_justica: int = 0, dias_justica: int = 28,
                   time_limit: float = 5.0) -> ResultadoOtim:
    t0 = time.perf_counter()
    pres = presenca(modelo, turnos, inicio)
    dem = demanda_horizonte(dem168, inicio, pres.dias)
    ks = modelo.distribuir_k(k)
    m = cp_model.CpModel()
    x = {c: m.NewIntVar(0, ks[c[0]], f"x{c[0]}_{c[1]}") for c in pres.chaves}
    for g, kg in enumerate(ks):
        m.Add(sum(v for c, v in x.items() if c[0] == g) == kg)
    obj = []
    for ativos, d, n in _perfis(pres, dem):
        cob = sum(x[pres.chaves[i]] for i in ativos) * tamanho if ativos else 0
        df = m.NewIntVar(0, d, "d")
        ex = m.NewIntVar(0, tamanho * k, "e")
        m.Add(cob + df - ex == d)
        obj += [df * (n * w_deficit), ex * (n * w_excesso)]
    just = _justica_offsets(pres, turnos, inicio, dias_justica)
    espalh: list[Any] = []
    if w_justica:
        usado = {c: m.NewBoolVar("u") for c in pres.chaves}
        for c in pres.chaves:
            m.Add(x[c] >= 1).OnlyEnforceIf(usado[c])
            m.Add(x[c] == 0).OnlyEnforceIf(usado[c].Not())
        for idx in (0, 1):
            vals = [just[c][idx] for c in pres.chaves]
            lo, hi = min(vals), max(vals)
            mx = m.NewIntVar(lo, hi, "mx")
            mn = m.NewIntVar(lo, hi, "mn")
            for c in pres.chaves:
                m.Add(mx >= just[c][idx]).OnlyEnforceIf(usado[c])
                m.Add(mn <= just[c][idx]).OnlyEnforceIf(usado[c])
            espalh.append(mx - mn)
        obj += [e * w_justica for e in espalh]
    m.Minimize(sum(obj))
    sol = _solver(time_limit)
    st = sol.Solve(m)
    r = ResultadoOtim("fairness" if w_justica else "offsets", _status(st))
    if _status(st) in ("otimo", "viavel"):
        xv = {c: int(sol.Value(v)) for c, v in x.items()}
        r.valor, r.limitante = sol.ObjectiveValue(), sol.BestObjectiveBound()
        r.gap = _gap(r.valor, r.limitante)
        times = [(c, n) for c, n in sorted(xv.items()) for _ in range(n)]
        r.solucao = {"team_count": k, "team_size": tamanho, "offsets": _offsets_lista(pres, xv),
                     "per_team": [{"group": c[0], "offset": c[1], "sundays_off": just[c][0],
                                   "nights": just[c][1], "days_off": just[c][2]}
                                  for c, _ in times]}
        r.metricas = _metricas_cob(pres, xv, Fraction(tamanho), dem)
        if times:
            for nome, i in (("sundays_off", 0), ("nights", 1)):
                vs = [just[c][i] for c, _ in times]
                r.metricas[f"{nome}_spread"] = max(vs) - min(vs)
    r.tempo_ms = int((time.perf_counter() - t0) * 1000)
    return r


def metricas_offsets(modelo: ModeloEscala, turnos: Mapping[str, Turno], dem168: Sequence[int],
                     inicio: date, offsets: Sequence[Sequence[int]], tamanho: int,
                     dias_justica: int = 28) -> dict[str, Any]:
    """Mesmas métricas para uma solução existente (comparação antes/depois)."""
    pres = presenca(modelo, turnos, inicio)
    dem = demanda_horizonte(dem168, inicio, pres.dias)
    xv: dict[tuple[int, int], int] = {}
    for g, offs in enumerate(offsets):
        for o in offs:
            xv[(g, o)] = xv.get((g, o), 0) + 1
    out = _metricas_cob(pres, xv, Fraction(tamanho), dem)
    just = _justica_offsets(pres, turnos, inicio, dias_justica)
    times = [c for c, n in xv.items() for _ in range(n)]
    for nome, i in (("sundays_off", 0), ("nights", 1)):
        vs = [just[c][i] for c in times]
        out[f"{nome}_spread"] = max(vs) - min(vs) if vs else 0
    return out


# ---------------------------------------------------------------- (c) ranking ---------
def ranking_modelos(catalogo: Catalogo, dem168: Sequence[int], inicio: date, tamanho: int,
                    regime: RegimeLegal, ctx: ContextoRegime, alvo: Fraction = Fraction(1),
                    so_conformes: bool = True, incluir_act: bool = False,
                    time_limit: float = 5.0, extras: Sequence[dict[str, Any]] = (),
                    max_candidatos: int = 40) -> ResultadoOtim:
    """Avalia modelos contínuos cíclicos com (a) (tamanho fixo; meias se exatas)."""
    t0 = time.perf_counter()
    modelos = [m for m in catalogo.modelos.values()
               if m.continuo_24x7 and m.motor != "generico" and m.k_estrela is not None]
    modelos = modelos[:max_candidatos]
    fatia = max(0.1, time_limit / max(1, len(modelos)))
    cands: list[dict[str, Any]] = []
    for mo in modelos:
        achados = validar_modelo(mo, catalogo.turnos, regime, ctx)
        sl = selo(achados)
        conforme = sl == Selo.CONFORME or (incluir_act and sl == Selo.SO_COM_ACT)
        if so_conformes and not conforme:
            cands.append({"code": mo.codigo, "name": mo.nome, "compliance": sl.value,
                          "eligible": False, "status": "excluido_regime"})
            continue
        try:
            meias = bool(mo.exato_meias and not mo.exato)
            r = min_turmas(mo, catalogo.turnos, dem168, inicio, tamanho, meias, alvo, fatia)
        except ValueError as exc:
            cands.append({"code": mo.codigo, "name": mo.nome, "compliance": sl.value,
                          "eligible": False, "status": f"erro: {exc}"})
            continue
        if r.status not in ("otimo", "viavel"):
            cands.append({"code": mo.codigo, "name": mo.nome, "compliance": sl.value,
                          "eligible": False, "status": r.status})
            continue
        cands.append({"code": mo.codigo, "name": mo.nome, "compliance": sl.value,
                      "eligible": True, "status": r.status,
                      "team_count": r.solucao["team_count"], "team_size": r.solucao["team_size"],
                      "half_teams": meias, "headcount": r.solucao["headcount"],
                      "offsets": r.solucao["offsets"], **r.metricas})
    for ex in extras:
        cands.append({**ex, "eligible": ex.get("eligible", True)})
    ok = [c for c in cands if c["eligible"]]
    ok.sort(key=lambda c: (c["compliance"] != "conforme", round(c["deficit_post_hours_week"], 6),
                           c["headcount"], round(c["excess_post_hours_week"], 6), c["code"]))
    for i, c in enumerate(ok):
        c["rank"] = i + 1
    r = ResultadoOtim("best_model", "otimo" if ok else "inviavel")
    r.candidatos = ok + [c for c in cands if not c["eligible"]]
    if ok:
        r.solucao = dict(ok[0])
        r.valor = float(ok[0]["headcount"])
        r.metricas = {k: ok[0][k] for k in ("coverage_pct", "deficit_post_hours_week",
                                             "excess_post_hours_week", "deficit_hours")}
    r.notas.append("cada modelo resolvido com o otimizador (a) em "
                   f"{fatia:.2f}s; ranking: conformidade → déficit → headcount → excesso")
    r.tempo_ms = int((time.perf_counter() - t0) * 1000)
    return r


# ---------------------------------------------------------------- (d) alocação pool ---
def alocacao_pool(estr: Estrutura, pessoas: Sequence[PessoaLotada],
                  turno_do_dia: Callable[[int, int], str | None], turnos: Mapping[str, Turno],
                  inicio: date, dias: int, w_deficit: int = 1000, w_remanejo: int = 10,
                  w_justica: int = 1, time_limit: float = 5.0,
                  linha_base: Mapping[str, Any] | None = None) -> ResultadoOtim:
    """``turno_do_dia(pessoa, dia)`` = sigla do turno iniciado no dia (``dia`` ∈ [-1, dias),
    -1 = véspera) ou None."""
    t0 = time.perf_counter()
    m = cp_model.CpModel()
    regras: Sequence[Substituicao] = estr.regras
    npos = len(estr.posicoes)
    H = dias * 24
    cov: list[list[list[Any]]] = [[[] for _ in range(npos)] for _ in range(H)]
    moved_terms: list[Any] = []
    borrowed_by: dict[tuple[int, int], list[Any]] = {}
    z: dict[tuple[int, int, int], Any] = {}

    def elegivel(pe: PessoaLotada, k: int) -> int | None:
        p = estr.posicoes[k]
        if p.cargo is not None and pe.cargo != p.cargo:
            if not any(g.de == pe.cargo and g.para == p.cargo for g in regras):
                return None
        if p.subsetor == pe.subsetor:
            return 0
        pool = estr.pool_de(pe.subsetor)
        if pool is None or p.subsetor not in pool.subsetores:
            return None
        if pool.cargos and (pe.cargo or "") not in pool.cargos:
            return None
        return 1

    for i, pe in enumerate(pessoas):
        for d in range(-1, dias):     # -1 = véspera (noite que entra pela 00:00)
            sig = turno_do_dia(i, d)
            if sig is None or sig not in turnos:
                continue
            t = turnos[sig]
            hs = [h for a, b in t.segmentos
                  for h in range(max(0, d * 24 + a // 60), min(H, d * 24 + ceil(b / 60)))]
            if not hs:
                continue
            opts = [(k, e) for k in range(npos) if (e := elegivel(pe, k)) is not None]
            if not opts:
                continue
            vs = []
            for k, e in opts:
                v = m.NewBoolVar(f"z{i}_{d}_{k}")
                z[(i, d, k)] = v
                vs.append(v)
                for h in hs:
                    cov[h][k].append(v)
                if e:
                    moved_terms.append(v * len(hs))
                    borrowed_by.setdefault((i, max(0, d) // 7), []).append(v * len(hs))
            m.Add(sum(vs) <= 1)
    for (i, _), termos in borrowed_by.items():
        pool = estr.pool_de(pessoas[i].subsetor)
        if pool is not None and pool.max_horas_semana is not None:
            m.Add(sum(termos) <= pool.max_horas_semana)
    defs = []
    for h in range(H):
        dow = (inicio + timedelta(days=h // 24)).weekday()
        for k, p in enumerate(estr.posicoes):
            dem = p.demanda[dow * 24 + h % 24]
            if not dem:
                continue
            df = m.NewIntVar(0, dem, "d")
            m.Add(sum(cov[h][k]) + df >= dem)
            defs.append(df)
            # sem "ociosos" contando: cobertura acima da demanda não ajuda
    total_borrow = sum(moved_terms) if moved_terms else 0
    mx = m.NewIntVar(0, H, "mx")
    for i in range(len(pessoas)):
        termos = [t for (ii, _), ts in borrowed_by.items() if ii == i for t in ts]
        if termos:
            m.Add(mx >= sum(termos))
    m.Minimize(w_deficit * sum(defs) + w_remanejo * total_borrow
               + w_justica * mx)
    sol = _solver(time_limit)
    st = sol.Solve(m)
    r = ResultadoOtim("pool_allocation", _status(st))
    if _status(st) in ("otimo", "viavel"):
        r.valor, r.limitante = sol.ObjectiveValue(), sol.BestObjectiveBound()
        r.gap = _gap(r.valor, r.limitante)
        defi = int(sum(sol.Value(d) for d in defs))
        moved = int(sum(sol.Value(t) for t in moved_terms)) if moved_terms else 0
        aloc = [{"person": pessoas[i].id, "day": (inicio + timedelta(days=d)).isoformat(),
                 "workstation": estr.posicoes[k].codigo, "subsector": estr.posicoes[k].subsetor,
                 "moved": estr.posicoes[k].subsetor != pessoas[i].subsetor}
                for (i, d, k), v in sorted(z.items()) if sol.Value(v)]
        por_pessoa: dict[str, int] = {}
        for (i, d, k), v in z.items():
            if sol.Value(v) and estr.posicoes[k].subsetor != pessoas[i].subsetor:
                sig = turno_do_dia(i, d)
                por_pessoa[pessoas[i].id] = por_pessoa.get(pessoas[i].id, 0) + (
                    turnos[sig].minutos_trabalhados // 60 if sig else 0)
        r.solucao = {"assignments": [a for a in aloc if a["moved"]],
                     "borrowed_hours_by_person": por_pessoa, "days": dias}
        r.metricas = {"deficit_post_hours": defi, "moved_hours": moved,
                      "max_borrowed_hours_person": max(por_pessoa.values(), default=0),
                      "custo_emprestimo": CUSTO_EMPRESTIMO}
        if linha_base is not None:
            r.notas.append("antes = alocação hora a hora (min-cost flow) do motor")
    r.tempo_ms = int((time.perf_counter() - t0) * 1000)
    return r
