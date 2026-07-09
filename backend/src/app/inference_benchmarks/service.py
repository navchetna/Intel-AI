"""Business logic for the inference-benchmarks module."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from pydantic import ValidationError
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.inference_benchmarks import security
from app.inference_benchmarks.models import BenchmarkUser, InferenceBenchmark
from app.inference_benchmarks.schemas import (
    BenchmarkRecordCreate,
    BulkUploadResponse,
    ChartPoint,
    ChartsResponse,
    RowError,
    TtftSeries,
)

MAX_TABLE_ROWS = 25


@dataclass(slots=True)
class BenchmarkFilters:
    """Optional filters shared by the records and charts queries."""

    model: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    batch_size: int | None = None  # maps to the `concurrency` column
    platform: str | None = None


def _apply_filters(stmt, f: BenchmarkFilters):
    if f.model:
        stmt = stmt.where(InferenceBenchmark.model.ilike(f"%{f.model}%"))
    if f.input_tokens is not None:
        stmt = stmt.where(InferenceBenchmark.input_tokens == f.input_tokens)
    if f.output_tokens is not None:
        stmt = stmt.where(InferenceBenchmark.output_tokens == f.output_tokens)
    if f.batch_size is not None:
        stmt = stmt.where(InferenceBenchmark.concurrency == f.batch_size)
    if f.platform:
        stmt = stmt.where(InferenceBenchmark.platform.ilike(f"%{f.platform}%"))
    return stmt


# --- Records & charts ---------------------------------------------------------


async def query_records(
    db: AsyncSession, f: BenchmarkFilters, limit: int = MAX_TABLE_ROWS
) -> tuple[int, list[InferenceBenchmark]]:
    """Return ``(total_matching, up_to_`limit`_rows)`` ordered newest first."""
    count_stmt = _apply_filters(select(func.count(InferenceBenchmark.id)), f)
    total = (await db.execute(count_stmt)).scalar_one()

    rows_stmt = _apply_filters(select(InferenceBenchmark), f)
    rows_stmt = rows_stmt.order_by(InferenceBenchmark.id.desc()).limit(limit)
    rows = list((await db.execute(rows_stmt)).scalars().all())
    return total, rows


async def chart_data(db: AsyncSession, f: BenchmarkFilters) -> ChartsResponse:
    """Aggregate mean TTFT (grouped by input tokens) and mean ITL by batch size."""
    # TTFT grouped by (input_tokens, concurrency)
    ttft_stmt = (
        _apply_filters(
            select(
                InferenceBenchmark.input_tokens,
                InferenceBenchmark.concurrency,
                func.avg(InferenceBenchmark.mean_ttft_ms),
            ),
            f,
        )
        .where(
            InferenceBenchmark.concurrency.is_not(None),
            InferenceBenchmark.input_tokens.is_not(None),
            InferenceBenchmark.mean_ttft_ms.is_not(None),
        )
        .group_by(InferenceBenchmark.input_tokens, InferenceBenchmark.concurrency)
    )

    grouped: dict[int, list[ChartPoint]] = defaultdict(list)
    for input_tokens, concurrency, avg_ttft in (await db.execute(ttft_stmt)).all():
        grouped[int(input_tokens)].append(
            ChartPoint(batch_size=int(concurrency), value=round(float(avg_ttft), 3))
        )
    ttft_series = [
        TtftSeries(input_tokens=it, points=sorted(pts, key=lambda p: p.batch_size))
        for it, pts in sorted(grouped.items())
    ]

    # ITL by concurrency
    itl_stmt = (
        _apply_filters(
            select(
                InferenceBenchmark.concurrency,
                func.avg(InferenceBenchmark.mean_itl_ms),
            ),
            f,
        )
        .where(
            InferenceBenchmark.concurrency.is_not(None),
            InferenceBenchmark.mean_itl_ms.is_not(None),
        )
        .group_by(InferenceBenchmark.concurrency)
        .order_by(InferenceBenchmark.concurrency)
    )

    itl_points = [
        ChartPoint(batch_size=int(concurrency), value=round(float(avg_itl), 3))
        for concurrency, avg_itl in (await db.execute(itl_stmt)).all()
    ]

    return ChartsResponse(ttft_vs_batch=ttft_series, itl_vs_batch=itl_points)


async def distinct_platforms(db: AsyncSession) -> list[str]:
    stmt = select(distinct(InferenceBenchmark.platform)).order_by(InferenceBenchmark.platform)
    return [p for p in (await db.execute(stmt)).scalars().all() if p]


async def bulk_insert(db: AsyncSession, rows: list[dict]) -> BulkUploadResponse:
    """Validate each row and insert the valid ones; report per-row errors.

    Either every valid row is committed or, if there are no valid rows, nothing
    is. Invalid rows are reported with their 1-based index (header row excluded).
    """
    valid: list[InferenceBenchmark] = []
    errors: list[RowError] = []

    for i, raw in enumerate(rows, start=1):
        try:
            record = BenchmarkRecordCreate.model_validate(raw)
        except ValidationError as exc:
            errors.append(RowError(row=i, errors=[_format_error(e) for e in exc.errors()]))
            continue
        valid.append(InferenceBenchmark(**record.model_dump()))

    if valid:
        db.add_all(valid)
        await db.commit()

    return BulkUploadResponse(inserted=len(valid), failed=len(errors), errors=errors)


def _format_error(err: dict) -> str:
    loc = ".".join(str(p) for p in err.get("loc", ()))
    return f"{loc}: {err.get('msg', 'invalid')}"


# --- Users & auth -------------------------------------------------------------


async def get_user(db: AsyncSession, username: str) -> BenchmarkUser | None:
    stmt = select(BenchmarkUser).where(BenchmarkUser.username == username)
    return (await db.execute(stmt)).scalar_one_or_none()


async def authenticate(db: AsyncSession, username: str, password: str) -> BenchmarkUser | None:
    user = await get_user(db, username)
    if user and security.verify_password(password, user.password_hash):
        return user
    return None


async def create_user(db: AsyncSession, username: str, password: str) -> BenchmarkUser:
    user = BenchmarkUser(username=username, password_hash=security.hash_password(password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def list_users(db: AsyncSession) -> list[BenchmarkUser]:
    stmt = select(BenchmarkUser).order_by(BenchmarkUser.username)
    return list((await db.execute(stmt)).scalars().all())


async def ensure_default_admin(db: AsyncSession, username: str, password: str) -> None:
    """Seed a bootstrap admin if the users table is empty (idempotent)."""
    existing = (await db.execute(select(func.count(BenchmarkUser.id)))).scalar_one()
    if existing == 0:
        await create_user(db, username, password)
