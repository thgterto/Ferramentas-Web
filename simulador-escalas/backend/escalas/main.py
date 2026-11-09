from fastapi import FastAPI

from escalas.api.v1.escalas.router import router as escalas_router
from escalas.core.errors import PREFIX, install_handlers

app = FastAPI(title="Simulador de Escalas API", version="0.1.0")
install_handlers(app)

app.include_router(escalas_router, prefix=PREFIX)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Simulador de Cobertura de Escalas"}


@app.get("/health")
def health_check() -> dict[str, str]:
    """Liveness (F0-6)."""
    return {"status": "ok"}
