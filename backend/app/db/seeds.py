"""Seeds globais derivados dos DADOS do motor (catálogo YAML, regimes YAML) — usados pela
migração ``0002_seeds`` e pelos testes. Nunca ``if modelo == …`` (ADR-010)."""

from __future__ import annotations

from datetime import date, time
from decimal import Decimal
from fractions import Fraction
from typing import Any

from app.services.engine.catalogo import Catalogo, catalogo_mvp
from app.services.engine.regime_legal import AncoraD0, Regimes, regime_compliance, regimes_mvp
from app.services.engine.types import FOLGA, RESERVA, para_decimal

RULES_VERSION = "compliance-2026.11+regimes-1"
_V = "compliance-2026.11"
_R = "compliance-2026.11+regimes-1"

# 05 §3.9 + §3.13 + códigos COB_* do M3 enxuto (cargos/K) que o motor emite.
COMPLIANCE_RULES: list[dict[str, Any]] = [
    {"code": c, "default_severity": s, "title": t, "legal_reference": r, "rules_version": v,
     "is_blocking": s == "erro" and b}
    for c, s, t, r, v, b in [
        ("COB_DEFICIT", "alerta", "Cobertura abaixo da demanda", "FR-09/FR-12", _V, False),
        ("COB_DEFICIT_POSTO_CRITICO", "erro", "Déficit em posto crítico", "FR-02", _V, True),
        ("COB_EXCESSO", "info", "Cobertura acima da demanda", "FR-09", _V, False),
        ("COB_PASSAGEM_PLANEJADA", "info",
         "Excesso planejado de passagem de turno / reforço de pico", "FR-09", _V, False),
        ("COB_DEFICIT_ESPERADO_SHRINKAGE", "alerta", "Déficit esperado após absenteísmo",
         "FR-11", _V, False),
        ("COB_REMANEJAMENTO_SUBSETOR", "info",
         "Pessoas remanejadas entre subsetores intercambiáveis (pool)", "FR-34/v3.7", _V, False),
        ("COB_DEFICIT_SUBSETOR", "alerta", "Déficit em subsetor após remanejamento",
         "FR-09/v3.7", _V, False),
        ("COB_TURMAS_INSUFICIENTES", "erro", "Nº de turmas abaixo do K necessário", "FR-08",
         _V, True),
        ("COB_K_INSUFICIENTE", "alerta", "K fixo da operação não cobre a demanda", "FR-32",
         _V, False),
        ("COB_K_SUGERIDO", "info", "K escolhido pelo motor (mínimo/faixa/sugerir)", "FR-32",
         _V, False),
        ("COB_PADRAO_NAO_EXATO", "info", "Padrão não fecha exato com turmas iguais", "FR-29",
         _V, False),
        ("COB_FORA_JANELA", "info", "Turma escalada fora da janela de operação", "FR-29",
         _V, False),
        ("COB_CARGO_SEM_QUALIFICADO", "erro", "Mínimo por cargo não atendido", "FR-36", _V,
         True),
        ("COB_DEFICIT_CARGO", "alerta", "Déficit por cargo após substituição", "FR-35", _V,
         False),
        ("COB_COBERTURA_POR_SUBSTITUICAO", "info", "Horas-posto cobertas por substituição",
         "FR-35", _V, False),
        ("CLT_INTERJORNADA", "erro", "Interjornada < 11h", "CLT art. 66", _V, True),
        ("CLT_DSR_35H", "erro", "Repouso semanal < 35h (24h DSR + 11h)",
         "CLT art. 67; Lei 605/1949; Súmula 110 TST", _V, True),
        ("CLT_SETIMO_DIA", "erro", "7 dias consecutivos de trabalho", "OJ 410 SDI-1 TST", _V,
         True),
        ("CLT_JORNADA_DIARIA", "alerta", "Jornada computada > 8h (erro se > 10h fora de 12x36)",
         "CLT arts. 58, 59, 73", _V, False),
        ("CLT_MEDIA_SEMANAL", "alerta", "Média semanal > carga contratual", "CF art. 7º, XIII",
         _V, False),
        ("CLT_CARGA_SEMANAL_EXCEDIDA", "erro",
         "Média semanal no ciclo acima da carga máxima do regime",
         "CF art. 7º XIII; EC fim da 6x1 (premissa)", _R, True),
        ("CLT_FOLGAS_SEMANAIS_INSUFICIENTES", "erro",
         "Folgas por semana abaixo do mínimo do regime", "EC fim da 6x1 (premissa)", _R, True),
        ("CLT_ESCALA_6X1_VEDADA", "erro", "Escala 6x1 vedada neste regime",
         "EC fim da 6x1 (premissa)", _R, True),
        ("CLT_VIAVEL_SOMENTE_COM_ACT", "alerta",
         "Escala só é viável com ACT/CCT (compensação de jornada/carga)",
         "CLT art. 59 §2º; EC fim da 6x1 (premissa)", _R, False),
        ("CLT_REGIME_PENDENTE_REGULAMENTACAO", "alerta",
         "Regime diferenciado pendente de lei ordinária",
         "CLT art. 59-A; EC fim da 6x1 (premissa)", _R, False),
        ("INFO_REGIME_PREMISSA", "info",
         "Regime legal baseado em premissa (texto promulgado não confirmado)", "01-PRD §8.1",
         _R, False),
    ]
]


