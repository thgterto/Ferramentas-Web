"""v3.9 — mínimo de 2 folgas semanais nos regimes pós-6x1 (42 h e 40 h).

Só dados: ``legal_regimes.min_rest_days_per_week`` e os selos
``schedule_models.regime_compliance`` recalculados, sincronizados a partir do seed
(o motor lê o regime do YAML; estas colunas alimentam o catálogo e a linha do tempo).

Revision ID: 0007_v39_minimo_2_folgas
Revises: 0006_v38_colaboradores_6x1_5x1
Create Date: 2026-11-14
"""

import sqlalchemy as sa

from alembic import op
from escalas.db import seeds
from escalas.db.base import Base

revision = "0007_v39_minimo_2_folgas"
down_revision = "0006_v38_colaboradores_6x1_5x1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    reg = Base.metadata.tables["legal_regimes"]
    for r in seeds.legal_regime_rows():
        bind.execute(reg.update().where(sa.and_(reg.c.code == r["code"],
                                                reg.c.version == r["version"]))
                     .values(min_rest_days_per_week=r["min_rest_days_per_week"]))
    mod = Base.metadata.tables["schedule_models"]
    for m in seeds.schedule_model_rows():
        bind.execute(mod.update().where(mod.c.code == m["code"])
                     .values(regime_compliance=m["regime_compliance"]))


def downgrade() -> None:
    op.execute("UPDATE legal_regimes SET min_rest_days_per_week = 1 "
               "WHERE code = 'TRANSICAO_42H'")
