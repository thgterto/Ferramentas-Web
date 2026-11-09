"""Cenários: CRUD, simulate síncrono (M1→M4) com ``inputs_hash``, resultados e transição.

Nenhum cálculo aqui: tudo vem do motor via ``engine_runner`` / ``regime_legal``.
"""

from __future__ import annotations

import base64
import time
import uuid
from collections import Counter
from datetime import UTC, datetime
from decimal import Decimal
from fractions import Fraction
from typing import TYPE_CHECKING, Any

from sqlalchemy.orm import Session

from app.core.errors import AppError, conflict, not_found, validation
from app.db.models import (
    Assignment,
    ComplianceFinding,
    CoverageResult,
    CoverageRoleResult,
    RoleCoverageRequirement,
    Scenario,
    ScheduleModel,
    Team,
)
from app.db.seeds import RULES_VERSION
from app.repositories.cadastros import (
    DemandCurveRepo,
    LaborAgreementRepo,
    OperationRepo,
    PositionRepo,
    RoleRepo,
    RoleRequirementRepo,
    ShrinkageRepo,
    SubstitutionRepo,
    TeamConstraintRepo,
)
from app.repositories.catalog import CatalogRepo
from app.repositories.scenarios import ScenarioRepo
from app.schemas import scenario as ss
from app.services.engine.catalogo import catalogo_mvp
from app.services.engine.cobertura import status_de
from app.services.engine.cobertura_cargos import MinimoCargo, Substituicao
from app.services.engine.demanda import CurvaDemanda
from app.services.engine.dimensionamento import dimensionar
from app.services.engine.regime_legal import (
    ContextoRegime,
    Opcao,
    RegimeLegal,
    Regimes,
    k_efetivo,
    k_legal,
    regimes_mvp,
    simular_transicao,
)
from app.services.engine.shrinkage import Shrinkage
from app.services.engine.types import FOLGA, Achado, Severidade, para_decimal
from app.services.engine.version import ENGINE_VERSION
from app.services.escalas import demand_service
from app.services.escalas.catalog_service import resolve_engine_regime
from app.services.escalas.engine_runner import (
    EntradaCargos,
    EntradaInvalida,
    EntradaSimulacao,
    ResultadoSimulacao,
    assignments,
    canonical_hash,
    headcount,
    run_simulation,
)

if TYPE_CHECKING:
    from app.api.deps import Principal

EDITABLE = ("rascunho", "erro")
_STATUS_DB = {"deficit": "deficit", "exato": "exata", "excesso": "excesso"}


def D(f: Fraction | int) -> Decimal:
    return para_decimal(f)


# ---- leitura / apresentação --------------------------------------------------------------
def _get(db: Session, p: Principal, sid: uuid.UUID) -> Scenario:
    return ScenarioRepo(db, p.org_id).get(sid)


def scenario_out(db: Session, p: Principal, s: Scenario) -> ss.ScenarioOut:
    repo = ScenarioRepo(db, p.org_id)
    cat = CatalogRepo(db, p.org_id)
    model = cat.schedule_model_by_id(s.schedule_model_id)
    reg = cat.legal_regime_by_id(s.legal_regime_id)
    applied = cat.legal_regime_by_id(s.legal_regime_resolved_id)
    teams = repo.teams(s.id)
    comp = repo.composition([t.id for t in teams])
    roles = {r.id: r.code for r in RoleRepo(db, p.org_id).find()}
    by_team: dict[int, dict[str, int]] = {}
    for c in comp:
        by_team.setdefault(c.team_id, {})[roles.get(c.role_id, "?")] = c.headcount
    n_alerts = (s.result_summary or {}).get("warnings", 0)
    shr = ShrinkageRepo(db, p.org_id).get_by_id(s.shrinkage_profile_id) \
        if s.shrinkage_profile_id else None
    return ss.ScenarioOut(
        id=s.public_id, lineage_id=s.lineage_id, name=s.name, description=s.description,
        version=s.version, status=s.status, row_version=s.row_version,
        operation_id=OperationRepo(db, p.org_id).get_by_id(s.operation_id).public_id,
        demand_curve_id=DemandCurveRepo(db, p.org_id).get_by_id(s.demand_curve_id).public_id,
        labor_agreement_id=LaborAgreementRepo(db, p.org_id).get_by_id(
            s.labor_agreement_id).public_id,
        shrinkage_profile_id=shr.public_id if shr else None,
        schedule_model=ss.ScheduleModelRef(code=model.code,
                                           avg_weekly_hours=model.avg_weekly_hours),
        team_count=s.team_count, horizon_start=s.horizon_start, horizon_weeks=s.horizon_weeks,
        legal_regime_code=reg.code if reg else None,
        legal_reference_date=s.legal_reference_date,
        legal_regime_applied=f"{applied.code}@{applied.version}" if applied else None,
        compensation_agreement_declared=s.compensation_agreement_declared,
        overtime_planned=s.overtime_planned, simulate_transition=s.simulate_transition,
        params=s.params, inputs_hash=s.inputs_hash, engine_version=s.engine_version,
        rules_version=s.rules_version,
        kpis=ss.KpisOut(teams_required=s.teams_required, coverage_pct=s.coverage_pct,
                        deficit_post_hours=s.deficit_post_hours,
                        peak_undercoverage=s.peak_undercoverage, deficit_hours=s.deficit_hours,
                        headcount_min=s.headcount_min, blocking_findings=s.blocking_findings,
                        warnings=n_alerts),
        teams=[ss.TeamOut(code=t.code, kind=t.kind, label=t.label, size_required=t.size_required,
                          size_assigned=t.size_assigned, cycle_offset_days=t.cycle_offset_days,
                          composition=by_team.get(t.id, {})) for t in teams],
        calculated_at=s.calculated_at, created_at=s.created_at)


