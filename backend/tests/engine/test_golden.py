"""Harness de golden tests (F1-5): cada caso em ``golden/*.yaml`` vira um teste."""

from __future__ import annotations

from datetime import date
from fractions import Fraction
from pathlib import Path
from typing import Any

import pytest
import yaml

from app.services.engine import demanda, shrinkage
from app.services.engine.catalogo import catalogo_mvp
from app.services.engine.gerador import gerar_escala
from app.services.engine.types import FOLGA, Escala

GOLDEN = Path(__file__).parent / "golden"


def _casos() -> list[Any]:
    casos = []
    for arq in sorted(GOLDEN.glob("*.yaml")):
        for caso in yaml.safe_load(arq.read_text("utf-8"))["casos"]:
            casos.append(pytest.param(caso, id=f"golden-{caso['id']}"))
    return casos


CASOS = _casos()


def test_golden_minimo_20_casos() -> None:
    assert len(CASOS) >= 20


def _curva(entrada: dict[str, Any]) -> demanda.CurvaDemanda:
    if "postos_24x7" in entrada:
        return demanda.postos_24x7(int(entrada["postos_24x7"]))
    return demanda.postos_fixos(
        demanda.Faixa(tuple(f["dias"]), f["hora_ini"], f["hora_fim"], f["postos"],
                      bool(f.get("critico", False)))
        for f in entrada["faixas"]
    )


def _checar_curva(curva: demanda.CurvaDemanda, esp: dict[str, Any]) -> None:
    if "todas" in esp:
        assert set(curva.valores) == {esp["todas"]}
    if "total_semanal" in esp:
        assert curva.total_semanal == esp["total_semanal"]
    for chave, valor in esp.get("celulas", {}).items():
        d, h = (int(x) for x in chave.split(","))
        assert curva.valor(d, h) == valor, chave
    if "criticas" in esp:
        assert len(curva.criticas) == esp["criticas"]


def _rodar_demanda(entrada: dict[str, Any], esp: dict[str, Any]) -> None:
    _checar_curva(_curva(entrada), esp)


def _rodar_shrinkage(entrada: dict[str, Any], esp: dict[str, Any]) -> None:
    if "erro" in esp:
        with pytest.raises(getattr(shrinkage, esp["erro"])):
            shrinkage.Shrinkage.de(entrada["s_diurno"], entrada["s_noturno"])
        return
    shr = shrinkage.Shrinkage.de(entrada["s_diurno"], entrada["s_noturno"])
    _checar_curva(shrinkage.aplicar(_curva(entrada), shr), esp)


def _max_consecutivo(linha: tuple[str, ...]) -> int:
    melhor = atual = 0
    for e in linha:
        atual = atual + 1 if e != FOLGA else 0
        melhor = max(melhor, atual)
    return melhor


def _rodar_gerador(entrada: dict[str, Any], esp: dict[str, Any]) -> None:
    modelo = catalogo_mvp()[entrada["modelo"]]
    variante = next((v for v in modelo.variantes if v.nome == entrada.get("variante")), None)
    padrao = modelo.montar_padrao(variante)
    inicio = entrada.get("data_inicio")
    esc: Escala = gerar_escala(padrao, date.fromisoformat(entrada["data_ancora"]),
                               entrada["dias"], date.fromisoformat(inicio) if inicio else None)
    if "turmas" in esp:
        assert len(esc.turmas) == esp["turmas"]
    turnos = {t for g in padrao.grupos for t in g.turnos}
    if "turnos" in esp:
        assert turnos == set(esp["turnos"])
    cobs = [esc.cobertura_dia(j) for j in range(esc.dias)]
    valores = [c.get(t, Fraction(0)) for c in cobs for t in turnos]
    if "cobertura_min" in esp:
        assert min(valores) == Fraction(esp["cobertura_min"])
    if "cobertura_max" in esp:
        assert max(valores) == Fraction(esp["cobertura_max"])
    if "excesso_medio" in esp:
        assert sum(valores, Fraction(0)) / len(valores) - 1 == Fraction(esp["excesso_medio"])
    if "folgas_por_dia" in esp:
        for j in range(esc.dias):
            assert sum(1 for linha in esc.estados if linha[j] == FOLGA) == esp["folgas_por_dia"]
    if esp.get("sem_trabalho_consecutivo"):
        assert all(_max_consecutivo(linha) <= 1 for linha in esc.estados)
    if "max_trabalho_consecutivo" in esp:
        assert max(_max_consecutivo(linha) for linha in esc.estados) == esp[
            "max_trabalho_consecutivo"]
    if "dias_trabalhados_70d" in esp:
        assert all(sum(1 for e in linha[:70] if e != FOLGA) == esp["dias_trabalhados_70d"]
                   for linha in esc.estados)
    for nome, seq in esp.get("estados_iniciais", {}).items():
        i = next(k for k, t in enumerate(esc.turmas) if t.nome == nome)
        assert "".join(esc.estados[i][: len(seq)]) == seq


def _rodar_catalogo(entrada: dict[str, Any], esp: dict[str, Any]) -> None:
    m = catalogo_mvp()[entrada["modelo"]]
    k = esp["k_estrela"]
    assert m.k_estrela == (None if k is None else Fraction(k))
    assert m.exato == esp["exato"]
    assert [m.horas_semanais(d) for d in m.duracoes_min] == [
        Fraction(h) for h in esp["horas_semanais"]]
    assert m.folgas_7d == Fraction(esp["folgas_7d"])


EXECUTORES = {
    "demanda": _rodar_demanda,
    "shrinkage": _rodar_shrinkage,
    "gerador": _rodar_gerador,
    "catalogo": _rodar_catalogo,
}


@pytest.mark.parametrize("caso", CASOS)
def test_golden(caso: dict[str, Any]) -> None:
    EXECUTORES[caso["tipo"]](caso["entrada"], caso["esperado"])