def _dec(f: Fraction | int | None) -> Decimal | None:
    return None if f is None else para_decimal(f)


def shift_template_rows(cat: Catalogo | None = None) -> list[dict[str, Any]]:
    cat = cat or catalogo_mvp()
    rows = []
    for t in cat.turnos.values():
        ini = t.inicio_min
        rows.append({
            "organization_id": None, "code": t.codigo,
            "name": f"{t.codigo} {ini // 60:02d}h+{t.duracao_min // 60}h",
            "start_time": time(ini // 60, ini % 60), "duration_minutes": t.duracao_min,
            "break_minutes": 60 if t.duracao_min > 360 else 15,
            "break_policy": "computado_rendicao",
            "night_clock_minutes": 0,
        })
    return rows


def schedule_model_rows(cat: Catalogo | None = None,
                        regs: Regimes | None = None) -> list[dict[str, Any]]:
    cat = cat or catalogo_mvp()
    regs = regs or regimes_mvp()
    rows = []
    for m in cat.modelos.values():
        seq = m.sequencias[0]
        w = sum(1 for e in seq if e not in (FOLGA, RESERVA))
        dur = m.duracoes_min[0]
        selos = (m.regime_compliance or {}).get(str(dur))
        rc = ({k: {"status": str(v)} for k, v in selos.items()} if selos
              else {k: {"status": str(v)}
                    for k, v in regime_compliance(m, cat, regs).items()})
        turnos_trab = {e for s in m.sequencias for e in s if e not in (FOLGA, RESERVA)}
        typical = [v.turmas for v in m.variantes if v.turmas] or (
            [m.turmas_inteiras] if m.turmas_inteiras else [m.k_nao_continuo or 1])
        so_act = any(v.get("status") == "so_com_act" for v in rc.values())
        inviavel = all(v.get("status") == "nao_conforme" for v in rc.values())
        rows.append({
            "code": m.codigo, "name": m.nome, "work_days": w, "off_days": len(seq) - w,
            "cycle_length_days": len(seq), "typical_teams": typical,
            "calendar_cycle_days": m.ciclo_calendario,
            "daily_hours": _dec(Fraction(dur, 60)), "avg_weekly_hours": _dec(m.horas_semanais()),
            "is_continuous_24x7": m.continuo_24x7,
            "is_rotating": len(m.sequencias) == 1 and len(turnos_trab) > 1,
            "requires_agreement": so_act, "legal_basis": None,
            "default_params": {"sequences": [list(x) for x in m.sequencias],
                               "weekly": m.semanal, "k_non_continuous": m.k_nao_continuo},
            "is_active": True,
            "catalog_group": m.grupo,
            "shifts_per_day": max(1, len(turnos_trab)),
            "teams_24x7": _dec(m.k_estrela), "exact_24x7": bool(m.exato),
            "exact_alternative": (f"{int(2 * m.k_estrela)}_meias"
                                  if m.k_estrela and m.exato_meias and not m.exato else None),
            "teams_non_continuous": _dec(m.k_nao_continuo),
            "legal_status": ("inviavel_clt" if inviavel and m.fase != "mvp"
                             else "exige_cct" if so_act else "viavel"),
            "cycle_unit": "days", "phase": m.fase, "regime_compliance": rc,
        })
    rows.append(PERSONALIZADO_ROW)
    return rows


PERSONALIZADO = "PERSONALIZADO"
PERSONALIZADO_ROW: dict[str, Any] = {
    # Âncora do FK ``scenarios.schedule_model_id`` para cenários com padrão do construtor
    # (``params.pattern``); não aparece no catálogo (grupo 'personalizado').
    "code": PERSONALIZADO, "name": "Padrão personalizado (construtor)", "work_days": 1,
    "off_days": 0, "cycle_length_days": 1, "typical_teams": [1], "calendar_cycle_days": 7,
    "daily_hours": Decimal("8.000000"), "avg_weekly_hours": Decimal("0.000000"),
    "is_continuous_24x7": False, "is_rotating": False, "requires_agreement": False,
    "legal_basis": None, "default_params": {}, "is_active": True,
    "catalog_group": "personalizado", "shifts_per_day": 1, "teams_24x7": None,
    "exact_24x7": False, "exact_alternative": None, "teams_non_continuous": None,
    "legal_status": "viavel", "cycle_unit": "days", "phase": "fase2", "regime_compliance": {},
}


def _offset(a: object) -> str | None:
    if not isinstance(a, AncoraD0):
        return None
    partes = []
    if a.meses:
        partes.append(f"{a.meses} months")
    if a.dias or not a.meses:
        partes.append(f"{a.dias} days")
    s = " ".join(partes)
    return f"{s} - 1 day" if a.menos_um_dia else s


def legal_regime_rows(regs: Regimes | None = None) -> list[dict[str, Any]]:
    regs = regs or regimes_mvp()
    rows = []
    for r in regs.regimes.values():
        anc = isinstance(r.valid_from, AncoraD0) or isinstance(r.valid_to, AncoraD0)
        rows.append({
            "code": r.codigo, "version": r.versao, "name": r.nome, "status": r.status,
            "valid_from": r.valid_from if isinstance(r.valid_from, date) else None,
            "valid_to": r.valid_to if isinstance(r.valid_to, date) else None,
            "anchor": "promulgacao" if anc else None,
            "anchor_offset_from": _offset(r.valid_from), "anchor_offset_to": _offset(r.valid_to),
            "weekly_hours_max": _dec(Fraction(r.carga_semanal_max_min, 60)),
            "daily_hours_max": _dec(Fraction(r.jornada_diaria_max_min, 60)),
            "min_rest_days_per_week": _dec(r.folgas_semanais_min),
            "rest_days_criterion": r.criterio_folgas, "allows_6x1": r.permite_6x1,
            "allows_compensation_agreement": r.compensacao_act,
            "special_regimes": dict(r.especiais), "legal_reference": r.fonte,
            "assumption_note": ("Premissa: parâmetros de reportagens; confirmar texto "
                                "promulgado (01 §8.1)") if r.status == "premissa" else None,
            "supersedes_id": None,
        })
    return rows


def seed_globals(session: Any) -> None:
    """Insere os catálogos globais (idempotente) — usado em testes/dev; produção: Alembic."""
    from sqlalchemy import select

    from app.db.models import ComplianceRule, LegalRegime, ScheduleModel, ShiftTemplate

    have = set(session.scalars(select(ScheduleModel.code)).all())
    session.add_all(ScheduleModel(**r) for r in schedule_model_rows() if r["code"] not in have)
    have_t = set(session.scalars(select(ShiftTemplate.code)
                                 .where(ShiftTemplate.organization_id.is_(None))).all())
    session.add_all(ShiftTemplate(**r) for r in shift_template_rows() if r["code"] not in have_t)
    have_r = set(session.scalars(select(ComplianceRule.code)).all())
    session.add_all(ComplianceRule(**r) for r in COMPLIANCE_RULES if r["code"] not in have_r)
    if session.scalar(select(LegalRegime.id).limit(1)) is None:
        session.add_all(LegalRegime(**r) for r in legal_regime_rows())
    session.commit()


MVP_SHIFTS = frozenset({"M", "T", "N", "D12", "N12"})
RULES_V35 = frozenset({"COB_K_SUGERIDO", "COB_PADRAO_NAO_EXATO", "COB_FORA_JANELA"})
RULES_V37 = frozenset({"COB_REMANEJAMENTO_SUBSETOR", "COB_DEFICIT_SUBSETOR"})
