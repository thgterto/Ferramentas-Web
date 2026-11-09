"""v3.8: launcher portable — pasta de dados, migrações + seeds + admin, SPA estático."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def test_portable_primeira_execucao(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from escalas import portable
    from escalas.core.config import settings

    web = tmp_path / "web"
    (web / "assets").mkdir(parents=True)
    (web / "index.html").write_text("<title>Simulador</title>", "utf-8")
    (web / "assets" / "a.js").write_text("x", "utf-8")
    monkeypatch.setattr(portable, "base_dir", lambda: Path(__file__).resolve().parents[1])
    monkeypatch.setenv("ESCALAS_DATA_DIR", str(tmp_path / "dados"))
    dados = portable.data_dir()
    portable.configurar(dados)
    monkeypatch.setattr(settings, "database_url", os.environ["DATABASE_URL"])
    senha = portable.migrar_e_semear(dados)
    assert senha and (dados / "escalas.db").exists()
    assert "admin@local" in (dados / "credenciais-iniciais.txt").read_text("utf-8")
    assert portable.migrar_e_semear(dados) is None          # idempotente
    assert 1024 <= portable.free_port() <= 65535
    monkeypatch.setattr(portable, "base_dir", lambda: tmp_path)
    app = portable.criar_app()
    c = TestClient(app)
    assert c.get("/health").status_code == 200
    assert "Simulador" in c.get("/o/x/operacoes").text and "Simulador" in c.get("/").text
    assert c.get("/assets/a.js").text == "x"
    from sqlalchemy.orm import sessionmaker

    from escalas.db.session import get_session, make_engine

    mk = sessionmaker(bind=make_engine(os.environ["DATABASE_URL"]))

    def _s():  # type: ignore[no-untyped-def]
        with mk() as s:
            yield s

    app.dependency_overrides[get_session] = _s
    r = c.post("/api/v1/escalas/auth/login", json={"email": "admin@local", "password": senha})
    app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
