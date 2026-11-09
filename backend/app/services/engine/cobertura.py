"""M3 — Cobertura hora a hora, agregação 7×24 e KPIs (FR-09, FR-11, FR-14).

Horizonte em horas absolutas desde ``data_inicio`` 00:00; a hora ``h`` cai no dia da semana
``(data_inicio + h//24).weekday()`` (segunda = 0, mesmo índice da curva 168 h). Turnos que
cruzam a meia-noite contam no índice absoluto; o dia anterior ao horizonte é gerado para
que o turno noturno que entra pela 00:00 do primeiro dia seja contado (sem ``mod``).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from enum import StrEnum
from fractions import Fraction
from math import ceil

from app.services.engine.demanda import CurvaDemanda
from app.services.engine.gerador import gerar_escala
from app.services.engine.shrinkage import Shrinkage
from app.services.engine.types import FOLGA, RESERVA, Achado, Padrao, Severidade, Turno

COB_DEFICIT = "COB_DEFICIT"
COB_DEFICIT_POSTO_CRITICO = "COB_DEFICIT_POSTO_CRITICO"
COB_EXCESSO = "COB_EXCESSO"
COB_DEFICIT_ESPERADO_SHRINKAGE = "COB_DEFICIT_ESPERADO_SHRINKAGE"


class Status(StrEnum):
    """Estado da célula (FR-09): déficit / exato / excesso."""

    DEFICIT = "deficit"
    EXATO = "exato"
    EXCESSO = "excesso"


def status_de(gap: Fraction) -> Status:
    if gap < 0:
        return Status.DEFICIT
    return Status.EXCESSO if gap > 0 else Status.EXATO


def ocupacao_horaria(
    padrao: Padrao, turnos: Mapping[str, Turno], data_ancora: date, dias: int,
    data_inicio: date | None = None,
) -> list[list[tuple[int, str]]]:
    """Por hora do horizonte, lista de ``(índice da turma, turno)`` em turno ativo.

    Granularidade horária: o turno ocupa as horas ``[ini//60, ceil(fim/60))``.
    """
    inicio = data_inicio or data_ancora
    esc = gerar_escala(padrao, data_ancora, dias + 1, inicio - timedelta(days=1))
    total = dias * 24
    ocup: list[list[tuple[int, str]]] = [[] for _ in range(total)]
    for k, linha in enumerate(esc.estados):
        for j, e in enumerate(linha):
            if e in (FOLGA, RESERVA):
                continue
            t = turnos[e]
            base = (j - 1) * 1440
            h_ini = (base + t.inicio_min) // 60
            h_fim = ceil((base + t.fim_min) / 60)
            for h in range(max(0, h_ini), min(total, h_fim)):
                ocup[h].append((k, e))
    return ocup


@dataclass(frozen=True, slots=True)
class Pico:
    valor: Fraction
    data: date
    hora: int


@dataclass(frozen=True, slots=True)
class KPIs:
    """KPIs de cobertura (PRD §3.2) — todos derivados das células do horizonte."""

    horas_posto_requeridas: Fraction
    horas_posto_cobertas: Fraction
    pct_horas_posto_cobertas: Fraction
    deficit_hp: Fraction
    deficit_hp_semana: Fraction
    excesso_hp: Fraction
    pct_excesso: Fraction
    horas_com_deficit: int
    pico: Pico | None


@dataclass(frozen=True, slots=True)
class ResultadoCobertura:
    data_inicio: date
    demanda: tuple[int, ...]
    cobertura: tuple[Fraction, ...]
    kpis: KPIs
    heat_pior: tuple[tuple[Fraction, ...], ...]     # 7×24 (segunda = 0): menor gap
    heat_media: tuple[tuple[Fraction, ...], ...]    # 7×24: gap médio
    achados: tuple[Achado, ...]

    @property
    def gap(self) -> tuple[Fraction, ...]:
        return tuple(c - d for c, d in zip(self.cobertura, self.demanda, strict=True))

    @property
    def status_pior(self) -> tuple[tuple[Status, ...], ...]:
        return tuple(tuple(status_de(g) for g in linha) for linha in self.heat_pior)

    @property
    def status_media(self) -> tuple[tuple[Status, ...], ...]:
        return tuple(tuple(status_de(g) for g in linha) for linha in self.heat_media)


def _dow(data_inicio: date, h: int) -> int:
    return (data_inicio + timedelta(days=h // 24)).weekday()


def calcular_kpis(data_inicio: date, req: Sequence[int | Fraction],
                  cob: Sequence[Fraction]) -> KPIs:
    total = sum((Fraction(r) for r in req), Fraction(0))
    cobertas = sum((min(c, Fraction(r)) for c, r in zip(cob, req, strict=True)), Fraction(0))
    deficits = [max(Fraction(0), Fraction(r) - c) for c, r in zip(cob, req, strict=True)]
    excesso = sum((max(Fraction(0), c - r) for c, r in zip(cob, req, strict=True)), Fraction(0))
    deficit = sum(deficits, Fraction(0))
    pico = None
    if deficit > 0:
        h = max(range(len(deficits)), key=lambda i: (deficits[i], -i))
        pico = Pico(deficits[h], data_inicio + timedelta(days=h // 24), h % 24)
    dias = Fraction(len(req), 24)
    return KPIs(
        horas_posto_requeridas=total,
        horas_posto_cobertas=cobertas,
        pct_horas_posto_cobertas=cobertas / total if total else Fraction(1),
        deficit_hp=deficit,
        deficit_hp_semana=deficit * 7 / dias if dias else Fraction(0),
        excesso_hp=excesso,
        pct_excesso=excesso / total if total else Fraction(0),
        horas_com_deficit=sum(1 for d in deficits if d > 0),
        pico=pico,
    )


def agregar_7x24(
    data_inicio: date, gap: Sequence[Fraction]
) -> tuple[tuple[tuple[Fraction, ...], ...], tuple[tuple[Fraction, ...], ...]]:
    """Agregação 7×24 do gap: pior caso (mín.) e média por hora da semana."""
    celulas: list[list[list[Fraction]]] = [[[] for _ in range(24)] for _ in range(7)]
    for h, g in enumerate(gap):
        celulas[_dow(data_inicio, h)][h % 24].append(g)
    pior = tuple(tuple(min(c) if c else Fraction(0) for c in d) for d in celulas)
    media = tuple(tuple(sum(c, Fraction(0)) / len(c) if c else Fraction(0) for c in d)
                  for d in celulas)
    return pior, media


def calcular_cobertura(
    padrao: Padrao,
    turnos: Mapping[str, Turno],
    curva: CurvaDemanda,
    postos: int,
    data_ancora: date,
    dias: int | None = None,
    data_inicio: date | None = None,
) -> ResultadoCobertura:
    """Cobertura do horizonte (padrão: ciclo calendário ``mmc(L,7)``).

    Cada turma tem ``postos × fração_posto`` pessoas (meias-turmas = metade).
    """
    dias = dias or padrao.ciclo_calendario
    inicio = data_inicio or data_ancora
    fracoes = [g.fracao_posto for g in padrao.grupos for _ in g.offsets]
    ocup = ocupacao_horaria(padrao, turnos, data_ancora, dias, inicio)
    cob = tuple(sum((postos * fracoes[k] for k, _ in o), Fraction(0)) for o in ocup)
    req = tuple(curva.valores[_dow(inicio, h) * 24 + h % 24] for h in range(dias * 24))
    gap = [c - r for c, r in zip(cob, req, strict=True)]
    kpis = calcular_kpis(inicio, req, cob)
    pior, media = agregar_7x24(inicio, gap)
    achados: list[Achado] = []
    if kpis.deficit_hp > 0:
        achados.append(Achado(COB_DEFICIT, Severidade.ALERTA,
                              f"{kpis.horas_com_deficit} h com déficit; "
                              f"{float(kpis.deficit_hp_semana):.2f} horas-posto/semana",
                              {"deficit_hp": str(kpis.deficit_hp),
                               "deficit_hp_semana": str(kpis.deficit_hp_semana)}))
        criticas = [h for h in range(len(req))
                    if gap[h] < 0 and _dow(inicio, h) * 24 + h % 24 in curva.criticas]
        if criticas:
            achados.append(Achado(COB_DEFICIT_POSTO_CRITICO, Severidade.ERRO,
                                  f"{len(criticas)} h de déficit em posto crítico",
                                  {"horas": str(len(criticas))}))
    if kpis.excesso_hp > 0:
        achados.append(Achado(COB_EXCESSO, Severidade.INFO,
                              f"excesso de {float(kpis.pct_excesso):.1%} das horas-posto",
                              {"excesso_hp": str(kpis.excesso_hp)}))
    return ResultadoCobertura(inicio, req, cob, kpis, pior, media, tuple(achados))


@dataclass(frozen=True, slots=True)
class VisaoReserva:
    """FR-11 — visão "postos + reserva": cobertura esperada ``cob × (1 − S_h)``."""

    cobertura_esperada: tuple[Fraction, ...]
    deficit_esperado: tuple[Fraction, ...]
    deficit_esperado_hp: Fraction
    pessoas_extras_por_turma: int
    achados: tuple[Achado, ...]


def visao_reserva(res: ResultadoCobertura, shr: Shrinkage, postos: int) -> VisaoReserva:
    esperada = tuple(c * (1 - shr.na_hora(h % 24)) for h, c in enumerate(res.cobertura))
    deficit = tuple(max(Fraction(0), r - c)
                    for c, r in zip(esperada, res.demanda, strict=True))
    total = sum(deficit, Fraction(0))
    s_max = max(shr.diurno, shr.noturno)
    extras = ceil(Fraction(postos) / (1 - s_max)) - postos
    achados: tuple[Achado, ...] = ()
    if total > 0:
        achados = (Achado(COB_DEFICIT_ESPERADO_SHRINKAGE, Severidade.ALERTA,
                          f"déficit esperado de {float(max(deficit)):.2f} posto no pior horário; "
                          f"sugestão: +{extras} pessoa(s) por turma ou folguistas",
                          {"deficit_esperado_hp": str(total),
                           "pico": str(max(deficit)), "extras_por_turma": str(extras)}),)
    return VisaoReserva(esperada, deficit, total, extras, achados)
