"""M3 — Cobertura por cargo com matriz de substituição direcional (FR-34–36, MVP enxuto).

Por hora: oferta ``sup[a]`` (pessoas do cargo ``a`` em turno ativo) e demanda ``dem[b]``.
Alocação = min-cost max-flow no grafo bipartido ``fonte → a → b → sumidouro``; arco
``a → b`` existe só na diagonal ou com regra explícita (fator 1,0 no MVP); custo = 0 na
diagonal e ``prioridade`` na substituição (prefere o próprio cargo). Implementação própria
(Bellman-Ford sobre grafo de ≤ 2R+2 nós), inteira e determinística — sem dependência.
Perfis ``(sup, dem)`` repetidos usam cache. Mínimos por cargo por turno (FR-36) são
checados pela presença de qualificados (substitutos só se ``aceita_substituto``).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from functools import lru_cache

from app.services.engine.cobertura import ocupacao_horaria
from app.services.engine.demanda import CurvaDemanda
from app.services.engine.types import Achado, Padrao, Severidade, Turno

COB_CARGO_SEM_QUALIFICADO = "COB_CARGO_SEM_QUALIFICADO"
COB_DEFICIT_CARGO = "COB_DEFICIT_CARGO"
COB_COBERTURA_POR_SUBSTITUICAO = "COB_COBERTURA_POR_SUBSTITUICAO"


@dataclass(frozen=True, slots=True)
class Substituicao:
    """``de`` pode cobrir posto de ``para`` (direcional). Fator ≠ 1 é Fase 2."""

    de: str
    para: str
    prioridade: int = 1
    fator: int = 1

    def __post_init__(self) -> None:
        if self.fator != 1:
            raise ValueError("substituição parcial (fator < 1) é Fase 2")
        if self.prioridade < 1:
            raise ValueError("prioridade deve ser ≥ 1")


@dataclass(frozen=True, slots=True)
class MinimoCargo:
    """≥ ``minimo`` pessoas do ``cargo`` presentes nos ``turnos`` (vazio = todas as horas)."""

    cargo: str
    minimo: int
    turnos: tuple[str, ...] = ()
    aceita_substituto: bool = False


# ---------------------------------------------------------------- min-cost flow ----
def min_cost_max_flow(n: int, arcos: Sequence[tuple[int, int, int, int]], s: int,
                      t: int) -> list[int]:
    """Fluxo por arco (mesma ordem de ``arcos`` = (u, v, cap, custo)). Custos ≥ 0."""
    grafo: list[list[int]] = [[] for _ in range(n)]
    para: list[int] = []
    cap: list[int] = []
    custo: list[int] = []
    for u, v, c, w in arcos:
        for a, b, cc, ww in ((u, v, c, w), (v, u, 0, -w)):
            grafo[a].append(len(para))
            para.append(b)
            cap.append(cc)
            custo.append(ww)
    while True:
        dist: list[int | None] = [None] * n
        prev: list[int] = [-1] * n
        dist[s] = 0
        for _ in range(n):
            mudou = False
            for u in range(n):
                du = dist[u]
                if du is None:
                    continue
                for e in grafo[u]:
                    v = para[e]
                    dv = dist[v]
                    if cap[e] > 0 and (dv is None or du + custo[e] < dv):
                        dist[v] = du + custo[e]
                        prev[v] = e
                        mudou = True
            if not mudou:
                break
        if dist[t] is None:
            break
        f = sum(cap)
        v = t
        while v != s:
            e = prev[v]
            f = min(f, cap[e])
            v = para[e ^ 1]
        v = t
        while v != s:
            e = prev[v]
            cap[e] -= f
            cap[e ^ 1] += f
            v = para[e ^ 1]
    return [cap[2 * i + 1] for i in range(len(arcos))]


@lru_cache(maxsize=4096)
def alocar_hora(cargos: tuple[str, ...], sup: tuple[int, ...], dem: tuple[int, ...],
                regras: tuple[Substituicao, ...]) -> tuple[tuple[int, ...], ...]:
    """Matriz ``x[a][b]`` (pessoas do cargo a cobrindo posto de b) ótima para a hora."""
    r = len(cargos)
    idx = {c: i for i, c in enumerate(cargos)}
    s, t = 2 * r, 2 * r + 1
    arcos: list[tuple[int, int, int, int]] = []
    pares: list[tuple[int, int]] = []
    for a in range(r):
        arcos.append((s, a, sup[a], 0))
    for b in range(r):
        arcos.append((r + b, t, dem[b], 0))
    for a in range(r):
        pares.append((a, a))
        arcos.append((a, r + a, sup[a], 0))
    for g in regras:
        a, b = idx[g.de], idx[g.para]
        if a != b:
            pares.append((a, b))
            arcos.append((a, r + b, sup[a], g.prioridade))
    fluxo = min_cost_max_flow(2 * r + 2, arcos, s, t)
    x = [[0] * r for _ in range(r)]
    for (a, b), f in zip(pares, fluxo[2 * r:], strict=True):
        x[a][b] += f
    return tuple(tuple(linha) for linha in x)


# ---------------------------------------------------------------- cenário ----------
@dataclass(frozen=True, slots=True)
class KPIsCargo:
    demanda_hp: int
    proprio_hp: int
    substituicao_hp: int
    deficit_hp: int
    horas_sem_qualificado: int


@dataclass(frozen=True, slots=True)
class ResultadoCargos:
    cargos: tuple[str, ...]
    # por hora: (demanda, próprio, por substituição, déficit) por cargo
    horas: tuple[tuple[tuple[int, int, int, int], ...], ...]
    kpis: Mapping[str, KPIsCargo]
    achados: tuple[Achado, ...]


def cobertura_por_cargo(
    padrao: Padrao,
    turnos: Mapping[str, Turno],
    composicao: Mapping[str, int],
    demandas: Mapping[str, CurvaDemanda],
    regras: Sequence[Substituicao],
    data_ancora: date,
    minimos: Sequence[MinimoCargo] = (),
    dias: int | None = None,
    composicao_por_turma: Sequence[Mapping[str, int]] | None = None,
) -> ResultadoCargos:
    """``composicao`` = pessoas por cargo em cada turma (ou ``composicao_por_turma``)."""
    dias = dias or padrao.ciclo_calendario
    cargos = tuple(dict.fromkeys([*composicao, *demandas]))
    regras_t = tuple(sorted(set(regras), key=lambda g: (g.de, g.para, g.prioridade)))
    for g in regras_t:
        if g.de not in cargos or g.para not in cargos:
            raise ValueError(f"regra com cargo desconhecido: {g}")
    ocup = ocupacao_horaria(padrao, turnos, data_ancora, dias)
    n_turmas = sum(len(g.offsets) for g in padrao.grupos)
    comp = list(composicao_por_turma) if composicao_por_turma else [composicao] * n_turmas
    r = len(cargos)
    horas: list[tuple[tuple[int, int, int, int], ...]] = []
    sem_qualif: dict[str, int] = dict.fromkeys(cargos, 0)
    for h, o in enumerate(ocup):
        dow = (data_ancora + timedelta(days=h // 24)).weekday()
        sup = tuple(sum(comp[k].get(c, 0) for k, _ in o) for c in cargos)
        dem = tuple(demandas[c].valores[dow * 24 + h % 24] if c in demandas else 0
                    for c in cargos)
        x = alocar_hora(cargos, sup, dem, regras_t)
        linha = []
        for b in range(r):
            proprio = x[b][b]
            subst = sum(x[a][b] for a in range(r) if a != b)
            linha.append((dem[b], proprio, subst, dem[b] - proprio - subst))
        horas.append(tuple(linha))
        ativos = {e for _, e in o}
        for m in minimos:
            if m.turnos and not ativos & set(m.turnos):
                continue
            qualificados = {m.cargo}
            if m.aceita_substituto:
                qualificados |= {g.de for g in regras_t if g.para == m.cargo}
            presentes = sum(sup[cargos.index(c)] for c in qualificados)
            if presentes < m.minimo:
                sem_qualif[m.cargo] += 1
    kpis: dict[str, KPIsCargo] = {}
    achados: list[Achado] = []
    for b, c in enumerate(cargos):
        k = KPIsCargo(sum(hh[b][0] for hh in horas), sum(hh[b][1] for hh in horas),
                      sum(hh[b][2] for hh in horas), sum(hh[b][3] for hh in horas),
                      sem_qualif[c])
        kpis[c] = k
        if k.horas_sem_qualificado:
            achados.append(Achado(COB_CARGO_SEM_QUALIFICADO, Severidade.ERRO,
                                  f"{c}: mínimo não atendido em {k.horas_sem_qualificado} h",
                                  {"cargo": c, "horas": str(k.horas_sem_qualificado)}))
        if k.deficit_hp:
            achados.append(Achado(COB_DEFICIT_CARGO, Severidade.ALERTA,
                                  f"{c}: {k.deficit_hp} horas-posto em déficit após substituição",
                                  {"cargo": c, "deficit_hp": str(k.deficit_hp)}))
        if k.substituicao_hp:
            achados.append(Achado(COB_COBERTURA_POR_SUBSTITUICAO, Severidade.INFO,
                                  f"{c}: {k.substituicao_hp} horas-posto cobertas por substituição",
                                  {"cargo": c, "substituicao_hp": str(k.substituicao_hp)}))
    return ResultadoCargos(cargos, tuple(horas), kpis, tuple(achados))
