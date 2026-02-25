from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List, Dict
import uuid
from datetime import datetime
import pandas as pd
import asyncio

from app.schemas.dataset import Dataset, DatasetCreate, DatasetData
from app.services.excel_processor import ExcelProcessor

router = APIRouter()

# In-memory database for MVP
# Structure: { uuid: { "metadata": Dataset, "data": pd.DataFrame } }
DATASETS_DB = {}

@router.post("/upload", response_model=Dataset)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(None)
):
    """
    Uploads an Excel or CSV file, processes it, and stores the dataset.
    Uses ThreadPoolExecutor to avoid blocking the event loop during file processing.
    """
    # 1. Read content (I/O bound)
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file upload: {str(e)}")

    # 2. Process File (CPU bound)
    # Run synchronous pandas operations in a separate thread
    loop = asyncio.get_event_loop()
    try:
        # process_file is static, can be called directly
        df = await loop.run_in_executor(None, ExcelProcessor.process_file, content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 3. Extract Metadata
    meta = ExcelProcessor.get_metadata(df)

    dataset_id = uuid.uuid4()
    dataset_obj = Dataset(
        id=dataset_id,
        name=name,
        description=description,
        filename=file.filename,
        created_at=datetime.utcnow(),
        rows=meta['rows'],
        columns=meta['columns'],
        column_names=meta['column_names']
    )

    # 4. Store in DB
    DATASETS_DB[dataset_id] = {
        "metadata": dataset_obj,
        "data": df
    }

    return dataset_obj

@router.get("/", response_model=List[Dataset])
def list_datasets():
    """
    List all available datasets.
    """
    return [item["metadata"] for item in DATASETS_DB.values()]

@router.get("/{dataset_id}", response_model=Dataset)
def get_dataset(dataset_id: uuid.UUID):
    """
    Get metadata for a specific dataset.
    """
    if dataset_id not in DATASETS_DB:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return DATASETS_DB[dataset_id]["metadata"]

@router.get("/{dataset_id}/data", response_model=DatasetData)
def get_dataset_data(dataset_id: uuid.UUID):
    """
    Get the actual data content of the dataset as JSON.
    """
    if dataset_id not in DATASETS_DB:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = DATASETS_DB[dataset_id]["data"]
    # Convert DataFrame to list of dicts for JSON response
    # Orient 'records' is standard for frontend consumption
    # replace({pd.NA: None}) is redundant if already handled in processor, but safe to keep or rely on processor
    # We already handled it in processor, but to_dict handles None correctly.
    data_records = df.to_dict(orient="records")

    return DatasetData(id=dataset_id, data=data_records)

@router.delete("/{dataset_id}", status_code=204)
def delete_dataset(dataset_id: uuid.UUID):
    """
    Delete a dataset.
    """
    if dataset_id not in DATASETS_DB:
        raise HTTPException(status_code=404, detail="Dataset not found")

    del DATASETS_DB[dataset_id]
    return
