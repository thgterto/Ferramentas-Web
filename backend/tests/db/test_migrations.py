"""A21: Alembic upgrade/downgrade + paridade modelos × migrações (SQLite; PG se disponível)."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from sqlalchemy import inspect, select

from alembic import command
from alembic.config import Config
from app.core.config import settings
from app.db.models import LegalRegime, ScheduleModel
from app.db.session import make_engine

BACKEND = Path(__file__).resolve().parents[2]
PG = os.environ.get("TEST_POSTGRES_URL")


def _cfg() -> Config:
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    return cfg


def alembic_upgrade(url: str, rev: str) -> None:
    old = settings.database_url
    settings.database_url = url
    try:
        command.upgrade(_cfg(), rev)
    finally:
        settings.database_url = old


def alembic_downgrade(url: str, rev: str) -> None:
    old = settings.database_url
    settings.database_url = url
    try:
        command.downgrade(_cfg(), rev)
    finally:
        settings.database_url = old


def _ciclo(url: str) -> None:
    alembic_upgrade(url, "head")
    eng = make_engine(url)
    tabelas = set(inspect(eng).get_table_names())
    assert {"scenarios", "legal_regimes", "scenario_transition_results", "team_constraints",
            "substitution_rules", "coverage_role_results", "custom_schedule_patterns"} <= tabelas
    assert "employees" not in tabelas and "financial_results" not in tabelas  # Fase 2 / P2
    from sqlalchemy.orm import Session

    with Session(eng) as s:
        assert len(s.scalars(select(ScheduleModel)).all()) == 45  # v3.6: 44 + PERSONALIZADO
        assert [r.code for r in s.scalars(select(LegalRegime).order_by(LegalRegime.id))] == [
            "CLT_44H_ATUAL", "TRANSICAO_42H", "PEC_40H"]
    # paridade: autogenerate não detecta diferenças entre ORM e migrações
    old = settings.database_url
    settings.database_url = url
    try:
        command.check(_cfg())
    finally:
        settings.database_url = old
    alembic_downgrade(url, "base")
    assert set(inspect(eng).get_table_names()) <= {"alembic_version"}
    alembic_upgrade(url, "head")
    eng.dispose()


def test_upgrade_downgrade_sqlite(tmp_path: Path) -> None:
    _ciclo(f"sqlite:///{tmp_path / 'm.db'}")


@pytest.mark.skipif(not PG, reason="TEST_POSTGRES_URL não definido")
def test_upgrade_downgrade_postgres() -> None:
    assert PG
    from sqlalchemy import text

    eng = make_engine(PG)
    with eng.begin() as c:
        c.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public"))
    eng.dispose()
    _ciclo(PG)
