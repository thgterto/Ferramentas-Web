"""M4 — Regime legal versionado e transição da 6x1 (FR-39–FR-42, TRD §5.5.2, ADR-011).

O regime é **dado** (``seeds/regimes_legais.yaml``); o motor recebe ``RegimeLegal``
imutável. Média semanal = ``Σ jornada × 7 / L`` sobre o ciclo; folgas/7 d = ``(L − w)·7/L``
(``media_ciclo``) ou o mínimo em qualquer janela de 7 dias (``toda_janela_7d``).

Base de horas (``ContextoRegime.base``): ``"relogio"`` (padrão — é a base da tabela do PRD
§6.2 e dos GT-REG) ou ``"computada"`` (hora noturna 8/7 + Súmula 60, TRD §5.5.2 nota 1).
O achado sempre traz as duas médias no contexto.
"""

from __future__ import annotations

import calendar
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field, replace
from datetime import date, timedelta
from enum import StrEnum
from fractions import Fraction
from functools import cache
from importlib.resources import files
from math import ceil
from typing import Any, Literal, cast

import yaml

from app.services.engine.catalogo import Catalogo, ModeloEscala, Variante
from app.services.engine.cobertura import calcular_cobertura
from app.services.engine.compliance.regras import CLT_JORNADA_DIARIA, validar_sequencia
from app.services.engine.demanda import postos_24x7
from app.services.engine.noturno import jornada_computada_min
from app.services.engine.types import (
    FOLGA,
    RESERVA,
    Achado,
    Padrao,
    Severidade,
    Turno,
    para_decimal,
)

CLT_CARGA_SEMANAL_EXCEDIDA = "CLT_CARGA_SEMANAL_EXCEDIDA"
CLT_FOLGAS_SEMANAIS_INSUFICIENTES = "CLT_FOLGAS_SEMANAIS_INSUFICIENTES"
CLT_ESCALA_6X1_VEDADA = "CLT_ESCALA_6X1_VEDADA"
CLT_VIAVEL_SOMENTE_COM_ACT = "CLT_VIAVEL_SOMENTE_COM_ACT"
CLT_REGIME_PENDENTE_REGULAMENTACAO = "CLT_REGIME_PENDENTE_REGULAMENTACAO"
CLT_MEDIA_SEMANAL = "CLT_MEDIA_SEMANAL"
INFO_REGIME_PREMISSA = "INFO_REGIME_PREMISSA"

Politica = Literal["autorizado", "autorizado_pendente_lei", "vedado"]
HORAS_POSTO_SEMANA = 168
JORNADA_ERRO_MIN = 600


class RegimeNaoResolvido(ValueError):
    """Nenhum (ou mais de um) regime vigente na data — pedir escolha explícita (422)."""


@dataclass(frozen=True, slots=True)
class AncoraD0:
    """Data relativa à promulgação: D0 + ``meses`` + ``dias`` (− 1 dia se indicado)."""

    dias: int = 0
    meses: int = 0
    menos_um_dia: bool = False

    def resolver(self, d0: date) -> date:
        m = d0.month - 1 + self.meses
        ano, mes = d0.year + m // 12, m % 12 + 1
        dia = min(d0.day, calendar.monthrange(ano, mes)[1])
        d = date(ano, mes, dia) + timedelta(days=self.dias)
        return d - timedelta(days=1) if self.menos_um_dia else d


Limite = date | AncoraD0 | None


@dataclass(frozen=True, slots=True)
class RegimeLegal:
    codigo: str
    versao: int
    nome: str
    status: Literal["vigente", "previsto", "premissa"]
    valid_from: Limite
    valid_to: Limite
    carga_semanal_max_min: int
    jornada_diaria_max_min: int
    folgas_semanais_min: Fraction
    criterio_folgas: Literal["media_ciclo", "toda_janela_7d"]
    permite_6x1: bool
    compensacao_act: bool
    especiais: Mapping[str, Politica] = field(default_factory=dict)
    fonte: str = ""

    @property
    def ref(self) -> str:
        return f"{self.codigo}@{self.versao}"

    def vigencia(self, d0: date | None) -> tuple[date | None, date | None, bool]:
        """(início, fim, resolvido) — ``resolvido`` é False se depende de D0 desconhecido."""
        def r(lim: Limite) -> tuple[date | None, bool]:
            if isinstance(lim, AncoraD0):
                return (lim.resolver(d0), True) if d0 else (None, False)
            return lim, True
        ini, ok1 = r(self.valid_from)
        fim, ok2 = r(self.valid_to)
        return ini, fim, ok1 and ok2


