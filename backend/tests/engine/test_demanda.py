from __future__ import annotations

from decimal import Decimal
from fractions import Fraction

import pytest

from app.services.engine import demanda, shrinkage


def _csv(linhas: list[str]) -> str:
    return "\n".join(["dia,hora,demanda", *linhas])


def _completo() -> list[str]:
    return [f"{d},{h},{(d + h) % 4}" for d in range(1, 8) for h in range(24)]


def test_importar_csv_168_linhas() -> None:
    curva = demanda.importar_csv(_csv(_completo()))
    assert len(curva.valores) == 168
    assert curva.total_semanal == sum((d + h) % 4 for d in range(1, 8) for h in range(24))


@pytest.mark.parametrize(
    ("mutacao", "linha", "trecho"),
    [
        (lambda ls: ls[:-1], None, "faltam 1"),
        (lambda ls: [*ls, "1,0,3"], 170, "duplicada"),
        (lambda ls: ["1,0,-1", *ls[1:]], 2, "negativa"),
        (lambda ls: ["1,0", *ls[1:]], 2, "esperado"),
        (lambda ls: ["8,0,1", *ls[1:]], 2, "1–7"),
        (lambda ls: ["1,0,x", *ls[1:]], 2, "inteiro"),
    ],
)
def test_importar_csv_erros(mutacao, linha, trecho) -> None:  # type: ignore[no-untyped-def]
    with pytest.raises(demanda.ErroDemanda, match=trecho) as exc:
        demanda.importar_csv(_csv(mutacao(_completo())))
    assert exc.value.linha == linha


def test_curva_invalida() -> None:
    with pytest.raises(demanda.ErroDemanda):
        demanda.CurvaDemanda((1,) * 10)
    with pytest.raises(demanda.ErroDemanda):
        demanda.CurvaDemanda((-1,) * 168)
    with pytest.raises(demanda.ErroDemanda):
        demanda.postos_fixos([demanda.Faixa((0,), 10, 8, 1)])
    with pytest.raises(demanda.ErroDemanda):
        demanda.indice(7, 0)


def test_shrinkage_combinado() -> None:
    s = shrinkage.combinar([Decimal("0.05"), Decimal("0.05")])
    assert s == Fraction(39, 400)  # 1 − 0,95²
    with pytest.raises(shrinkage.ErroShrinkage):
        shrinkage.combinar(["0.5", "0.3"])
    with pytest.raises(TypeError):
        shrinkage.Shrinkage.de(0.1)  # type: ignore[arg-type]


def test_fte_liquido_fracionario() -> None:
    curva = demanda.postos_24x7(3)
    fte = shrinkage.fte_liquido(curva, shrinkage.Shrinkage.de("0", "0.1"))
    assert fte[22] == Fraction(10, 3)
    assert fte[12] == 3
    assert shrinkage.n_bruto(3, Fraction(1, 10)) == 4
