# API do simulador de escalas (staging — A44)
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
COPY escalas ./escalas
COPY alembic ./alembic
COPY alembic.ini ./
COPY scripts ./scripts
RUN pip install --no-cache-dir -e .
ENV DATABASE_URL=postgresql+psycopg2://escalas:escalas@db:5432/escalas
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && python scripts/dev_seed.py && uvicorn escalas.main:app --host 0.0.0.0 --port 8000"]
