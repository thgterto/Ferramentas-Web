"""M4 — Viabilidade CLT (MVP): interjornada, DSR 35 h, 7º dia, jornada diária computada.

Regras recebem jornadas ``(ini_abs, fim_abs, turno)`` em minutos absolutos (sem ``mod 24``).
Achados de cobertura (``COB_*``) ficam no M3.
"""

from escalas.services.engine.compliance.jornadas import Jornada, jornadas_da_sequencia
from escalas.services.engine.compliance.regras import (
    validar_dsr_35h,
    validar_interjornada,
    validar_jornada_diaria,
    validar_sequencia,
    validar_setimo_dia,
)

__all__ = [
    "Jornada",
    "jornadas_da_sequencia",
    "validar_dsr_35h",
    "validar_interjornada",
    "validar_jornada_diaria",
    "validar_sequencia",
    "validar_setimo_dia",
]
