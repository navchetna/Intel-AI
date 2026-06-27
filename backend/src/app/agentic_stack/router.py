"""Agentic Stack module routes."""

from fastapi import APIRouter

from app.agentic_stack.schemas import AgenticStackInfo
from app.agentic_stack.service import get_overview

router = APIRouter()


@router.get("", response_model=AgenticStackInfo, summary="Agentic Stack overview")
async def overview() -> AgenticStackInfo:
    return get_overview()