def _limite(v: Any) -> Limite:
    if v is None:
        return None
    if isinstance(v, date):
        return v
    if isinstance(v, str):
        return date.fromisoformat(v)
    a = v["d0"]
    return AncoraD0(int(a.get("dias", 0)), int(a.get("meses", 0)),
                    bool(a.get("menos_um_dia", False)))


@dataclass(frozen=True, slots=True)
class Regimes:
    versao: str
    regimes: Mapping[str, RegimeLegal]
    linha_do_tempo: tuple[str, ...]

    def __getitem__(self, codigo: str) -> RegimeLegal:
        return self.regimes[codigo]


def carregar_regimes(dados: Mapping[str, Any]) -> Regimes:
    regimes = {}
    for r in dados["regimes"]:
        reg = RegimeLegal(
            codigo=str(r["codigo"]), versao=int(r["versao"]), nome=str(r["nome"]),
            status=r["status"], valid_from=_limite(r.get("valid_from")),
            valid_to=_limite(r.get("valid_to")),
            carga_semanal_max_min=int(r["carga_semanal_max_min"]),
            jornada_diaria_max_min=int(r["jornada_diaria_max_min"]),
            folgas_semanais_min=Fraction(str(r["folgas_semanais_min"])),
            criterio_folgas=r["criterio_folgas"], permite_6x1=bool(r["permite_6x1"]),
            compensacao_act=bool(r["compensacao_act"]),
            especiais={str(k): v for k, v in (r.get("especiais") or {}).items()},
            fonte=str(r.get("fonte", "")),
        )
        regimes[reg.codigo] = reg
    linha = tuple(str(c) for c in dados.get("linha_do_tempo", list(regimes)))
    return Regimes(str(dados["versao"]), regimes, linha)


@cache
def regimes_mvp() -> Regimes:
    texto = files("app.services.engine").joinpath("seeds/regimes_legais.yaml").read_text("utf-8")
    return carregar_regimes(cast(dict[str, Any], yaml.safe_load(texto)))


def resolver_regime(regimes: Regimes, codigo: str | None = None, data: date | None = None,
                    d0: date | None = None) -> RegimeLegal:
    """Regime explícito (prioridade) ou o único vigente em ``data`` (bordas inclusivas)."""
    if codigo:
        return regimes[codigo]
    if data is None:
        raise RegimeNaoResolvido("informe o regime ou a data de referência")
    vigentes = []
    for r in regimes.regimes.values():
        ini, fim, ok = r.vigencia(d0)
        if not ok:
            # limite desconhecido: só exclui se o limite conhecido já descarta a data
            if (ini is not None and data < ini) or (fim is not None and data > fim):
                continue
            raise RegimeNaoResolvido(f"{r.codigo}: vigência depende da data da promulgação")
        if (ini is None or ini <= data) and (fim is None or data <= fim):
            vigentes.append(r)
    if len(vigentes) != 1:
        raise RegimeNaoResolvido(f"{len(vigentes)} regimes vigentes em {data.isoformat()}")
    return vigentes[0]


# ------------------------------------------------------------- perfil da escala ----
@dataclass(frozen=True, slots=True)
class PerfilEscala:
    """Sequência de uma turma com jornadas (relógio e computada) por dia trabalhado."""

    sequencia: tuple[str, ...]
    jornada_relogio_min: Mapping[str, int]
    jornada_computada_min: Mapping[str, Fraction]
    regime_especial: str | None = None

    @property
    def ciclo(self) -> int:
        return len(self.sequencia)

    @property
    def trabalhados(self) -> tuple[str, ...]:
        return tuple(e for e in self.sequencia if e not in (FOLGA, RESERVA))

    def media_semanal_min(self, base: str) -> Fraction:
        jm: Mapping[str, Fraction | int] = (self.jornada_computada_min if base == "computada"
                                            else self.jornada_relogio_min)
        return sum((Fraction(jm[e]) for e in self.trabalhados), Fraction(0)) * 7 / self.ciclo

    def max_jornada_min(self, base: str) -> Fraction:
        jm: Mapping[str, Fraction | int] = (self.jornada_computada_min if base == "computada"
                                            else self.jornada_relogio_min)
        return max(Fraction(jm[e]) for e in self.trabalhados)

    def folgas_7d(self, criterio: str) -> Fraction:
        L = self.ciclo
        if criterio == "media_ciclo":
            return Fraction((L - len(self.trabalhados)) * 7, L)
        return Fraction(min(sum(1 for j in range(7) if self.sequencia[(i + j) % L] == FOLGA)
                            for i in range(L)))


