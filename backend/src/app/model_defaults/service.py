"""Business logic for the model_defaults module."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.model_defaults.models import TaskModelDefault


async def list_defaults(db: AsyncSession) -> list[TaskModelDefault]:
    stmt = select(TaskModelDefault).order_by(TaskModelDefault.id.asc())
    return list((await db.execute(stmt)).scalars().all())


async def get_default(db: AsyncSession, default_id: int) -> TaskModelDefault | None:
    return await db.get(TaskModelDefault, default_id)


async def create_default(
    db: AsyncSession,
    task_type: str,
    model_name: str,
    *,
    latency_sec: float | None = None,
    silicon: str | None = None,
    default_concurrency: int | None = None,
    requests_per_day: float | None = None,
    processing_window_hrs: float | None = None,
) -> TaskModelDefault:
    row = TaskModelDefault(
        task_type=task_type,
        model_name=model_name,
        latency_sec=latency_sec,
        silicon=silicon,
        default_concurrency=default_concurrency,
        requests_per_day=requests_per_day,
        processing_window_hrs=processing_window_hrs,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def update_default(
    db: AsyncSession,
    row: TaskModelDefault,
    *,
    task_type: str | None = None,
    model_name: str | None = None,
    latency_sec: float | None = None,
    silicon: str | None = None,
    default_concurrency: int | None = None,
    requests_per_day: float | None = None,
    processing_window_hrs: float | None = None,
) -> TaskModelDefault:
    if task_type is not None:
        row.task_type = task_type
    if model_name is not None:
        row.model_name = model_name
    if latency_sec is not None:
        row.latency_sec = latency_sec
    if silicon is not None:
        row.silicon = silicon
    if default_concurrency is not None:
        row.default_concurrency = default_concurrency
    if requests_per_day is not None:
        row.requests_per_day = requests_per_day
    if processing_window_hrs is not None:
        row.processing_window_hrs = processing_window_hrs
    await db.commit()
    await db.refresh(row)
    return row


async def delete_default(db: AsyncSession, row: TaskModelDefault) -> None:
    await db.delete(row)
    await db.commit()
