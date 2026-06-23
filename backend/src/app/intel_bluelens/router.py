"""Intel BlueLens module routes."""

from fastapi import APIRouter

from app.intel_bluelens.schemas import IntelBluelensInfo
from app.intel_bluelens.service import get_overview

router = APIRouter()


@router.get("", response_model=IntelBluelensInfo, summary="Intel BlueLens overview")
async def overview() -> IntelBluelensInfo:
    return get_overview()
