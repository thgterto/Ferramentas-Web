"""Versão portable (v3.8): um executável que roda offline, sem Python/Node/Postgres.

* dados em ``<pasta do usuário>/SimuladorEscalas`` (``ESCALAS_DATA_DIR`` sobrescreve):
  ``escalas.db`` (SQLite), ``config.env`` (segredo JWT) e ``credenciais-iniciais.txt``;
* 1ª execução: migrações Alembic + seeds (catálogo, regimes, regras) + usuário admin com
  senha aleatória; execuções seguintes só aplicam migrações novas;
* serve a API em ``/api`` e o frontend buildado (``web/``) como estático com fallback SPA;
* escolhe uma porta livre em 127.0.0.1 e abre o navegador (``--no-browser`` desliga).
"""

from __future__ import annotations

import argparse
import os
import secrets
import socket
import sys
import threading
import webbrowser
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import FastAPI

ADMIN_EMAIL = "admin@local"


def base_dir() -> Path:
    """Raiz dos recursos empacotados (PyInstaller ``_MEIPASS``) ou do backend em dev."""
    return Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parents[1]))


def data_dir() -> Path:
    env = os.environ.get("ESCALAS_DATA_DIR")
    if env:
        d = Path(env)
    elif sys.platform == "win32":
        d = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData/Local")) / "SimuladorEscalas"
    elif sys.platform == "darwin":
        d = Path.home() / "Library/Application Support/SimuladorEscalas"
    else:
        d = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local/share")) / "SimuladorEscalas"
    d.mkdir(parents=True, exist_ok=True)
    return d


def free_port(preferida: int = 8765) -> int:
    for porta in (preferida, 0):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", porta))
            except OSError:
                continue
            return int(s.getsockname()[1])
    raise RuntimeError("sem porta livre")


def configurar(dados: Path) -> None:
    """Define DATABASE_URL e JWT_SECRET (persistido) ANTES de importar ``escalas``."""
    cfg = dados / "config.env"
    if not cfg.exists():
        cfg.write_text(f"JWT_SECRET={secrets.token_urlsafe(48)}\n", "utf-8")
    for linha in cfg.read_text("utf-8").splitlines():
        k, _, v = linha.partition("=")
        if k.strip():
            os.environ.setdefault(k.strip(), v.strip())
    os.environ["DATABASE_URL"] = f"sqlite:///{(dados / 'escalas.db').as_posix()}"


def migrar_e_semear(dados: Path) -> str | None:
    """Alembic até head + usuário admin na 1ª execução; devolve a senha criada (ou None)."""
    from sqlalchemy import select
    from sqlalchemy.orm import sessionmaker

    from alembic import command
    from alembic.config import Config
    from escalas.core.security import hash_password
    from escalas.db.models import User
    from escalas.db.seeds import seed_globals
    from escalas.db.session import make_engine
    from escalas.repositories.tenancy import UserRepository

    cfg = Config()
    cfg.set_main_option("script_location", str(base_dir() / "alembic"))
    command.upgrade(cfg, "head")
    eng = make_engine(os.environ["DATABASE_URL"])
    senha = None
    with sessionmaker(bind=eng, expire_on_commit=False)() as s:
        seed_globals(s)
        if s.scalar(select(User).limit(1)) is None:
            senha = secrets.token_urlsafe(9)
            repo = UserRepository(s)
            org = repo.create_org("Minha organização")
            u = repo.create_user(ADMIN_EMAIL, "Administrador", hash_password(senha))
            repo.add_membership(org, u, "owner")
            s.commit()
            (dados / "credenciais-iniciais.txt").write_text(
                f"Simulador de Escalas — acesso inicial\nE-mail: {ADMIN_EMAIL}\n"
                f"Senha: {senha}\n(troque/guarde em local seguro e apague este arquivo)\n",
                "utf-8")
    eng.dispose()
    return senha


def criar_app() -> FastAPI:
    from fastapi.responses import FileResponse
    from starlette.staticfiles import StaticFiles

    from escalas.main import app

    web = base_dir() / "web"
    if web.is_dir():
        # a raiz passa a ser o simulador (SPA), não a mensagem JSON da API
        app.router.routes = [r for r in app.router.routes if getattr(r, "path", None) != "/"]
        app.mount("/assets", StaticFiles(directory=web / "assets"), name="assets")

        @app.get("/{caminho:path}", include_in_schema=False)
        def spa(caminho: str) -> FileResponse:
            alvo = (web / caminho).resolve()
            if caminho and alvo.is_file() and web.resolve() in alvo.parents:
                return FileResponse(alvo)
            return FileResponse(web / "index.html")
    return app


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Simulador de Cobertura de Escalas (portable)")
    ap.add_argument("--port", type=int, default=int(os.environ.get("ESCALAS_PORT", 8765)))
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args(argv)
    dados = data_dir()
    configurar(dados)
    senha = migrar_e_semear(dados)
    porta = free_port(a.port)
    url = f"http://127.0.0.1:{porta}"
    print(f"Simulador de Escalas em {url}  (dados: {dados})", flush=True)
    if senha:
        print(f"1º acesso: {ADMIN_EMAIL} / {senha}  (salvo em credenciais-iniciais.txt)",
              flush=True)
    import uvicorn

    app = criar_app()
    if not a.no_browser:
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    uvicorn.run(app, host="127.0.0.1", port=porta, log_level="warning")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
