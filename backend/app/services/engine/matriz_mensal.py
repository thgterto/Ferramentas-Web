"""v3.6 — Matriz mensal pessoa × dia (quem está em cada turno e quem folga, dia a dia).

Função pura sobre a escala turma × dia já gerada pelo motor (``gerar_escala`` /
``personalizado.gerar``): expande turmas em pessoas (cadastradas ou fictícias ``A-01``…),
conta pessoas por turno/dia contra o necessário, mede a cobertura hora a hora do mês
(incluindo a noite que vem do dia anterior) e totaliza por pessoa (dias, folgas, horas,
domingos de folga, noites). Feriados nacionais BR (fixos + móveis) só destacam o calendário.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from fractions import Fraction
from math import ceil

from app.services.engine.types import FOLGA, MINUTOS_DIA, RESERVA, Turno

NOITE_INI = 22 * 60
NOITE_FIM = 29 * 60          # 05:00 do dia seguinte
NOITE_MIN_MINUTOS = 120      # turno "noturno" = ≥ 2 h dentro de 22:00–05:00


def pascoa(ano: int) -> date:
    """Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher)."""
    a, b, c = ano % 19, ano // 100, ano % 100
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l_ = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l_) // 451
    mes, dia = divmod(h + l_ - 7 * m + 114, 31)
    return date(ano, mes, dia + 1)


def feriados_br(ano: int) -> dict[date, str]:
    """Feriados nacionais (Lei 662/1949, 6.802/1980, 14.759/2023) + pontos móveis usuais."""
    p = pascoa(ano)
    fixos = {(1, 1): "Confraternização Universal", (4, 21): "Tiradentes",
             (5, 1): "Dia do Trabalho", (9, 7): "Independência", (10, 12): "N. Sra. Aparecida",
             (11, 2): "Finados", (11, 15): "Proclamação da República",
             (11, 20): "Consciência Negra", (12, 25): "Natal"}
    out = {date(ano, m, d): n for (m, d), n in fixos.items()}
    out[p - timedelta(days=47)] = "Carnaval"
    out[p - timedelta(days=2)] = "Sexta-feira Santa"
    out[p + timedelta(days=60)] = "Corpus Christi"
    return out


def e_noturno(t: Turno) -> bool:
    """≥ 2 h do turno dentro de 22:00–05:00 (CLT art. 73)."""
    minutos = 0
    for a, b in t.segmentos:
        for base in (0, -MINUTOS_DIA):
            minutos += max(0, min(b, NOITE_FIM + base) - max(a, NOITE_INI + base))
    return minutos >= NOITE_MIN_MINUTOS


@dataclass(frozen=True, slots=True)
class Pessoa:
    id: str
    nome: str
    turma: str
    cargo: str | None


def pessoas_das_turmas(turmas: Sequence[tuple[str, int, Mapping[str, int]]]
                       ) -> list[Pessoa]:
    """Pessoas fictícias por turma (``A-01``, ``A-02``…) com o cargo da composição, em ordem."""
    out: list[Pessoa] = []
    for nome, tamanho, comp in turmas:
        cargos = [c for c, n in comp.items() for _ in range(n)]
        for i in range(max(1, tamanho, len(cargos))):
            pid = f"{nome}-{i + 1:02d}"
            out.append(Pessoa(pid, pid, nome, cargos[i] if i < len(cargos) else None))
    return out


@dataclass(frozen=True, slots=True)
class TotaisPessoa:
    dias_trabalhados: int
    folgas: int
    minutos: int
    domingos_folga: int
    noites: int

    @property
    def horas(self) -> Fraction:
        return Fraction(self.minutos, 60)


def totais(estados: Sequence[str], dias: Sequence[date], turnos: Mapping[str, Turno]
           ) -> TotaisPessoa:
    trab = [e for e in estados if e in turnos]
    return TotaisPessoa(
        dias_trabalhados=len(trab),
        folgas=sum(1 for e in estados if e not in turnos),
        minutos=sum(turnos[e].minutos_trabalhados for e in trab),
        domingos_folga=sum(1 for e, d in zip(estados, dias, strict=True)
                           if d.weekday() == 6 and e not in turnos),
        noites=sum(1 for e in trab if e_noturno(turnos[e])))


def continuacao(anterior: str, turnos: Mapping[str, Turno]) -> str | None:
    """Turno do dia anterior que entra pela 00:00 deste dia (``← N 22–06``)."""
    t = turnos.get(anterior)
    if t is None or anterior in (FOLGA, RESERVA):
        return None
    return anterior if max(b for _, b in t.segmentos) > MINUTOS_DIA else None


@dataclass(frozen=True, slots=True)
class ResumoDia:
    data: date
    por_turno: dict[str, int]            # pessoas que INICIAM o turno no dia
    necessario_por_turno: dict[str, int]
    folgas: int
    turnos_em_deficit: tuple[str, ...]
    horas_deficit: int
    horas_passagem: int
    necessario_pico: int


def resumo_dias(
    linhas: Sequence[Sequence[str]],      # por pessoa, começando no DIA ANTERIOR ao mês
    dias: Sequence[date],
    turnos: Mapping[str, Turno],
    demanda: Callable[[date, int], int],
) -> list[ResumoDia]:
    """Contagem por turno/dia, folgas e cobertura hora a hora (com a noite anterior)."""
    n = len(dias)
    cob = [[0] * 24 for _ in range(n)]
    plan = [[0] * 24 for _ in range(n)]
    for linha in linhas:
        for j, e in enumerate(linha):
            t = turnos.get(e)
            if t is None:
                continue
            base = (j - 1) * MINUTOS_DIA
            for a, b in t.segmentos:
                for h in range(max(0, (base + a) // 60), min(n * 24, ceil((base + b) / 60))):
                    cob[h // 24][h % 24] += 1
            for a, b in t.janelas_sobreposicao:
                for h in range(max(0, (base + a) // 60), min(n * 24, ceil((base + b) / 60))):
                    plan[h // 24][h % 24] += 1
    usados = [c for c in turnos if any(c in linha for linha in linhas)]
    out: list[ResumoDia] = []
    for j, d in enumerate(dias):
        por = {c: sum(1 for linha in linhas if linha[j + 1] == c) for c in usados}
        nec: dict[str, int] = {}
        for c in usados:
            t = turnos[c]
            if t.reforco:
                continue
            meio = t.inicio_min + t.duracao_min // 2
            dia_meio = d + timedelta(days=meio // MINUTOS_DIA)
            nec[c] = demanda(dia_meio, (meio % MINUTOS_DIA) // 60)
        req = [demanda(d, h) for h in range(24)]
        out.append(ResumoDia(
            data=d, por_turno=por, necessario_por_turno=nec,
            folgas=sum(1 for linha in linhas if linha[j + 1] not in turnos),
            turnos_em_deficit=tuple(c for c in nec if por.get(c, 0) < nec[c]),
            horas_deficit=sum(1 for h in range(24) if cob[j][h] < req[h]),
            horas_passagem=sum(1 for h in range(24)
                               if cob[j][h] > req[h] and plan[j][h]
                               and cob[j][h] - req[h] <= plan[j][h]),
            necessario_pico=max(req)))
    return out