def turnos_com_duracao(turnos: Mapping[str, Turno], duracao_min: int) -> dict[str, Turno]:
    return {c: replace(t, duracao_min=duracao_min) for c, t in turnos.items()}


def perfis_do_modelo(modelo: ModeloEscala, turnos: Mapping[str, Turno],
                     duracao_min: int | None = None, sumula60: bool = True
                     ) -> tuple[PerfilEscala, ...]:
    """Um perfil por grupo (ex.: 12x36 D e N). ``X`` sem turno = jornada diurna."""
    dur = duracao_min if duracao_min is not None else modelo.duracoes_min[0]
    esp = modelo.modelo_base or modelo.codigo
    perfis = []
    for seq in modelo.sequencias:
        rel: dict[str, int] = {}
        comp: dict[str, Fraction] = {}
        for e in seq:
            if e in (FOLGA, RESERVA) or e in rel:
                continue
            rel[e] = dur
            if e in turnos:
                ini = turnos[e].inicio_min
                comp[e] = jornada_computada_min(ini, ini + dur, sumula60)
            else:
                comp[e] = Fraction(dur)
        perfis.append(PerfilEscala(seq, rel, comp, esp))
    return tuple(perfis)


# ------------------------------------------------------------- validação ----------
@dataclass(frozen=True, slots=True)
class ContextoRegime:
    act_cct_declarado: bool = False
    he_planejada: bool = False
    carga_contratual_min: int | None = None
    base: Literal["relogio", "computada"] = "relogio"


def _h(m: Fraction | int) -> str:
    return str(para_decimal(Fraction(m) / 60))


def validar_regime(perfil: PerfilEscala, regime: RegimeLegal,
                   ctx: ContextoRegime | None = None) -> list[Achado]:
    """FR-40. Divergência deliberada do pseudocódigo do TRD: carga semanal só vira
    ``CLT_VIAVEL_SOMENTE_COM_ACT`` com instrumento **declarado** (FR-40, GT-REG-01);
    jornada diária > limite vira ``CLT_VIAVEL_SOMENTE_COM_ACT`` sempre que o regime admite
    compensação, e > 10 h fora de regime especial ainda emite ``CLT_JORNADA_DIARIA`` ERRO."""
    ctx = ctx or ContextoRegime()
    out: list[Achado] = []
    base_ctx = {"regime": regime.ref}
    media = perfil.media_semanal_min(ctx.base)
    medias = {"media_relogio_h": _h(perfil.media_semanal_min("relogio")),
              "media_computada_h": _h(perfil.media_semanal_min("computada"))}
    if regime.status == "premissa":
        out.append(Achado(INFO_REGIME_PREMISSA, Severidade.INFO,
                          "parâmetros baseados em reportagens; confirmar texto promulgado",
                          base_ctx))
    pol = regime.especiais.get(perfil.regime_especial or "")
    if pol == "autorizado_pendente_lei":
        out.append(Achado(CLT_REGIME_PENDENTE_REGULAMENTACAO, Severidade.ALERTA,
                          f"{perfil.regime_especial}: regime especial pendente de lei ordinária",
                          {**base_ctx, **medias}))
    elif pol != "autorizado":
        if media > regime.carga_semanal_max_min:
            excesso = media - regime.carga_semanal_max_min
            det = {**base_ctx, **medias, "excesso_h": _h(excesso),
                   "limite_h": _h(regime.carga_semanal_max_min)}
            if regime.compensacao_act and ctx.act_cct_declarado:
                out.append(Achado(CLT_VIAVEL_SOMENTE_COM_ACT, Severidade.INFO,
                                  "Esta escala só é viável com acordo ou convenção coletiva "
                                  "(compensação de carga)",
                                  {**det, "origem": CLT_CARGA_SEMANAL_EXCEDIDA}))
            else:
                sev = (Severidade.ALERTA if ctx.he_planejada and regime.codigo == "CLT_44H_ATUAL"
                       else Severidade.ERRO)
                out.append(Achado(CLT_CARGA_SEMANAL_EXCEDIDA, sev,
                                  f"média semanal {_h(media)} h > "
                                  f"{_h(regime.carga_semanal_max_min)}"
                                  f" h ({_h(excesso)} h/sem acima)", det))
        jmax = perfil.max_jornada_min(ctx.base)
        if jmax > regime.jornada_diaria_max_min:
            det = {**base_ctx, "jornada_h": _h(jmax),
                   "limite_h": _h(regime.jornada_diaria_max_min)}
            if regime.compensacao_act:
                sev = Severidade.INFO if ctx.act_cct_declarado else Severidade.ALERTA
                out.append(Achado(CLT_VIAVEL_SOMENTE_COM_ACT, sev,
                                  "Esta escala só é viável com acordo ou convenção coletiva "
                                  "(jornada diária)", {**det, "origem": CLT_JORNADA_DIARIA}))
            if jmax > JORNADA_ERRO_MIN or not regime.compensacao_act:
                sev = Severidade.ERRO if jmax > JORNADA_ERRO_MIN else Severidade.ALERTA
                out.append(Achado(CLT_JORNADA_DIARIA, sev,
                                  f"jornada {_h(jmax)} h > {_h(regime.jornada_diaria_max_min)} h",
                                  det))
    if ctx.carga_contratual_min is not None and media > ctx.carga_contratual_min:
        out.append(Achado(CLT_MEDIA_SEMANAL, Severidade.ALERTA,
                          f"média {_h(media)} h > carga contratual "
                          f"{_h(ctx.carga_contratual_min)} h",
                          {**base_ctx, **medias,
                           "excesso_h": _h(media - ctx.carga_contratual_min)}))
    folgas = perfil.folgas_7d(regime.criterio_folgas)
    if folgas <= 1 and not regime.permite_6x1:
        out.append(Achado(CLT_ESCALA_6X1_VEDADA, Severidade.ERRO,
                          "escala com ≤ 1 folga a cada 7 dias vedada no regime",
                          {**base_ctx, "folgas_7d": str(para_decimal(folgas))}))
    elif folgas < regime.folgas_semanais_min:
        out.append(Achado(CLT_FOLGAS_SEMANAIS_INSUFICIENTES, Severidade.ERRO,
                          f"folgas/7 d = {para_decimal(folgas, 2)} < "
                          f"{para_decimal(regime.folgas_semanais_min, 2)}",
                          {**base_ctx, "folgas_7d": str(para_decimal(folgas))}))
    return out


