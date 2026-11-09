from __future__ import annotations

import uuid
from datetime import date
from typing import Any, Literal

from pydantic import Field

from app.schemas.common import Dec6, Schema


class ShiftTemplateOut(Schema):
    id: uuid.UUID
    code: str
    name: str
    start_time: str
    duration_minutes: int
    break_minutes: int
    break_policy: str
    scope: Literal["global", "organization"]


class ScheduleModelOut(Schema):
    code: str
    name: str
    work_days: int
    off_days: int
    cycle_length_days: int
    typical_teams: list[int]
    calendar_cycle_days: int
    daily_hours: Dec6
    avg_weekly_hours: Dec6
    is_continuous_24x7: bool
    is_rotating: bool
    requires_agreement: bool
    catalog_group: str
    shifts_per_day: int
    teams_24x7: Dec6 | None
    exact_24x7: bool
    exact_alternative: str | None
    legal_status: str
    phase: str
    regime_compliance: dict[str, Any]


class ComplianceRuleOut(Schema):
    code: str
    default_severity: str
    title: str
    legal_reference: str
    rules_version: str
    is_blocking: bool


class LegalRegimeOut(Schema):
    code: str
    version: int
    name: str
    status: str
    valid_from: date | None
    valid_to: date | None
    anchor: str | None
    anchor_offset_from: str | None
    anchor_offset_to: str | None
    weekly_hours_max: Dec6
    daily_hours_max: Dec6
    min_rest_days_per_week: Dec6
    rest_days_criterion: str
    allows_6x1: bool
    allows_compensation_agreement: bool
    special_regimes: dict[str, str]
    legal_reference: str
    assumption_note: str | None
    resolved_valid_from: date | None = Field(None, description="vigência com LEGAL_D0")
    resolved_valid_to: date | None = None