def list_scenarios(db: Session, p: Principal, page: int, per_page: int,
                   operation_id: uuid.UUID | None, status: list[str] | None,
                   is_baseline: bool | None) -> tuple[list[ss.ScenarioOut], int]:
    filters: list[Any] = []
    if operation_id:
        filters.append(Scenario.operation_id == OperationRepo(db, p.org_id).get(operation_id).id)
    if status:
        filters.append(Scenario.status.in_(status))
    if is_baseline is not None:
        filters.append(Scenario.is_baseline == is_baseline)
    rows, total = ScenarioRepo(db, p.org_id).list_page(page, per_page, *filters,
                                                       order_by=Scenario.created_at.desc())
    return [scenario_out(db, p, s) for s in rows], total


# ---- escrita ------------------------------------------------------------------------------
def _model(db: Session, code: str) -> ScheduleModel:
    try:
        return CatalogRepo(db).schedule_model(code)
    except AppError as exc:
        raise validation(f"modelo de escala inexistente: {code}",
                         [{"field": "schedule_model_code", "code": "not_found",
                           "message": code}]) from exc


def _regime_id(db: Session, code: str | None) -> int | None:
    if code is None:
        return None
    try:
        return CatalogRepo(db).legal_regime(code).id
    except AppError as exc:
        raise validation(f"regime legal inexistente: {code}",
                         [{"field": "legal_regime_code", "code": "not_found",
                           "message": code}]) from exc


def _shift_ids(db: Session, p: Principal, codes: list[str]) -> list[int]:
    by_code = {t.code: t.id for t in CatalogRepo(db, p.org_id).shift_templates()}
    falt = [c for c in codes if c not in by_code]
    if falt:
        raise validation(f"turnos inexistentes: {falt}",
                         [{"field": "shift_template_codes", "code": "not_found",
                           "message": ",".join(falt)}])
    return [by_code[c] for c in codes]


def create(db: Session, p: Principal, body: ss.ScenarioCreate) -> ss.ScenarioCreated:
    op = OperationRepo(db, p.org_id).get(body.operation_id)
    curve = DemandCurveRepo(db, p.org_id).get(body.demand_curve_id)
    pos = PositionRepo(db, p.org_id).get_by_id(curve.position_id)
    if pos.operation_id != op.id:
        raise validation("curva de demanda não pertence à operação",
                         [{"field": "demand_curve_id", "code": "mismatch", "message": ""}])
    agr = LaborAgreementRepo(db, p.org_id).get(body.labor_agreement_id)
    shr = ShrinkageRepo(db, p.org_id).get(body.shrinkage_profile_id) \
        if body.shrinkage_profile_id else None
    model = _model(db, body.schedule_model_code)
    repo = ScenarioRepo(db, p.org_id)
    s = repo.add(
        operation_id=op.id, name=body.name, description=body.description,
        is_baseline=body.is_baseline, schedule_model_id=model.id, labor_agreement_id=agr.id,
        shrinkage_profile_id=shr.id if shr else None, demand_curve_id=curve.id,
        team_count=body.team_count, horizon_start=body.horizon_start,
        horizon_weeks=body.horizon_weeks, agreement_8h_confirmed=body.agreement_8h_confirmed,
        holiday_policy=body.holiday_policy, params=body.params,
        legal_regime_id=_regime_id(db, body.legal_regime_code),
        legal_reference_date=body.legal_reference_date,
        compensation_agreement_declared=body.compensation_agreement_declared,
        overtime_planned=body.overtime_planned, simulate_transition=body.simulate_transition,
        created_by=p.user.id)
    repo.set_shift_templates(s.id, _shift_ids(db, p, body.shift_template_codes))
    db.commit()
    return ss.ScenarioCreated(id=s.public_id, lineage_id=s.lineage_id, version=s.version,
                              status=s.status, row_version=s.row_version)


