"""Pydantic schemas for the projects module."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    name: str
    data: dict = {}


class ProjectDataUpdate(BaseModel):
    data: dict


class ProjectSummary(BaseModel):
    """Light record for the project picker list."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    updated_at: datetime


class Project(BaseModel):
    """A full project record, including its data blob."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    data: dict
    created_at: datetime
    updated_at: datetime