def validar_modelo(modelo: ModeloEscala, turnos: Mapping[str, Turno], regime: RegimeLegal,
                   ctx: ContextoRegime | None = None, duracao_min: int | None = None
                   ) -> list[Achado]:
    """Regime + regras CLT da sequência (interjornada, DSR, 7º dia) por grupo, sem repetir."""
    dur = duracao_min if duracao_min is not None else modelo.duracoes_min[0]
    tdur = turnos_com_duracao(turnos, dur)
    out: list[Achado] = []
    vistos: set[str] = set()
    for perfil in perfis_do_modelo(modelo, turnos, dur):
        brutos = validar_regime(perfil, regime, ctx)
        if all(e in tdur or e in (FOLGA, RESERVA) for e in perfil.sequencia):
            brutos += [a for a in validar_sequencia(perfil.sequencia, tdur)
                       if a.codigo != CLT_JORNADA_DIARIA]
        for a in brutos:
            if a.codigo not in vistos:
                vistos.add(a.codigo)
                out.append(a)
    return out


# ------------------------------------------------------------- selo (FR-42) --------
class Selo(StrEnum):
    CONFORME = "conforme"
    SO_COM_ACT = "so_com_act"
    REGIME_ESPECIAL = "regime_especial"
    NAO_CONFORME = "nao_conforme"


_ERROS_NAO_COMPENSAVEIS = {CLT_CARGA_SEMANAL_EXCEDIDA, CLT_FOLGAS_SEMANAIS_INSUFICIENTES,
                           CLT_ESCALA_6X1_VEDADA, "CLT_INTERJORNADA", "CLT_DSR_35H",
                           "CLT_SETIMO_DIA"}


def selo(achados: Sequence[Achado]) -> Selo:
    """``CLT_JORNADA_DIARIA`` ERRO (> 10 h) é override de CCT (Q13) ⇒ "só com ACT/CCT"."""
    codigos = {a.codigo for a in achados if a.severidade != Severidade.INFO
               or a.codigo == CLT_VIAVEL_SOMENTE_COM_ACT}
    if codigos & _ERROS_NAO_COMPENSAVEIS:
        return Selo.NAO_CONFORME
    if codigos & {CLT_VIAVEL_SOMENTE_COM_ACT, CLT_JORNADA_DIARIA}:
        return Selo.SO_COM_ACT
    if CLT_REGIME_PENDENTE_REGULAMENTACAO in codigos:
        return Selo.REGIME_ESPECIAL
    return Selo.CONFORME