def patch(db: Session, p: Principal, sid: uuid.UUID, body: ss.ScenarioPatch,
          if_match: str | None) -> ss.ScenarioOut:
    s = _get(db, p, sid)
    if if_match is None:
        raise AppError(428, "precondition_required", "PATCH de cenário exige If-Match")
    if if_match.strip('W/"') != str(s.row_version):
        raise AppError(412, "precondition_failed", "row_version divergente")
    if s.status not in EDITABLE:
        raise conflict("scenario_immutable", "cenário calculado: crie nova versão (Fase 2)")
    vals = body.model_dump(exclude_unset=True)
    if "schedule_model_code" in vals:
        vals["schedule_model_id"] = _model(db, vals.pop("schedule_model_code")).id
    if "legal_regime_code" in vals:
        vals["legal_regime_id"] = _regime_id(db, vals.pop("legal_regime_code"))
    if "shrinkage_profile_id" in vals:
        sp = vals.pop("shrinkage_profile_id")
        vals["shrinkage_profile_id"] = ShrinkageRepo(db, p.org_id).get(sp).id if sp else None
    ScenarioRepo(db, p.org_id).update(s, vals)
    s.row_version += 1
    db.commit()
    return scenario_out(db, p, s)


def archive(db: Session, p: Principal, sid: uuid.UUID) -> None:
    s = _get(db, p, sid)
    s.status = "arquivado"
    s.row_version += 1
    db.commit()


# ---- montagem das entradas do motor -----------------------------------------------------
def _regime(db: Session, s: Scenario) -> RegimeLegal:
    reg = CatalogRepo(db).legal_regime_by_id(s.legal_regime_id)
    return resolve_engine_regime(reg.code if reg else None,
                                 s.legal_reference_date or s.horizon_start)


def _team_size(s: Scenario, curva: CurvaDemanda) -> int:
    v = s.params.get("team_size")
    if v is not None:
        if not isinstance(v, int) or not 1 <= v <= 500:
            raise validation("params.team_size deve ser inteiro 1..500")
        return v
    return max(1, max(curva.valores))


