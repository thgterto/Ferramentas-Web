"""F1-17 / NFR-01 (MVP): 200 colaboradores × 8 semanas — motor (M1→M4 + cargos) < 1,5 s."""

from __future__ import annotations

import time
from datetime import date

from pytest_benchmark.fixture import BenchmarkFixture

from escalas.services.engine.catalogo import catalogo_mvp
from escalas.services.engine.cobertura_cargos import MinimoCargo, Substituicao
from escalas.services.engine.demanda import postos_24x7
from escalas.services.engine.regime_legal import ContextoRegime, regimes_mvp
from escalas.services.engine.shrinkage import Shrinkage
from escalas.services.escalas.engine_runner import (
    EntradaCargos,
    EntradaSimulacao,
    run_simulation,
)

LIMITE_S = 1.5


def _entrada() -> EntradaSimulacao:
    cat = catalogo_mvp()
    postos = 40  # 5 turmas × 40 = 200 colaboradores
    curva = postos_24x7(postos)
    comp = [{"ENF": 8, "TEC_ENF": 32}] * 5
    return EntradaSimulacao(
        modelo=cat["5T"], catalogo=cat, curva=curva, tamanho_turma=postos, k=5,
        k_fixo_operacao=True, inicio=date(2027, 1, 4), semanas=8,
        shrinkage=Shrinkage.de("0.10", "0.15"), regime=regimes_mvp()["PEC_40H"],
        ctx=ContextoRegime(),
        cargos=EntradaCargos(comp, {"TEC_ENF": postos_24x7(30), "ENF": postos_24x7(8)},
                             [Substituicao("ENF", "TEC_ENF")], [MinimoCargo("ENF", 1)]))


def test_benchmark_200_colaboradores(benchmark: BenchmarkFixture) -> None:
    e = _entrada()
    t0 = time.perf_counter()
    r = run_simulation(e)
    frio = time.perf_counter() - t0
    assert sum(t.fracao_posto * 40 for t in r.escala.turmas) == 200
    assert len(r.cobertura.cobertura) == 8 * 7 * 24
    assert frio < LIMITE_S, f"{frio:.3f}s"
    res = benchmark.pedantic(run_simulation, args=(e,), rounds=3, iterations=1)
    assert res.cobertura.kpis.deficit_hp == 0
    assert benchmark.stats is not None and benchmark.stats.stats.max < LIMITE_S
