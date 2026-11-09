"""M2b — Catálogo essencial de modelos de escala como dados (FR-28, ADR-010).

Os modelos vêm de ``seeds/catalogo_mvp.yaml``; este módulo só interpreta os dados
(expansão de ``X``, K*, h/sem, exatidão por enumeração dos offsets ``i·L/K``). O carregamento
do arquivo é a única leitura (seed empacotada, sem banco/rede); ``carregar_catalogo``
também aceita o dicionário já carregado.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from fractions import Fraction
from functools import cache
from importlib.resources import files
from math import ceil, lcm
from typing import Any, cast

import yaml

from app.services.engine.gerador import cobre_exatamente, montar_grupo, offsets_uniformes
from app.services.engine.types import FOLGA, RESERVA, GrupoTurmas, Padrao, Turno

GENERICO = "X"


def _hhmm(texto: str) -> int:
    h, m = texto.split(":")
    return int(h) * 60 + int(m)


@dataclass(frozen=True, slots=True)
class Variante:
    nome: str
    turmas: int | None = None
    meias: bool = False


@dataclass(frozen=True, slots=True)
class ModeloEscala:
    """Uma linha do catálogo (equivale a ``schedule_models`` + ``rotation_patterns``)."""

    codigo: str
    nome: str
    sequencias: tuple[tuple[str, ...], ...]   # sequência expandida de cada grupo
    duracoes_min: tuple[int, ...]
    continuo_24x7: bool
    variantes: tuple[Variante, ...] = ()
    k_nao_continuo: int | None = None
    modelo_base: str | None = None
    esperado: Mapping[str, Any] | None = None
    regime_compliance: Mapping[str, Mapping[str, str]] | None = None  # FR-42 (seed)
    grupo: str = "continuo"            # continuo | nao_continuo | complementar | variacao
    fase: str = "mvp"                  # mvp | fase2 (catálogo completo v3.5)
    semanal: bool = False              # sequência alinhada à segunda-feira
    k_estrela_dado: Fraction | None = None   # override (ex.: 18x36, cobertura por hora)
    exato_dado: bool | None = None
    offsets_dados: tuple[int, ...] | None = None
    turmas_grupos: tuple[int, ...] | None = None   # v3.6: turmas por grupo (núcleo + pico)
    motor: str = "ciclico"             # ciclico | generico (camadas com alinhamento semanal)
    sobreposicao: bool = False         # v3.6: versão com passagem/reforço planejado

    def distribuir_k(self, total: int) -> tuple[int, ...]:
        """K total → turmas por grupo (``turmas_grupos`` como base; resto aos primeiros)."""
        n = len(self.sequencias)
        if self.turmas_grupos and total >= sum(self.turmas_grupos):
            extra = total - sum(self.turmas_grupos)
            return tuple(b + (1 if i < extra % n else 0) + extra // n
                         for i, b in enumerate(self.turmas_grupos))
        if total < n:
            raise ValueError(f"{self.codigo}: K={total} menor que o nº de grupos ({n})")
        base, resto = divmod(total, n)
        return tuple(base + (1 if i < resto else 0) for i in range(n))

    # ---- métricas analíticas -------------------------------------------------
    def _grupos_canonicos(self, meias: bool = False) -> tuple[GrupoTurmas, ...]:
        """Grupos com offsets uniformes ``i·L/K`` (ou ``i·L/2K`` para meias)."""
        grupos = []
        for seq in self.sequencias:
            k = _k_estrela_seq(seq) * (2 if meias else 1)
            if k.denominator != 1:
                raise ValueError("K não inteiro")
            offs = offsets_uniformes(len(seq), int(k))
            if offs is None:
                raise ValueError("L/K não inteiro")
            grupos.append(GrupoTurmas(seq, offs, Fraction(1, 2) if meias else Fraction(1)))
        return tuple(grupos)

    @property
    def k_estrela(self) -> Fraction | None:
        """K* = Σ s·L/w por grupo; ``None`` para modelo não contínuo."""
        if not self.continuo_24x7:
            return None
        if self.k_estrela_dado is not None:
            return self.k_estrela_dado
        return sum((_k_estrela_seq(s) for s in self.sequencias), Fraction(0))

    @property
    def ciclo(self) -> int:
        return len(self.sequencias[0])

    @property
    def ciclo_calendario(self) -> int:
        return lcm(7, *(len(s) for s in self.sequencias))

    def horas_semanais(self, duracao_min: int | None = None) -> Fraction:
        """h/sem média = w × h × 7 / L (por turma)."""
        seq = self.sequencias[0]
        w = sum(1 for e in seq if e not in (FOLGA, RESERVA))
        dur = self.duracoes_min[0] if duracao_min is None else duracao_min
        return Fraction(w * dur * 7, len(seq) * 60)

    @property
    def folgas_7d(self) -> Fraction:
        seq = self.sequencias[0]
        return Fraction(sum(1 for e in seq if e == FOLGA) * 7, len(seq))

    def _exato(self, meias: bool) -> bool | None:
        if not self.continuo_24x7:
            return None
        if self.exato_dado is not None:
            return self.exato_dado and not meias
        try:
            grupos = self._grupos_canonicos(meias)
        except ValueError:
            return False
        return all(cobre_exatamente(g, self.ciclo_calendario) for g in grupos)

    @property
    def exato(self) -> bool | None:
        """Cobertura 24/7 exata com turmas inteiras de mesmo tamanho."""
        return self._exato(meias=False)

    @property
    def exato_meias(self) -> bool | None:
        """Cobertura exata com meias-turmas (exige postos pares)."""
        return self._exato(meias=True)

    @property
    def turmas_inteiras(self) -> int | None:
        k = self.k_estrela
        return None if k is None else ceil(k)

    @property
    def excesso(self) -> Fraction | None:
        """Excedente de cobertura com ``ceil(K*)`` turmas inteiras: ceil(K*)/K* − 1."""
        k = self.k_estrela
        return None if k is None else Fraction(ceil(k)) / k - 1

    # ---- materialização --------------------------------------------------------
    def montar_padrao(self, variante: Variante | None = None) -> Padrao:
        """Materializa o padrão (grupos + offsets) para a variante (padrão: a primeira)."""
        if not self.continuo_24x7:
            raise ValueError(f"{self.codigo}: modelo não contínuo — gerador 24/7 não se aplica")
        v = variante or (self.variantes[0] if self.variantes else Variante("K*"))
        if self.offsets_dados is not None and not v.meias:
            return Padrao(self.codigo, (GrupoTurmas(self.sequencias[0], self.offsets_dados),))
        n_grupos = len(self.sequencias)
        grupos: list[GrupoTurmas] = []
        for seq in self.sequencias:
            k = _k_estrela_seq(seq)
            if v.meias:
                n = k * 2
                if n.denominator != 1:
                    raise ValueError(f"{self.codigo}: 2·K* não inteiro — meias não fecham")
                grupos.append(montar_grupo(seq, int(n), Fraction(1, 2)))
            else:
                total = v.turmas if v.turmas is not None else ceil(self.k_estrela or 0)
                if self.turmas_grupos:
                    grupos.append(montar_grupo(seq, self.distribuir_k(total)[len(grupos)]))
                    continue
                if total % n_grupos:
                    raise ValueError(f"{self.codigo}: {total} turmas não divide {n_grupos} grupos")
                grupos.append(montar_grupo(seq, total // n_grupos))
        return Padrao(self.codigo, tuple(grupos))


def _k_estrela_seq(seq: tuple[str, ...]) -> Fraction:
    turnos = {e for e in seq if e not in (FOLGA, RESERVA)}
    w = sum(1 for e in seq if e not in (FOLGA, RESERVA))
    return Fraction(len(turnos) * len(seq), w)


def _expandir(seq: list[str], rotacao: str | None, turnos: list[str]) -> list[tuple[str, ...]]:
    if GENERICO not in seq:
        return [tuple(seq)]
    if not turnos:
        return [tuple(seq)]
    if rotacao == "fixa":
        return [tuple(t if e == GENERICO else e for e in seq) for t in turnos]
    if rotacao == "rotativa":
        return [tuple(t if e == GENERICO else e for t in turnos for e in seq)]
    raise ValueError(f"rotação inválida para sequência genérica: {rotacao!r}")


@dataclass(frozen=True, slots=True)
class Catalogo:
    versao: str
    turnos: Mapping[str, Turno]
    modelos: Mapping[str, ModeloEscala]

    def __getitem__(self, codigo: str) -> ModeloEscala:
        return self.modelos[codigo]

    @property
    def codigos(self) -> tuple[str, ...]:
        return tuple(self.modelos)


def carregar_catalogo(dados: Mapping[str, Any]) -> Catalogo:
    """Interpreta o dicionário do seed (estrutura de ``catalogo_mvp.yaml``)."""
    turnos = {
        c: Turno(c, _hhmm(str(t["inicio"])), int(t["duracao_min"]),
                 blocos=tuple((_hhmm(str(b[0])), int(b[1])) for b in t.get("blocos", ())),
                 passagem_min=int(t.get("passagem_min", 0)), reforco=bool(t.get("reforco")))
        for c, t in dados["turnos"].items()
    }
    brutos = {str(m["codigo"]): m for m in dados["modelos"]}
    modelos: dict[str, ModeloEscala] = {}
    for codigo, m in brutos.items():
        if "modelo_base" in m:
            base = brutos[str(m["modelo_base"])]
            seqs = _expandir(list(base["sequencia"]), base.get("rotacao"), [str(m["turno_fixo"])])
            fonte = base
        elif "grupos" in m:   # v3.6: grupos com sequências distintas (núcleo + pico)
            seqs = [tuple(str(e) for e in g) for g in m["grupos"]]
            fonte = m
        else:
            seqs = _expandir([str(e) for e in m["sequencia"]], m.get("rotacao"),
                             [str(t) for t in m.get("turnos", [])])
            fonte = m
        for seq in seqs:
            desconhecidos = {e for e in seq
                             if e not in turnos and e not in (FOLGA, RESERVA, GENERICO)}
            if desconhecidos:
                raise ValueError(f"{codigo}: turnos desconhecidos {sorted(desconhecidos)}")
        if "modelo_base" in m:
            variantes: tuple[Variante, ...] = (Variante("K*"),)
        else:
            variantes = tuple(
                Variante(str(v["nome"]), v.get("turmas"), bool(v.get("meias", False)))
                for v in m.get("variantes", [])
            )
        modelos[codigo] = ModeloEscala(
            codigo=codigo,
            nome=str(m["nome"]),
            sequencias=tuple(seqs),
            duracoes_min=tuple(int(d) for d in fonte["duracoes_min"]),
            continuo_24x7=bool(fonte["continuo_24x7"]),
            variantes=variantes,
            k_nao_continuo=fonte.get("k_nao_continuo"),
            modelo_base=m.get("modelo_base"),
            esperado=m.get("esperado"),
            regime_compliance=m.get("regime_compliance"),
            grupo=str(m.get("grupo") or fonte.get("grupo")
                      or ("continuo" if fonte["continuo_24x7"] else "nao_continuo")),
            fase=str(m.get("fase", "mvp")),
            semanal=bool(m.get("semanal", False)),
            k_estrela_dado=Fraction(str(m["k_estrela"])) if "k_estrela" in m else None,
            exato_dado=m.get("exato"),
            offsets_dados=tuple(m["offsets"]) if "offsets" in m else None,
            turmas_grupos=tuple(int(x) for x in m["turmas_grupos"]) if "turmas_grupos" in m
            else None,
            motor=str(m.get("motor", "ciclico")),
            sobreposicao=any(turnos[e].passagem_min or turnos[e].reforco
                             for sq in seqs for e in sq if e in turnos),
        )
    return Catalogo(str(dados["versao"]), turnos, modelos)


@cache
def catalogo_mvp() -> Catalogo:
    """Catálogo essencial empacotado (seed YAML)."""
    texto = files("app.services.engine").joinpath("seeds/catalogo_mvp.yaml").read_text("utf-8")
    return carregar_catalogo(cast(dict[str, Any], yaml.safe_load(texto)))
