from fastapi import FastAPI
from app.api.v1.endpoints import datasets

app = FastAPI(title="ChemFlow API", version="0.1.0")

app.include_router(datasets.router, prefix="/api/v1/datasets", tags=["datasets"])

@app.get("/")
def read_root():
    return {"message": "Welcome to ChemFlow API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
