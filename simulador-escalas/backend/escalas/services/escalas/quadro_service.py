"""v3.9 — Calculadora de quadro (FR-51) e folgas por colaborador / fechamento (FR-52–53).

``staffing`` lê a demanda (curva 168 h, respeitando a janela de operação), a carga semanal
do modelo e o quadro atual do cenário; ``rest_report`` deriva tudo da matriz mensal (as
mesmas pessoas e células que o gestor vê) mais o mês anterior, para os dias consecutivos
que atravessam a virada do mês.
"""

from __future__ import annotations

import uuid
from fractions import Fraction
from math import ceil
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from escalas.core.errors import AppError, validation
from escalas.repositories.scenarios import ScenarioRepo
from escalas.schemas import scenario as ss
from escalas.services.engine import folgas as FG
from escalas.services.engine import personalizado as P
from escalas.services.engine import quadro as Q
from escalas.services.engine.shrinkage import ErroShrinkage
from escalas.services.escalas import matrix_service
from escalas.services.escalas import scenario_service as svc
from escalas.services.escalas.engine_runner import EntradaSimulacao

if TYPE_CHECKING:
    from escalas.api.deps import Principal


def _janela(e: EntradaSimulacao) -> P.Janela | None:
    if e.padrao is not None:
        return e.padrao.janela
    if e.modelo is not None and not e.modelo.continuo_24x7:
        return P.janela_padrao(e.modelo, e.catalogo.turnos)
    return None


def _horas_modelo(e: EntradaSimulacao) -> tuple[Fraction | None, Fraction | None]:
    """(horas semanais médias, jornada diária) do modelo ou do padrão personalizado."""
    if e.padrao is not None:
        rel = [P.relatorio_camada(c, e.padrao.turnos) for c in e.padrao.camadas]
        usados = [e.padrao.turnos[t] for r in rel for t in r.turnos if t in e.padrao.turnos]
        jornada = (Fraction(sum(t.minutos_trabalhados for t in usados), 60 * len(usados))
                   if usados else None)
        return (max(r.horas_semanais for r in rel) if rel else None), jornada
    if e.modelo is not None:
        return e.modelo.horas_semanais(), Fraction(e.modelo.duracoes_min[0], 60)
    return None, None


