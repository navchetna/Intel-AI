"""Business logic for the app_settings module — a singleton settings row (id=1), created
lazily on first read or write."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.app_settings.models import AppSettings

SETTINGS_ROW_ID = 1


async def get_settings(db: AsyncSession) -> AppSettings:
    row = await db.get(AppSettings, SETTINGS_ROW_ID)
    if row is None:
        row = AppSettings(id=SETTINGS_ROW_ID)
        db.add(row)
        await db.commit()
        await db.refresh(row)
    return row


async def get_groq_api_key(db: AsyncSession) -> str | None:
    row = await get_settings(db)
    return row.groq_api_key or None


async def update_settings(db: AsyncSession, *, groq_api_key: str | None) -> AppSettings:
    """`groq_api_key=None` leaves the stored key unchanged; `""` clears it; any other string sets it."""
    row = await get_settings(db)
    if groq_api_key is not None:
        row.groq_api_key = groq_api_key or None
    await db.commit()
    await db.refresh(row)
    return row
