"""Cenários, simulate síncrono, resultados e transição (FR-05–09, 11, 14–16, 20, 24, 41)."""

from __future__ import annotations

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Header, Query, Response

from escalas.api.deps import DB, Current, Writer
from escalas.api.v1.escalas._common import ERRORS, LimitQ, PageQ, PerPageQ, created, csv_list
from escalas.schemas import scenario as ss
from escalas.schemas.common import CursorPage, Envelope, Page, page_of
from escalas.services.escalas import export_service, matrix_service
from escalas.services.escalas import scenario_service as svc

router = APIRouter(responses=ERRORS, tags=["scenarios"])


@router.get("/scenarios", response_model=Page[ss.ScenarioOut])
def list_scenarios(p: Current, db: DB, page: PageQ = 1, per_page: PerPageQ = 50,
                   operation_id: uuid.UUID | None = None, status: str | None = None,
                   is_baseline: bool | None = None) -> object:
    rows, total = svc.list_scenarios(db, p, page, per_page, operation_id, csv_list(status),
                                     is_baseline)
    return page_of(rows, page, per_page, total, "/api/v1/escalas/scenarios")


@router.post("/scenarios", response_model=Envelope[ss.ScenarioCreated], status_code=201)
def create_scenario(body: ss.ScenarioCreate, p: Writer, db: DB, response: Response) -> object:
    out = svc.create(db, p, body)
    created(response, f"/scenarios/{out.id}")
    response.headers["ETag"] = f'"{out.row_version}"'
    return {"data": out}


@router.get("/scenarios/{scenario_id}", response_model=Envelope[ss.ScenarioOut])
def get_scenario(scenario_id: uuid.UUID, p: Current, db: DB, response: Response) -> object:
    out = svc.scenario_out(db, p, svc._get(db, p, scenario_id))
    response.headers["ETag"] = f'"{out.row_version}"'
    return {"data": out}


@router.patch("/scenarios/{scenario_id}", response_model=Envelope[ss.ScenarioOut],
              responses={409: {}, 412: {}, 428: {}})
def patch_scenario(scenario_id: uuid.UUID, body: ss.ScenarioPatch, p: Writer, db: DB,
                   response: Response,
                   if_match: Annotated[str | None, Header()] = None) -> object:
    out = svc.patch(db, p, scenario_id, body, if_match)
    response.headers["ETag"] = f'"{out.row_version}"'
    return {"data": out}


@router.delete("/scenarios/{scenario_id}", status_code=204)
def archive_scenario(scenario_id: uuid.UUID, p: Writer, db: DB) -> Response:
    svc.archive(db, p, scenario_id)
    return Response(status_code=204)


@router.post("/scenarios/{scenario_id}/simulate", response_model=Envelope[ss.SimulateOut])
def simulate(scenario_id: uuid.UUID, p: Writer, db: DB,
             body: ss.SimulateIn | None = None) -> object:
    """Síncrono no MVP (200): M1 demanda → M2 gerador → M3 cobertura → M4 viabilidade."""
    return {"data": svc.simulate(db, p, scenario_id, body or ss.SimulateIn())}


@router.get("/scenarios/{scenario_id}/coverage", response_model=Envelope[ss.CoverageOut])
def coverage(scenario_id: uuid.UUID, p: Current, db: DB,
             view: Literal["postos", "reserva"] = "postos",
             agg: Literal["pior", "media"] = "pior", role: str | None = None,
             subsector: str | None = None, workstation: str | None = None) -> object:
    """v3.7: ``subsector``/``workstation`` filtram heatmap e KPIs (após remanejamento)."""
    return {"data": svc.coverage(db, p, scenario_id, view, agg, role, subsector, workstation)}


@router.post("/scenarios/{scenario_id}/sizing", response_model=Envelope[ss.SizingOut])
def sizing(scenario_id: uuid.UUID, p: Current, db: DB,
           body: ss.SizingIn | None = None) -> object:
    """K*, headcount mínimo com/sem reserva e K legal do regime (folguistas: Fase 2)."""
    body = body or ss.SizingIn(team_size=None, team_count=None)
    return {"data": svc.sizing(db, p, scenario_id, body)}


@router.get("/scenarios/{scenario_id}/compliance-findings",
            response_model=CursorPage[ss.FindingOut])
def compliance_findings(scenario_id: uuid.UUID, p: Current, db: DB,
                        severity: str | None = None, rule_code: str | None = None,
                        limit: LimitQ = 100, cursor: str | None = None) -> object:
    return svc.findings(db, p, scenario_id, csv_list(severity), csv_list(rule_code), limit,
                        cursor)


