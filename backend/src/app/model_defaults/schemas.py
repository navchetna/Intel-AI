"""Pydantic schemas for the model_defaults module."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TaskModelDefaultCreate(BaseModel):
    task_type: str
    model_name: str
    latency_sec: float | None = None
    silicon: str | None = None
    default_concurrency: int | None = None
    requests_per_day: float | None = None
    processing_window_hrs: float | None = None


class TaskModelDefaultUpdate(BaseModel):
    task_type: str | None = None
    model_name: str | None = None
    latency_sec: float | None = None
    silicon: str | None = None
    default_concurrency: int | None = None
    requests_per_day: float | None = None
    processing_window_hrs: float | None = None


class TaskModelDefaultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_type: str
    model_name: str
    latency_sec: float | None
    silicon: str | None
    default_concurrency: int | None
    requests_per_day: float | None
    processing_window_hrs: float | None
    updated_at: datetime
