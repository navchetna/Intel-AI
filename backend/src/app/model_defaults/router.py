"""Model defaults module routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.model_defaults import service
from app.model_defaults.models import TaskModelDefault as TaskModelDefaultModel
from app.model_defaults.schemas import (
    TaskModelDefaultCreate,
    TaskModelDefaultRead,
    TaskModelDefaultUpdate,
)

router = APIRouter()


async def _get_or_404(db: AsyncSession, default_id: int) -> TaskModelDefaultModel:
    row = await service.get_default(db, default_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Default not found")
    return row


@router.get("", response_model=list[TaskModelDefaultRead], summary="List task-type default models")
async def list_defaults(db: AsyncSession = Depends(get_db)) -> list[TaskModelDefaultModel]:
    return await service.list_defaults(db)


@router.post(
    "", response_model=TaskModelDefaultRead, status_code=status.HTTP_201_CREATED, summary="Add a task-type default"
)
async def create_default(
    payload: TaskModelDefaultCreate, db: AsyncSession = Depends(get_db)
) -> TaskModelDefaultModel:
    task_type = payload.task_type.strip()
    model_name = payload.model_name.strip()
    if not task_type or not model_name:
        raise HTTPException(status_code=400, detail="Task type and model name are required")
    return await service.create_default(
        db, task_type, model_name,
        latency_sec=payload.latency_sec, silicon=payload.silicon, default_concurrency=payload.default_concurrency,
        requests_per_day=payload.requests_per_day, processing_window_hrs=payload.processing_window_hrs,
    )


@router.patch("/{default_id}", response_model=TaskModelDefaultRead, summary="Update a task-type default")
async def update_default(
    default_id: int, payload: TaskModelDefaultUpdate, db: AsyncSession = Depends(get_db)
) -> TaskModelDefaultModel:
    row = await _get_or_404(db, default_id)
    task_type = payload.task_type.strip() if payload.task_type is not None else None
    model_name = payload.model_name.strip() if payload.model_name is not None else None
    return await service.update_default(
        db, row, task_type=task_type, model_name=model_name,
        latency_sec=payload.latency_sec, silicon=payload.silicon, default_concurrency=payload.default_concurrency,
        requests_per_day=payload.requests_per_day, processing_window_hrs=payload.processing_window_hrs,
    )


@router.delete("/{default_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a task-type default")
async def delete_default(default_id: int, db: AsyncSession = Depends(get_db)) -> None:
    row = await _get_or_404(db, default_id)
    await service.delete_default(db, row)