def _entrada(db: Session, p: Principal, s: Scenario
             ) -> tuple[EntradaSimulacao, dict[str, Any], list[Team] | None]:
    cat = catalogo_mvp()
    model_row = CatalogRepo(db).schedule_model_by_id(s.schedule_model_id)
    modelo = cat.modelos.get(model_row.code)
    if modelo is None:
        raise validation(f"modelo {model_row.code} fora do catálogo do motor")
    curve_repo = DemandCurveRepo(db, p.org_id)
    curve = curve_repo.get_by_id(s.demand_curve_id)
    pos = PositionRepo(db, p.org_id).get_by_id(curve.position_id)
    curva = demand_service.from_slots(curve_repo.slots(curve.id), pos.is_mandatory_presence)
    shr_row = ShrinkageRepo(db, p.org_id).get_by_id(s.shrinkage_profile_id) \
        if s.shrinkage_profile_id else None
    shr = Shrinkage.de(shr_row.day_pct, shr_row.night_pct) if shr_row else Shrinkage()
    tc = TeamConstraintRepo(db, p.org_id).for_operation(s.operation_id)
    k = tc.k_min if tc and tc.k_min else s.team_count
    regime = _regime(db, s)
    ctx = ContextoRegime(act_cct_declarado=s.compensation_agreement_declared,
                         he_planejada=s.overtime_planned)
    tam = _team_size(s, curva)

    # cargos (FR-34–36): composição por turma definida via PUT …/composition
    repo = ScenarioRepo(db, p.org_id)
    teams = list(repo.teams(s.id))
    comp_rows = repo.composition([t.id for t in teams])
    cargos = None
    roles = {r.id: r.code for r in RoleRepo(db, p.org_id).find()}
    snap_cargos: dict[str, Any] | None = None
    if comp_rows:
        by_team: dict[int, dict[str, int]] = {}
        for c in comp_rows:
            by_team.setdefault(c.team_id, {})[roles[c.role_id]] = c.headcount
        comp = [by_team.get(t.id, {}) for t in teams]
        demandas: dict[str, CurvaDemanda] = {}
        if pos.required_role_id:
            demandas[roles[pos.required_role_id]] = curva
        regras = [Substituicao(roles[r.from_role_id], roles[r.to_role_id], r.priority)
                  for r in SubstitutionRepo(db, p.org_id).find()
                  if r.from_role_id in roles and r.to_role_id in roles]
        minimos = [MinimoCargo(roles[r.role_id], r.min_count, tuple(r.shift_codes or ()),
                               r.accepts_substitute)
                   for r in RoleRequirementRepo(db, p.org_id).find(
                       RoleCoverageRequirement.operation_id == s.operation_id)]
        usados = {c for d in comp for c in d} | set(demandas)
        regras = [g for g in regras if g.de in usados and g.para in usados]
        minimos = [m for m in minimos if m.cargo in usados]
        cargos = EntradaCargos(comp, demandas, regras, minimos)
        snap_cargos = {"composicao": comp, "demandas": sorted(demandas),
                       "regras": sorted((g.de, g.para, g.prioridade) for g in regras),
                       "minimos": sorted((m.cargo, m.minimo, m.turnos, m.aceita_substituto)
                                         for m in minimos)}
    entrada = EntradaSimulacao(
        modelo=modelo, catalogo=cat, curva=curva, tamanho_turma=tam, k=k,
        k_fixo_operacao=tc is not None, inicio=s.horizon_start, semanas=s.horizon_weeks,
        shrinkage=shr, regime=regime, ctx=ctx, cargos=cargos)
    snapshot = {
        "engine_version": ENGINE_VERSION, "rules_version": RULES_VERSION,
        "catalog_version": cat.versao, "regimes_version": regimes_mvp().versao,
        "schedule_model": modelo.codigo, "k": k, "k_mode": "fixo" if tc else "cenario",
        "team_size": tam, "horizon_start": s.horizon_start.isoformat(),
        "horizon_weeks": s.horizon_weeks, "demand": list(curva.valores),
        "critical": sorted(curva.criticas), "demand_checksum": curve.checksum,
        "shrinkage": [str(shr.diurno), str(shr.noturno)], "regime": regime.ref,
        "ctx": [ctx.act_cct_declarado, ctx.he_planejada], "roles": snap_cargos,
    }
    return entrada, snapshot, teams if comp_rows else None


# ---- simulate --------------------------------------------------------------------------
def _brief(a: Achado) -> ss.FindingBrief:
    return ss.FindingBrief(rule_code=a.codigo, severity=_sev(a), message=a.mensagem,
                           team=a.contexto.get("turma"), details=dict(a.contexto))


def _sev(a: Achado) -> Any:
    return a.severidade.value.lower()


def _kpis(s: Scenario) -> ss.KpisOut:
    return ss.KpisOut(teams_required=s.teams_required, coverage_pct=s.coverage_pct,
                      deficit_post_hours=s.deficit_post_hours,
                      peak_undercoverage=s.peak_undercoverage, deficit_hours=s.deficit_hours,
                      headcount_min=s.headcount_min, blocking_findings=s.blocking_findings,
                      warnings=(s.result_summary or {}).get("warnings", 0))


