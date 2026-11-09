"""Exporta o contrato OpenAPI (A24/F2-8) para ``frontend/src/api/openapi.json``.

Uso: ``python scripts/export_openapi.py [--check]`` — ``--check`` falha se o arquivo estiver
desatualizado (CI). Os tipos TS são gerados a partir dele com ``npm run gen:api``.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
OUT = ROOT / "frontend" / "src" / "api" / "openapi.json"


def render() -> str:
    from escalas.main import app

    return json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> int:
    texto = render()
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text("utf-8") != texto:
            print(f"{OUT} desatualizado: rode scripts/export_openapi.py e npm run gen:api")
            return 1
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(texto, "utf-8")
    print(f"escrito {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
