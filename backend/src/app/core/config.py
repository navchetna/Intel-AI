"""Application configuration via pydantic-settings.

All settings are read from environment variables (and an optional ``.env``
file). This is the single source of truth for runtime configuration; add new
settings here rather than reading ``os.environ`` directly elsewhere.
"""

from functools import lru_cache

from pydantic import Field
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

    # --- Database (PostgreSQL, async asyncpg driver) ---
    db_user: str = "intelai"
    db_password: str = "intelai"
    db_name: str = "intelai"
    db_host: str = "localhost"
    db_port: int = 5432
    db_echo: bool = False

    # Optional full URL override; if unset, the URL is built from the parts above.
    database_url_override: str | None = Field(default=None, alias="DATABASE_URL")

    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return self.database_url_override
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

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