def _persist(db: Session, p: Principal, s: Scenario, r: ResultadoSimulacao,
             tam: int, k_mode: str, teams_before: list[Team] | None) -> None:
    repo = ScenarioRepo(db, p.org_id)
    repo.clear_results(s.id)
    org = p.org_id
    teams = repo.ensure_teams(s.id, [
        {"code": t.nome, "kind": "regular", "label": f"Turma {t.nome}",
         "cycle_offset_days": t.offset, "size_required": D(tam * t.fracao_posto),
         "size_assigned": int(tam * t.fracao_posto)} for t in r.escala.turmas])
    team_id = {t.code: t.id for t in teams}
    repo.bulk_add([Assignment(organization_id=org, scenario_id=s.id,
                              team_id=team_id[a.pop("team")], source="engine", **a)
                   for a in assignments(r.escala, catalogo_mvp())])
    repo.bulk_add([CoverageResult(
        organization_id=org, scenario_id=s.id, slot_index=sl.slot_index,
        required_net=D(sl.required_net), required_gross=D(sl.required_gross),
        scheduled_worst=D(sl.scheduled_worst), scheduled_mean=D(sl.scheduled_mean),
        expected_worst=D(sl.expected_worst), break_gap=Decimal(0),
        deficit_occurrences=sl.deficit_occurrences,
        gap=D(sl.scheduled_worst - sl.required_net),
        gap_mean=D(sl.scheduled_mean - sl.required_net),
        status=_STATUS_DB[status_de(sl.scheduled_worst - sl.required_net)],
        status_mean=_STATUS_DB[status_de(sl.scheduled_mean - sl.required_net)])
        for sl in r.slots])
    if r.slots_cargo:
        roles = {x.code: x.id for x in RoleRepo(db, org).find()}
        repo.bulk_add([CoverageRoleResult(
            organization_id=org, scenario_id=s.id, role_id=roles[c.cargo],
            slot_index=c.slot_index, required_worst=Decimal(c.demanda),
            own_worst=Decimal(c.proprio), substituted_worst=Decimal(c.substituicao),
            qualified_present=c.proprio + c.substituicao,
            status=_STATUS_DB[status_de(Fraction(c.proprio + c.substituicao - c.demanda))])
            for c in r.slots_cargo])
    rules = CatalogRepo(db).rules_by_code()
    repo.bulk_add([ComplianceFinding(
        organization_id=org, scenario_id=s.id, rule_code=a.codigo,
        severity=_sev(a),
        legal_reference=rules[a.codigo].legal_reference if a.codigo in rules else "—",
        team_code=a.contexto.get("turma"), message=a.mensagem, details=dict(a.contexto))
        for a in r.achados])
    k = r.cobertura.kpis
    dim = r.dimensionamento
    sev = Counter(a.severidade for a in r.achados)
    s.coverage_pct = D(k.pct_horas_posto_cobertas)
    s.deficit_post_hours = D(k.deficit_hp)
    s.peak_undercoverage = D(k.pico.valor if k.pico else 0)
    s.deficit_hours = k.horas_com_deficit
    s.headcount_min = headcount(dim)
    s.teams_required = D(dim.k_estrela)
    s.blocking_findings = sev[Severidade.ERRO]
    s.team_count_achievable_pct = D(r.alcancavel)
    cargos_kpi = []
    if r.cargos:
        s.substitution_post_hours = Decimal(sum(v.substituicao_hp for v in r.cargos.kpis.values()))
        s.unqualified_hours = sum(v.horas_sem_qualificado for v in r.cargos.kpis.values())
        for c, v in r.cargos.kpis.items():
            cargos_kpi.append({
                "role": c,
                "pct_hours_covered": str(D(Fraction(v.demanda_hp - v.deficit_hp, v.demanda_hp)
                                           if v.demanda_hp else 1)),
                "own_post_hours": str(v.proprio_hp),
                "substituted_post_hours": str(v.substituicao_hp),
                "deficit_post_hours": str(v.deficit_hp),
                "unqualified_hours": v.horas_sem_qualificado})
    s.result_summary = {
        "warnings": sev[Severidade.ALERTA], "infos": sev[Severidade.INFO],
        "peak_at": (f"{k.pico.data.isoformat()}T{k.pico.hora:02d}:00" if k.pico else None),
        "excess_post_hours": str(D(k.excesso_hp)), "team_size": tam,
        "team_count": {"mode": k_mode, "k_used": len(r.escala.turmas),
                       "k_required": str(D(dim.k_estrela)),
                       "achievable_pct": str(D(r.alcancavel))},
        "k_legal": str(D(r.k_legal)), "coverage_by_role": cargos_kpi,
    }
    if teams_before is not None and {t.code for t in teams_before} != set(team_id):
        s.result_summary["composition_reset"] = True


