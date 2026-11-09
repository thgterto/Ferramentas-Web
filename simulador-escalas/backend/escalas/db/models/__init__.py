"""Modelos ORM do MVP (05 §3, só tabelas marcadas [MVP])."""

from escalas.db.models.catalog import (
    ComplianceRule,
    CustomSchedulePattern,
    LegalRegime,
    RotationPattern,
    ScheduleModel,
    ShiftTemplate,
)
from escalas.db.models.operations import (
    DemandCurve,
    DemandSlot,
    LaborAgreement,
    Operation,
    Position,
    ShrinkageProfile,
)
from escalas.db.models.results import (
    ComplianceFinding,
    CoverageResult,
    CoverageRoleResult,
    ScenarioTransitionResult,
)
from escalas.db.models.roles import (
    Role,
    RoleCoverageRequirement,
    SubstitutionRule,
    TeamConstraint,
    TeamRoleComposition,
)
from escalas.db.models.scenarios import Assignment, Scenario, ScenarioShiftTemplate, Team
from escalas.db.models.structure import Employee, Subsector, SubsectorPool, Workstation
from escalas.db.models.tenancy import Membership, Organization, User

__all__ = [
    "Assignment",
    "ComplianceFinding",
    "ComplianceRule",
    "CoverageResult",
    "CoverageRoleResult",
    "CustomSchedulePattern",
    "DemandCurve",
    "DemandSlot",
    "Employee",
    "LaborAgreement",
    "LegalRegime",
    "Membership",
    "Operation",
    "Organization",
    "Position",
    "Role",
    "RoleCoverageRequirement",
    "RotationPattern",
    "Scenario",
    "ScenarioShiftTemplate",
    "ScenarioTransitionResult",
    "ScheduleModel",
    "ShiftTemplate",
    "ShrinkageProfile",
    "Subsector",
    "SubsectorPool",
    "SubstitutionRule",
    "Team",
    "TeamConstraint",
    "TeamRoleComposition",
    "User",
    "Workstation",
]

# Tabelas com organization_id NOT NULL: RLS tenant_isolation (05 §4) e filtro no repositório.
TENANT_TABLES = (
    "memberships", "labor_agreements", "operations", "positions", "demand_curves",
    "demand_slots", "shrinkage_profiles", "scenarios", "scenario_shift_templates", "teams",
    "assignments", "coverage_results", "compliance_findings", "roles", "substitution_rules",
    "role_coverage_requirements", "team_constraints", "team_role_composition",
    "coverage_role_results", "scenario_transition_results", "custom_schedule_patterns",
    "subsectors", "workstations", "subsector_pools", "employees",
)
# Catálogos com linhas globais (organization_id NULL) + linhas do tenant.
SHARED_TABLES = ("shift_templates", "rotation_patterns")
# Globais somente leitura para app_user.
GLOBAL_TABLES = ("schedule_models", "compliance_rules", "legal_regimes")

# Tabelas criadas depois da 0003 (a RLS delas é ativada na própria migração).
V35_TENANT_TABLES = ("custom_schedule_patterns",)
V37_TENANT_TABLES = ("subsectors", "workstations", "subsector_pools", "employees")
