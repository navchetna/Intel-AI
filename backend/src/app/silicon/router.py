"""Silicon module routes."""

from fastapi import APIRouter

from app.silicon.schemas import SiliconInfo
from app.silicon.service import get_overview

router = APIRouter()


@router.get("", response_model=SiliconInfo, summary="Silicon overview")
async def overview() -> SiliconInfo:
    return get_overview()
