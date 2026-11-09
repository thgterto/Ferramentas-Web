"""Construtor de padrões (FR-29–FR-33): conversão API ↔ motor, pré-visualização e templates.

Nenhum cálculo aqui: o motor genérico está em ``app.services.engine.personalizado``.
"""

from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime
from fractions import Fraction
from typing import TYPE_CHECKING, Any, cast

from sqlalchemy.orm import Session

from app.core.errors import conflict, not_found, validation
from app.db.models import CustomSchedulePattern
from app.repositories.base import TenantRepository
from app.schemas import pattern as sp
from app.services.engine import personalizado as P
from app.services.engine.catalogo import catalogo_mvp
from app.services.engine.demanda import CurvaDemanda, postos_24x7
from app.services.engine.regime_legal import ContextoRegime
from app.services.engine.types import Achado, Turno, para_decimal
from app.services.escalas.catalog_service import resolve_engine_regime

if TYPE_CHECKING:
    from app.api.deps import Principal


class PatternRepo(TenantRepository[CustomSchedulePattern]):
    model = CustomSchedulePattern
    label = "padrão de escala"


def _hhmm(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def _fmt(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"


# ---- conversão ---------------------------------------------------------------------------
def to_engine(spec: sp.PatternSpec) -> P.PadraoPersonalizado:
    try:
        turnos = {s.code: Turno(s.code, _hhmm(s.start), s.duration_min, s.break_min,
                                tuple((_hhmm(a), int(d)) for a, d in (s.blocks or ())))
                  for s in spec.shifts}
        camadas = tuple(P.Camada(
            codigo=layer.code, nome=layer.name or layer.code, sequencia=tuple(layer.sequence),
            rotacao=layer.rotation, k_modo=layer.team_mode, k=layer.k, k_min=layer.k_min,
            k_max=layer.k_max,
            offsets=tuple(layer.offsets) if layer.offsets is not None else None,
            tamanhos=(tuple(Fraction(str(v)) for v in layer.team_sizes)
                      if layer.team_sizes else None),
            folgas_fixas=frozenset(layer.fixed_off_weekdays),
            dias_ativos=frozenset(layer.active_weekdays), semanal=layer.weekly_anchor,
            cargo=layer.role_code) for layer in spec.layers)
        w = spec.operating_window
        janela = (P.Janela(frozenset(w.weekdays), _hhmm(w.start), _hhmm(w.end))
                  if w is not None else None)
        return P.PadraoPersonalizado(spec.derived_from or "PERSONALIZADO", turnos, camadas,
                                     spec.anchor_date, janela, spec.derived_from)
    except ValueError as exc:
        raise validation(f"padrão inválido: {exc}", code="PATTERN_INVALIDO") from exc


def from_engine(p: P.PadraoPersonalizado, name: str) -> sp.PatternSpec:
    return sp.PatternSpec(
        name=name, derived_from=p.derivado_de,
        shifts=[sp.ShiftIn(code=t.codigo, name=None, color=None, start=_fmt(t.inicio_min),
                           duration_min=t.duracao_min,
                           break_min=t.intervalo_min,
                           blocks=[(_fmt(a), d) for a, d in t.blocos] or None)
                for t in p.turnos.values()],
        layers=[sp.LayerIn(
            code=c.codigo, name=c.nome, sequence=list(c.sequencia),
            rotation=cast(Any, c.rotacao), team_mode=cast(Any, c.k_modo), k=c.k,
            k_min=c.k_min, k_max=c.k_max,
            offsets=list(c.offsets) if c.offsets is not None else None,
            team_sizes=[para_decimal(v) for v in c.tamanhos] if c.tamanhos else None,
            fixed_off_weekdays=sorted(c.folgas_fixas),
            active_weekdays=sorted(c.dias_ativos),
            weekly_anchor=c.semanal) for c in p.camadas],
        anchor_date=p.data_ancora)


def derive(code: str, team_count: int | None, team_size: int | None) -> sp.PatternSpec:
    """"Duplicar do catálogo" / "Personalizar": modelo → padrão editável em camadas."""
    cat = catalogo_mvp()
    m = cat.modelos.get(code)
    if m is None:
        raise not_found("modelo de escala")
    p = P.de_modelo(m, cat.turnos, team_count, team_size)
    spec = from_engine(p, m.nome)
    if p.janela is not None:
        spec.operating_window = sp.WindowIn(
            weekdays=sorted(p.janela.dias),
            start=_fmt(p.janela.inicio_min), end=_fmt(p.janela.fim_min))
    return spec


def _brief(a: Achado) -> sp.FindingLite:
    return sp.FindingLite(rule_code=a.codigo, severity=a.severidade.value.lower(),  # type: ignore[arg-type]
                          message=a.mensagem, layer=a.contexto.get("camada"),
                          details=dict(a.contexto))


def _d(v: Fraction | int) -> Any:
    return para_decimal(v)


def validate(body: sp.PatternValidateIn) -> sp.PatternValidation:
    """Validação em tempo real (FR-29): K*, exatidão, h/sem, interjornada e cobertura."""
    t0 = time.perf_counter()
    p = to_engine(body.pattern)
    curva: CurvaDemanda = (CurvaDemanda(tuple(body.demand)) if body.demand is not None
                           else postos_24x7(body.postos))
    tam = body.team_size or max(1, max(curva.valores))
    regime = resolve_engine_regime(body.legal_regime_code or "CLT_44H_ATUAL", None)
    try:
        pv = P.previa(p, curva, tam, regime, ContextoRegime(), semanas=body.weeks)
    except ValueError as exc:
        raise validation(f"padrão inválido: {exc}", code="PATTERN_INVALIDO") from exc
    res = pv.cobertura
    esc_ks = pv.ks
    layers = []
    for c, r, k in zip(p.camadas, pv.relatorios, esc_ks, strict=True):
        layers.append(sp.LayerReport(
            code=r.codigo, cycle_length=r.ciclo, k_required=_d(r.k_estrela),
            k_suggested=r.k_sugerido, k_used=k, offsets=list(P.offsets_camada(c, k)),
            exact=r.exato, exact_with_half_teams=r.meias_exato,
            avg_weekly_hours=_d(r.horas_semanais), rest_days_per_7=_d(r.folgas_7d),
            max_consecutive_work_days=r.maior_sequencia_trabalho,
            min_rest_between_shifts_hours=(_d(Fraction(r.menor_interjornada_min, 60))
                                           if r.menor_interjornada_min is not None else None),
            team_sizes=[_d(v) for v in P.tamanhos_camada(c, k, Fraction(tam))]))
    slots = [sp.PreviewSlot(slot_index=d * 24 + h, required=_d(curva.valores[d * 24 + h]),
                            scheduled_worst=_d(curva.valores[d * 24 + h] + res.heat_pior[d][h]),
                            gap_worst=_d(res.heat_pior[d][h]))
             for d in range(7) for h in range(24)]
    if p.janela is not None:
        for s in slots:
            d, h = divmod(s.slot_index, 24)
            if not p.janela.aberta(d, h):
                s.required = _d(0)
                s.gap_worst = s.scheduled_worst - s.required
    kp = res.kpis
    teams = sum(esc_ks)
    hc = sum((sum(P.tamanhos_camada(c, kk, Fraction(tam)), Fraction(0))
              for c, kk in zip(p.camadas, esc_ks, strict=True)), Fraction(0))
    return sp.PatternValidation(
        layers=layers, teams_total=teams, headcount=_d(hc),
        k_required_total=_d(sum((r.k_estrela for r in pv.relatorios), Fraction(0))),
        coverage_pct=_d(kp.pct_horas_posto_cobertas),
        deficit_post_hours_week=_d(kp.deficit_hp_semana), excess_pct=_d(kp.pct_excesso),
        slots=slots, findings=[_brief(a) for a in pv.achados], legal_regime=regime.ref,
        elapsed_ms=int((time.perf_counter() - t0) * 1000))


# ---- templates da organização (FR-31) ------------------------------------------------------
def _out(r: CustomSchedulePattern) -> sp.PatternTemplateOut:
    return sp.PatternTemplateOut(
        id=r.public_id, name=r.name, derived_from_code=r.derived_from_code,
        current_version=r.current_version, is_shared=r.is_shared,
        pattern=sp.PatternSpec.model_validate(r.spec), validation=r.validation,
        created_at=r.created_at, updated_at=r.updated_at)


def _summary(spec: sp.PatternSpec) -> dict[str, Any]:
    p = to_engine(spec)
    return {"layers": [{"code": r.codigo, "k_required": str(_d(r.k_estrela)),
                        "exact": r.exato, "avg_weekly_hours": str(_d(r.horas_semanais))}
                       for r in (P.relatorio_camada(c, p.turnos) for c in p.camadas)]}


def list_templates(db: Session, p: Principal) -> list[sp.PatternTemplateOut]:
    rows = PatternRepo(db, p.org_id).find()
    return [_out(r) for r in sorted(rows, key=lambda r: r.name.lower())]


def get_template(db: Session, p: Principal, pid: uuid.UUID) -> sp.PatternTemplateOut:
    return _out(PatternRepo(db, p.org_id).get(pid))


def _unique(db: Session, p: Principal, name: str, skip: int | None = None) -> None:
    for r in PatternRepo(db, p.org_id).find(CustomSchedulePattern.name == name):
        if r.id != skip:
            raise conflict("duplicate", f"já existe um padrão chamado “{name}”")


def create_template(db: Session, p: Principal, body: sp.PatternTemplateIn
                    ) -> sp.PatternTemplateOut:
    _unique(db, p, body.name)
    spec = body.pattern.model_copy(update={"name": body.name})
    r = PatternRepo(db, p.org_id).add(
        name=body.name, derived_from_code=spec.derived_from, current_version=1,
        is_shared=body.is_shared, spec=spec.model_dump(mode="json"),
        validation=_summary(spec), created_by=p.user.id)
    db.commit()
    return _out(r)


def update_template(db: Session, p: Principal, pid: uuid.UUID, body: sp.PatternTemplatePut
                    ) -> sp.PatternTemplateOut:
    repo = PatternRepo(db, p.org_id)
    r = repo.get(pid)
    vals: dict[str, Any] = {"current_version": r.current_version + 1,
                            "updated_at": datetime.now(UTC)}
    if body.name:
        _unique(db, p, body.name, r.id)
        vals["name"] = body.name
    if body.pattern is not None:
        spec = body.pattern.model_copy(update={"name": body.name or r.name})
        vals.update(spec=spec.model_dump(mode="json"), validation=_summary(spec),
                    derived_from_code=spec.derived_from)
    repo.update(r, vals)
    db.commit()
    return _out(r)


def duplicate_template(db: Session, p: Principal, pid: uuid.UUID, body: sp.PatternDuplicateIn
                       ) -> sp.PatternTemplateOut:
    r = PatternRepo(db, p.org_id).get(pid)
    name = body.name or f"{r.name} (cópia)"
    return create_template(db, p, sp.PatternTemplateIn(
        name=name, pattern=sp.PatternSpec.model_validate(r.spec), is_shared=r.is_shared))


def delete_template(db: Session, p: Principal, pid: uuid.UUID) -> None:
    repo = PatternRepo(db, p.org_id)
    repo.delete(repo.get(pid))
    db.commit()
