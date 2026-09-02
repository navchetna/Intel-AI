"""Pydantic schemas for the agent_suggestions module."""

from pydantic import BaseModel, Field


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


class AgentSuggestionsRequest(BaseModel):
    business_process_name: str
    description: str = ""
    reference_text: str = ""
    # Customer-consultation refinement loop: a free-text nudge plus the currently-active
    # proposal to revise, if this is a regeneration rather than the first generation.
    nudge_prompt: str = ""
    previous_flow: AgentSuggestionsResponse | None = None
