"""v3.8 — Colaboradores (cadastro completo) + catálogo 6x1/5x1 corrigido.

* ``employees``: matrícula, habilidades/certificações, admissão, jornada contratual,
  restrições (ex.: não faz noite), pools que pode cobrir e status (ativo/inativo);
* catálogo: 6X1_BASE e 5X1 com turno fixo por turma (repouso ≥ 35 h), novo 5X1_DIURNO
  (5x1 rotativo diurno 7h12) e turno D72 — sincronizados a partir do seed (idempotente:
  atualiza o que existe, insere o que falta).

Revision ID: 0006_v38_colaboradores_6x1_5x1
Revises: 0005_v37_subsetores_otimizadores
Create Date: 2026-11-09
"""

import sqlalchemy as sa

from alembic import op
from escalas.db import seeds
from escalas.db.base import Base

revision = "0006_v38_colaboradores_6x1_5x1"
down_revision = "0005_v37_subsetores_otimizadores"
branch_labels = None
depends_on = None

_JSON = sa.JSON().with_variant(sa.dialects.postgresql.JSONB(), "postgresql")
MODELOS = ("6X1_BASE", "5X1", "5X1_DIURNO")
TURNOS = ("D72",)


def _sync(tabela: str, chave: str, linhas: list[dict[str, object]], extra: str = "") -> None:
    bind = op.get_bind()
    t = Base.metadata.tables[tabela]
    for r in linhas:
        cond = t.c[chave] == r[chave]
        if extra:
            cond = sa.and_(cond, t.c[extra].is_(None))
        existe = bind.execute(sa.select(t.c.id).where(cond)).first()
        if existe:
            bind.execute(t.update().where(t.c.id == existe[0]).values(**r))
        else:
            bind.execute(t.insert().values(**r))


def upgrade() -> None:
    with op.batch_alter_table("employees", schema=None) as b:
        b.add_column(sa.Column("registration", sa.String(length=40), nullable=True))
        b.add_column(sa.Column("skills", _JSON, server_default=sa.text("'[]'"), nullable=False))
        b.add_column(sa.Column("hire_date", sa.Date(), nullable=True))
        b.add_column(sa.Column("contract_weekly_hours", sa.Numeric(5, 2), nullable=True))
        b.add_column(sa.Column("restrictions", _JSON, server_default=sa.text("'[]'"),
                               nullable=False))
        b.add_column(sa.Column("pool_codes", _JSON, server_default=sa.text("'[]'"),
                               nullable=False))
        b.add_column(sa.Column("active", sa.Boolean(), server_default=sa.true(),
                               nullable=False))
        b.create_index(b.f("ix_employees_registration"), ["registration"], unique=False)
    _sync("schedule_models", "code",
          [r for r in seeds.schedule_model_rows() if r["code"] in MODELOS])
    _sync("shift_templates", "code",
          [r for r in seeds.shift_template_rows() if r["code"] in TURNOS], "organization_id")


def downgrade() -> None:
    op.execute("DELETE FROM schedule_models WHERE code = '5X1_DIURNO' AND id NOT IN "
               "(SELECT schedule_model_id FROM scenarios)")
    with op.batch_alter_table("employees", schema=None) as b:
        b.drop_index(b.f("ix_employees_registration"))
        for c in ("active", "pool_codes", "restrictions", "contract_weekly_hours", "hire_date",
                  "skills", "registration"):
            b.drop_column(c)
