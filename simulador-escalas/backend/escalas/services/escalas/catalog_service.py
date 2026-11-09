"""Catálogos e regimes legais (FR-39, FR-42)."""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from escalas.core.config import settings
from escalas.core.errors import validation
from escalas.db.models import LegalRegime
from escalas.repositories.catalog import CatalogRepo
from escalas.schemas.catalog import (
    ComplianceRuleOut,
    LegalRegimeOut,
    ScheduleModelOut,
    ShiftTemplateOut,
)
from escalas.services.engine.regime_legal import (
    RegimeLegal,
    RegimeNaoResolvido,
    regimes_mvp,
    resolver_regime,
)


def schedule_models(db: Session, regime: str | None, group: str | None,
                    exact: bool | None) -> list[ScheduleModelOut]:
    out = []
    for m in CatalogRepo(db).schedule_models():
        if m.catalog_group == "personalizado":
            continue
        if group and m.catalog_group != group:
            continue
        if exact is not None and m.exact_24x7 != exact:
            continue
        o = ScheduleModelOut.model_validate(m)
        if regime:
            rc = m.regime_compliance
            o.regime_compliance = {regime: rc.get(regime) or rc.get("*") or {}}
        out.append(o)
    return out


def shift_templates(db: Session, org_id: int) -> list[ShiftTemplateOut]:
    return [ShiftTemplateOut(id=t.public_id, code=t.code, name=t.name,
                             start_time=t.start_time.strftime("%H:%M"),
                             duration_minutes=t.duration_minutes, break_minutes=t.break_minutes,
                             break_policy=t.break_policy,
                             scope="global" if t.organization_id is None else "organization")
            for t in CatalogRepo(db, org_id).shift_templates()]


def compliance_rules(db: Session) -> list[ComplianceRuleOut]:
    return [ComplianceRuleOut.model_validate(r) for r in CatalogRepo(db).compliance_rules()]


def regime_out(row: LegalRegime) -> LegalRegimeOut:
    o = LegalRegimeOut.model_validate(row)
    eng = regimes_mvp().regimes.get(row.code)
    if eng is not None and eng.versao == row.version:
        ini, fim, _ = eng.vigencia(settings.legal_d0)
        o.resolved_valid_from, o.resolved_valid_to = ini, fim
    return o


def resolve_engine_regime(code: str | None, ref: date | None) -> RegimeLegal:
    try:
        return resolver_regime(regimes_mvp(), code, ref, settings.legal_d0)
    except KeyError as exc:
        raise validation(f"regime legal inexistente: {code}", code="REGIME_NAO_RESOLVIDO") \
            from exc
    except RegimeNaoResolvido as exc:
        raise validation(str(exc), code="REGIME_NAO_RESOLVIDO") from exc


def resolve(db: Session, ref: date) -> LegalRegimeOut:
    r = resolve_engine_regime(None, ref)
    return regime_out(CatalogRepo(db).legal_regime(r.codigo, r.versao))
