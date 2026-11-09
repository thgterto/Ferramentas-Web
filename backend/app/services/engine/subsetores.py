"""v3.7 — Hierarquia Setor → Subsetor → Posição e intercambialidade por *pools*.

Uma **posição** (posto de trabalho: "Caldeira 1", "Leito 3") pertence a um **subsetor** e tem
demanda própria (168 h) e, opcionalmente, um cargo exigido. Cada **pessoa** tem subsetor de
lotação e posição padrão. Um **pool** agrupa subsetores cujos funcionários são
intercambiáveis (total ou restrito a cargos), com limite opcional de horas emprestadas por
pessoa/semana e preferência pela lotação de origem.

Alocação hora a hora = min-cost max-flow (generaliza ``cobertura_cargos``):

``fonte → grupo (subsetor, cargo) → [empréstimo do grupo] → posição → sumidouro``

* arco grupo → posição do **próprio** subsetor: custo 0 (cargo igual / sem exigência) ou
  ``prioridade`` da matriz de substituição;
* arco grupo → posição de **outro** subsetor do mesmo pool: passa por um nó de empréstimo
  com capacidade = saldo de horas emprestáveis do grupo na semana; custo
  ``CUSTO_EMPRESTIMO`` (ou 1 se o pool não prefere a origem) + custo de cargo.

O fluxo máximo garante a maior cobertura; o custo mínimo, o menor remanejamento. Inteiro e
determinístico; perfis repetidos (sem limite de horas) usam cache.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from functools import lru_cache

from app.services.engine.cobertura_cargos import Substituicao, min_cost_max_flow
from app.services.engine.types import Achado, Severidade

COB_REMANEJAMENTO_SUBSETOR = "COB_REMANEJAMENTO_SUBSETOR"
COB_DEFICIT_SUBSETOR = "COB_DEFICIT_SUBSETOR"
CUSTO_EMPRESTIMO = 10
SEM_CARGO = ""


@dataclass(frozen=True, slots=True)
class Posicao:
    codigo: str
    subsetor: str
    demanda: tuple[int, ...]          # 168 valores (segunda 00h = 0)
    cargo: str | None = None
    nome: str = ""

    def __post_init__(self) -> None:
        if len(self.demanda) != 168 or any(v < 0 for v in self.demanda):
            raise ValueError(f"posição {self.codigo}: demanda deve ter 168 inteiros ≥ 0")

    @property
    def pico(self) -> int:
        return max(self.demanda)


@dataclass(frozen=True, slots=True)
class Pool:
    codigo: str
    subsetores: tuple[str, ...]
    cargos: tuple[str, ...] = ()       # vazio = intercambialidade total
    max_horas_semana: int | None = None  # por pessoa (None = sem limite)
    preferir_origem: bool = True
    nome: str = ""


@dataclass(frozen=True, slots=True)
class Estrutura:
    subsetores: tuple[str, ...]
    posicoes: tuple[Posicao, ...]
    pools: tuple[Pool, ...] = ()
    regras: tuple[Substituicao, ...] = ()
    nomes: tuple[tuple[str, str], ...] = ()   # (subsetor, nome)

    def __post_init__(self) -> None:
        subs = set(self.subsetores)
        for p in self.posicoes:
            if p.subsetor not in subs:
                raise ValueError(f"posição {p.codigo}: subsetor desconhecido {p.subsetor}")
        vistos: set[str] = set()
        for pool in self.pools:
            if not set(pool.subsetores) <= subs:
                raise ValueError(f"pool {pool.codigo}: subsetor desconhecido")
            if vistos & set(pool.subsetores):
                raise ValueError(f"pool {pool.codigo}: subsetor já pertence a outro pool")
            vistos |= set(pool.subsetores)

    def nome(self, subsetor: str) -> str:
        return dict(self.nomes).get(subsetor, subsetor)

    def pool_de(self, subsetor: str) -> Pool | None:
        return next((p for p in self.pools if subsetor in p.subsetores), None)

    def demanda_total(self, subsetores: Sequence[str] | None = None) -> tuple[int, ...]:
        alvo = set(subsetores) if subsetores is not None else set(self.subsetores)
        return tuple(sum(p.demanda[i] for p in self.posicoes if p.subsetor in alvo)
                     for i in range(168))


@dataclass(frozen=True, slots=True)
class PessoaLotada:
    id: str
    turma: int                 # índice da turma
    subsetor: str
    posicao: str | None
    cargo: str | None = None


def distribuir_pessoas(estr: Estrutura, turmas: Sequence[tuple[str, int, Sequence[str | None]]]
                       ) -> list[PessoaLotada]:
    """Lotação das pessoas fictícias (``A-01``…) de cada turma nas posições.

    Cada turma é espalhada pelas "vagas" (posição repetida ``pico`` vezes), preferindo vaga
    com o cargo da pessoa; pessoas além das vagas voltam ao início da lista.
    """
    vagas = [p for p in estr.posicoes for _ in range(max(1, p.pico))] or []
    out: list[PessoaLotada] = []
    for ti, (nome, tamanho, cargos) in enumerate(turmas):
        livres = list(range(len(vagas)))
        for i in range(max(1, tamanho)):
            cargo = cargos[i] if i < len(cargos) else None
            if not vagas:
                sub = estr.subsetores[0] if estr.subsetores else ""
                out.append(PessoaLotada(f"{nome}-{i + 1:02d}", ti, sub, None, cargo))
                continue
            if not livres:
                livres = list(range(len(vagas)))
            j = next((k for k in livres if vagas[k].cargo in (cargo, None)), livres[0])
            livres.remove(j)
            v = vagas[j]
            out.append(PessoaLotada(f"{nome}-{i + 1:02d}", ti, v.subsetor, v.codigo, cargo))
    return out


# ------------------------------------------------------------------ alocação ---------
Grupo = tuple[str, str]   # (subsetor, cargo ou "")


def _custo_cargo(cargo: str, exigido: str | None, regras: Sequence[Substituicao]
                 ) -> int | None:
    if exigido is None or cargo == exigido:
        return 0
    r = next((g for g in regras if g.de == cargo and g.para == exigido), None)
    return r.prioridade if r else None


@lru_cache(maxsize=8192)
def _alocar_cache(estr: Estrutura, grupos: tuple[Grupo, ...], sup: tuple[int, ...],
                  dem: tuple[int, ...], saldo: tuple[int, ...], usar_pools: bool
                  ) -> tuple[tuple[int, int, int], ...]:
    return tuple(_alocar(estr, grupos, sup, dem, saldo, usar_pools))


def _alocar(estr: Estrutura, grupos: Sequence[Grupo], sup: Sequence[int], dem: Sequence[int],
            saldo: Sequence[int], usar_pools: bool) -> list[tuple[int, int, int]]:
    """Lista ``(grupo, posição, pessoas)`` ótima para uma hora. ``saldo[g]`` = horas
    emprestáveis restantes do grupo (``-1`` = ilimitado)."""
    ng, npos = len(grupos), len(estr.posicoes)
    s, t = 2 * ng + npos, 2 * ng + npos + 1
    arcos: list[tuple[int, int, int, int]] = []
    pares: list[tuple[int, int]] = []
    for g in range(ng):
        arcos.append((s, g, sup[g], 0))
    for k in range(npos):
        arcos.append((2 * ng + k, t, dem[k], 0))
    base = len(arcos)
    for g, (sub, cargo) in enumerate(grupos):
        if not sup[g]:
            continue
        pool = estr.pool_de(sub) if usar_pools else None
        emprestimo_ok = pool is not None and (not pool.cargos or cargo in pool.cargos)
        if emprestimo_ok:
            cap = sup[g] if saldo[g] < 0 else min(sup[g], saldo[g])
            arcos.append((g, ng + g, cap, 0))
            pares.append((-1, -1))
        for k, p in enumerate(estr.posicoes):
            if not dem[k]:
                continue
            cc = _custo_cargo(cargo, p.cargo, estr.regras)
            if cc is None:
                continue
            if p.subsetor == sub:
                arcos.append((g, 2 * ng + k, sup[g], cc))
                pares.append((g, k))
            elif emprestimo_ok and pool is not None and p.subsetor in pool.subsetores:
                custo = (CUSTO_EMPRESTIMO if pool.preferir_origem else 1) + cc
                arcos.append((ng + g, 2 * ng + k, sup[g], custo))
                pares.append((g, k))
    fluxo = min_cost_max_flow(2 * ng + npos + 2, arcos, s, t)
    out: dict[tuple[int, int], int] = {}
    for (g, k), f in zip(pares, fluxo[base:], strict=True):
        if g >= 0 and f:
            out[(g, k)] = out.get((g, k), 0) + f
    return [(g, k, f) for (g, k), f in sorted(out.items())]


@dataclass(frozen=True, slots=True)
class KPIsSubsetor:
    demanda_hp: int
    proprio_hp: int          # coberto por pessoas lotadas no subsetor
    recebido_hp: int         # coberto por pessoas emprestadas de outro subsetor do pool
    cedido_hp: int           # horas que pessoas do subsetor trabalharam em outro subsetor
    deficit_hp: int


@dataclass(frozen=True, slots=True)
class ResultadoSubsetores:
    posicoes: tuple[str, ...]
    # por hora e posição: (demanda, próprio, recebido, déficit)
    horas: tuple[tuple[tuple[int, int, int, int], ...], ...]
    kpis: Mapping[str, KPIsSubsetor]
    horas_remanejadas: int
    deficit_hp: int
    deficit_sem_pool_hp: int | None
    # por pessoa e hora: índice da posição trabalhada (-1 = fora de turno/ociosa)
    alocacao_pessoas: tuple[tuple[int, ...], ...]
    achados: tuple[Achado, ...]
    subsetor_de: tuple[str, ...] = ()   # subsetor de cada posição (mesma ordem)


def alocar_horizonte(
    estr: Estrutura, pessoas: Sequence[PessoaLotada],
    ocupacao: Sequence[Sequence[tuple[int, str]]], inicio: date, usar_pools: bool = True,
    comparar_sem_pool: bool = True, por_pessoa: bool = True,
) -> ResultadoSubsetores:
    """Aloca as pessoas presentes às posições hora a hora (ver docstring do módulo)."""
    grupos: list[Grupo] = sorted({(pe.subsetor, pe.cargo or SEM_CARGO) for pe in pessoas})
    gidx = {g: i for i, g in enumerate(grupos)}
    membros: list[list[int]] = [[] for _ in grupos]
    for i, pe in enumerate(pessoas):
        membros[gidx[(pe.subsetor, pe.cargo or SEM_CARGO)]].append(i)
    limite: list[int] = []
    for sub, _ in grupos:
        pool = estr.pool_de(sub)
        lim = pool.max_horas_semana if pool is not None else None
        limite.append(-1 if lim is None else lim)
    pos_idx = {p.codigo: k for k, p in enumerate(estr.posicoes)}
    sub_de = [p.subsetor for p in estr.posicoes]
    tem_limite = any(x >= 0 for x in limite)
    horas: list[tuple[tuple[int, int, int, int], ...]] = []
    usados: dict[tuple[int, int], int] = {}
    aloc: list[list[int]] = [[-1] * len(ocupacao) for _ in pessoas] if por_pessoa else []
    anterior: list[int] = [-1] * len(pessoas)
    remanejadas = 0
    for h, o in enumerate(ocupacao):
        dia = h // 24
        dow = (inicio + timedelta(days=dia)).weekday()
        semana = dia // 7
        ativos = {k for k, _ in o}
        presentes = [[i for i in membros[g] if pessoas[i].turma in ativos]
                     for g in range(len(grupos))]
        sup = tuple(len(x) for x in presentes)
        dem = tuple(p.demanda[dow * 24 + h % 24] for p in estr.posicoes)
        saldo = tuple(-1 if limite[g] < 0 else
                      max(0, limite[g] * len(membros[g]) - usados.get((g, semana), 0))
                      for g in range(len(grupos)))
        if tem_limite:
            fl = _alocar(estr, grupos, sup, dem, saldo, usar_pools)
        else:
            fl = list(_alocar_cache(estr, tuple(grupos), sup, dem, saldo, usar_pools))
        prop = [0] * len(dem)
        rec = [0] * len(dem)
        for g, k, f in fl:
            if sub_de[k] == grupos[g][0]:
                prop[k] += f
            else:
                rec[k] += f
                remanejadas += f
                usados[(g, semana)] = usados.get((g, semana), 0) + f
        horas.append(tuple((dem[k], prop[k], rec[k], dem[k] - prop[k] - rec[k])
                           for k in range(len(dem))))
        if por_pessoa:
            _mapear_pessoas(fl, presentes, pessoas, pos_idx, anterior, aloc, h)
    kpis: dict[str, KPIsSubsetor] = {}
    cedido: dict[str, int] = dict.fromkeys(estr.subsetores, 0)
    # cedido = horas de pessoas lotadas no subsetor trabalhando em outro (via fluxo agregado)
    for (g, _), f in usados.items():
        cedido[grupos[g][0]] += f
    for sub in estr.subsetores:
        ks = [k for k, s in enumerate(sub_de) if s == sub]
        kpis[sub] = KPIsSubsetor(
            demanda_hp=sum(hh[k][0] for hh in horas for k in ks),
            proprio_hp=sum(hh[k][1] for hh in horas for k in ks),
            recebido_hp=sum(hh[k][2] for hh in horas for k in ks),
            cedido_hp=cedido[sub],
            deficit_hp=sum(max(0, hh[k][3]) for hh in horas for k in ks))
    deficit = sum(v.deficit_hp for v in kpis.values())
    sem_pool: int | None = None
    if usar_pools and comparar_sem_pool and estr.pools:
        sem_pool = alocar_horizonte(estr, pessoas, ocupacao, inicio, usar_pools=False,
                                    comparar_sem_pool=False, por_pessoa=False).deficit_hp
    achados: list[Achado] = []
    if remanejadas:
        txt = (f"{remanejadas} horas-pessoa remanejadas entre subsetores intercambiáveis"
               + (f"; déficit {sem_pool} → {deficit} horas-posto com o pool"
                  if sem_pool is not None else ""))
        achados.append(Achado(COB_REMANEJAMENTO_SUBSETOR, Severidade.INFO, txt,
                              {"horas_remanejadas": str(remanejadas),
                               "deficit_com_pool": str(deficit),
                               "deficit_sem_pool": str(sem_pool if sem_pool is not None
                                                       else deficit)}))
    for sub, v in kpis.items():
        if v.deficit_hp:
            achados.append(Achado(COB_DEFICIT_SUBSETOR, Severidade.ALERTA,
                                  f"subsetor {estr.nome(sub)}: {v.deficit_hp} "
                                  "horas-posto em déficit após remanejamento",
                                  {"subsetor": sub, "deficit_hp": str(v.deficit_hp)}))
    return ResultadoSubsetores(
        posicoes=tuple(p.codigo for p in estr.posicoes), horas=tuple(horas), kpis=kpis,
        horas_remanejadas=remanejadas, deficit_hp=deficit, deficit_sem_pool_hp=sem_pool,
        alocacao_pessoas=tuple(tuple(x) for x in aloc), achados=tuple(achados),
        subsetor_de=tuple(sub_de))


def _mapear_pessoas(fl: Sequence[tuple[int, int, int]], presentes: Sequence[Sequence[int]],
                    pessoas: Sequence[PessoaLotada], pos_idx: Mapping[str, int],
                    anterior: list[int], aloc: list[list[int]], h: int) -> None:
    """Fluxo agregado → pessoa: mantém a posição da hora anterior, depois a padrão."""
    vagas: dict[int, dict[int, int]] = {}
    for g, k, f in fl:
        vagas.setdefault(g, {})[k] = vagas.get(g, {}).get(k, 0) + f
    for g, membros in enumerate(presentes):
        v = vagas.get(g, {})
        pend: list[int] = []
        for i in membros:
            k = anterior[i]
            if k >= 0 and v.get(k, 0) > 0:
                v[k] -= 1
                aloc[i][h] = k
            else:
                pend.append(i)
        resto: list[int] = []
        for i in pend:
            k = pos_idx.get(pessoas[i].posicao or "", -1)
            if k >= 0 and v.get(k, 0) > 0:
                v[k] -= 1
                aloc[i][h] = k
            else:
                resto.append(i)
        for i in resto:
            k = next((kk for kk, n in sorted(v.items()) if n > 0), -1)
            if k >= 0:
                v[k] -= 1
            aloc[i][h] = k
        for i in membros:
            anterior[i] = aloc[i][h]
    agora = {i for m in presentes for i in m}
    for i in range(len(anterior)):
        if i not in agora:
            anterior[i] = -1


def agregar_7x24(res: ResultadoSubsetores, inicio: date, codigos: Sequence[str]
                 ) -> list[tuple[int, int, int]]:
    """Pior ocorrência por slot 7×24 de um conjunto de posições: (demanda, coberto,
    recebido) somados sobre ``codigos``."""
    ks = [res.posicoes.index(c) for c in codigos if c in res.posicoes]
    pior: dict[int, tuple[int, int, int]] = {}
    for h, linha in enumerate(res.horas):
        idx = (inicio + timedelta(days=h // 24)).weekday() * 24 + h % 24
        dem = sum(linha[k][0] for k in ks)
        cob = sum(linha[k][1] + linha[k][2] for k in ks)
        rec = sum(linha[k][2] for k in ks)
        if idx not in pior or cob - dem < pior[idx][1] - pior[idx][0]:
            pior[idx] = (dem, cob, rec)
    return [pior.get(i, (0, 0, 0)) for i in range(168)]
