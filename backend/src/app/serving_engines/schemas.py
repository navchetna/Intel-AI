"""Pydantic schemas for the serving-engines module."""

from pydantic import BaseModel


class Highlight(BaseModel):
    title: str
    body: str


class ServingEnginesInfo(BaseModel):
    slug: str
    title: str
    tagline: str
    description: str
    highlights: list[Highlight]