def simulate(db: Session, p: Principal, sid: uuid.UUID, body: ss.SimulateIn) -> ss.SimulateOut:
    s = _get(db, p, sid)
    if s.status in ("homologado", "em_revisao"):
        raise conflict("scenario_immutable", "cenário em revisão/homologado")
    t0 = time.perf_counter()
    entrada, snapshot, teams_before = _entrada(db, p, s)
    try:
        r = run_simulation(entrada)
    except EntradaInvalida as exc:
        raise validation(str(exc)) from exc
    elapsed = int((time.perf_counter() - t0) * 1000)
    s.inputs_snapshot = snapshot
    s.inputs_hash = canonical_hash(snapshot)
    s.engine_version = ENGINE_VERSION
    s.rules_version = RULES_VERSION
    s.legal_regime_resolved_id = CatalogRepo(db).legal_regime(
        entrada.regime.codigo, entrada.regime.versao).id
    _persist(db, p, s, r, entrada.tamanho_turma, snapshot["k_mode"], teams_before)
    s.status = "calculado"
    s.calculated_at = datetime.now(UTC)
    s.row_version += 1
    db.commit()
    summ = s.result_summary or {}
    return ss.SimulateOut(
        scenario_id=s.public_id, status=s.status, inputs_hash=s.inputs_hash,
        engine_version=ENGINE_VERSION, rules_version=RULES_VERSION,
        catalog_version=snapshot["catalog_version"], legal_regime=entrada.regime.ref,
        kpis=_kpis(s), team_count=ss.TeamCountOut(**summ["team_count"]),
        coverage_by_role=[ss.RoleCoverageKpi(**c) for c in summ["coverage_by_role"]],
        findings=[_brief(a) for a in r.achados], elapsed_ms=elapsed)


def _require_calc(s: Scenario) -> None:
    if s.calculated_at is None:
        raise conflict("not_calculated", "cenário ainda não simulado (POST …/simulate)")


# ---- resultados ---------------------------------------------------------------------------
def coverage(db: Session, p: Principal, sid: uuid.UUID, view: str, agg: str,
             role: str | None) -> ss.CoverageOut:
    s = _get(db, p, sid)
    _require_calc(s)
    repo = ScenarioRepo(db, p.org_id)
    summ = s.result_summary or {}
    kpis = ss.CoverageKpis(
        pct_hours_covered=s.coverage_pct or Decimal(0),
        deficit_post_hours=s.deficit_post_hours or Decimal(0),
        peak_undercoverage=(ss.PeakOut(value=s.peak_undercoverage or Decimal(0),
                                       at=summ["peak_at"]) if summ.get("peak_at") else None),
        deficit_hours=s.deficit_hours or 0,
        excess_post_hours=Decimal(summ.get("excess_post_hours", "0")),
        break_gap_post_hours=Decimal(0), headcount_min=s.headcount_min,
        teams_required=s.teams_required)
    slots: list[ss.CoverageSlot] = []
    if role:
        r = RoleRepo(db, p.org_id).by_code(role)
        if r is None:
            raise not_found("cargo")
        rows = repo.coverage_roles(s.id, r.id)
        if not rows:
            raise validation(f"sem cobertura por cargo para {role}: defina a composição")
        rk = next((c for c in summ.get("coverage_by_role", []) if c["role"] == role), None)
        if rk:
            kpis.pct_hours_covered = Decimal(rk["pct_hours_covered"])
            kpis.deficit_post_hours = Decimal(rk["deficit_post_hours"])
        for rr in rows:
            cov = rr.own_worst + rr.substituted_worst
            slots.append(ss.CoverageSlot(
                slot_index=rr.slot_index, weekday=rr.slot_index // 24 + 1,
                start=f"{rr.slot_index % 24:02d}:00", required_net=rr.required_worst,
                required_gross=rr.required_worst, scheduled_worst=cov, scheduled_mean=cov,
                expected_worst=cov, break_gap=Decimal(0), deficit_occurrences=0,
                gap=cov - rr.required_worst, status=rr.status))  # type: ignore[arg-type]
        return ss.CoverageOut(granularity="60", view="postos", agg="pior", role=role,
                              kpis=kpis, slots=slots)
    for c in repo.coverage(s.id):
        if view == "reserva":
            gap = c.expected_worst - c.required_net
            st = _STATUS_DB[status_de(Fraction(gap))]
        elif agg == "media":
            gap, st = c.gap_mean, c.status_mean
        else:
            gap, st = c.gap, c.status
        slots.append(ss.CoverageSlot(
            slot_index=c.slot_index, weekday=c.slot_index // 24 + 1,
            start=f"{c.slot_index % 24:02d}:00", required_net=c.required_net,
            required_gross=c.required_gross, scheduled_worst=c.scheduled_worst,
            scheduled_mean=c.scheduled_mean, expected_worst=c.expected_worst,
            break_gap=c.break_gap, deficit_occurrences=c.deficit_occurrences, gap=gap,
            status=st))  # type: ignore[arg-type]
    return ss.CoverageOut(granularity="60", view=view, agg=agg,  # type: ignore[arg-type]
                          kpis=kpis, slots=slots)


