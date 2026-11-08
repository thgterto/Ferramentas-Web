"""Configurações da aplicação (pydantic-settings)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Lidas de variáveis de ambiente (prefixo opcional via .env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://escalas:escalas@localhost:5432/escalas"


settings = Settings()
