"""Pydantic schemas for the health module."""

from pydantic import BaseModel


class HealthStatus(BaseModel):
    status: str
    environment: str
    version: str
