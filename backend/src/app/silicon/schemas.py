"""Pydantic schemas for the silicon module."""

from pydantic import BaseModel


class Highlight(BaseModel):
    title: str
    body: str


class SiliconInfo(BaseModel):
    slug: str
    title: str
    tagline: str
    description: str
    highlights: list[Highlight]