def staffing(db: Session, p: Principal, sid: uuid.UUID, body: ss.StaffingIn
             ) -> ss.StaffingOut:
    s = svc._get(db, p, sid)
    e, _, _ = svc._entrada(db, p, s)
    janela = _janela(e)
    hps = Fraction(sum(int(v) for i, v in enumerate(e.curva.valores)
                       if janela is None or janela.aberta(i // 24, i % 24)))
    h_modelo, j_modelo = _horas_modelo(e)
    h_regime = Fraction(e.regime.carga_semanal_max_min, 60)
    if body.weekly_hours is not None:
        horas, fonte = Fraction(body.weekly_hours), "informado"
    elif h_modelo:
        horas, fonte = h_modelo, "modelo"
    else:
        horas, fonte = h_regime, "regime"
    jornada = Fraction(body.shift_hours) if body.shift_hours is not None else (
        j_modelo or Fraction(8))
    try:
        taxa = Q.taxa_indisponibilidade(
            Q.Indisponibilidade(Fraction(body.vacation_days), Fraction(body.holidays_days),
                                Fraction(body.absenteeism_pct), Fraction(body.training_hours),
                                Fraction(body.handover_min)), horas, jornada)
        q = Q.dimensionar_quadro(hps, horas, taxa.taxa)
    except ErroShrinkage as exc:
        raise validation(str(exc), [{"field": "unavailability", "code": "too_high",
                                     "message": str(exc)}]) from exc
    teams = list(ScenarioRepo(db, p.org_id).teams(s.id))
    atual = sum(t.size_assigned for t in teams)
    if not atual:
        atual = ceil(sum((Fraction(t.size_required) for t in teams), Fraction(0)))
    if not atual:
        atual = e.k * e.tamanho_turma
    status = ("insuficiente" if atual < q.equipe_minima
              else "sem_reserva" if atual < q.equipe_recomendada else "suficiente")
    postos = hps / 168
    return ss.StaffingOut(
        post_hours_week=svc.D(q.horas_posto_semana), post_hours_year=svc.D(q.horas_posto_ano),
        simultaneous_posts_avg=svc.D(postos), weekly_hours=svc.D(horas),
        weekly_hours_source=fonte,  # type: ignore[arg-type]
        shift_hours=svc.D(jornada), contracted_hours_year=svc.D(q.horas_contratadas_ano),
        net_hours_year=svc.D(q.horas_uteis_ano), unavailability_rate=svc.D(q.taxa),
        components=[ss.StaffingComponent(code=c.codigo,  # type: ignore[arg-type]
                                         rate=svc.D(c.taxa), hours_per_year=svc.D(c.horas_ano))
                    for c in taxa.componentes],
        coverage_factor=svc.D(q.fator_cobertura),
        people_per_post=svc.D(q.fator_cobertura / postos) if postos else None,
        headcount_min=q.equipe_minima, headcount_recommended=q.equipe_recomendada,
        reserve=q.reserva, headcount_current=atual,
        headcount_gap=q.equipe_recomendada - atual,
        status=status,  # type: ignore[arg-type]
        legal_regime=e.regime.ref, legal_weekly_hours=svc.D(h_regime))


def _mes_anterior(month: str) -> str:
    y, m = (int(x) for x in month.split("-"))
    return f"{y - 1:04d}-12" if m == 1 else f"{y:04d}-{m - 1:02d}"


def _trabalha(c: ss.MatrixCell) -> bool:
    return c.code != "F" or c.reserve


def rest_report(db: Session, p: Principal, sid: uuid.UUID, month: str,
                weekly_rest_days: float | None = None,
                max_consecutive_days: int | None = None) -> ss.RestReportOut:
    mx = matrix_service.monthly_matrix(db, p, sid, month)
    regime = svc._regime(db, svc._get(db, p, sid))
    regra = FG.RegraFolgas(
        Fraction(str(weekly_rest_days)) if weekly_rest_days is not None
        else max(FG.FOLGAS_SEMANA_MINIMO, regime.folgas_semanais_min),
        max_consecutive_days or FG.RegraFolgas().max_consecutivos)
    antes: dict[str, int] = {}
    try:
        prev = matrix_service.monthly_matrix(db, p, sid, _mes_anterior(month))
        antes = {pe.id: FG.consecutivos_no_fim([_trabalha(c) for c in pe.cells])
                 for pe in prev.people}
    except AppError:
        pass
    dias = [d.date for d in mx.days]
    feriados = frozenset(d.date for d in mx.days if d.holiday)
    noturnos = {sh.code for sh in mx.shifts if sh.night}
    inds: list[FG.IndicadoresPessoa] = []
    people: list[ss.RestPerson] = []
    for pe in mx.people:
        trab = [_trabalha(c) for c in pe.cells]
        ind = FG.indicadores(trab, [c.code in noturnos for c in pe.cells], dias, feriados,
                             regra, antes.get(pe.id, 0))
        inds.append(ind)
        alerts = ([FG.FOL_FOLGAS_PENDENTES] if ind.folgas_pendentes else []) + (
            [FG.FOL_DIAS_CONSECUTIVOS] if ind.excede_consecutivos else [])
        people.append(ss.RestPerson(
            id=pe.id, name=pe.name, team=pe.team, role=pe.role,
            worked_days=ind.dias_trabalhados, rest_days=ind.folgas,
            min_rest_days=ind.folgas_minimas, pending_rest_days=ind.folgas_pendentes,
            max_consecutive_days=ind.max_consecutivos, hours=pe.totals.hours,
            sundays_worked=ind.domingos_trabalhados,
            holidays_worked=ind.feriados_trabalhados, nights=ind.noites,
            weekends_off=ind.fins_de_semana_folga, alerts=alerts))
    series: list[tuple[str, list[Fraction]]] = [
        ("rest_days", [Fraction(i.folgas) for i in inds]),
        ("sundays_worked", [Fraction(i.domingos_trabalhados) for i in inds]),
        ("holidays_worked", [Fraction(i.feriados_trabalhados) for i in inds]),
        ("nights", [Fraction(i.noites) for i in inds]),
        ("hours", [Fraction(pe.hours) for pe in people])]
    equity = []
    for metric, vals in series:
        eq = FG.equidade(vals)
        equity.append(ss.EquityOut(metric=metric,  # type: ignore[arg-type]
                                   min=svc.D(eq.minimo), max=svc.D(eq.maximo),
                                   mean=svc.D(eq.media), index=svc.D(eq.indice)))
    horas_def = sum(d.deficit_hours for d in mx.daily)
    indices = [ic for d in mx.daily for c, nec in d.required_by_shift.items()
               if (ic := FG.indice_cobertura(d.by_shift.get(c, 0), nec)) is not None]
    bloqueios = FG.bloqueios_fechamento(inds, horas_def, regra)
    return ss.RestReportOut(
        month=mx.month, generated_people=mx.generated_people,
        rule=ss.RestRule(
            weekly_rest_days=svc.D(regra.folgas_semana),
            max_consecutive_days=regra.max_consecutivos,
            min_rest_days_month=FG.folgas_minimas_mes(len(dias), regra.folgas_semana),
            source="informado" if weekly_rest_days is not None else "minimo",
            legal_regime=regime.ref),
        people=people, equity=equity,
        coverage=ss.RestCoverage(
            deficit_hours=horas_def,
            days_with_deficit=sum(1 for d in mx.daily if d.deficit_hours),
            coverage_index_min=svc.D(min(indices)) if indices else None,
            coverage_index_mean=(svc.D(sum(indices, Fraction(0)) / len(indices))
                                 if indices else None)),
        can_close=not bloqueios,
        blockers=[ss.ClosingBlocker(code=b.codigo, count=b.quantidade, message=b.mensagem)
                  for b in bloqueios])


