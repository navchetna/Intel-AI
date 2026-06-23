"""Application configuration via pydantic-settings.

All settings are read from environment variables (and an optional ``.env``
file). This is the single source of truth for runtime configuration; add new
settings here rather than reading ``os.environ`` directly elsewhere.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_name: str = "Intel-AI Backend"
    environment: str = "development"
    debug: bool = True
    api_prefix: str = "/api"

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000

    # --- CORS (comma-separated origins, or "*") ---
    cors_origins: str = "*"

    # --- Database (PostgreSQL, async driver) ---
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/intel_ai"
    db_echo: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()
