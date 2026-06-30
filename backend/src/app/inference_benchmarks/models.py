"""SQLAlchemy models for the inference-benchmarks module."""

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class InferenceBenchmark(Base):
    """A single inference benchmark run.

    Text columns: ``timestamp``, ``platform``, ``model``, ``dataset``.
    Everything else is numeric (int for counts, float for measured metrics).
    """

    __tablename__ = "inference_benchmarks"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Text fields
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False)
    platform: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    model: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    dataset: Mapped[str | None] = mapped_column(String(256), nullable=True)

    # Integer fields
    tp: Mapped[int | None] = mapped_column(Integer, nullable=True)
    num_deployments: Mapped[int | None] = mapped_column(Integer, nullable=True)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    concurrency: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)

    # Float fields
    request_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    mean_ttft_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    median_ttft_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    p90_ttft_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    mean_tpot_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    median_tpot_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    p90_tpot_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    mean_itl_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    median_itl_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    p90_itl_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    request_throughput: Mapped[float | None] = mapped_column(Float, nullable=True)
    output_token_throughput: Mapped[float | None] = mapped_column(Float, nullable=True)
    interactivity_tokens_per_sec_per_user: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class BenchmarkUser(Base):
    """An account authorized to use the benchmarks admin panel."""

    __tablename__ = "benchmark_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
