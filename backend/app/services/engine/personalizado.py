"""M2/M3 genérico (v3.5) — padrão de escala **arbitrário** em camadas (FR-29–FR-33).

Um :class:`PadraoPersonalizado` tem turnos livres (início/duração/blocos, sobrepostos ou não)
e uma ou mais **camadas** (FR-30: ex.: núcleo 12x36 + reforço 5x2). Cada camada tem:

* sequência de ciclo livre (qualquer comprimento, códigos do usuário, ``F`` = folga,
  ``R`` = reserva), rotação para frente/trás;
* K em modo ``fixo`` | ``minimo`` | ``faixa`` | ``sugerir`` (o motor escolhe o menor K que
  zera o déficit — FR-32) e **tamanho por turma** em pessoas (meias-turmas = tamanhos
  menores — FR-33);
* offsets manuais ou automáticos (``buscar_offsets`` heurístico), folgas fixas por dia da
  semana, dias ativos da camada e alinhamento semanal (dia 0 = segunda).

A operação pode ter **janela de funcionamento** (dias/horas): fora dela a demanda é zero —
é assim que modelos não contínuos (4x3, 5x2 comercial, parcial) simulam normalmente.
Alertas legais nunca impedem simular: viram achados (``validar_padrao``).
Turma ``i`` da camada no dia ``d`` executa ``seq[(d_abs + offset_i) mod L]`` com ``d_abs``
contado da data-âncora (nunca o dia do mês).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field, replace
from datetime import date, timedelta
from fractions import Fraction
from functools import lru_cache
from itertools import pairwise
from math import ceil

from app.services.engine.catalogo import ModeloEscala
from app.services.engine.cobertura import ResultadoCobertura, montar_resultado
from app.services.engine.compliance.jornadas import jornadas_da_sequencia
from app.services.engine.compliance.regras import CLT_JORNADA_DIARIA, validar_sequencia
from app.services.engine.demanda import CurvaDemanda
from app.services.engine.gerador import (
    buscar_offsets,
    cobre_exatamente,
    nome_turma,
    offsets_uniformes,
)
from app.services.engine.noturno import jornada_computada_min
from app.services.engine.regime_legal import (
    ContextoRegime,
    PerfilEscala,
    RegimeLegal,
    validar_regime,
)
from app.services.engine.types import (
    FOLGA,
    MINUTOS_DIA,
    RESERVA,
    Achado,
    Escala,
    GrupoTurmas,
    Severidade,
    Turma,
    Turno,
    para_decimal,
)

MODOS_K = ("fixo", "minimo", "faixa", "sugerir")
K_MAX_BUSCA = 60
COB_K_INSUFICIENTE = "COB_K_INSUFICIENTE"
COB_K_SUGERIDO = "COB_K_SUGERIDO"
COB_PADRAO_NAO_EXATO = "COB_PADRAO_NAO_EXATO"
COB_FORA_JANELA = "COB_FORA_JANELA"


@dataclass(frozen=True, slots=True)
class Janela:
    """Janela de operação: dias da semana (0 = seg) e faixa horária ``[ini, fim)`` em minutos.

    ``fim <= ini`` cruza a meia-noite; ``ini == fim`` = 24 h.
    """

    dias: frozenset[int] = frozenset(range(7))
    inicio_min: int = 0
    fim_min: int = 0

    def aberta(self, dow: int, hora: int) -> bool:
        m = hora * 60
        if self.inicio_min == self.fim_min:
            return dow in self.dias
        if self.inicio_min < self.fim_min:
            return dow in self.dias and self.inicio_min <= m < self.fim_min
        # cruza a meia-noite: a parte após 00:00 pertence ao dia anterior
        if m >= self.inicio_min:
            return dow in self.dias
        return m < self.fim_min and (dow - 1) % 7 in self.dias


@dataclass(frozen=True, slots=True)
class Camada:
    codigo: str
    sequencia: tuple[str, ...]
    nome: str = ""
    rotacao: str = "frente"                       # frente | tras
    k_modo: str = "fixo"
    k: int | None = None
    k_min: int | None = None
    k_max: int | None = None
    offsets: tuple[int, ...] | None = None        # manuais (None = automático)
    tamanhos: tuple[Fraction, ...] | None = None  # pessoas por turma (None = padrão)
    folgas_fixas: frozenset[int] = frozenset()    # dias da semana sempre de folga
    dias_ativos: frozenset[int] = frozenset(range(7))
    semanal: bool = False
    cargo: str | None = None
    regime_especial: str | None = None

    def __post_init__(self) -> None:
        if not self.sequencia:
            raise ValueError(f"camada {self.codigo}: sequência vazia")
        if len(self.sequencia) > 366:
            raise ValueError(f"camada {self.codigo}: sequência > 366 posições")
        if all(e in (FOLGA, RESERVA) for e in self.sequencia):
            raise ValueError(f"camada {self.codigo}: sequência sem dias trabalhados")
        if self.k_modo not in MODOS_K:
            raise ValueError(f"camada {self.codigo}: modo de K inválido {self.k_modo!r}")
        if self.rotacao not in ("frente", "tras"):
            raise ValueError(f"camada {self.codigo}: rotação inválida {self.rotacao!r}")
        for nome, v in (("k", self.k), ("k_min", self.k_min), ("k_max", self.k_max)):
            if v is not None and not 1 <= v <= K_MAX_BUSCA:
                raise ValueError(f"camada {self.codigo}: {nome} fora de 1..{K_MAX_BUSCA}")
        if self.k_modo == "faixa" and (self.k_min is None or self.k_max is None
                                       or self.k_min > self.k_max):
            raise ValueError(f"camada {self.codigo}: faixa exige k_min ≤ k_max")
        if self.offsets is not None and any(o < 0 for o in self.offsets):
            raise ValueError(f"camada {self.codigo}: offset negativo")

    @property
    def efetiva(self) -> tuple[str, ...]:
        """Sequência após o sentido de rotação (``tras`` espelha a ordem dos turnos)."""
        return sequencia_rotacionada(self.sequencia, self.rotacao)

    @property
    def ciclo(self) -> int:
        return len(self.sequencia)


@dataclass(frozen=True, slots=True)
class PadraoPersonalizado:
    codigo: str
    turnos: Mapping[str, Turno]
    camadas: tuple[Camada, ...]
    data_ancora: date | None = None
    janela: Janela | None = None
    derivado_de: str | None = None

    def __post_init__(self) -> None:
        if not self.camadas:
            raise ValueError("padrão sem camadas")
        cods = [c.codigo for c in self.camadas]
        if len(set(cods)) != len(cods):
            raise ValueError("códigos de camada repetidos")
        for c in self.camadas:
            falt = {e for e in c.sequencia if e not in (FOLGA, RESERVA)} - set(self.turnos)
            if falt:
                raise ValueError(f"camada {c.codigo}: turnos não definidos {sorted(falt)}")


def sequencia_rotacionada(seq: Sequence[str], rotacao: str) -> tuple[str, ...]:
    if rotacao != "tras":
        return tuple(seq)
    ordem = [e for e in dict.fromkeys(seq) if e not in (FOLGA, RESERVA)]
    espelho = dict(zip(ordem, reversed(ordem), strict=True))
    return tuple(espelho.get(e, e) for e in seq)


def gerar_por_blocos(turnos: Sequence[str], dias_por_turno: int, folgas: int,
                     folga_entre: int = 0, rotacao: str = "frente") -> tuple[str, ...]:
    """Construtor "bloco de n dias por turno + folgas" (FR-29), ex.: M,T,N × 2 + 2 F = 6x2."""
    if dias_por_turno < 1 or folgas < 0 or folga_entre < 0 or not turnos:
        raise ValueError("blocos inválidos")
    seq: list[str] = []
    for i, t in enumerate(turnos):
        seq += [t] * dias_por_turno
        if folga_entre and i < len(turnos) - 1:
            seq += [FOLGA] * folga_entre
    seq += [FOLGA] * folgas
    return sequencia_rotacionada(seq, rotacao)


# --------------------------------------------------------------- métricas analíticas --
def turnos_da_sequencia(seq: Sequence[str]) -> tuple[str, ...]:
    return tuple(e for e in dict.fromkeys(seq) if e not in (FOLGA, RESERVA))


def k_estrela(seq: Sequence[str]) -> Fraction:
    """K* = s × L / w (turnos distintos × ciclo / dias trabalhados)."""
    w = sum(1 for e in seq if e not in (FOLGA, RESERVA))
    return Fraction(len(turnos_da_sequencia(seq)) * len(seq), w)


def horas_semanais(seq: Sequence[str], turnos: Mapping[str, Turno]) -> Fraction:
    trab = sum(turnos[e].minutos_trabalhados for e in seq if e not in (FOLGA, RESERVA))
    return Fraction(trab * 7, len(seq) * 60)


def maior_sequencia_trabalho(seq: Sequence[str]) -> int:
    L = len(seq)
    trab = [e not in (FOLGA, RESERVA) for e in seq]
    if all(trab):
        return L
    melhor = atual = 0
    for i in range(2 * L):
        atual = atual + 1 if trab[i % L] else 0
        melhor = max(melhor, atual)
    return melhor


def menor_interjornada_min(seq: Sequence[str], turnos: Mapping[str, Turno]) -> int | None:
    L = len(seq)
    js = jornadas_da_sequencia(tuple(seq), turnos, 3 * L)
    gaps = [b.ini - a.fim for a, b in pairwise(js)]
    return min(gaps) if gaps else None


def folgas_7d(seq: Sequence[str]) -> Fraction:
    return Fraction(sum(1 for e in seq if e == FOLGA) * 7, len(seq))


@dataclass(frozen=True, slots=True)
class RelatorioCamada:
    """Validação em tempo real (FR-29): o que o construtor mostra a cada edição."""

    codigo: str
    ciclo: int
    k_estrela: Fraction
    k_sugerido: int
    exato: bool
    meias_exato: bool
    horas_semanais: Fraction
    folgas_7d: Fraction
    maior_sequencia_trabalho: int
    menor_interjornada_min: int | None
    turnos: tuple[str, ...]


def relatorio_camada(c: Camada, turnos: Mapping[str, Turno]) -> RelatorioCamada:
    seq = c.efetiva
    ks = k_estrela(seq)
    L = len(seq)

    def _exato(n: Fraction, fr: Fraction) -> bool:
        if n.denominator != 1 or L % int(n):
            return False
        passo = L // int(n)
        g = GrupoTurmas(seq, tuple(i * passo for i in range(int(n))), fr)
        return cobre_exatamente(g, L)

    return RelatorioCamada(
        codigo=c.codigo, ciclo=L, k_estrela=ks, k_sugerido=ceil(ks),
        exato=_exato(ks, Fraction(1)), meias_exato=_exato(2 * ks, Fraction(1, 2)),
        horas_semanais=horas_semanais(seq, turnos), folgas_7d=folgas_7d(seq),
        maior_sequencia_trabalho=maior_sequencia_trabalho(seq),
        menor_interjornada_min=menor_interjornada_min(seq, turnos),
        turnos=turnos_da_sequencia(seq))


# --------------------------------------------------------------- materialização -------
@dataclass(frozen=True, slots=True)
class TurmaGerada:
    nome: str
    camada: str
    indice_camada: int
    offset: int
    tamanho: Fraction


@dataclass(frozen=True, slots=True)
class EscalaPersonalizada:
    data_inicio: date
    data_ancora: date
    turmas: tuple[TurmaGerada, ...]
    estados: tuple[tuple[str, ...], ...]   # turma × dia (dia 0 = data_inicio)
    ks: tuple[int, ...]                    # K resolvido por camada
    offsets: tuple[tuple[int, ...], ...]   # por camada

    def como_escala(self, codigo: str) -> Escala:
        """Formato canônico; ``Turma.fracao_posto`` carrega o tamanho **em pessoas**."""
        return Escala(codigo, self.data_ancora, (self.data_inicio - self.data_ancora).days,
                      tuple(Turma(t.nome, t.indice_camada, t.offset, t.tamanho)
                            for t in self.turmas), self.estados)


@lru_cache(maxsize=512)
def _offsets_auto(seq: tuple[str, ...], k: int) -> tuple[int, ...]:
    unif = offsets_uniformes(len(seq), k)
    if unif is not None and cobre_exatamente(GrupoTurmas(seq, unif), len(seq)):
        return unif
    return buscar_offsets(seq, k)


def offsets_camada(c: Camada, k: int) -> tuple[int, ...]:
    L = c.ciclo
    if c.offsets is not None:
        manuais = tuple(o % L for o in c.offsets)
        if len(manuais) == k:
            return manuais
        if c.k_modo == "fixo":
            raise ValueError(f"camada {c.codigo}: {len(manuais)} offsets manuais para K={k}")
    return _offsets_auto(c.efetiva, k)


def tamanhos_camada(c: Camada, k: int, padrao: Fraction) -> tuple[Fraction, ...]:
    t = c.tamanhos or ()
    return tuple(Fraction(t[i]) if i < len(t) else padrao for i in range(k))


def k_inicial(c: Camada) -> int:
    ks = ceil(k_estrela(c.efetiva))
    if c.k_modo == "fixo":
        return c.k or ks
    if c.k_modo in ("minimo", "faixa"):
        return c.k_min or ks
    return ks


def ancora_camada(c: Camada, ancora: date) -> date:
    return ancora - timedelta(days=ancora.weekday()) if c.semanal else ancora


def estado_dia(c: Camada, seq: tuple[str, ...], offset: int, dia: date, ancora: date) -> str:
    dow = dia.weekday()
    if dow in c.folgas_fixas or dow not in c.dias_ativos:
        return FOLGA
    d_abs = (dia - ancora_camada(c, ancora)).days
    return seq[(d_abs + offset) % len(seq)]


def gerar(p: PadraoPersonalizado, ks: Sequence[int], inicio: date, dias: int,
          tamanho_padrao: Fraction) -> EscalaPersonalizada:
    """Turma × dia de ``inicio`` por ``dias`` dias (inclui a camada com seus offsets)."""
    ancora = p.data_ancora or inicio
    turmas: list[TurmaGerada] = []
    estados: list[tuple[str, ...]] = []
    offs_all: list[tuple[int, ...]] = []
    for ci, (c, k) in enumerate(zip(p.camadas, ks, strict=True)):
        seq = c.efetiva
        offs = offsets_camada(c, k)
        offs_all.append(offs)
        for o, tam in zip(offs, tamanhos_camada(c, k, tamanho_padrao), strict=True):
            turmas.append(TurmaGerada(nome_turma(len(turmas)), c.codigo, ci, o, tam))
            estados.append(tuple(estado_dia(c, seq, o, inicio + timedelta(days=j), ancora)
                                 for j in range(dias)))
    return EscalaPersonalizada(inicio, ancora, tuple(turmas), tuple(estados), tuple(ks),
                               tuple(offs_all))


def ocupacao(p: PadraoPersonalizado, esc: EscalaPersonalizada,
             dias: int) -> list[list[tuple[int, str]]]:
    """Por hora do horizonte: ``(índice da turma, turno)`` ativos (blocos e virada de dia)."""
    total = dias * 24
    ocup: list[list[tuple[int, str]]] = [[] for _ in range(total)]
    ancora = esc.data_ancora
    for k, t in enumerate(esc.turmas):
        c = p.camadas[t.indice_camada]
        seq = c.efetiva
        anterior = estado_dia(c, seq, t.offset, esc.data_inicio - timedelta(days=1), ancora)
        for j, e in enumerate((anterior, *esc.estados[k])):
            if e in (FOLGA, RESERVA):
                continue
            base = (j - 1) * MINUTOS_DIA
            for a, b in p.turnos[e].segmentos:
                h0, h1 = (base + a) // 60, ceil((base + b) / 60)
                for h in range(max(0, h0), min(total, h1)):
                    ocup[h].append((k, e))
    return ocup


def demanda_horizonte(curva: CurvaDemanda, inicio: date, dias: int,
                      janela: Janela | None) -> tuple[int, ...]:
    out = []
    for h in range(dias * 24):
        dow = (inicio + timedelta(days=h // 24)).weekday()
        v = curva.valores[dow * 24 + h % 24]
        out.append(v if janela is None or janela.aberta(dow, h % 24) else 0)
    return tuple(out)


@dataclass(frozen=True, slots=True)
class ResultadoPersonalizado:
    escala: EscalaPersonalizada
    ocupacao: list[list[tuple[int, str]]]
    cobertura: ResultadoCobertura
    relatorios: tuple[RelatorioCamada, ...]
    achados: tuple[Achado, ...]
    k_estrela_total: Fraction
    headcount: Fraction


def _avaliar(p: PadraoPersonalizado, ks: Sequence[int], curva: CurvaDemanda, inicio: date,
             dias: int, tam: Fraction) -> tuple[EscalaPersonalizada, list[list[tuple[int, str]]],
                                                ResultadoCobertura]:
    esc = gerar(p, ks, inicio, dias, tam)
    ocup = ocupacao(p, esc, dias)
    cob = tuple(sum((esc.turmas[k].tamanho for k, _ in o), Fraction(0)) for o in ocup)
    req = demanda_horizonte(curva, inicio, dias, p.janela)
    return esc, ocup, montar_resultado(inicio, req, cob, curva)


def _candidatos(c: Camada) -> range:
    teto = max(12, 2 * ceil(k_estrela(c.efetiva)) + 2)
    if c.k_modo == "faixa":
        return range(c.k_min or 1, (c.k_max or teto) + 1)
    if c.k_modo == "minimo":
        lo = c.k_min or 1
        return range(lo, min(K_MAX_BUSCA, max(lo, teto)) + 1)
    return range(1, min(K_MAX_BUSCA, teto) + 1)


def simular(p: PadraoPersonalizado, curva: CurvaDemanda, inicio: date, dias: int,
            tamanho_padrao: int | Fraction) -> ResultadoPersonalizado:
    """Resolve K por camada (fixo/mínimo/faixa/sugerir), gera e mede a cobertura."""
    if dias < 1:
        raise ValueError("horizonte deve ter ≥ 1 dia")
    tam = Fraction(tamanho_padrao)
    ks = [k_inicial(c) for c in p.camadas]
    achados: list[Achado] = []
    for i, c in enumerate(p.camadas):
        if c.k_modo == "fixo":
            continue
        melhor: tuple[Fraction, int] | None = None
        escolhido = None
        for k in _candidatos(c):
            ks[i] = k
            _, _, res = _avaliar(p, ks, curva, inicio, dias, tam)
            d = res.kpis.deficit_hp
            if melhor is None or d < melhor[0]:
                melhor = (d, k)
            if d == 0:
                escolhido = k
                break
        assert melhor is not None
        ks[i] = escolhido if escolhido is not None else melhor[1]
        rotulo = {"minimo": f"K ≥ {c.k_min}", "faixa": f"K em {c.k_min}–{c.k_max}",
                  "sugerir": "K sugerido"}[c.k_modo]
        if escolhido is not None:
            achados.append(Achado(COB_K_SUGERIDO, Severidade.INFO,
                                  f"Camada {c.codigo}: {rotulo} → K = {escolhido} zera o déficit",
                                  {"camada": c.codigo, "k": str(escolhido), "modo": c.k_modo}))
        else:
            achados.append(Achado(COB_K_INSUFICIENTE, Severidade.ALERTA,
                                  f"Camada {c.codigo}: nenhum K ({rotulo}) zera o déficit; "
                                  f"melhor K = {melhor[1]} com "
                                  f"{float(melhor[0]):g} horas-posto de déficit",
                                  {"camada": c.codigo, "k": str(melhor[1]), "modo": c.k_modo,
                                   "deficit_hp": str(melhor[0])}))
    esc, ocup, res = _avaliar(p, ks, curva, inicio, dias, tam)
    if res.kpis.deficit_hp > 0:
        for i, c in enumerate(p.camadas):
            if c.k_modo != "fixo":
                continue
            sug = None
            for extra in range(1, 9):
                if ks[i] + extra > K_MAX_BUSCA or (c.offsets is not None
                                                   and len(c.offsets) == ks[i]):
                    break
                tent = [*ks]
                tent[i] += extra
                if _avaliar(p, tent, curva, inicio, dias, tam)[2].kpis.deficit_hp == 0:
                    sug = tent[i]
                    break
            pct = float(res.kpis.pct_horas_posto_cobertas)
            msg = (f"Camada {c.codigo}: K fixo = {ks[i]} cobre {pct:.1%} das horas-posto "
                   f"(déficit {float(res.kpis.deficit_hp_semana):g} horas-posto/semana)")
            msg += f"; K = {sug} zera o déficit" if sug else "; considere outra camada/turno"
            achados.append(Achado(COB_K_INSUFICIENTE, Severidade.ALERTA, msg,
                                  {"camada": c.codigo, "k": str(ks[i]),
                                   "sugestao": str(sug or ""),
                                   "deficit_hp_semana": str(res.kpis.deficit_hp_semana)}))
    relatorios = tuple(relatorio_camada(c, p.turnos) for c in p.camadas)
    for c, r in zip(p.camadas, relatorios, strict=True):
        if not r.exato and c.dias_ativos == frozenset(range(7)) and not c.folgas_fixas:
            alt = f"{r.k_sugerido} turmas"
            if r.meias_exato:
                alt += f" ou {int(2 * r.k_estrela)} meias-turmas"
            achados.append(Achado(COB_PADRAO_NAO_EXATO, Severidade.INFO,
                                  f"Camada {c.codigo}: K* = {float(r.k_estrela):g} não fecha "
                                  f"exato com turmas iguais — use {alt}",
                                  {"camada": c.codigo, "k_estrela": str(r.k_estrela)}))
    if p.janela is not None:
        fora = sum(1 for h, o in enumerate(ocup)
                   if o and not p.janela.aberta(
                       (inicio + timedelta(days=h // 24)).weekday(), h % 24))
        if fora:
            achados.append(Achado(COB_FORA_JANELA, Severidade.INFO,
                                  f"{fora} h com turma escalada fora da janela de operação",
                                  {"horas": str(fora)}))
    k_tot = sum((r.k_estrela for r in relatorios), Fraction(0))
    hc = sum((t.tamanho for t in esc.turmas), Fraction(0))
    return ResultadoPersonalizado(esc, ocup, res, relatorios, (*res.achados, *achados),
                                  k_tot, hc)


# --------------------------------------------------------------- viabilidade (M4) ------
def perfil_camada(c: Camada, turnos: Mapping[str, Turno],
                  especial: str | None) -> PerfilEscala:
    rel: dict[str, int] = {}
    comp: dict[str, Fraction] = {}
    for e in turnos_da_sequencia(c.efetiva):
        t = turnos[e]
        rel[e] = t.minutos_trabalhados
        comp[e] = sum((jornada_computada_min(a, b) for a, b in t.segmentos), Fraction(0))
    return PerfilEscala(c.efetiva, rel, comp, c.regime_especial or especial)


def validar_padrao(p: PadraoPersonalizado, regime: RegimeLegal,
                   ctx: ContextoRegime | None = None) -> list[Achado]:
    """Regime (carga, jornada, folgas, 6x1) + CLT da sequência por camada — só achados."""
    out: list[Achado] = []
    vistos: set[tuple[str, str]] = set()
    for c in p.camadas:
        perfil = perfil_camada(c, p.turnos, p.derivado_de)
        brutos = validar_regime(perfil, regime, ctx)
        brutos += [a for a in validar_sequencia(c.efetiva, p.turnos)
                   if a.codigo != CLT_JORNADA_DIARIA]
        for a in brutos:
            if (a.codigo, c.codigo) in vistos:
                continue
            vistos.add((a.codigo, c.codigo))
            out.append(replace(a, contexto={**a.contexto, "camada": c.codigo}))
    return out


# --------------------------------------------------------------- derivação do catálogo -
def de_modelo(m: ModeloEscala, turnos: Mapping[str, Turno], k: int | None = None,
              tamanho: int | None = None) -> PadraoPersonalizado:
    """"Duplicar do catálogo" (FR-31): cada grupo do modelo vira uma camada editável.

    O K total (padrão: K* arredondado ou ``k_nao_continuo``) é distribuído entre as camadas.
    """
    n = len(m.sequencias)
    total = k or (m.turmas_inteiras or m.k_nao_continuo or n)
    if m.variantes and k is None and m.variantes[0].turmas:
        total = m.variantes[0].turmas
    total = max(total, n)
    base, resto = divmod(total, n)
    usados = {e for s in m.sequencias for e in s if e not in (FOLGA, RESERVA)}
    camadas = []
    for i, seq in enumerate(m.sequencias):
        kk = base + (1 if i < resto else 0)
        offs = m.offsets_dados if (m.offsets_dados and len(m.offsets_dados) == kk) else None
        cod = (turnos_da_sequencia(seq)[0] if n > 1 else "NUCLEO")[:16]
        camadas.append(Camada(
            codigo=cod, nome=f"{m.nome} · {cod}" if n > 1 else m.nome, sequencia=seq,
            k_modo="fixo", k=kk, offsets=offs,
            tamanhos=tuple(Fraction(tamanho) for _ in range(kk)) if tamanho else None,
            semanal=m.semanal, regime_especial=m.modelo_base or m.codigo))
    return PadraoPersonalizado(m.codigo, {c: turnos[c] for c in sorted(usados)},
                               tuple(camadas), janela=janela_padrao(m, turnos),
                               derivado_de=m.codigo)


def janela_padrao(m: ModeloEscala, turnos: Mapping[str, Turno]) -> Janela | None:
    """Não contínuo: janela = horário dos turnos do modelo nos dias em que trabalham."""
    if m.continuo_24x7:
        return None
    ts = [turnos[e] for s in m.sequencias for e in s if e in turnos]
    ini = min(t.inicio_min for t in ts)
    fim = max(t.fim_min for t in ts) % MINUTOS_DIA
    dias = (frozenset(i % 7 for s in m.sequencias for i, e in enumerate(s) if e in turnos)
            if m.semanal else frozenset(range(7)))
    return Janela(dias, ini, fim)


@dataclass(frozen=True, slots=True)
class Previa:
    """Pré-visualização instantânea do construtor (≤ 300 ms)."""

    relatorios: tuple[RelatorioCamada, ...]
    cobertura: ResultadoCobertura
    ks: tuple[int, ...]
    achados: tuple[Achado, ...] = field(default_factory=tuple)


def previa(p: PadraoPersonalizado, curva: CurvaDemanda, tamanho: int, regime: RegimeLegal,
           ctx: ContextoRegime | None = None, inicio: date = date(2026, 1, 5),
           semanas: int = 4) -> Previa:
    r = simular(p, curva, inicio, semanas * 7, tamanho)
    return Previa(r.relatorios, r.cobertura, r.escala.ks,
                  (*r.achados, *validar_padrao(p, regime, ctx)))


def horas(m: int | None) -> str | None:
    return None if m is None else str(para_decimal(Fraction(m, 60)))
