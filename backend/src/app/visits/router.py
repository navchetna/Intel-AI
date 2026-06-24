"""Visits module routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.visits import service
from app.visits.schemas import VisitCount

router = APIRouter()


@router.get("", response_model=VisitCount, summary="Get visit count")
async def get_visits(db: AsyncSession = Depends(get_db)) -> VisitCount:
    return VisitCount(count=await service.get_count(db))


@router.post("", response_model=VisitCount, summary="Record a visit")
async def record_visit(db: AsyncSession = Depends(get_db)) -> VisitCount:
    return VisitCount(count=await service.record_visit(db))
