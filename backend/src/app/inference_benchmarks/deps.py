"""Auth dependency for protected inference-benchmarks endpoints."""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.inference_benchmarks import security, service
from app.inference_benchmarks.models import BenchmarkUser

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or missing authentication token",
    headers={"WWW-Authenticate": "Bearer"},
)


async def current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> BenchmarkUser:
    """Resolve the bearer token to an authorized user or raise 401."""
    if not authorization or not authorization.startswith("Bearer "):
        raise _UNAUTHORIZED
    username = security.verify_token(authorization.removeprefix("Bearer "), settings.auth_secret)
    if not username:
        raise _UNAUTHORIZED
    user = await service.get_user(db, username)
    if not user:
        raise _UNAUTHORIZED
    return user
