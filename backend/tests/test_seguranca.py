"""Testes de regressão das regras de segurança da API (ver SECURITY.md)."""
import io

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook

from app.api.v1.endpoints import atas
from app.main import app

client = TestClient(app)


def payload(**extra):
    base = {
        "date": "2026-10-04",
        "shift": "A",
        "unit": "Usina Norte",
        "responsible": "Ana",
        "kpi_score": 90,
        "answers": {"0": {"0": "SIM"}},
        "action_plans": {"0": {"0": {"type": "5S", "s": "", "b": "", "a": "", "r": ""}}},
    }
    base.update(extra)
    return base


@pytest.fixture(autouse=True)
def banco_limpo():
    atas.ATAS_DB.clear()
    yield
    atas.ATAS_DB.clear()


def exporta(**extra):
    r = client.post("/api/v1/atas/", json=payload(**extra))
    assert r.status_code == 201, r.text
    resp = client.get(f"/api/v1/atas/{r.json()['id']}/export")
    assert resp.status_code == 200
    return resp, load_workbook(io.BytesIO(resp.content))


def test_texto_do_usuario_nunca_vira_formula_no_excel():
    plano = {"type": "=1+1", "s": "=cmd|' /C calc'!A0", "b": "+SUM(A1)", "a": "@x", "r": "-2+3"}
    _, wb = exporta(
        unit="=1+1",
        responsible='=HYPERLINK("http://exemplo.invalid","clique")',
        action_plans={"0": {"0": plano}},
    )
    capa = wb["Resumo da Ata"]
    rod = wb["Balanças Rodoviárias"]
    for cell in (capa["B5"], capa["B6"], rod["D2"], rod["E2"], rod["F2"], rod["G2"], rod["H2"]):
        assert cell.data_type == "s", (cell.coordinate, cell.value, cell.data_type)
    assert capa["B6"].value.startswith("=HYPERLINK")  # o texto é preservado, só não executa


def test_nome_do_arquivo_no_cabecalho_e_sanitizado():
    resp, _ = exporta(unit='Usina "Sul"; x=1', shift="../../A")
    disp = resp.headers["content-disposition"]
    nome = disp.split('filename="', 1)[1].rstrip('"')
    assert set(nome) <= set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-")
    assert nome.endswith(".xlsx")
    assert resp.headers["cache-control"] == "no-store"


@pytest.mark.parametrize(
    "campo",
    [
        {"unit": "x" * 10_000},
        {"responsible": "x" * 10_000},
        {"kpi_score": -1},
        {"kpi_score": 101},
        {"answers": {"0": {"0": "x" * 50}}},
        {"answers": {"99": {"0": "SIM"}}},
        {"answers": {"0": {str(i): "SIM" for i in range(500)}}},
        {"action_plans": {"0": {"0": {"type": "", "s": "x" * 5000, "b": "", "a": "", "r": ""}}}},
        {"campo_extra": "nao_permitido"},
    ],
)
def test_entradas_fora_dos_limites_sao_rejeitadas(campo):
    assert client.post("/api/v1/atas/", json=payload(**campo)).status_code == 422


def test_banco_em_memoria_tem_teto(monkeypatch):
    monkeypatch.setattr(atas, "MAX_ATAS", 2)
    assert client.post("/api/v1/atas/", json=payload()).status_code == 201
    assert client.post("/api/v1/atas/", json=payload()).status_code == 201
    assert client.post("/api/v1/atas/", json=payload()).status_code == 507


def test_cabecalhos_de_seguranca():
    r = client.get("/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
