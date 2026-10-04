from fastapi import FastAPI, Request
from app.api.v1.endpoints import atas

app = FastAPI(title="ChemFlow API", version="0.1.0")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Cabeçalhos de segurança básicos em todas as respostas."""
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    return response

app.include_router(atas.router, prefix="/api/v1/atas", tags=["atas"])

@app.get("/")
def read_root():
    return {"message": "Welcome to ChemFlow API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
