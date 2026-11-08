"""A38 — cobertura por cargo com matriz direcional (golden UTI, FR-34–36)."""

from __future__ import annotations

from datetime import date

from app.services.engine.catalogo import catalogo_mvp
from app.services.engine.cobertura_cargos import (
    MinimoCargo,
    Substituicao,
    alocar_hora,
    cobertura_por_cargo,
)
from app.services.engine.demanda import postos_24x7

CAT = catalogo_mvp()
SEG = date(2026, 1, 5)
ENF, TEC = "enfermeiro", "tecnico_enfermagem"
REGRA = [Substituicao(ENF, TEC)]
DEM = {ENF: postos_24x7(1), TEC: postos_24x7(2)}


def test_enfermeiro_cobre_tecnico() -> None:
    r = cobertura_por_cargo(CAT["12X36"].montar_padrao(), CAT.turnos, {ENF: 2, TEC: 1},
                            DEM, REGRA, SEG)
    assert r.kpis[TEC].deficit_hp == 0 and r.kpis[ENF].deficit_hp == 0
    assert r.kpis[TEC].substituicao_hp == r.kpis[TEC].demanda_hp // 2
    assert {a.codigo for a in r.achados} == {"COB_COBERTURA_POR_SUBSTITUICAO"}


def test_tecnico_nao_cobre_enfermeiro() -> None:
    r = cobertura_por_cargo(CAT["12X36"].montar_padrao(), CAT.turnos, {ENF: 0, TEC: 3},
                            DEM, REGRA, SEG, minimos=[MinimoCargo(ENF, 1)])
    assert r.kpis[ENF].deficit_hp == r.kpis[ENF].demanda_hp
    assert r.kpis[ENF].substituicao_hp == 0
    codigos = {a.codigo for a in r.achados}
    assert {"COB_DEFICIT_CARGO", "COB_CARGO_SEM_QUALIFICADO"} <= codigos


def test_minimo_por_turno_noturno() -> None:
    comp = [{ENF: 1, TEC: 2}, {ENF: 1, TEC: 2}, {ENF: 0, TEC: 5}, {ENF: 0, TEC: 5}]
    r = cobertura_por_cargo(CAT["12X36"].montar_padrao(), CAT.turnos, {ENF: 1, TEC: 2},
                            DEM, REGRA, SEG, minimos=[MinimoCargo(ENF, 1, ("N12",))],
                            composicao_por_turma=comp)
    assert r.kpis[ENF].horas_sem_qualificado > 0
    assert any(a.codigo == "COB_CARGO_SEM_QUALIFICADO" and a.severidade == "ERRO"
               for a in r.achados)


def test_alocacao_prefere_proprio_cargo_e_nao_reusa_pessoa() -> None:
    x = alocar_hora((ENF, TEC), (2, 1), (1, 2), tuple(REGRA))
    assert x == ((1, 1), (0, 1))
    x = alocar_hora((ENF, TEC), (1, 0), (1, 1), tuple(REGRA))
    assert x == ((1, 0), (0, 0))
