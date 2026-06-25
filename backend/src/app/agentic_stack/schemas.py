"""Pydantic schemas for the agentic-stack module."""

from pydantic import BaseModel


class Highlight(BaseModel):
    title: str
    body: str


class AgenticStackInfo(BaseModel):
    slug: str
    title: str
    tagline: str
    description: str
    highlights: list[Highlight]
