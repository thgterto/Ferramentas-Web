"""A21 — multi-tenancy com RLS (05 §4) — só PostgreSQL (no SQLite é no-op; o isolamento lá é
o filtro por ``organization_id`` dos repositórios).

A aplicação conecta como ``app_user`` (sem BYPASSRLS) e cada transação faz
``set_config('app.org_id', …, true)`` (``app.db.session.set_tenant``).

Revision ID: 0003_mvp_rls
Revises: 0002_mvp_seeds
Create Date: 2026-11-08
"""

from alembic import op
from app.db.models import GLOBAL_TABLES, SHARED_TABLES, TENANT_TABLES

revision = "0003_mvp_rls"
down_revision = "0002_mvp_seeds"
branch_labels = None
depends_on = None


def _pg() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def upgrade() -> None:
    if not _pg():
        return
    op.execute("""
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END $$;""")
    op.execute("""
CREATE OR REPLACE FUNCTION current_org_id() RETURNS bigint
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.org_id', true), '')::bigint $$;""")
    op.execute("""
CREATE OR REPLACE FUNCTION current_user_id() RETURNS bigint
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '')::bigint $$;""")
    op.execute("GRANT USAGE ON SCHEMA public TO app_user")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user")
    op.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user")
    for t in TENANT_TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {t} FORCE ROW LEVEL SECURITY")
        op.execute(f"""CREATE POLICY tenant_isolation ON {t}
            USING (organization_id = (SELECT current_org_id()))
            WITH CHECK (organization_id = (SELECT current_org_id()))""")
    for t in SHARED_TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")
        op.execute(f"""CREATE POLICY {t}_read ON {t} FOR SELECT
            USING (organization_id IS NULL OR organization_id = (SELECT current_org_id()))""")
        op.execute(f"""CREATE POLICY {t}_write ON {t} FOR ALL
            USING (organization_id = (SELECT current_org_id()))
            WITH CHECK (organization_id = (SELECT current_org_id()))""")
    op.execute("REVOKE INSERT, UPDATE, DELETE ON " + ", ".join(GLOBAL_TABLES) + " FROM app_user")
    op.execute("ALTER TABLE organizations ENABLE ROW LEVEL SECURITY")
    op.execute("CREATE POLICY org_self ON organizations USING (id = (SELECT current_org_id()))")
    # Login/troca de org: o usuário enxerga os próprios vínculos e as orgs onde é membro
    # (app.user_id é definido antes de o tenant ser conhecido — app.db.session.set_user).
    op.execute("""CREATE POLICY member_self ON memberships FOR SELECT
        USING (user_id = (SELECT current_user_id()))""")
    op.execute("""CREATE POLICY org_member ON organizations FOR SELECT
        USING (id IN (SELECT organization_id FROM memberships
                      WHERE user_id = (SELECT current_user_id())))""")
    # Vigência sem sobreposição entre regimes datados (btree_gist) — 05 §3.13
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.execute("""ALTER TABLE legal_regimes ADD CONSTRAINT ex_legal_regimes_no_overlap
        EXCLUDE USING gist (daterange(valid_from, valid_to, '[]') WITH &&)
        WHERE (valid_from IS NOT NULL AND status <> 'previsto')""")


def downgrade() -> None:
    if not _pg():
        return
    op.execute("ALTER TABLE legal_regimes DROP CONSTRAINT IF EXISTS ex_legal_regimes_no_overlap")
    op.execute("DROP POLICY IF EXISTS org_member ON organizations")
    op.execute("DROP POLICY IF EXISTS member_self ON memberships")
    op.execute("DROP POLICY IF EXISTS org_self ON organizations")
    op.execute("ALTER TABLE organizations DISABLE ROW LEVEL SECURITY")
    for t in SHARED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS {t}_read ON {t}")
        op.execute(f"DROP POLICY IF EXISTS {t}_write ON {t}")
        op.execute(f"ALTER TABLE {t} DISABLE ROW LEVEL SECURITY")
    for t in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {t}")
        op.execute(f"ALTER TABLE {t} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {t} DISABLE ROW LEVEL SECURITY")
    op.execute("DROP FUNCTION IF EXISTS current_org_id()")
    op.execute("DROP FUNCTION IF EXISTS current_user_id()")
