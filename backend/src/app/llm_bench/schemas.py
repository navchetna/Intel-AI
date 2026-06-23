"""Pydantic schemas for the llm-bench module."""

from pydantic import BaseModel


class Highlight(BaseModel):
    title: str
    body: str


class LlmBenchInfo(BaseModel):
    slug: str
    title: str
    tagline: str
    description: str
    highlights: list[Highlight]
