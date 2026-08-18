"""SQLAlchemy model for the app_settings module."""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AppSettings(Base):
    """Singleton row (id=1) of app-wide, UI-configurable settings — currently just the GROQ
    API key used for the Agents tab's AI-Suggested-Flow generation. Not scoped to any Project."""

    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    groq_api_key: Mapped[str | None] = mapped_column(String(200), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
