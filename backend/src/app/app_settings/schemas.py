"""Pydantic schemas for the app_settings module.

The GROQ API key is write-only from the API's perspective — reads report only whether one is
configured, never the value itself, so it never round-trips back to the browser after being set.
"""

from pydantic import BaseModel


class AppSettingsRead(BaseModel):
    groq_api_key_configured: bool


class AppSettingsUpdate(BaseModel):
    """`groq_api_key=None` leaves the stored key unchanged; pass `""` to clear it."""

    groq_api_key: str | None = None
