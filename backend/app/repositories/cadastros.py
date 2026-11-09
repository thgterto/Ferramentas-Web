"""Repositórios dos cadastros de tenant."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import delete, select

from app.db.models import (
    DemandCurve,
    DemandSlot,
    LaborAgreement,
    Operation,
    Position,
    Role,
    RoleCoverageRequirement,
    ShrinkageProfile,
    SubstitutionRule,
    TeamConstraint,
)
from app.repositories.base import TenantRepository


class LaborAgreementRepo(TenantRepository[LaborAgreement]):
    model = LaborAgreement
    label = "acordo"


class OperationRepo(TenantRepository[Operation]):
    model = Operation
    label = "operação"


class PositionRepo(TenantRepository[Position]):
    model = Position
    label = "posto"


class ShrinkageRepo(TenantRepository[ShrinkageProfile]):
    model = ShrinkageProfile
    label = "perfil de shrinkage"


class DemandCurveRepo(TenantRepository[DemandCurve]):
    model = DemandCurve
    label = "curva de demanda"

    def slots(self, curve_id: int) -> Sequence[DemandSlot]:
        return self.s.scalars(select(DemandSlot).where(
            DemandSlot.organization_id == self.org_id, DemandSlot.demand_curve_id == curve_id
        ).order_by(DemandSlot.slot_index)).all()

    def replace_slots(self, curve_id: int, rows: list[dict[str, object]]) -> None:
        self.s.execute(delete(DemandSlot).where(DemandSlot.organization_id == self.org_id,
                                                DemandSlot.demand_curve_id == curve_id))
        self.s.add_all(DemandSlot(organization_id=self.org_id, demand_curve_id=curve_id, **r)
                       for r in rows)
        self.s.flush()


class RoleRepo(TenantRepository[Role]):
    model = Role
    label = "cargo"

    def by_code(self, code: str) -> Role | None:
        return self.s.scalar(self._base().where(Role.code == code))


class SubstitutionRepo(TenantRepository[SubstitutionRule]):
    model = SubstitutionRule
    label = "regra de substituição"
    soft_delete = False

    def replace_all(self, rows: list[dict[str, object]]) -> None:
        self.s.execute(delete(SubstitutionRule).where(
            SubstitutionRule.organization_id == self.org_id))
        self.s.add_all(SubstitutionRule(organization_id=self.org_id, **r) for r in rows)
        self.s.flush()


class RoleRequirementRepo(TenantRepository[RoleCoverageRequirement]):
    model = RoleCoverageRequirement
    label = "mínimo por cargo"
    soft_delete = False


class TeamConstraintRepo(TenantRepository[TeamConstraint]):
    model = TeamConstraint
    label = "restrição de turmas"
    soft_delete = False

    def for_operation(self, operation_id: int) -> TeamConstraint | None:
        return self.s.scalar(self._base().where(TeamConstraint.operation_id == operation_id))

    def replace_for_operation(self, operation_id: int, rows: list[dict[str, object]]) -> None:
        self.s.execute(delete(TeamConstraint).where(
            TeamConstraint.organization_id == self.org_id,
            TeamConstraint.operation_id == operation_id))
        self.s.add_all(TeamConstraint(organization_id=self.org_id, operation_id=operation_id,
                                      **r) for r in rows)
        self.s.flush()
