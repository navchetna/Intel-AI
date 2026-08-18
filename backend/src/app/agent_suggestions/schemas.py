"""Pydantic schemas for the agent_suggestions module."""

from pydantic import BaseModel, Field


class AgentSuggestionsRequest(BaseModel):
    business_process_name: str
    description: str = ""
    reference_text: str = ""


class SuggestedAgent(BaseModel):
    name: str
    task_type: str
    description: str = ""


class SuggestedHumanCheck(BaseModel):
    name: str
    role: str
    description: str = ""


class SuggestedFlowStep(BaseModel):
    step: int
    actor: str = Field(description='"agent" or "human"')
    name: str
    description: str = ""


class AgentSuggestionsResponse(BaseModel):
    agents: list[SuggestedAgent] = []
    humans: list[SuggestedHumanCheck] = []
    flow: list[SuggestedFlowStep] = []
