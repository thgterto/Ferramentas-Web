from fastapi import APIRouter, HTTPException, Response
from typing import List, Dict
import uuid
from datetime import datetime, date

from app.schemas.ata import Ata, AtaCreate
from app.services.ata_excel_service import AtaExcelService

router = APIRouter()

# In-memory database for MVP
ATAS_DB: Dict[uuid.UUID, Ata] = {}

@router.post("/", response_model=Ata, status_code=201)
def create_ata(ata_in: AtaCreate):
    """
    Create a new Ata Digital record.
    """
    ata_id = uuid.uuid4()

    # Create DB Object
    ata_obj = Ata(
        id=ata_id,
        created_at=date.today(),
        **ata_in.model_dump()
    )

    ATAS_DB[ata_id] = ata_obj
    return ata_obj

@router.get("/", response_model=List[Ata])
def list_atas():
    """
    List all saved Atas.
    """
    return list(ATAS_DB.values())

@router.get("/{ata_id}", response_model=Ata)
def get_ata(ata_id: uuid.UUID):
    """
    Get details of a specific Ata.
    """
    if ata_id not in ATAS_DB:
        raise HTTPException(status_code=404, detail="Ata not found")
    return ATAS_DB[ata_id]

@router.put("/{ata_id}", response_model=Ata)
def update_ata(ata_id: uuid.UUID, ata_in: AtaCreate):
    """
    Update an existing Ata.
    """
    if ata_id not in ATAS_DB:
        raise HTTPException(status_code=404, detail="Ata not found")

    # Update object
    existing_ata = ATAS_DB[ata_id]
    updated_ata = existing_ata.model_copy(update=ata_in.model_dump())

    ATAS_DB[ata_id] = updated_ata
    return updated_ata

@router.delete("/{ata_id}", status_code=204)
def delete_ata(ata_id: uuid.UUID):
    """
    Delete an Ata record.
    """
    if ata_id not in ATAS_DB:
        raise HTTPException(status_code=404, detail="Ata not found")

    del ATAS_DB[ata_id]
    return

@router.get("/{ata_id}/export")
def export_ata_excel(ata_id: uuid.UUID):
    """
    Generate and download an Excel report for the Ata.
    """
    if ata_id not in ATAS_DB:
        raise HTTPException(status_code=404, detail="Ata not found")

    ata = ATAS_DB[ata_id]

    # Generate Excel (in-memory bytes)
    excel_file = AtaExcelService.generate_report(ata)

    # Filename
    filename = f"Ata_{ata.unit}_{ata.date}_{ata.shift}.xlsx".replace(" ", "_")

    return Response(
        content=excel_file.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
