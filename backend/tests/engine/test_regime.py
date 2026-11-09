"""A45 — regime legal versionado e transição (GT-REG-01…08, FR-39–42, PRD §6.2)."""

from __future__ import annotations

from datetime import date
from fractions import Fraction

import pytest

from app.services.engine.catalogo import catalogo_mvp
from app.services.engine.regime_legal import (
    ContextoRegime,
    RegimeNaoResolvido,
    k_efetivo,
    k_legal,
    perfis_do_modelo,
    regime_compliance,
    regimes_mvp,
    resolver_regime,
    simular_transicao,
    validar_modelo,
    validar_regime,
)

CAT = catalogo_mvp()
REG = regimes_mvp()
PREMISSA = "INFO_REGIME_PREMISSA"


def _cods(modelo: str, regime: str, dur: int | None = None,
          ctx: ContextoRegime | None = None) -> dict[str, str]:
    achados = validar_modelo(CAT[modelo], CAT.turnos, REG[regime], ctx, dur)
    return {a.codigo: a.severidade.value for a in achados if a.codigo != PREMISSA}


def test_gt_reg_01_6x2_pec_40h() -> None:
    c = _cods("6X2", "PEC_40H")
    assert c == {"CLT_CARGA_SEMANAL_EXCEDIDA": "ERRO", "CLT_FOLGAS_SEMANAIS_INSUFICIENTES": "ERRO"}
    a = next(a for a in validar_modelo(CAT["6X2"], CAT.turnos, REG["PEC_40H"])
             if a.codigo == "CLT_CARGA_SEMANAL_EXCEDIDA")
    assert a.contexto["excesso_h"] == "2.000000" and a.contexto["regime"] == "PEC_40H@1"


def test_gt_reg_02_6x2_transicao_sem_achados() -> None:
    assert _cods("6X2", "TRANSICAO_42H") == {}


def test_gt_reg_03_6x1_7h20() -> None:
    assert _cods("6X1_BASE", "CLT_44H_ATUAL", 440).keys() <= {"CLT_DSR_35H"}
    perf = perfis_do_modelo(CAT["6X1_BASE"], CAT.turnos, 440)[0]
    assert [a.codigo for a in validar_regime(perf, REG["CLT_44H_ATUAL"])] == [PREMISSA]
    c = {a.codigo for a in validar_regime(perf, REG["TRANSICAO_42H"])}
    assert {"CLT_ESCALA_6X1_VEDADA", "CLT_CARGA_SEMANAL_EXCEDIDA"} <= c
    assert "CLT_FOLGAS_SEMANAIS_INSUFICIENTES" not in c  # 6x1 vedada prevalece


def test_6x1_8h_he_planejada_vira_alerta() -> None:
    perf = perfis_do_modelo(CAT["6X1_BASE"], CAT.turnos, 480)[0]
    a = [x for x in validar_regime(perf, REG["CLT_44H_ATUAL"], ContextoRegime(he_planejada=True))
         if x.codigo == "CLT_CARGA_SEMANAL_EXCEDIDA"]
    assert a[0].severidade == "ALERTA"


def test_gt_reg_04_5t_pec_40h_conforme() -> None:
    assert _cods("5T", "PEC_40H") == {}


def test_gt_reg_05_transicao_10_postos() -> None:
    fases = simular_transicao(10, CAT, REG, modelo_cenario="6X2")
    assert [f.regime for f in fases] == ["CLT_44H_ATUAL", "TRANSICAO_42H", "PEC_40H"]
    assert [f.recomendado.pessoas for f in fases if f.recomendado] == [40, 40, 45]
    assert [f.recomendado.modelo for f in fases if f.recomendado] == ["6X2", "6X2", "4X2"]
    assert fases[2].recomendado is not None and fases[2].recomendado.turmas == Fraction(9, 2)
    assert fases[2].limite_inferior_pessoas == 42
    cen = fases[2].cenario
    assert cen is not None and any(a.severidade == "ERRO" for a in cen.achados)
    t5 = next(o for o in fases[2].opcoes if o.modelo == "5T")
    assert (t5.pessoas, t5.horas_semanais) == (50, Fraction(168, 5))


