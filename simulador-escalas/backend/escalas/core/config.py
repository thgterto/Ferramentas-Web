"""Configurações da aplicação (pydantic-settings)."""

from datetime import date

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Lidas de variáveis de ambiente (prefixo opcional via .env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://escalas:escalas@localhost:5432/escalas"
    # JWT de acesso (MVP: HS256 com segredo; RS256 + refresh token na Fase 2 — TRD §9)
    jwt_secret: str = "dev-only-change-me-please-32-bytes-min"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    # D0 = data da promulgação da EC do fim da 6x1 (05 §5.5: sem D0, datas futuras não resolvem)
    legal_d0: date | None = None


settings = Settings()
