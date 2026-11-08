from fastapi import FastAPI

from app.api.v1.endpoints import atas

app = FastAPI(title="ChemFlow API", version="0.1.0")

app.include_router(atas.router, prefix="/api/v1/atas", tags=["atas"])


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Welcome to ChemFlow API"}


@app.get("/health")
def health_check() -> dict[str, str]:
    """Liveness (F0-6)."""
    return {"status": "ok"}