def test_gt_reg_06_12x36_pec_40h() -> None:
    c = _cods("12X36", "PEC_40H")
    assert c == {"CLT_REGIME_PENDENTE_REGULAMENTACAO": "ALERTA"}


def test_gt_reg_07_4x3_pec_40h() -> None:
    assert _cods("4X3", "PEC_40H") == {"CLT_VIAVEL_SOMENTE_COM_ACT": "ALERTA"}
    ctx = ContextoRegime(act_cct_declarado=True)
    assert _cods("4X3", "PEC_40H", ctx=ctx) == {"CLT_VIAVEL_SOMENTE_COM_ACT": "INFO"}


@pytest.mark.parametrize(("data", "esperado"), [
    (date(2026, 12, 1), "CLT_44H_ATUAL"),
    (date(2027, 1, 28), "CLT_44H_ATUAL"),   # D0 + 59 d
    (date(2027, 1, 29), "TRANSICAO_42H"),   # D0 + 60 d
    (date(2028, 1, 29), "TRANSICAO_42H"),   # D0 + 14 meses − 1 d
    (date(2028, 1, 30), "PEC_40H"),         # D0 + 14 meses
    (date(2030, 6, 1), "PEC_40H"),
])
def test_gt_reg_08_bordas_vigencia(data: date, esperado: str) -> None:
    assert resolver_regime(REG, data=data, d0=date(2026, 11, 30)).codigo == esperado


def test_gt_reg_08_sem_d0_pede_escolha() -> None:
    with pytest.raises(RegimeNaoResolvido):
        resolver_regime(REG, data=date(2027, 6, 1))
    with pytest.raises(RegimeNaoResolvido):
        resolver_regime(REG, data=date(1980, 1, 1), d0=date(2026, 11, 30))
    assert resolver_regime(REG, codigo="PEC_40H").carga_semanal_max_min == 2400


def test_premissa_sempre_presente() -> None:
    for cod in REG.linha_do_tempo:
        perf = perfis_do_modelo(CAT["5T"], CAT.turnos)[0]
        assert validar_regime(perf, REG[cod])[0].codigo == PREMISSA


def test_k_legal() -> None:
    assert k_legal(REG["CLT_44H_ATUAL"]) == 4
    assert k_legal(REG["TRANSICAO_42H"]) == 4
    assert k_legal(REG["PEC_40H"]) == 5
    assert k_legal(REG["PEC_40H"], meias=True) == Fraction(9, 2)
    assert k_efetivo(CAT["6X2"], REG["PEC_40H"]) == 5


def test_2x2_12h_jornada_diaria() -> None:
    c = _cods("2X2_12H", "CLT_44H_ATUAL")
    assert c == {"CLT_VIAVEL_SOMENTE_COM_ACT": "ALERTA", "CLT_JORNADA_DIARIA": "ERRO"}


def test_media_semanal_contratual() -> None:
    c = _cods("6X2", "TRANSICAO_42H", ctx=ContextoRegime(carga_contratual_min=2400))
    assert c == {"CLT_MEDIA_SEMANAL": "ALERTA"}


def test_base_computada_mostra_noturno() -> None:
    perf = perfis_do_modelo(CAT["6X2"], CAT.turnos)[0]
    assert perf.media_semanal_min("computada") > perf.media_semanal_min("relogio") == 42 * 60


@pytest.mark.parametrize("codigo", list(CAT.codigos))
def test_regime_compliance_tabela_prd_6_2(codigo: str) -> None:
    m = CAT[codigo]
    assert m.regime_compliance, f"{codigo} sem regime_compliance no seed"
    for dur, esperado in m.regime_compliance.items():
        obtido = {k: v.value for k, v in regime_compliance(m, CAT, REG, int(dur)).items()}
        assert obtido == dict(esperado), (codigo, dur)
