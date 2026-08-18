"""App settings module routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.app_settings import service
from app.app_settings.schemas import AppSettingsRead, AppSettingsUpdate
from app.core.database import get_db

router = APIRouter()


@router.get("", response_model=AppSettingsRead, summary="Get app settings (values masked)")
async def get_settings(db: AsyncSession = Depends(get_db)) -> AppSettingsRead:
    row = await service.get_settings(db)
    return AppSettingsRead(groq_api_key_configured=bool(row.groq_api_key))


@router.put("", response_model=AppSettingsRead, summary="Update app settings")
async def update_settings(payload: AppSettingsUpdate, db: AsyncSession = Depends(get_db)) -> AppSettingsRead:
    row = await service.update_settings(db, groq_api_key=payload.groq_api_key)
    return AppSettingsRead(groq_api_key_configured=bool(row.groq_api_key))
