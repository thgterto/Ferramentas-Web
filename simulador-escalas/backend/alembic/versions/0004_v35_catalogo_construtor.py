"""v3.5 — catálogo completo (§6.1), construtor de padrões e K livre.

* ``custom_schedule_patterns`` (templates do construtor, FR-29/FR-31) com RLS no PostgreSQL;
* seeds dos modelos da Fase 2 trazidos ao MVP (27 modelos) + ``PERSONALIZADO`` (âncora do FK
  de cenários com ``params.pattern``), turnos novos e regras ``COB_*`` do construtor;
* ``scenarios.team_count`` aceita K livre (1..500) — só PostgreSQL (SQLite de dev usa
  ``create_all``).

Revision ID: 0004_v35_catalogo_construtor
Revises: 0003_mvp_rls
Create Date: 2026-11-09
"""

import sqlalchemy as sa
from sqlalchemy import Text
from sqlalchemy.dialects import postgresql

from alembic import op
from escalas.db import models as _models  # noqa: F401
from escalas.db import seeds
from escalas.db.base import Base

revision = "0004_v35_catalogo_construtor"
down_revision = "0003_mvp_rls"
branch_labels = None
depends_on = None

_BIG = sa.BigInteger().with_variant(sa.Integer(), "sqlite")
_JSON = sa.JSON().with_variant(postgresql.JSONB(astext_type=Text()), "postgresql")


def _pg() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def upgrade() -> None:
    op.create_table(
        "custom_schedule_patterns",
        sa.Column("id", _BIG, autoincrement=True, nullable=False),
        sa.Column("public_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", _BIG, nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("derived_from_code", sa.String(length=24), nullable=True),
        sa.Column("current_version", sa.Integer(), nullable=False),
        sa.Column("is_shared", sa.Boolean(), nullable=False),
        sa.Column("spec", _JSON, nullable=False),
        sa.Column("validation", _JSON, nullable=False),
        sa.Column("created_by", _BIG, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"],
                                name=op.f("fk_custom_schedule_patterns_created_by_users")),
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE",
            name=op.f("fk_custom_schedule_patterns_organization_id_organizations")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_custom_schedule_patterns")),
        sa.UniqueConstraint("organization_id", "name",
                            name=op.f("uq_custom_schedule_patterns_organization_id")),
        sa.UniqueConstraint("public_id", name=op.f("uq_custom_schedule_patterns_public_id")),
    )
    op.create_index(op.f("ix_custom_schedule_patterns_organization_id"),
                    "custom_schedule_patterns", ["organization_id"], unique=False)
    meta = Base.metadata.tables
    op.bulk_insert(meta["schedule_models"],
                   [r for r in seeds.schedule_model_rows() if r["phase"] != "mvp"])
    op.bulk_insert(meta["shift_templates"],
                   [r for r in seeds.shift_template_rows() if r["code"] not in seeds.MVP_SHIFTS])
    op.bulk_insert(meta["compliance_rules"],
                   [r for r in seeds.COMPLIANCE_RULES if r["code"] in seeds.RULES_V35])
    if _pg():
        op.execute("ALTER TABLE custom_schedule_patterns ENABLE ROW LEVEL SECURITY")
        op.execute("ALTER TABLE custom_schedule_patterns FORCE ROW LEVEL SECURITY")
        op.execute("""CREATE POLICY tenant_isolation ON custom_schedule_patterns
            USING (organization_id = (SELECT current_org_id()))
            WITH CHECK (organization_id = (SELECT current_org_id()))""")
        op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON custom_schedule_patterns TO app_user")
        op.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user")
        op.execute("ALTER TABLE scenarios DROP CONSTRAINT ck_scenarios_team_count")
        op.execute("ALTER TABLE scenarios ADD CONSTRAINT ck_scenarios_team_count "
                   "CHECK (team_count BETWEEN 1 AND 500)")


def downgrade() -> None:
    if _pg():
        op.execute("ALTER TABLE scenarios DROP CONSTRAINT ck_scenarios_team_count")
        op.execute("ALTER TABLE scenarios ADD CONSTRAINT ck_scenarios_team_count "
                   "CHECK (team_count BETWEEN 1 AND 12)")
    codes = ", ".join(f"'{c}'" for c in seeds.RULES_V35)
    op.execute(f"DELETE FROM compliance_rules WHERE code IN ({codes})")
    shifts = ", ".join(f"'{c}'" for c in seeds.MVP_SHIFTS)
    op.execute(f"DELETE FROM shift_templates WHERE organization_id IS NULL "
               f"AND code NOT IN ({shifts})")
    op.execute("DELETE FROM schedule_models WHERE phase <> 'mvp'")
    op.drop_index(op.f("ix_custom_schedule_patterns_organization_id"),
                  table_name="custom_schedule_patterns")
    op.drop_table("custom_schedule_patterns")