def sizing(db: Session, p: Principal, sid: uuid.UUID, body: ss.SizingIn) -> ss.SizingOut:
    s = _get(db, p, sid)
    entrada, _, _ = _entrada(db, p, s)
    m = entrada.modelo
    if m.k_estrela is None:
        raise validation(f"{m.codigo}: modelo não contínuo — sem K* 24/7")
    tam = body.team_size or entrada.tamanho_turma
    dim = dimensionar(m, tam, body.team_count or entrada.k, entrada.shrinkage)
    reg = entrada.regime
    meias = dim.n_meias is not None
    return ss.SizingOut(
        schedule_model=m.codigo, team_size=tam, k_required=D(dim.k_estrela),
        whole_teams=dim.turmas_inteiras, half_teams=dim.n_meias,
        headcount_min=dim.headcount_min, headcount_min_half_teams=dim.headcount_min_meias,
        team_size_with_reserve=dim.tamanho_turma_reserva,
        headcount_with_reserve=dim.headcount_reserva, k_legal=D(k_legal(reg, meias)),
        k_effective=D(k_efetivo(m, reg, meias)), legal_regime=reg.ref,
        findings=[_brief(a) for a in dim.achados])


def _cursor(n: int | None) -> str | None:
    return None if n is None else base64.urlsafe_b64encode(str(n).encode()).decode()


def _uncursor(c: str | None) -> int:
    if not c:
        return 0
    try:
        return int(base64.urlsafe_b64decode(c.encode()).decode())
    except (ValueError, UnicodeDecodeError) as exc:
        raise AppError(400, "invalid_cursor", "cursor malformado") from exc


def findings(db: Session, p: Principal, sid: uuid.UUID, severity: list[str] | None,
             rule_code: list[str] | None, limit: int, cursor: str | None) -> dict[str, Any]:
    s = _get(db, p, sid)
    rows = ScenarioRepo(db, p.org_id).findings(s.id, severity, rule_code, _uncursor(cursor),
                                              limit)
    has_next = len(rows) > limit
    rows = rows[:limit]
    data = [ss.FindingOut(id=f.public_id, rule_code=f.rule_code,
                          severity=f.severity,  # type: ignore[arg-type]
                          legal_reference=f.legal_reference, team=f.team_code,
                          occurs_on=f.occurs_on, message=f.message, details=f.details,
                          waived=f.waived) for f in rows]
    return {"data": data, "meta": {"limit": limit, "has_next": has_next,
                                   "next_cursor": _cursor(rows[-1].id) if has_next else None}}


def teams(db: Session, p: Principal, sid: uuid.UUID) -> list[ss.TeamOut]:
    return scenario_out(db, p, _get(db, p, sid)).teams


def assignments_page(db: Session, p: Principal, sid: uuid.UUID, team: str | None, limit: int,
                     cursor: str | None) -> dict[str, Any]:
    s = _get(db, p, sid)
    repo = ScenarioRepo(db, p.org_id)
    codes = {t.id: t.code for t in repo.teams(s.id)}
    tid = next((i for i, c in codes.items() if c == team), -1) if team else None
    rows = repo.assignments(s.id, tid, _uncursor(cursor), limit)
    has_next = len(rows) > limit
    rows = rows[:limit]
    data = [ss.AssignmentOut(team=codes.get(a.team_id or 0), work_date=a.work_date,
                             shift_code=a.shift_code, is_day_off=a.is_day_off,
                             starts_at=a.starts_at, ends_at=a.ends_at,
                             clock_minutes=a.clock_minutes) for a in rows]
    return {"data": data, "meta": {"limit": limit, "has_next": has_next,
                                   "next_cursor": _cursor(rows[-1].id) if has_next else None}}


