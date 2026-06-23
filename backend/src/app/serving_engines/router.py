"""Serving engines module routes."""

from fastapi import APIRouter

from app.serving_engines.schemas import ServingEnginesInfo
from app.serving_engines.service import get_overview

router = APIRouter()


@router.get("", response_model=ServingEnginesInfo, summary="Serving engines overview")
async def overview() -> ServingEnginesInfo:
    return get_overview()
