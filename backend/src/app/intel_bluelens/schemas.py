"""Pydantic schemas for the intel-bluelens module."""

from pydantic import BaseModel


class Highlight(BaseModel):
    title: str
    body: str


class IntelBluelensInfo(BaseModel):
    slug: str
    title: str
    tagline: str
    description: str
    highlights: list[Highlight]
