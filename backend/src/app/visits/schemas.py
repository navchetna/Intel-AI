"""Pydantic schemas for the visits module."""

from pydantic import BaseModel


class VisitCount(BaseModel):
    """Total number of page visits recorded."""

    count: int
