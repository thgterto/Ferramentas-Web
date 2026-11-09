"""v3.7 — subsetores, posições e pools: alocação min-cost flow hora a hora (golden)."""

from __future__ import annotations

from datetime import date

import pytest

from app.services.engine import subsetores as S
from app.services.engine.catalogo import catalogo_mvp
from app.services.engine.cobertura import ocupacao_horaria
from app.services.engine.cobertura_cargos import Substituicao
from app.services.engine.turmas_k import padrao_k_fixo

D0 = date(2027, 1, 4)


def _jan(ini: int, fim: int, v: int = 1) -> tuple[int, ...]:
    return tuple(v if ini <= h % 24 < fim else 0 for h in range(168))


FIXO = (1,) * 168
POOL = S.Pool("P", ("SA", "SB"))


def _estr(pool: S.Pool | None = POOL, cargo_b2: str | None = None,
          regras: tuple[Substituicao, ...] = ()) -> S.Estrutura:
    return S.Estrutura(
        ("SA", "SB"),
        (S.Posicao("A1", "SA", FIXO), S.Posicao("A2", "SA", _jan(6, 14)),
         S.Posicao("B1", "SB", FIXO), S.Posicao("B2", "SB", _jan(14, 22), cargo_b2)),
        (pool,) if pool else (), regras)


def _ocup(k: int = 4, dias: int = 56) -> list[list[tuple[int, str]]]:
    cat = catalogo_mvp()
    return ocupacao_horaria(padrao_k_fixo(cat["6X2"], k), cat.turnos, D0, dias)


def test_distribuicao_por_vagas_e_cargo() -> None:
    e = _estr(cargo_b2="ENF")
    pes = S.distribuir_pessoas(e, [("A", 4, ["TEC", "TEC", "TEC", "ENF"])])
    assert [(p.id, p.posicao) for p in pes] == [("A-01", "A1"), ("A-02", "A2"),
                                                ("A-03", "B1"), ("A-04", "B2")]


def test_pool_remaneja_e_zera_deficit() -> None:
    e = _estr()
    pes = S.distribuir_pessoas(e, [(n, 3, ()) for n in "ABCD"])
    r = S.alocar_horizonte(e, pes, _ocup(), D0)
    # 3 pessoas/turma → A1, A2, B1: B2 (tarde) só é coberto pelo ocioso de A2 (8 h × 56 d)
    assert r.deficit_hp == 0 and r.deficit_sem_pool_hp == 56 * 8
    assert r.horas_remanejadas == 56 * 8
    assert r.kpis["SB"].recebido_hp == 448 and r.kpis["SA"].cedido_hp == 448
    assert r.achados[0].codigo == S.COB_REMANEJAMENTO_SUBSETOR
    assert "448 → 0" in r.achados[0].mensagem


def test_sem_pool_deficit_e_achado() -> None:
    e = _estr(pool=None)
    pes = S.distribuir_pessoas(e, [(n, 3, ()) for n in "ABCD"])
    r = S.alocar_horizonte(e, pes, _ocup(), D0)
    assert r.horas_remanejadas == 0 and r.deficit_hp == 448
    assert [a.codigo for a in r.achados] == [S.COB_DEFICIT_SUBSETOR]


def test_preferencia_lotacao_origem() -> None:
    """Com sobra no próprio subsetor, ninguém é remanejado (custo de empréstimo > 0)."""
    e = _estr()
    pes = S.distribuir_pessoas(e, [(n, 4, ()) for n in "ABCD"])
    r = S.alocar_horizonte(e, pes, _ocup(), D0)
    assert r.deficit_hp == 0 and r.horas_remanejadas == 0


def test_limite_horas_emprestadas_por_semana() -> None:
    e = _estr(pool=S.Pool("P", ("SA", "SB"), max_horas_semana=1))
    pes = S.distribuir_pessoas(e, [(n, 3, ()) for n in "ABCD"])
    r = S.alocar_horizonte(e, pes, _ocup(), D0)
    # grupo SA tem 8 pessoas → 8 h emprestáveis por semana; 8 semanas
    assert r.horas_remanejadas == 8 * 8
    assert r.deficit_hp == 448 - 64


def test_pool_restrito_por_cargo_e_matriz() -> None:
    e = _estr(pool=S.Pool("P", ("SA", "SB"), cargos=("ENF",)), cargo_b2="TEC")
    pes = S.distribuir_pessoas(e, [(n, 3, ["TEC", "TEC", "TEC"]) for n in "ABCD"])
    r = S.alocar_horizonte(e, pes, _ocup(), D0)
    assert r.horas_remanejadas == 0  # TEC não é intercambiável no pool restrito a ENF
    e2 = _estr(pool=S.Pool("P", ("SA", "SB")), cargo_b2="ENF",
               regras=(Substituicao("TEC", "ENF", 2),))
    r2 = S.alocar_horizonte(e2, pes, _ocup(), D0)
    assert r2.deficit_hp == 0 and r2.horas_remanejadas == 448


def test_alocacao_por_pessoa_estavel_no_turno() -> None:
    e = _estr()
    pes = S.distribuir_pessoas(e, [(n, 3, ()) for n in "ABCD"])
    r = S.alocar_horizonte(e, pes, _ocup(dias=8), D0)
    b2 = r.posicoes.index("B2")
    for i, lin in enumerate(r.alocacao_pessoas):
        blocos = [h for h, k in enumerate(lin) if k == b2]
        if blocos:  # 14–22 contínuo, sempre a pessoa lotada em A2
            assert pes[i].posicao == "A2" and len(blocos) % 8 == 0


def test_validacoes() -> None:
    with pytest.raises(ValueError, match="168"):
        S.Posicao("X", "SA", (1,))
    with pytest.raises(ValueError, match="desconhecido"):
        S.Estrutura(("SA",), (S.Posicao("X", "SB", FIXO),))
    with pytest.raises(ValueError, match="outro pool"):
        S.Estrutura(("SA", "SB", "SC"), (), (S.Pool("P", ("SA", "SB")),
                                              S.Pool("Q", ("SB", "SC"))))