def regime_compliance(modelo: ModeloEscala, catalogo: Catalogo, regimes: Regimes,
                      duracao_min: int | None = None) -> dict[str, Selo]:
    """Selo de conformidade **do regime** (tabela do PRD §6.2) por regime da linha do tempo.

    Usa só ``validar_regime`` (carga, jornada, folgas, 6x1, especiais); as regras de
    sequência (interjornada/DSR/7º dia) aparecem em ``validar_modelo``.
    """
    out = {}
    for c in regimes.linha_do_tempo:
        achados: list[Achado] = []
        for perfil in perfis_do_modelo(modelo, catalogo.turnos, duracao_min):
            achados += validar_regime(perfil, regimes[c])
        out[c] = selo(achados)
    return out


# ------------------------------------------------------------- dimensionamento -----
def k_legal_bruto(regime: RegimeLegal, horas_posto_semana: int = HORAS_POSTO_SEMANA) -> Fraction:
    return Fraction(horas_posto_semana * 60, regime.carga_semanal_max_min)


def k_legal(regime: RegimeLegal, meias: bool = False,
            horas_posto_semana: int = HORAS_POSTO_SEMANA) -> Fraction:
    """FR-41: 168/40 = 4,2 → 5 (ou 4,5 com meias-turmas)."""
    passo = Fraction(1, 2) if meias else Fraction(1)
    return ceil(k_legal_bruto(regime, horas_posto_semana) / passo) * passo


def k_efetivo(modelo: ModeloEscala, regime: RegimeLegal, meias: bool = False) -> Fraction:
    k = modelo.k_estrela
    if k is None:
        raise ValueError(f"{modelo.codigo}: modelo não contínuo")
    return max(k, k_legal(regime, meias))


@dataclass(frozen=True, slots=True)
class Opcao:
    modelo: str
    variante: str
    turmas: Fraction          # turmas-equivalentes (meias contam 1/2)
    pessoas: int
    horas_semanais: Fraction
    achados: tuple[Achado, ...]


@dataclass(frozen=True, slots=True)
class FaseTransicao:
    regime: str
    k_legal: Fraction
    k_legal_meias: Fraction
    limite_inferior_pessoas: int
    cenario: Opcao | None
    recomendado: Opcao | None
    opcoes: tuple[Opcao, ...]


_PADROES: dict[tuple[str, str, Variante], Padrao] = {}


def _avaliar(modelo: ModeloEscala, v: Variante, catalogo: Catalogo, regime: RegimeLegal,
             postos: int, ctx: ContextoRegime | None) -> Opcao | None:
    if v.meias and postos % 2:
        return None
    chave = (catalogo.versao, modelo.codigo, v)
    padrao = _PADROES.get(chave)
    if padrao is None:
        padrao = _PADROES[chave] = modelo.montar_padrao(v)
    res = calcular_cobertura(padrao, catalogo.turnos, postos_24x7(postos), postos,
                             date(2026, 1, 5))
    if res.kpis.deficit_hp > 0:
        return None
    turmas = sum((len(g.offsets) * g.fracao_posto for g in padrao.grupos), Fraction(0))
    achados = tuple(validar_modelo(modelo, catalogo.turnos, regime, ctx))
    return Opcao(modelo.codigo, v.nome, turmas, int(turmas * postos),
                 modelo.horas_semanais(), achados)


def simular_transicao(postos: int, catalogo: Catalogo, regimes: Regimes,
                      turnos_cenario: tuple[str, ...] = ("M", "T", "N"),
                      modelo_cenario: str | None = None,
                      ctx: ContextoRegime | None = None) -> list[FaseTransicao]:
    """FR-41: mesma operação (postos 24/7, mesmos turnos) em cada fase da linha do tempo.

    Recomendado = opção do catálogo essencial com os mesmos turnos, sem déficit e sem
    ``ERRO``, de menor headcount (empate: ordem do catálogo).
    """
    fases = []
    alvo = set(turnos_cenario)
    candidatos = [m for m in catalogo.modelos.values()
                  if m.continuo_24x7 and m.fase == "mvp"
                  and {e for s in m.sequencias for e in s} - {FOLGA} == alvo]
    for cod in regimes.linha_do_tempo:
        reg = regimes[cod]
        opcoes = [o for m in candidatos for v in m.variantes
                  if (o := _avaliar(m, v, catalogo, reg, postos, ctx)) is not None]
        viaveis = [o for o in opcoes
                   if not any(a.severidade == Severidade.ERRO for a in o.achados)]
        rec = min(viaveis, key=lambda o: o.pessoas) if viaveis else None
        cen = next((o for o in opcoes if o.modelo == modelo_cenario), None)
        fases.append(FaseTransicao(
            cod, k_legal(reg), k_legal(reg, meias=True),
            ceil(Fraction(postos * HORAS_POSTO_SEMANA * 60, reg.carga_semanal_max_min)),
            cen, rec, tuple(opcoes)))
    return fases
