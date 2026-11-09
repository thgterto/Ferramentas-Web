"""A24/F2-8: contrato OpenAPI congelado (snapshot em frontend/src/api/openapi.json)."""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SPEC = importlib.util.spec_from_file_location("export_openapi",
                                              ROOT / "backend/scripts/export_openapi.py")
assert SPEC and SPEC.loader
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def test_snapshot_atualizado() -> None:
    assert mod.OUT.read_text("utf-8") == mod.render(), \
        "rode backend/scripts/export_openapi.py e npm run gen:api"


def test_rotas_mvp_presentes() -> None:
    import json

    paths = json.loads(mod.render())["paths"]
    base = "/api/v1/escalas"
    for p in ("/auth/login", "/me", "/operations", "/operations/{operation_id}/positions",
              "/positions/{position_id}/demand-curves", "/demand-curves/{curve_id}/slots",
              "/demand-curves/{curve_id}/slots:import", "/scenarios",
              "/scenarios/{scenario_id}/simulate", "/scenarios/{scenario_id}/coverage",
              "/scenarios/{scenario_id}/sizing", "/scenarios/{scenario_id}/compliance-findings",
              "/scenarios/{scenario_id}/transition", "/legal-regimes", "/legal-regimes:resolve",
              "/roles", "/substitution-rules", "/operations/{operation_id}/team-constraints",
              "/operations/{operation_id}/role-requirements",
              "/scenarios/{scenario_id}/teams/{code}/composition", "/schedule-models"):
        assert base + p in paths, p
    types = (ROOT / "frontend/src/api/types.ts").read_text("utf-8")
    assert '"/api/v1/escalas/scenarios/{scenario_id}/transition"' in types
