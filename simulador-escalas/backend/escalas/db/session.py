"""Engine/sessão síncronos e contexto de tenant (05 §4: ``SET LOCAL app.org_id``)."""

from __future__ import annotations

from collections.abc import Iterator
from functools import cache

from sqlalchemy import Connection, Engine, create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

from escalas.core.config import settings


def make_engine(url: str) -> Engine:
    kwargs: dict[str, object] = {"future": True}
    if url.startswith("sqlite"):
        from sqlalchemy.pool import StaticPool

        kwargs["connect_args"] = {"check_same_thread": False}
        if ":memory:" in url or url in ("sqlite://", "sqlite+pysqlite://"):
            kwargs["poolclass"] = StaticPool
    eng = create_engine(url, **kwargs)  # type: ignore[arg-type, unused-ignore]
    if url.startswith("sqlite"):
        @event.listens_for(eng, "connect")
        def _fk_on(dbapi_conn, _rec):  # type: ignore[no-untyped-def]
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA foreign_keys=ON")
            cur.close()
    return eng


@cache
def default_sessionmaker() -> sessionmaker[Session]:
    return sessionmaker(bind=make_engine(settings.database_url), expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """Dependência FastAPI; sobrescrita nos testes."""
    with default_sessionmaker()() as s:
        yield s


def _apply(session: Session, connection: Connection) -> None:
    if connection.dialect.name != "postgresql":
        return
    for key in ("org_id", "user_id"):
        if key in session.info:
            connection.execute(text(f"SELECT set_config('app.{key}', :v, true)"),
                               {"v": str(session.info[key])})


@event.listens_for(Session, "after_begin")
def _reapply_tenant(session: Session, _tx: object, connection: Connection) -> None:
    """``set_config(..., true)`` vale por transação: reaplica após cada commit."""
    _apply(session, connection)


def set_user(session: Session, user_id: int) -> None:
    """Antes de o tenant ser conhecido (login/``/me``): libera ver os próprios vínculos (RLS)."""
    session.info["user_id"] = user_id
    _apply(session, session.connection())


def set_tenant(session: Session, org_id: int, user_id: int | None = None) -> None:
    """Ativa a política RLS no PostgreSQL; no SQLite o isolamento é só o filtro do repositório."""
    session.info["org_id"] = org_id
    if user_id is not None:
        session.info["user_id"] = user_id
    _apply(session, session.connection())
