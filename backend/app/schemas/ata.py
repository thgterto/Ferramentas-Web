from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import date
import uuid

# Action Plan per Question
class ActionPlan(BaseModel):
    type: str = "" # "Manutenção", "5S", etc.
    s: str = ""
    b: str = ""
    a: str = ""
    r: str = ""

# Nested Dicts: { category_idx: { question_idx: VALUE } }
# Using Dict[int, Dict[int, ...]] for compatibility with JS indices
class AtaBase(BaseModel):
    date: date
    shift: str
    unit: str
    responsible: Optional[str] = None
    kpi_score: int
    answers: Dict[int, Dict[int, Optional[str]]] # "SIM", "NÃO", "NA", null
    action_plans: Dict[int, Dict[int, ActionPlan]]

class AtaCreate(AtaBase):
    pass

class Ata(AtaBase):
    id: uuid.UUID
    created_at: date

    class Config:
        from_attributes = True
