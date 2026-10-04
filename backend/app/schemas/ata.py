from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Dict, Optional
from datetime import date
import uuid

# Limites de entrada: protegem a API (memória, tempo de exportação) e o Excel gerado.
MAX_TEXTO_CURTO = 120      # turno, unidade, responsável, tipo
MAX_TEXTO_LONGO = 2000     # campos SBAR do plano de ação
MAX_CATEGORIAS = 20
MAX_QUESTOES = 200


# Action Plan per Question
class ActionPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str = Field("", max_length=MAX_TEXTO_CURTO)  # "Manutenção", "5S", etc.
    s: str = Field("", max_length=MAX_TEXTO_LONGO)
    b: str = Field("", max_length=MAX_TEXTO_LONGO)
    a: str = Field("", max_length=MAX_TEXTO_LONGO)
    r: str = Field("", max_length=MAX_TEXTO_LONGO)


def _checa_matriz(valor: dict, nome: str) -> dict:
    """{ categoria: { questão: ... } } com índices e tamanhos dentro dos limites."""
    if len(valor) > MAX_CATEGORIAS:
        raise ValueError(f"{nome}: no máximo {MAX_CATEGORIAS} categorias")
    for cat, questoes in valor.items():
        if not 0 <= cat < MAX_CATEGORIAS:
            raise ValueError(f"{nome}: índice de categoria fora do intervalo: {cat}")
        if len(questoes) > MAX_QUESTOES:
            raise ValueError(f"{nome}: no máximo {MAX_QUESTOES} questões por categoria")
        for q in questoes:
            if not 0 <= q < MAX_QUESTOES:
                raise ValueError(f"{nome}: índice de questão fora do intervalo: {q}")
    return valor


# Nested Dicts: { category_idx: { question_idx: VALUE } }
# Using Dict[int, Dict[int, ...]] for compatibility with JS indices
class AtaBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: date
    shift: str = Field(..., min_length=1, max_length=MAX_TEXTO_CURTO)
    unit: str = Field(..., min_length=1, max_length=MAX_TEXTO_CURTO)
    responsible: Optional[str] = Field(None, max_length=MAX_TEXTO_CURTO)
    kpi_score: int = Field(..., ge=0, le=100)
    answers: Dict[int, Dict[int, Optional[str]]]  # "SIM", "NÃO", "NA", null
    action_plans: Dict[int, Dict[int, ActionPlan]]

    @field_validator("answers")
    @classmethod
    def _answers(cls, v):
        _checa_matriz(v, "answers")
        for questoes in v.values():
            for resposta in questoes.values():
                if resposta is not None and len(resposta) > 10:
                    raise ValueError("answers: resposta longa demais (use SIM, NÃO ou NA)")
        return v

    @field_validator("action_plans")
    @classmethod
    def _plans(cls, v):
        return _checa_matriz(v, "action_plans")


class AtaCreate(AtaBase):
    pass


class Ata(AtaBase):
    id: uuid.UUID
    created_at: date

    model_config = ConfigDict(from_attributes=True, extra="forbid")
