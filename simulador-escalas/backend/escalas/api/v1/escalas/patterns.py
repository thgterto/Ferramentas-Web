"""Construtor de padrões (FR-29–FR-33, v3.5): derivar do catálogo, validar em tempo real e
templates da organização (``custom_schedule_patterns``)."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response

from escalas.api.deps import DB, Current, Writer
from escalas.api.v1.escalas._common import ERRORS, created
from escalas.schemas import pattern as sp
from escalas.schemas.common import Envelope
from escalas.services.escalas import pattern_service as svc

router = APIRouter(responses=ERRORS, tags=["patterns"])


@router.get("/schedule-models/{code}/pattern", response_model=Envelope[sp.PatternSpec])
def model_pattern(
    code: str, _: Current,
    team_count: Annotated[int | None, Query(ge=1, le=60)] = None,
    team_size: Annotated[int | None, Query(ge=1, le=500)] = None,
) -> object:
    """Padrão editável derivado do modelo (\"Personalizar\" / \"Duplicar do catálogo\")."""
    return {"data": svc.derive(code, team_count, team_size)}


@router.post("/schedule-patterns:validate", response_model=Envelope[sp.PatternValidation])
def validate(body: sp.PatternValidateIn, _: Current) -> object:
    """Validação em tempo real: K*/exato, h/sem, interjornada, achados e cobertura 7×24.

    Achados legais nunca bloqueiam: o padrão sempre pode ser simulado.
    """
    return {"data": svc.validate(body)}


@router.get("/schedule-patterns", response_model=Envelope[list[sp.PatternTemplateOut]])
def list_patterns(p: Current, db: DB) -> object:
    return {"data": svc.list_templates(db, p)}


@router.post("/schedule-patterns", response_model=Envelope[sp.PatternTemplateOut],
             status_code=201)
def create_pattern(body: sp.PatternTemplateIn, p: Writer, db: DB, response: Response) -> object:
    out = svc.create_template(db, p, body)
    created(response, f"/schedule-patterns/{out.id}")
    return {"data": out}


@router.get("/schedule-patterns/{pattern_id}", response_model=Envelope[sp.PatternTemplateOut])
def get_pattern(pattern_id: uuid.UUID, p: Current, db: DB) -> object:
    return {"data": svc.get_template(db, p, pattern_id)}


@router.put("/schedule-patterns/{pattern_id}", response_model=Envelope[sp.PatternTemplateOut])
def put_pattern(pattern_id: uuid.UUID, body: sp.PatternTemplatePut, p: Writer, db: DB
                ) -> object:
    """Alteração cria nova versão (``current_version + 1``)."""
    return {"data": svc.update_template(db, p, pattern_id, body)}


@router.post("/schedule-patterns/{pattern_id}/duplicate",
             response_model=Envelope[sp.PatternTemplateOut], status_code=201)
def duplicate_pattern(pattern_id: uuid.UUID, body: sp.PatternDuplicateIn, p: Writer, db: DB,
                      response: Response) -> object:
    out = svc.duplicate_template(db, p, pattern_id, body)
    created(response, f"/schedule-patterns/{out.id}")
    return {"data": out}


@router.delete("/schedule-patterns/{pattern_id}", status_code=204)
def delete_pattern(pattern_id: uuid.UUID, p: Writer, db: DB) -> Response:
    svc.delete_template(db, p, pattern_id)
    return Response(status_code=204)
