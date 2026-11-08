"""M1 — Demanda: curva 168 h (FR-01) e postos fixos (FR-02).

Índice circular: ``idx = dia*24 + hora``, segunda 00h = 0 (dia 0 = segunda).
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

HORAS_SEMANA = 168


class ErroDemanda(ValueError):
    """Erro de validação da curva; ``linha`` aponta a linha do arquivo (1-based) quando houver."""

    def __init__(self, mensagem: str, linha: int | None = None) -> None:
        super().__init__(mensagem if linha is None else f"linha {linha}: {mensagem}")
        self.linha = linha


@dataclass(frozen=True, slots=True)
class CurvaDemanda:
    """Postos requeridos por hora da semana (168 valores) e horas com posto crítico."""

    valores: tuple[int, ...]
    criticas: frozenset[int] = frozenset()

    def __post_init__(self) -> None:
        if len(self.valores) != HORAS_SEMANA:
            raise ErroDemanda(f"curva deve ter {HORAS_SEMANA} valores, tem {len(self.valores)}")
        if any(v < 0 for v in self.valores):
            raise ErroDemanda("valores devem ser inteiros ≥ 0")

    @property
    def total_semanal(self) -> int:
        return sum(self.valores)

    def valor(self, dia: int, hora: int) -> int:
        return self.valores[indice(dia, hora)]


def indice(dia: int, hora: int) -> int:
    """Índice 0..167 para dia 0..6 (segunda=0) e hora 0..23."""
    if not (0 <= dia < 7 and 0 <= hora < 24):
        raise ErroDemanda(f"dia/hora inválidos: {dia}/{hora}")
    return dia * 24 + hora


@dataclass(frozen=True, slots=True)
class Faixa:
    """Faixa de postos fixos: dias (0..6), horas [hora_ini, hora_fim) — fim 24 = meia-noite."""

    dias: tuple[int, ...]
    hora_ini: int
    hora_fim: int
    postos: int
    critico: bool = False


def postos_fixos(faixas: Iterable[Faixa]) -> CurvaDemanda:
    """FR-02: gera a curva somando as faixas (faixas sobrepostas se somam)."""
    valores = [0] * HORAS_SEMANA
    criticas: set[int] = set()
    for f in faixas:
        if not 0 <= f.hora_ini < f.hora_fim <= 24 or f.postos < 0:
            raise ErroDemanda(f"faixa inválida: {f}")
        for d in f.dias:
            for h in range(f.hora_ini, f.hora_fim):
                i = indice(d, h)
                valores[i] += f.postos
                if f.critico:
                    criticas.add(i)
    return CurvaDemanda(tuple(valores), frozenset(criticas))


def postos_24x7(postos: int, critico: bool = False) -> CurvaDemanda:
    """Atalho FR-02: ``postos`` em todas as 168 horas."""
    return postos_fixos([Faixa(tuple(range(7)), 0, 24, postos, critico)])


def importar_csv(texto: str) -> CurvaDemanda:
    """FR-01: importa ``dia(1-7),hora(0-23),demanda`` (168 linhas; cabeçalho opcional).

    Tudo-ou-nada: qualquer linha faltante, duplicada, malformada ou negativa gera
    ``ErroDemanda`` indicando a linha.
    """
    valores: list[int | None] = [None] * HORAS_SEMANA
    for n, bruta in enumerate(texto.splitlines(), start=1):
        linha = bruta.strip()
        if not linha:
            continue
        partes = [p.strip() for p in linha.replace(";", ",").split(",")]
        if n == 1 and not partes[0].lstrip("-").isdigit():
            continue  # cabeçalho
        if len(partes) != 3:
            raise ErroDemanda("esperado dia,hora,demanda", n)
        try:
            dia, hora, dem = (int(p) for p in partes)
        except ValueError as exc:
            raise ErroDemanda("valor não inteiro", n) from exc
        if not (1 <= dia <= 7 and 0 <= hora <= 23):
            raise ErroDemanda("dia deve ser 1–7 e hora 0–23", n)
        if dem < 0:
            raise ErroDemanda("demanda negativa", n)
        i = indice(dia - 1, hora)
        if valores[i] is not None:
            raise ErroDemanda(f"linha duplicada para dia {dia} hora {hora}", n)
        valores[i] = dem
    faltantes = [i for i, v in enumerate(valores) if v is None]
    if faltantes:
        d, h = divmod(faltantes[0], 24)
        raise ErroDemanda(f"faltam {len(faltantes)} linhas (primeira: dia {d + 1} hora {h})")
    return CurvaDemanda(tuple(v for v in valores if v is not None))
