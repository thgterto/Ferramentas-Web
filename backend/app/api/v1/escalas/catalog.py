"""Catálogos (leitura) e regimes legais (FR-28, FR-39, FR-42)."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Query

from app.api.deps import DB, Current
from app.api.v1.escalas._common import ERRORS
from app.repositories.catalog import CatalogRepo
from app.schemas.catalog import (
    ComplianceRuleOut,
    LegalRegimeOut,
    ScheduleModelOut,
    ShiftTemplateOut,
)
from app.schemas.common import Envelope
from app.services.escalas import catalog_service as svc

router = APIRouter(responses=ERRORS, tags=["catalog"])


@router.get("/shift-templates", response_model=Envelope[list[ShiftTemplateOut]])
def shift_templates(p: Current, db: DB) -> object:
    return {"data": svc.shift_templates(db, p.org_id)}


@router.get("/schedule-models", response_model=Envelope[list[ScheduleModelOut]])
def schedule_models(
    _: Current, db: DB,
    group: Literal["continuo", "nao_continuo", "complementar", "variacao"] | None = None,
    exact_24x7: bool | None = None,
    regime: Annotated[str | None, Query(pattern=r"^[A-Z0-9_]{3,40}$")] = None,
) -> object:
    return {"data": svc.schedule_models(db, regime, group, exact_24x7)}


@router.get("/schedule-models/{code}", response_model=Envelope[ScheduleModelOut])
def schedule_model(code: str, _: Current, db: DB) -> object:
    return {"data": ScheduleModelOut.model_validate(CatalogRepo(db).schedule_model(code))}


@router.get("/compliance-rules", response_model=Envelope[list[ComplianceRuleOut]])
def compliance_rules(_: Current, db: DB) -> object:
    return {"data": svc.compliance_rules(db)}


@router.get("/legal-regimes", response_model=Envelope[list[LegalRegimeOut]],
            tags=["legal-regimes"])
def legal_regimes(_: Current, db: DB) -> object:
    return {"data": [svc.regime_out(r) for r in CatalogRepo(db).legal_regimes()]}


@router.get("/legal-regimes:resolve", response_model=Envelope[LegalRegimeOut],
            tags=["legal-regimes"])
def resolve(date_: Annotated[date, Query(alias="date")], _: Current, db: DB) -> object:
    """Regime vigente na data; 422 ``REGIME_NAO_RESOLVIDO`` se nenhum/vários (ou sem D0)."""
    return {"data": svc.resolve(db, date_)}


@router.get("/legal-regimes/{code}", response_model=Envelope[LegalRegimeOut],
            tags=["legal-regimes"])
def legal_regime(code: str, _: Current, db: DB, version: int | None = None) -> object:
    return {"data": svc.regime_out(CatalogRepo(db).legal_regime(code, version))}
