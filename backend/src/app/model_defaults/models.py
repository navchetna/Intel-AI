"""SQLAlchemy models for the model_defaults module."""

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TaskModelDefault(Base):
    """The default model, latency SLA, silicon, and concurrency chosen for a task type
    (OCR, Classification, Reason, ...) — a global, app-wide preference, not scoped to any
    one Project."""

    __tablename__ = "task_model_defaults"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_type: Mapped[str] = mapped_column(String(120), nullable=False)
    model_name: Mapped[str] = mapped_column(String(200), nullable=False)
    latency_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    silicon: Mapped[str | None] = mapped_column(String(60), nullable=True)
    default_concurrency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requests_per_day: Mapped[float | None] = mapped_column(Float, nullable=True)
    processing_window_hrs: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
