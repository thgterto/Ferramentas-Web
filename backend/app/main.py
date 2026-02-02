from fastapi import FastAPI

app = FastAPI(title="ChemFlow API", version="0.1.0")

@app.get("/")
def read_root():
    return {"message": "Welcome to ChemFlow API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
