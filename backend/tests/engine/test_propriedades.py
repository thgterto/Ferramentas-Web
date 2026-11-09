"""A20 — propriedades (Hypothesis, 500 exemplos) — F1-16."""

from __future__ import annotations

from datetime import date
from fractions import Fraction
from random import Random

from hypothesis import given, settings
from hypothesis import strategies as st

from app.services.engine.catalogo import Variante, catalogo_mvp
from app.services.engine.cobertura import calcular_kpis
from app.services.engine.cobertura_cargos import Substituicao, alocar_hora
from app.services.engine.gerador import cobertura_grupo
from app.services.engine.regime_legal import (
    CLT_CARGA_SEMANAL_EXCEDIDA,
    PerfilEscala,
    RegimeLegal,
    regimes_mvp,
    validar_modelo,
    validar_regime,
)
from app.services.engine.types import GrupoTurmas, Severidade

CAT = catalogo_mvp()
REG = regimes_mvp()
EX = settings(max_examples=500, deadline=None)
CONTINUOS = [c for c in CAT.codigos if CAT[c].continuo_24x7]


@EX
@given(st.lists(st.tuples(st.integers(0, 6), st.integers(0, 6)), min_size=1, max_size=200))
def test_kpis_somam_celulas(pares: list[tuple[int, int]]) -> None:
    req = [r for r, _ in pares]
    cob = [Fraction(c) for _, c in pares]
    k = calcular_kpis(date(2026, 1, 5), req, cob)
    assert k.horas_posto_cobertas + k.deficit_hp == sum(req)
    assert sum(cob) - k.excesso_hp == k.horas_posto_cobertas
    assert k.horas_com_deficit == sum(1 for r, c in pares if c < r)
    assert 0 <= k.pct_horas_posto_cobertas <= 1


@EX
@given(st.sampled_from(CONTINUOS), st.integers(1, 12), st.randoms(use_true_random=False))
def test_k_menor_que_k_estrela_implica_deficit(codigo: str, k: int, rnd: Random) -> None:
    m = CAT[codigo]
    ke = m.k_estrela
    assert ke is not None
    n = len(m.sequencias)
    if k < n or k >= ke:
        return
    base, resto = divmod(k, n)
    deficit = Fraction(0)
    for i, seq in enumerate(m.sequencias):
        kk = base + (1 if i < resto else 0)
        offs = tuple(rnd.randrange(len(seq)) for _ in range(kk))
        g = GrupoTurmas(seq, offs)
        deficit += sum(max(Fraction(0), 1 - v)
                       for cob in cobertura_grupo(seq, offs, g.fracao_posto, len(seq))
                       for v in cob.values())
    assert deficit > 0


CARGOS = ("a", "b", "c")


@EX
@given(st.tuples(*[st.integers(0, 5)] * 3), st.tuples(*[st.integers(0, 5)] * 3),
       st.sets(st.tuples(st.sampled_from(CARGOS), st.sampled_from(CARGOS))))
def test_matriz_nunca_cobre_sem_regra(sup: tuple[int, ...], dem: tuple[int, ...],
                                      pares: set[tuple[str, str]]) -> None:
    regras = tuple(Substituicao(a, b) for a, b in sorted(pares) if a != b)
    x = alocar_hora(CARGOS, sup, dem, regras)
    permitidos = {(CARGOS.index(g.de), CARGOS.index(g.para)) for g in regras}
    for a in range(3):
        assert sum(x[a]) <= sup[a]                       # pessoa-hora usada uma vez
        for b in range(3):
            if a != b and (a, b) not in permitidos:
                assert x[a][b] == 0
    for b in range(3):
        assert sum(x[a][b] for a in range(3)) <= dem[b]


SEQ = st.lists(st.sampled_from("MTNF"), min_size=3, max_size=21).filter(
    lambda s: {"M", "T", "N"} <= set(s))


@EX
@given(SEQ, st.integers(30 * 60, 50 * 60))
def test_carga_excedida_sse_k_estrela_menor_que_k_legal(seq: list[str], carga: int) -> None:
    base = REG["PEC_40H"]
    reg = RegimeLegal(**{**{f: getattr(base, f) for f in base.__slots__},  # type: ignore[arg-type, unused-ignore]
                         "carga_semanal_max_min": carga})
    perfil = PerfilEscala(tuple(seq), dict.fromkeys("MTN", 480),
                          dict.fromkeys("MTN", Fraction(480)))
    w = sum(1 for e in seq if e != "F")
    k_estrela = Fraction(3 * len(seq), w)
    k_leg = Fraction(168 * 60, carga)
    tem = any(a.codigo == CLT_CARGA_SEMANAL_EXCEDIDA for a in validar_regime(perfil, reg))
    assert tem == (k_estrela < k_leg)


def test_catalogo_sem_erro_clt_no_44h_salvo_excecoes() -> None:
    # Exceções: 2x2 12 h (jornada > 10 h, Q13) e 6x1 (8 h ⇒ carga 48 h; rotação N→F→M dá
    # repouso < 35 h — CLT_DSR_35H, ver resumo do S2).
    for c in CAT.codigos:
        if c in {"2X2_12H", "6X1_BASE"}:
            continue
        achados = validar_modelo(CAT[c], CAT.turnos, REG["CLT_44H_ATUAL"])
        assert not [a for a in achados if a.severidade == Severidade.ERRO], c
    assert Variante("x") is not None
