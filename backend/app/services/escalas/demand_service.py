"""Curvas 168 h: slots (PUT), import CSV/XLSX (FR-01) e conversão para o motor."""

from __future__ import annotations

import csv
import hashlib
import io
from collections.abc import Sequence
from decimal import Decimal

from openpyxl import load_workbook

from app.core.errors import validation
from app.db.models import DemandSlot
from app.services.engine.demanda import CurvaDemanda, ErroDemanda, importar_csv
from app.services.engine.shrinkage import HORAS_NOTURNAS

MAX_UPLOAD = 2 * 1024 * 1024


def slot_rows(values: Sequence[Decimal]) -> list[dict[str, object]]:
    if len(values) != 168:
        raise validation(f"esperados 168 slots (granularidade 60), recebidos {len(values)}",
                         [{"field": "slots", "code": "count", "message": "168 itens"}])
    rows = []
    for i, v in enumerate(values):
        if v < 0:
            raise validation("valor negativo", [{"field": f"slots[{i}].required_value",
                                                 "code": "out_of_range", "message": "≥ 0"}])
        if v != v.to_integral_value():
            raise validation("MVP: postos inteiros por hora",
                             [{"field": f"slots[{i}].required_value", "code": "not_integer",
                               "message": "valor deve ser inteiro (modos volume: Fase 2)"}])
        rows.append({"slot_index": i, "weekday": i // 24 + 1, "start_minute": (i % 24) * 60,
                     "required_value": v, "is_night": i % 24 in HORAS_NOTURNAS})
    return rows


def checksum(values: Sequence[Decimal]) -> str:
    return hashlib.sha256(",".join(str(int(v)) for v in values).encode()).hexdigest()


def from_slots(slots: Sequence[DemandSlot], critico: bool = False) -> CurvaDemanda:
    if len(slots) != 168:
        raise validation("curva de demanda sem os 168 slots — use PUT /slots ou :import",
                         code="demand_incomplete")
    vals = tuple(int(s.required_value) for s in slots)
    crit = frozenset(i for i, v in enumerate(vals) if v > 0) if critico else frozenset()
    return CurvaDemanda(vals, crit)


def parse_upload(filename: str, content: bytes) -> tuple[list[Decimal], str]:
    """CSV ``dia(1-7),hora(0-23),demanda`` ou XLSX com as mesmas 3 colunas na 1ª planilha."""
    if len(content) > MAX_UPLOAD:
        raise validation("arquivo maior que 2 MB")
    nome = filename.lower()
    if nome.endswith(".xlsx"):
        try:
            wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        except Exception as exc:  # arquivo corrompido / não-xlsx
            raise validation("XLSX inválido") from exc
        ws = wb.worksheets[0]
        buf = io.StringIO()
        w = csv.writer(buf)
        for row in ws.iter_rows(values_only=True):
            cells = ["" if c is None else (str(int(c)) if isinstance(c, float) and c.is_integer()
                                           else str(c)) for c in row[:3]]
            if any(cells):
                w.writerow(cells)
        texto, fonte = buf.getvalue(), "upload_xlsx"
    elif nome.endswith(".csv") or nome.endswith(".txt"):
        try:
            texto = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise validation("CSV deve estar em UTF-8") from exc
        fonte = "upload_csv"
    else:
        raise validation("formato não suportado (use .csv ou .xlsx)", code="unsupported_format")
    try:
        curva = importar_csv(texto)
    except ErroDemanda as exc:
        raise validation(str(exc), [{"field": f"linha {exc.linha}" if exc.linha else "arquivo",
                                     "code": "invalid_row", "message": str(exc)}]) from exc
    return [Decimal(v) for v in curva.valores], fonte
