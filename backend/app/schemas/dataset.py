from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

class DatasetBase(BaseModel):
    name: str
    description: Optional[str] = None

class DatasetCreate(DatasetBase):
    pass # File is handled via UploadFile

class Dataset(DatasetBase):
    id: uuid.UUID
    filename: str
    created_at: datetime
    rows: int
    columns: int
    column_names: List[str]

    class Config:
        from_attributes = True

class DatasetData(BaseModel):
    id: uuid.UUID
    data: List[Dict[str, Any]]
