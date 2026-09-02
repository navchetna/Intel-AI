"""Prompt construction for the AI-Suggested-Flow feature — turns a business process's reference
material into a proposed agent/human-checkpoint flow."""

import json

# Mirrors frontend/modules/workflows/task-sizing-calcs.ts's TASK_TYPES — keeping every suggested
# agent's task_type in this vocabulary is what lets the rest of the app's sizing pipeline
# eventually pick it up (latency/silicon/concurrency defaults are keyed by task type).
TASK_TYPES: list[str] = [
    "OCR", "Classification", "Link/Cross-Reference", "Process", "Reason", "Generate",
    "Embedding", "Re-Ranking", "Guardrail", "PII",
]

MAX_REFERENCE_CHARS = 24000

SYSTEM_PROMPT = f"""You are a solutions architect designing an agentic-AI automation for a business \
process at a large enterprise. Given the process's name, a short description, and source reference \
material (excerpts from RFP/EOI documents describing what the process must do), propose:

1. The AI agents needed to automate the process — each agent does ONE well-scoped task and must be \
assigned a task_type from EXACTLY this fixed vocabulary (do not invent new ones):
{", ".join(TASK_TYPES)}

2. The human checkpoints needed — points where a person must review, approve, or handle an \
exception the agents can't resolve on their own. Give each a role title (e.g. "Dealing Hand", \
"AAO", "Compliance Officer") grounded in what the reference material says about who reviews what.

3. The end-to-end flow — the ordered sequence in which these agents and human checks actually run, \
alternating/branching as the source material implies (e.g. agent extracts -> human validates -> \
agent scores -> human approves).

Ground every agent and human check in the reference material — do not invent responsibilities the \
source text doesn't support. If the material is sparse, propose a reasonable minimal flow and keep \
descriptions honest about what's inferred vs. explicit.

Sometimes you will also be given the CURRENT proposal (from a prior generation) plus a "nudge" — \
free-text feedback from a Presales architect, given in consultation with the customer, asking for a \
specific change. When that happens, treat the current proposal as the starting point and revise it to \
satisfy the nudge, changing as little else as possible — do not regenerate an unrelated flow from \
scratch. When no current proposal is given, propose fresh from the reference material alone.

Respond with ONLY a single JSON object (no markdown fences, no commentary) matching exactly this shape:
{{
  "agents": [{{"name": string, "task_type": string, "description": string}}],
  "humans": [{{"name": string, "role": string, "description": string}}],
  "flow": [{{"step": integer starting at 1, "actor": "agent" | "human", "name": string, "description": string}}]
}}

"name" in a flow step must exactly match an agent's or human's "name" above. Keep descriptions to \
one or two sentences each."""


def build_user_message(
    business_process_name: str,
    description: str,
    reference_text: str,
    nudge_prompt: str = "",
    previous_flow: dict | None = None,
) -> str:
    text = reference_text.strip()
    if len(text) > MAX_REFERENCE_CHARS:
        text = text[:MAX_REFERENCE_CHARS] + "\n\n[...reference material truncated...]"

    parts = [f"Business process: {business_process_name.strip() or '(untitled)'}"]
    if description.strip():
        parts.append(f"\nDescription: {description.strip()}")
    if text:
        parts.append(f"\nReference material:\n{text}")
    else:
        parts.append("\nNo reference material is available for this process — propose a reasonable flow from the name and description alone.")

    if previous_flow:
        parts.append(f"\nCurrent proposal (revise this, don't start over):\n{json.dumps(previous_flow)}")
    if nudge_prompt.strip():
        parts.append(f"\nNudge from the Presales architect (apply this change):\n{nudge_prompt.strip()}")

    return "\n".join(parts)
