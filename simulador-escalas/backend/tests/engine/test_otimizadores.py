"""v3.7 — otimizadores CP-SAT: casos pequenos com ótimo conhecido (golden)."""

from __future__ import annotations

import time
from datetime import date
from fractions import Fraction

import pytest

from escalas.services.engine import otimizadores as O
from escalas.services.engine import subsetores as S
from escalas.services.engine.catalogo import catalogo_mvp
from escalas.services.engine.gerador import gerar_escala
from escalas.services.engine.regime_legal import ContextoRegime, regimes_mvp
from escalas.services.engine.turmas_k import padrao_k_fixo

D0 = date(2027, 1, 4)
CAT = catalogo_mvp()


@pytest.mark.parametrize(("codigo", "meias", "esperado"), [
    ("6X2", False, 4), ("4X2", False, 5), ("4X2", True, 9), ("12X36", False, 4),
    ("2X2_12H", False, 4), ("5X2", False, 5),
])
def test_min_turmas_golden(codigo: str, meias: bool, esperado: int) -> None:
    r = O.min_turmas(CAT[codigo], CAT.turnos, [1] * 168, D0, 1, meias)
    assert r.status == "otimo" and r.gap == 0
    assert r.solucao["units"] == esperado
    assert r.metricas["coverage_pct"] == 1.0 and r.metricas["deficit_hours"] == 0


def test_min_turmas_tamanho_e_cobertura_parcial() -> None:
    r = O.min_turmas(CAT["6X2"], CAT.turnos, [3] * 168, D0, 3)
    assert r.solucao["units"] == 4 and r.solucao["headcount"] == 12
    # 75 % de cobertura: 3 turmas bastam (cada turma cobre 3/4 das horas)
    r = O.min_turmas(CAT["6X2"], CAT.turnos, [1] * 168, D0, 1, alvo=Fraction(3, 4))
    assert r.solucao["units"] == 3 and r.metricas["coverage_pct"] >= 0.75


def test_pool_com_picos_alternados_reduz_headcount() -> None:
    def curva(m: int, t: int) -> list[int]:
        return [m if 6 <= h % 24 < 14 else t if 14 <= h % 24 < 22 else 1 for h in range(168)]

    a, b = curva(2, 1), curva(1, 2)
    sep = sum(O.min_turmas(CAT["6X2"], CAT.turnos, x, D0, None).solucao["headcount"]
              for x in (a, b))
    pool = O.min_turmas(CAT["6X2"], CAT.turnos, [x + y for x, y in zip(a, b, strict=True)],
                        D0, None).solucao["headcount"]
    assert (sep, pool) == (16, 12)


def test_offsets_otimos_k_fixo() -> None:
    r = O.offsets_otimos(CAT["6X2"], CAT.turnos, [1] * 168, D0, 4)
    assert r.status == "otimo" and r.valor == 0
    assert sorted(o % 2 for o in r.solucao["offsets"][0]) in ([0] * 4, [1] * 4)
    # K = 3 < K*: déficit inevitável de 1/4 das horas, distribuído sem excesso
    r = O.offsets_otimos(CAT["6X2"], CAT.turnos, [1] * 168, D0, 3)
    assert r.metricas["coverage_pct"] == pytest.approx(0.75)
    assert r.metricas["excess_post_hours_week"] == 0


def test_fairness_nao_piora_cobertura_e_reduz_espalhamento() -> None:
    base = O.offsets_otimos(CAT["4X2"], CAT.turnos, [2] * 168, D0, 5, 2)
    fair = O.offsets_otimos(CAT["4X2"], CAT.turnos, [2] * 168, D0, 5, 2, w_justica=50)
    assert fair.metricas["deficit_post_hours_week"] == base.metricas["deficit_post_hours_week"]
    def soma(r: O.ResultadoOtim) -> int:
        return int(r.metricas["sundays_off_spread"] + r.metricas["nights_spread"])

    assert soma(fair) <= soma(base)


def test_ranking_modelos_conformes() -> None:
    reg = regimes_mvp()["CLT_44H_ATUAL"]
    t0 = time.perf_counter()
    r = O.ranking_modelos(CAT, [1] * 168, D0, 1, reg, ContextoRegime(), time_limit=5)
    assert time.perf_counter() - t0 < 10
    ok = [c for c in r.candidatos if c["eligible"]]
    assert ok and ok[0]["rank"] == 1 and ok[0]["headcount"] == 4
    assert all(c["deficit_post_hours_week"] == 0 for c in ok[:3])
    assert all(c["compliance"] != "nao_conforme" for c in ok)
    pec = O.ranking_modelos(CAT, [1] * 168, D0, 1, regimes_mvp()["PEC_40H"], ContextoRegime())
    assert "6X2" not in {c["code"] for c in pec.candidatos if c["eligible"]}


def test_alocacao_pool_cp_sat() -> None:
    def jan(i: int, f: int) -> tuple[int, ...]:
        return tuple(1 if i <= h % 24 < f else 0 for h in range(168))

    estr = S.Estrutura(("SA", "SB"), (
        S.Posicao("A1", "SA", (1,) * 168), S.Posicao("A2", "SA", jan(6, 14)),
        S.Posicao("B1", "SB", (1,) * 168), S.Posicao("B2", "SB", jan(14, 22))),
        (S.Pool("P", ("SA", "SB"), max_horas_semana=16),))
    pes = S.distribuir_pessoas(estr, [(n, 3, ()) for n in "ABCD"])
    pad = padrao_k_fixo(CAT["6X2"], 4)
    esc = gerar_escala(pad, D0, 15, date(2027, 1, 3))
    r = O.alocacao_pool(estr, pes, lambda i, d: (lambda e: e if e in CAT.turnos else None)(
        esc.estados[pes[i].turma][d + 1]), CAT.turnos, D0, 14, time_limit=5)
    assert r.status == "otimo"
    assert r.metricas["deficit_post_hours"] == 0
    assert r.metricas["moved_hours"] == 14 * 8          # só a tarde de B2
    assert r.metricas["max_borrowed_hours_person"] <= 16  # limite duro por semana × 2
    assert all(a["subsector"] == "SB" for a in r.solucao["assignments"])
