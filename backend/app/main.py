from fastapi import FastAPI

from app.api.v1.endpoints import atas
from app.api.v1.escalas.router import router as escalas_router
from app.core.errors import PREFIX, install_handlers

app = FastAPI(title="ChemFlow API", version="0.1.0")
install_handlers(app)

app.include_router(atas.router, prefix="/api/v1/atas", tags=["atas"])
app.include_router(escalas_router, prefix=PREFIX)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Welcome to ChemFlow API"}


@app.get("/health")
def health_check() -> dict[str, str]:
    """Liveness (F0-6)."""
    return {"status": "ok"}
