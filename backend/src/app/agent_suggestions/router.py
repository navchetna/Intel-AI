"""Agent-suggestions module routes — on-demand AI-Suggested-Flow generation for a business process."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent_suggestions.groq_client import GroqError, request_json_completion
from app.agent_suggestions.prompts import SYSTEM_PROMPT, build_user_message
from app.agent_suggestions.schemas import AgentSuggestionsRequest, AgentSuggestionsResponse
from app.app_settings import service as app_settings_service
from app.core.database import get_db

router = APIRouter()


@router.post("/generate", response_model=AgentSuggestionsResponse, summary="Generate an AI-suggested agent/human flow")
async def generate(payload: AgentSuggestionsRequest, db: AsyncSession = Depends(get_db)) -> AgentSuggestionsResponse:
    api_key = await app_settings_service.get_groq_api_key(db)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No GROQ API key configured — set one in Settings (gear icon in the top-right) first.",
        )

    user_message = build_user_message(payload.business_process_name, payload.description, payload.reference_text)

    try:
        raw = await request_json_completion(api_key, SYSTEM_PROMPT, user_message)
    except GroqError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    try:
        return AgentSuggestionsResponse.model_validate(raw)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GROQ's response didn't match the expected shape: {e}",
        ) from e
