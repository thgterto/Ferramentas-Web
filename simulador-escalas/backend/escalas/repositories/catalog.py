"""Catálogos globais (somente leitura) e turnos (globais + do tenant)."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from escalas.core.errors import not_found
from escalas.db.models import ComplianceRule, LegalRegime, ScheduleModel, ShiftTemplate


class CatalogRepo:
    def __init__(self, session: Session, org_id: int | None = None) -> None:
        self.s = session
        self.org_id = org_id

    def schedule_models(self) -> Sequence[ScheduleModel]:
        return self.s.scalars(select(ScheduleModel).where(ScheduleModel.is_active)
                              .order_by(ScheduleModel.id)).all()

    def schedule_model(self, code: str) -> ScheduleModel:
        m = self.s.scalar(select(ScheduleModel).where(ScheduleModel.code == code))
        if m is None:
            raise not_found("modelo de escala")
        return m

    def schedule_model_by_id(self, id_: int) -> ScheduleModel:
        m = self.s.get(ScheduleModel, id_)
        if m is None:
            raise not_found("modelo de escala")
        return m

    def shift_templates(self) -> Sequence[ShiftTemplate]:
        return self.s.scalars(select(ShiftTemplate).where(
            or_(ShiftTemplate.organization_id.is_(None),
                ShiftTemplate.organization_id == self.org_id),
            ShiftTemplate.deleted_at.is_(None)).order_by(ShiftTemplate.id)).all()

    def compliance_rules(self) -> Sequence[ComplianceRule]:
        return self.s.scalars(select(ComplianceRule).order_by(ComplianceRule.code)).all()

    def rules_by_code(self) -> dict[str, ComplianceRule]:
        return {r.code: r for r in self.compliance_rules()}

    def legal_regimes(self) -> Sequence[LegalRegime]:
        return self.s.scalars(select(LegalRegime).order_by(LegalRegime.id)).all()

    def legal_regime(self, code: str, version: int | None = None) -> LegalRegime:
        q = select(LegalRegime).where(LegalRegime.code == code)
        if version is not None:
            q = q.where(LegalRegime.version == version)
        r = self.s.scalars(q.order_by(LegalRegime.version.desc())).first()
        if r is None:
            raise not_found("regime legal")
        return r

    def legal_regime_by_id(self, id_: int | None) -> LegalRegime | None:
        return None if id_ is None else self.s.get(LegalRegime, id_)