@router.get("/scenarios/{scenario_id}/teams", response_model=Envelope[list[ss.TeamOut]])
def teams(scenario_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": svc.teams(db, p, scenario_id)}


@router.put("/scenarios/{scenario_id}/teams/{code}/composition",
            response_model=Envelope[ss.TeamOut])
def put_composition(scenario_id: uuid.UUID, code: str, body: ss.CompositionPut, p: Writer,
                    db: DB) -> object:
    return {"data": svc.put_composition(db, p, scenario_id, code, body)}


@router.get("/scenarios/{scenario_id}/assignments", response_model=CursorPage[ss.AssignmentOut])
def assignments(scenario_id: uuid.UUID, p: Current, db: DB, team: str | None = None,
                limit: LimitQ = 500, cursor: str | None = None) -> object:
    return svc.assignments_page(db, p, scenario_id, team, limit, cursor)


@router.post("/scenarios/{scenario_id}/transition", response_model=Envelope[ss.TransitionOut])
def transition(scenario_id: uuid.UUID, p: Writer, db: DB,
               body: ss.TransitionIn | None = None) -> object:
    """FR-41: mesma operação em cada regime da linha do tempo; persiste o resultado."""
    return {"data": svc.transition(db, p, scenario_id, body or ss.TransitionIn())}


@router.post("/scenarios/{scenario_id}/exports",
             responses={200: {"content": {"text/csv": {}, "application/vnd.openxmlformats-"
                                          "officedocument.spreadsheetml.sheet": {}}}})
def export(scenario_id: uuid.UUID, p: Current, db: DB,
           body: ss.ExportIn | None = None) -> Response:
    """FR-23: CSV/XLSX síncrono no MVP (200 + arquivo); job 202 + URL assinada na Fase 2."""
    data, media, name = export_service.export(db, p, scenario_id, body or ss.ExportIn())
    return Response(content=data, media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


MonthQ = Annotated[str, Query(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", examples=["2027-01"])]


@router.get("/scenarios/{scenario_id}/monthly-matrix",
            response_model=Envelope[ss.MonthlyMatrixOut])
def monthly_matrix(scenario_id: uuid.UUID, p: Current, db: DB, month: MonthQ) -> object:
    """v3.6: matriz mensal pessoa × dia (turno/folga), rodapé por turno e totais por pessoa.

    Regenera o mês com a mesma âncora/K/offsets da simulação; pessoas fictícias por turma
    (``A-01``…) quando não há colaboradores cadastrados.
    """
    return {"data": matrix_service.monthly_matrix(db, p, scenario_id, month)}


@router.get("/scenarios/{scenario_id}/monthly-matrix/export",
            responses={200: {"content": {"text/csv": {}, "text/calendar": {},
                                         "application/vnd.openxmlformats-"
                                         "officedocument.spreadsheetml.sheet": {}}}})
def monthly_matrix_export(scenario_id: uuid.UUID, p: Current, db: DB, month: MonthQ,
                          format: Literal["xlsx", "csv", "ics"] = "xlsx",
                          months: Annotated[int, Query(ge=1, le=12)] = 1,
                          person: str | None = None) -> Response:
    """XLSX (uma aba por mês, cores por turno), CSV ou ICS (calendário individual)."""
    data, media, name = matrix_service.export(db, p, scenario_id, month, months, format,
                                              person)
    return Response(content=data, media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


@router.post("/scenarios/{scenario_id}/optimize", response_model=Envelope[ss.OptimizeOut],
             tags=["optimize"])
def optimize(scenario_id: uuid.UUID, body: ss.OptimizeIn, p: Current, db: DB) -> object:
    """v3.7 — otimizadores (OR-Tools CP-SAT), síncronos com ``time_limit_s``.

    ``min_headcount`` (K/tamanho mínimos p/ cobertura alvo, por subsetor/pool), ``offsets``
    (defasagem ótima dado K), ``best_model`` (ranking do catálogo + personalizados),
    ``pool_allocation`` (pessoas → posições nos pools) e ``fairness`` (offsets com folgas/
    noites/domingos equilibrados). Devolve solução, métricas antes/depois, gap e status.
    """
    from escalas.services.escalas import optimize_service

    return {"data": optimize_service.optimize(db, p, scenario_id, body)}


@router.post("/scenarios/{scenario_id}/optimize/apply",
             response_model=Envelope[ss.OptimizeApplyOut], tags=["optimize"])
def optimize_apply(scenario_id: uuid.UUID, body: ss.OptimizeApplyIn, p: Writer,
                   db: DB) -> object:
    """Cria um cenário a partir da solução (``mode=create``) ou aplica no atual e simula."""
    from escalas.services.escalas import optimize_service

    return {"data": optimize_service.apply(db, p, scenario_id, body)}
