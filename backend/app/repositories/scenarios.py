"""Cenários, turmas, alocações e resultados (sempre filtrados pelo tenant)."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, select

from app.db.models import (
    Assignment,
    ComplianceFinding,
    CoverageResult,
    CoverageRoleResult,
    Scenario,
    ScenarioShiftTemplate,
    ScenarioTransitionResult,
    Team,
    TeamRoleComposition,
)
from app.repositories.base import TenantRepository

_RESULTADOS = (Assignment, CoverageResult, CoverageRoleResult, ComplianceFinding)


class ScenarioRepo(TenantRepository[Scenario]):
    model = Scenario
    label = "cenário"
    soft_delete = False

    def _base(self):  # type: ignore[no-untyped-def]
        return super()._base().where(Scenario.status != "arquivado")

    # ---- turmas ----------------------------------------------------------------
    def teams(self, scenario_id: int) -> Sequence[Team]:
        return self.s.scalars(select(Team).where(
            Team.organization_id == self.org_id, Team.scenario_id == scenario_id
        ).order_by(Team.id)).all()

    def team(self, scenario_id: int, code: str) -> Team | None:
        return self.s.scalar(select(Team).where(
            Team.organization_id == self.org_id, Team.scenario_id == scenario_id,
            Team.code == code))

    def composition(self, team_ids: Sequence[int]) -> Sequence[TeamRoleComposition]:
        if not team_ids:
            return []
        return self.s.scalars(select(TeamRoleComposition).where(
            TeamRoleComposition.organization_id == self.org_id,
            TeamRoleComposition.team_id.in_(team_ids))).all()

    def set_composition(self, team_id: int, rows: dict[int, int]) -> None:
        self.s.execute(delete(TeamRoleComposition).where(
            TeamRoleComposition.organization_id == self.org_id,
            TeamRoleComposition.team_id == team_id))
        self.s.add_all(TeamRoleComposition(organization_id=self.org_id, team_id=team_id,
                                           role_id=r, headcount=h) for r, h in rows.items())
        self.s.flush()

    def set_shift_templates(self, scenario_id: int, ids: Sequence[int]) -> None:
        self.s.execute(delete(ScenarioShiftTemplate).where(
            ScenarioShiftTemplate.organization_id == self.org_id,
            ScenarioShiftTemplate.scenario_id == scenario_id))
        self.s.add_all(ScenarioShiftTemplate(organization_id=self.org_id,
                                             scenario_id=scenario_id, shift_template_id=i)
                       for i in ids)

    # ---- resultados --------------------------------------------------------------
    def clear_results(self, scenario_id: int) -> None:
        for m in _RESULTADOS:
            mm: Any = m
            self.s.execute(delete(m).where(mm.organization_id == self.org_id,
                                           mm.scenario_id == scenario_id))
        self.s.flush()

    def ensure_teams(self, scenario_id: int, rows: list[dict[str, Any]]) -> list[Team]:
        """Atualiza turmas por código; preserva composição das que continuam."""
        atuais = {t.code: t for t in self.teams(scenario_id)}
        novos = {r["code"] for r in rows}
        for code, velho in atuais.items():
            if code not in novos:
                self.s.delete(velho)
        out: list[Team] = []
        for r in rows:
            t: Team | None = atuais.get(r["code"])
            if t is None:
                t = Team(organization_id=self.org_id, scenario_id=scenario_id, **r)
                self.s.add(t)
            else:
                for k, v in r.items():
                    setattr(t, k, v)
            out.append(t)
        self.s.flush()
        return out

    def bulk_add(self, objs: Sequence[Any]) -> None:
        self.s.add_all(objs)
        self.s.flush()

    def coverage(self, scenario_id: int) -> Sequence[CoverageResult]:
        return self.s.scalars(select(CoverageResult).where(
            CoverageResult.organization_id == self.org_id,
            CoverageResult.scenario_id == scenario_id).order_by(CoverageResult.slot_index)).all()

    def coverage_roles(self, scenario_id: int, role_id: int) -> Sequence[CoverageRoleResult]:
        return self.s.scalars(select(CoverageRoleResult).where(
            CoverageRoleResult.organization_id == self.org_id,
            CoverageRoleResult.scenario_id == scenario_id,
            CoverageRoleResult.role_id == role_id).order_by(CoverageRoleResult.slot_index)).all()

    def findings(self, scenario_id: int, severities: Sequence[str] | None,
                 codes: Sequence[str] | None, after_id: int, limit: int
                 ) -> Sequence[ComplianceFinding]:
        q = select(ComplianceFinding).where(
            ComplianceFinding.organization_id == self.org_id,
            ComplianceFinding.scenario_id == scenario_id, ComplianceFinding.id > after_id)
        if severities:
            q = q.where(ComplianceFinding.severity.in_(severities))
        if codes:
            q = q.where(ComplianceFinding.rule_code.in_(codes))
        return self.s.scalars(q.order_by(ComplianceFinding.id).limit(limit + 1)).all()

    def assignments(self, scenario_id: int, team_id: int | None, after_id: int,
                    limit: int) -> Sequence[Assignment]:
        q = select(Assignment).where(Assignment.organization_id == self.org_id,
                                     Assignment.scenario_id == scenario_id,
                                     Assignment.id > after_id)
        if team_id is not None:
            q = q.where(Assignment.team_id == team_id)
        return self.s.scalars(q.order_by(Assignment.id).limit(limit + 1)).all()

    def replace_transition(self, scenario_id: int, rows: list[dict[str, Any]]) -> None:
        self.s.execute(delete(ScenarioTransitionResult).where(
            ScenarioTransitionResult.organization_id == self.org_id,
            ScenarioTransitionResult.scenario_id == scenario_id))
        self.s.add_all(ScenarioTransitionResult(organization_id=self.org_id,
                                                scenario_id=scenario_id, **r) for r in rows)
        self.s.flush()
