"""Regras CLT do MVP (FR-15, FR-16, FR-20) — códigos do Apêndice A do PRD.

* ``CLT_INTERJORNADA`` (ERRO, art. 66): ``ini[k+1] − fim[k] < 11 h`` (timestamps absolutos).
* ``CLT_SETIMO_DIA`` (ERRO, OJ 410): mais de 6 dias-calendário consecutivos com jornada.
* ``CLT_DSR_35H`` (ERRO, art. 67 + 66, Súmula 110): entre dois repousos de ≥ 35 h
  consecutivas não pode haver mais de 6 jornadas. Critério por contagem de jornadas, e
  não por janela fixa de 168 h: a janela fixa reprovaria a 6x1 e a 6x2 legais (o repouso
  semanal fica partido entre as bordas da janela) — ver nota no resumo.
* ``CLT_JORNADA_DIARIA`` (ALERTA; ERRO se > 10 h fora de 12x36): jornada **computada**
  (8/7 + Súmula 60) > limite (padrão 8 h, vindo do regime). 12x36 = regime especial (FR-19,
  Fase 2), não verificado aqui.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from fractions import Fraction
from itertools import pairwise

from escalas.services.engine.compliance.jornadas import Jornada, jornadas_da_sequencia
from escalas.services.engine.noturno import jornada_computada_min
from escalas.services.engine.types import Achado, Severidade, Turno, para_decimal

CLT_INTERJORNADA = "CLT_INTERJORNADA"
CLT_DSR_35H = "CLT_DSR_35H"
CLT_SETIMO_DIA = "CLT_SETIMO_DIA"
CLT_JORNADA_DIARIA = "CLT_JORNADA_DIARIA"

INTERJORNADA_MIN = 11 * 60
DSR_MIN = 35 * 60
MAX_DIAS_CONSECUTIVOS = 6
JORNADA_ERRO_MIN = 10 * 60


def _h(minutos: Fraction | int) -> str:
    return str(para_decimal(Fraction(minutos) / 60))


def validar_interjornada(jornadas: Sequence[Jornada]) -> list[Achado]:
    out = []
    for a, b in pairwise(jornadas):
        descanso = b.ini - a.fim
        if descanso < INTERJORNADA_MIN:
            out.append(Achado(CLT_INTERJORNADA, Severidade.ERRO,
                              f"descanso de {_h(descanso)} h entre {a.turno} (dia {a.dia}) "
                              f"e {b.turno} (dia {b.dia}) < 11 h",
                              {"descanso_h": _h(descanso), "dia": str(b.dia)}))
    return out


def validar_setimo_dia(jornadas: Sequence[Jornada]) -> list[Achado]:
    out = []
    dias = sorted({j.dia for j in jornadas})
    run = 1
    for a, b in pairwise(dias):
        run = run + 1 if b == a + 1 else 1
        if run == MAX_DIAS_CONSECUTIVOS + 1:
            out.append(Achado(CLT_SETIMO_DIA, Severidade.ERRO,
                              f"7º dia consecutivo de trabalho no dia {b}", {"dia": str(b)}))
    return out


def validar_dsr_35h(jornadas: Sequence[Jornada]) -> list[Achado]:
    out = []
    cont = 1
    for a, b in pairwise(jornadas):
        if b.ini - a.fim >= DSR_MIN:
            cont = 1
            continue
        cont += 1
        if cont == MAX_DIAS_CONSECUTIVOS + 1:
            out.append(Achado(CLT_DSR_35H, Severidade.ERRO,
                              f"sem repouso de 35 h nas 7 jornadas até o dia {b.dia}",
                              {"dia": str(b.dia)}))
    return out


def validar_jornada_diaria(jornadas: Sequence[Jornada], limite_min: int = 480,
                           sumula60: bool = True, regime_12x36: bool = False) -> list[Achado]:
    if regime_12x36:
        return []
    out = []
    vistos: set[str] = set()
    for j in jornadas:
        comp = jornada_computada_min(j.ini, j.fim, sumula60)
        if comp > limite_min and j.turno not in vistos:
            vistos.add(j.turno)
            sev = Severidade.ERRO if comp > JORNADA_ERRO_MIN else Severidade.ALERTA
            out.append(Achado(CLT_JORNADA_DIARIA, sev,
                              f"turno {j.turno}: jornada computada {_h(comp)} h > "
                              f"{_h(limite_min)} h",
                              {"turno": j.turno, "jornada_computada_h": _h(comp),
                               "jornada_relogio_h": _h(j.fim - j.ini),
                               "limite_h": _h(limite_min)}))
    return out


def validar_sequencia(sequencia: tuple[str, ...], turnos: Mapping[str, Turno],
                      limite_jornada_min: int = 480, sumula60: bool = True,
                      regime_12x36: bool = False) -> list[Achado]:
    """Valida a sequência cíclica (desenrolada por ≥ 3 ciclos) e deduplica por posição."""
    L = len(sequencia)
    reps = max(3, -(-21 // L))
    jornadas = jornadas_da_sequencia(sequencia, turnos, L * reps)
    brutos = (validar_interjornada(jornadas) + validar_setimo_dia(jornadas)
              + validar_dsr_35h(jornadas))
    out: list[Achado] = []
    vistos: set[tuple[str, int]] = set()
    for a in brutos:
        chave = (a.codigo, int(a.contexto["dia"]) % L)
        if chave not in vistos:
            vistos.add(chave)
            out.append(Achado(a.codigo, a.severidade, a.mensagem,
                              {**a.contexto, "dia_ciclo": str(chave[1])}))
    out += validar_jornada_diaria(jornadas, limite_jornada_min, sumula60, regime_12x36)
    return out
