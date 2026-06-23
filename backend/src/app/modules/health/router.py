"""Health module routes."""

from fastapi import APIRouter

from app import __version__
from app.core.config import settings
from app.modules.health.schemas import HealthStatus

router = APIRouter()


@router.get("", response_model=HealthStatus, summary="Service health check")
async def health() -> HealthStatus:
    return HealthStatus(
        status="ok",
        environment=settings.environment,
        version=__version__,
    )
