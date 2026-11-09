# -*- mode: python ; coding: utf-8 -*-
# PyInstaller one-folder do Simulador de Escalas (v3.8). Gerado/usado por build.sh / build.ps1:
#   pyinstaller --noconfirm --distpath dist --workpath build simulador-escalas.spec
# Pré-requisito: frontend buildado em ../frontend/dist (copiado como "web").
from pathlib import Path

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

ROOT = Path(SPECPATH).resolve().parent
BACK = ROOT / "backend"
datas = [
    (str(BACK / "alembic"), "alembic"),
    (str(ROOT / "frontend" / "dist"), "web"),
    *collect_data_files("escalas", includes=["**/*.yaml"]),
    *collect_data_files("ortools"),
]
hidden = [
    *collect_submodules("escalas"),
    *collect_submodules("uvicorn"),
    "sqlalchemy.dialects.sqlite",
    "argon2",
    "multipart",
    "openpyxl",
]

a = Analysis(
    [str(Path(SPECPATH) / "entry.py")],
    pathex=[str(BACK)],
    datas=datas,
    hiddenimports=hidden,
    excludes=["tkinter", "pytest", "hypothesis", "mypy", "psycopg2"],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name="simulador-escalas",
          console=True, upx=False)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name="simulador-escalas")