def put_composition(db: Session, p: Principal, sid: uuid.UUID, code: str,
                    body: ss.CompositionPut) -> ss.TeamOut:
    s = _get(db, p, sid)
    repo = ScenarioRepo(db, p.org_id)
    team = repo.team(s.id, code)
    if team is None:
        raise not_found("turma (simule o cenário para gerar as turmas)")
    roles = {r.code: r.id for r in RoleRepo(db, p.org_id).find()}
    bad = [c for c in body.composition if c not in roles]
    if bad or any(v < 0 for v in body.composition.values()):
        raise validation("composição inválida",
                         [{"field": f"composition.{c}", "code": "not_found", "message": c}
                          for c in bad] or [{"field": "composition", "code": "negative",
                                             "message": "headcount ≥ 0"}])
    repo.set_composition(team.id, {roles[c]: v for c, v in body.composition.items()})
    team.size_assigned = sum(body.composition.values())
    db.commit()
    return next(t for t in scenario_out(db, p, s).teams if t.code == code)


# ---- transição (FR-41) ------------------------------------------------------------------
def _opt(o: Opcao, first_hc: int | None) -> ss.TransitionOption:
    return ss.TransitionOption(
        code=o.modelo, variant=o.variante,
        half_teams=o.turmas.denominator != 1 or "meia" in o.variante,
        teams_required=D(o.turmas), headcount=o.pessoas, avg_weekly_hours=D(o.horas_semanais),
        delta_headcount_vs_first=(o.pessoas - first_hc) if first_hc is not None else None)


def transition(db: Session, p: Principal, sid: uuid.UUID, body: ss.TransitionIn
               ) -> ss.TransitionOut:
    s = _get(db, p, sid)
    entrada, _, _ = _entrada(db, p, s)
    base = regimes_mvp()
    codes = body.regimes or list(base.linha_do_tempo)
    falt = [c for c in codes if c not in base.regimes]
    if falt:
        raise validation(f"regimes inexistentes: {falt}", code="REGIME_NAO_RESOLVIDO")
    regs = Regimes(base.versao, base.regimes, tuple(codes))
    m = entrada.modelo
    turnos = tuple(sorted({e for sq in m.sequencias for e in sq} - {FOLGA}))
    fases = simular_transicao(entrada.tamanho_turma, entrada.catalogo, regs, turnos, m.codigo,
                              entrada.ctx)
    out: list[ss.TransitionPhase] = []
    rows: list[dict[str, Any]] = []
    cat = CatalogRepo(db)
    first_hc: int | None = None
    for i, f in enumerate(fases):
        cen = f.cenario
        if i == 0:
            first_hc = cen.pessoas if cen else (f.recomendado.pessoas if f.recomendado else None)
        sm = None
        if cen:
            sm = ss.TransitionScenarioModel(
                code=cen.modelo,
                compliant=not any(a.severidade == Severidade.ERRO for a in cen.achados),
                teams=D(cen.turmas), headcount=cen.pessoas,
                avg_weekly_hours=D(cen.horas_semanais),
                findings=[_brief(a) for a in cen.achados])
        rec = f.recomendado if body.recommend else None
        alts = [o for o in f.opcoes if rec is None or o is not rec]
        alts = [o for o in alts if not any(a.severidade == Severidade.ERRO for a in o.achados)]
        if not body.allow_half_teams:
            alts = [o for o in alts if o.turmas.denominator == 1]
        out.append(ss.TransitionPhase(
            regime=f.regime + f"@{regs[f.regime].versao}", k_legal=D(f.k_legal),
            k_legal_half_teams=D(f.k_legal_meias), min_headcount_legal=f.limite_inferior_pessoas,
            scenario_model=sm, recommended=_opt(rec, first_hc) if rec else None,
            alternatives=[_opt(o, first_hc) for o in alts]))
        ref = cen or f.recomendado
        sev = Counter(a.severidade.value.lower() for a in (cen.achados if cen else ()))
        rows.append({
            "legal_regime_id": cat.legal_regime(f.regime, regs[f.regime].versao).id,
            "phase_order": i + 1, "scenario_model_code": m.codigo,
            "scenario_model_compliant": bool(sm and sm.compliant),
            "recommended_model_code": f.recomendado.modelo if f.recomendado else None,
            "teams_required": D(ref.turmas) if ref else Decimal(0),
            "headcount": ref.pessoas if ref else 0,
            "avg_weekly_hours": D(ref.horas_semanais) if ref else Decimal(0),
            "k_legal": D(f.k_legal),
            "findings_summary": {**sev, "codes": sorted({a.codigo for a in cen.achados})
                                 if cen else []}})
    ScenarioRepo(db, p.org_id).replace_transition(s.id, rows)
    db.commit()
    return ss.TransitionOut(team_size=entrada.tamanho_turma, phases=out)


