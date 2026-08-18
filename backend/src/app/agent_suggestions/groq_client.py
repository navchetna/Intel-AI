"""Minimal GROQ chat-completions client (OpenAI-compatible API)."""

from __future__ import annotations

import json

import httpx

GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
REQUEST_TIMEOUT_SEC = 60.0


class GroqError(Exception):
    """Raised on any failure to get a usable JSON response back from GROQ."""


async def request_json_completion(api_key: str, system_prompt: str, user_message: str) -> dict:
    """Calls GROQ chat completions with JSON-object response mode and returns the parsed object."""
    body = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "max_tokens": 4000,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SEC) as client:
            res = await client.post(GROQ_CHAT_COMPLETIONS_URL, json=body, headers=headers)
    except httpx.HTTPError as e:
        raise GroqError(f"Could not reach GROQ: {e}") from e

    if res.status_code != 200:
        detail = res.text
        try:
            detail = res.json().get("error", {}).get("message", detail)
        except Exception:
            pass
        raise GroqError(f"GROQ request failed ({res.status_code}): {detail}")

    data = res.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        raise GroqError("GROQ response had no completion content") from e

    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        raise GroqError(f"GROQ did not return valid JSON: {e}") from e
