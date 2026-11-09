"""Banco de demo/E2E (A44): cria o schema, os catálogos globais e um usuário.

Uso: ``DATABASE_URL=sqlite:///./escalas-dev.db python scripts/dev_seed.py``
Variáveis: ``SEED_EMAIL`` (padrão gerente@demo.local), ``SEED_PASSWORD`` (padrão demo-12345),
``SEED_RESET=1`` apaga o SQLite antes. Idempotente. Em PostgreSQL use Alembic (RLS) e
rode este script só para o usuário de demo.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def main() -> int:
    from sqlalchemy import make_url, select
    from sqlalchemy.orm import sessionmaker

    from app.core.config import settings
    from app.core.security import hash_password
    from app.db.base import Base
    from app.db.models import User
    from app.db.seeds import seed_globals
    from app.db.session import make_engine
    from app.repositories.tenancy import UserRepository

    url = settings.database_url
    if url.startswith("sqlite") and os.environ.get("SEED_RESET") == "1":
        db = make_url(url).database
        if db and Path(db).exists():
            Path(db).unlink()
    eng = make_engine(url)
    if url.startswith("sqlite"):
        Base.metadata.create_all(eng)
    email = os.environ.get("SEED_EMAIL", "gerente@demo.local")
    password = os.environ.get("SEED_PASSWORD", "demo-12345")
    with sessionmaker(bind=eng, expire_on_commit=False)() as s:
        seed_globals(s)
        if s.scalar(select(User).where(User.email == email)) is None:
            repo = UserRepository(s)
            org = repo.create_org("Planta Demo")
            u = repo.create_user(email, "Gerente de Operações", hash_password(password))
            repo.add_membership(org, u, "owner")
            s.commit()
    print(f"ok: {url} · usuário {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
