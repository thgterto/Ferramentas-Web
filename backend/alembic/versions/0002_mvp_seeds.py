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
    # v3.5: 0002 grava só o catálogo essencial (fase 'mvp'); o restante entra na 0004.
    op.bulk_insert(_table("shift_templates"),
                   [r for r in seeds.shift_template_rows() if r["code"] in seeds.MVP_SHIFTS])
    op.bulk_insert(_table("schedule_models"),
                   [r for r in seeds.schedule_model_rows() if r["phase"] == "mvp"])
    op.bulk_insert(_table("compliance_rules"),
                   [r for r in seeds.COMPLIANCE_RULES if r["code"] not in seeds.RULES_V35 | seeds.RULES_V37])
    op.bulk_insert(_table("legal_regimes"), seeds.legal_regime_rows())


def downgrade() -> None:
    for t in ("legal_regimes", "compliance_rules", "schedule_models"):
        op.execute(f"DELETE FROM {t}")
    op.execute("DELETE FROM shift_templates WHERE organization_id IS NULL")
