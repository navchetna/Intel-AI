"""LLM benchmarking module routes."""

from fastapi import APIRouter

from app.llm_bench.schemas import LlmBenchInfo
from app.llm_bench.service import get_overview

router = APIRouter()


@router.get("", response_model=LlmBenchInfo, summary="LLM benchmarking overview")
async def overview() -> LlmBenchInfo:
    return get_overview()
