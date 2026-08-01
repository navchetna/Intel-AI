"""Inference-benchmarks module routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.inference_benchmarks import security, service
from app.inference_benchmarks.deps import current_user
from app.inference_benchmarks.models import BenchmarkUser
from app.inference_benchmarks.schemas import (
    EXCEL_COLUMNS,
    BenchmarkRecord,
    BenchmarkRecordsResponse,
    BulkUploadRequest,
    BulkUploadResponse,
    ChartsResponse,
    CreateUserRequest,
    LoginRequest,
    LoginResponse,
    UserInfo,
)
from app.inference_benchmarks.service import BenchmarkFilters

router = APIRouter()


def _filters(
    model: str | None = Query(default=None),
    input_tokens: int | None = Query(default=None),
    output_tokens: int | None = Query(default=None),
    batch_size: int | None = Query(default=None, description="Maps to concurrency"),
    platform: str | None = Query(default=None, description="Hardware platform"),
    serving_engine: str | None = Query(default=None, description="e.g. vLLM, SGLang"),
) -> BenchmarkFilters:
    return BenchmarkFilters(
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        batch_size=batch_size,
        platform=platform,
        serving_engine=serving_engine,
    )


# --- Public read endpoints ----------------------------------------------------


@router.get(
    "/records",
    response_model=BenchmarkRecordsResponse,
    response_model_by_alias=False,
    summary="Filtered records",
)
async def get_records(
    f: BenchmarkFilters = Depends(_filters),
    limit: int = Query(default=25, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
) -> BenchmarkRecordsResponse:
    total, rows = await service.query_records(db, f, limit=limit)
    return BenchmarkRecordsResponse(
        total=total, rows=[BenchmarkRecord.model_validate(r) for r in rows]
    )


@router.get("/charts", response_model=ChartsResponse, summary="Chart aggregates")
async def get_charts(
    f: BenchmarkFilters = Depends(_filters),
    db: AsyncSession = Depends(get_db),
) -> ChartsResponse:
    return await service.chart_data(db, f)


@router.get("/platforms", response_model=list[str], summary="Distinct hardware platforms")
async def get_platforms(db: AsyncSession = Depends(get_db)) -> list[str]:
    return await service.distinct_platforms(db)


@router.get("/template-columns", response_model=list[str], summary="Excel template columns")
async def template_columns() -> list[str]:
    return EXCEL_COLUMNS


# --- Auth ---------------------------------------------------------------------


@router.post("/auth/login", response_model=LoginResponse, summary="Log in")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    user = await service.authenticate(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = security.create_token(user.username, settings.auth_secret, settings.auth_token_ttl)
    return LoginResponse(token=token, username=user.username)


@router.get("/auth/me", response_model=UserInfo, summary="Current user")
async def me(user: BenchmarkUser = Depends(current_user)) -> UserInfo:
    return UserInfo.model_validate(user)


@router.post(
    "/auth/users",
    response_model=UserInfo,
    status_code=status.HTTP_201_CREATED,
    summary="Create an authorized user",
)
async def create_user(
    payload: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    _: BenchmarkUser = Depends(current_user),
) -> UserInfo:
    if not payload.username.strip() or not payload.password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    try:
        user = await service.create_user(db, payload.username.strip(), payload.password)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Username already exists") from exc
    return UserInfo.model_validate(user)


# --- Protected write endpoints ------------------------------------------------


@router.post(
    "/records/bulk",
    response_model=BulkUploadResponse,
    summary="Bulk-insert validated rows (Excel upload)",
)
async def bulk_upload(
    payload: BulkUploadRequest,
    db: AsyncSession = Depends(get_db),
    _: BenchmarkUser = Depends(current_user),
) -> BulkUploadResponse:
    if not payload.rows:
        raise HTTPException(status_code=400, detail="No rows provided")
    return await service.bulk_insert(db, payload.rows)
