"""A21/A46 — seeds globais: turnos, 10 modelos essenciais (+ regime_compliance), regras de
compliance (incl. v3.4) e regimes legais (CLT_44H_ATUAL, TRANSICAO_42H, PEC_40H).

Os valores vêm dos DADOS versionados do motor (seeds YAML) via ``app.db.seeds``; nova versão
de regime = nova linha (version + 1), nunca UPDATE destrutivo (ADR-011).

Revision ID: 0002_mvp_seeds
Revises: 0001_mvp_schema
Create Date: 2026-11-08
"""

import sqlalchemy as sa

from alembic import op
from app.db import models as _models  # noqa: F401
from app.db import seeds
from app.db.base import Base

revision = "0002_mvp_seeds"
down_revision = "0001_mvp_schema"
branch_labels = None
depends_on = None


def _table(name: str) -> sa.Table:
    # Tabela do metadata ORM (traz defaults Python, ex.: public_id) — funciona também --sql.
    return Base.metadata.tables[name]


def upgrade() -> None:
    op.bulk_insert(_table("shift_templates"), seeds.shift_template_rows())
    op.bulk_insert(_table("schedule_models"), seeds.schedule_model_rows())
    op.bulk_insert(_table("compliance_rules"), seeds.COMPLIANCE_RULES)
    op.bulk_insert(_table("legal_regimes"), seeds.legal_regime_rows())


def downgrade() -> None:
    for t in ("legal_regimes", "compliance_rules", "schedule_models"):
        op.execute(f"DELETE FROM {t}")
    op.execute("DELETE FROM shift_templates WHERE organization_id IS NULL")
