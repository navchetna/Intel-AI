"""Prompt construction for the Implementation Workflow extractor — turns a project's
documents, notes, and discussion log into an implementation write-up for one business process."""

MAX_SOURCE_CHARS = 40000

SYSTEM_PROMPT = """You are a solutions architect writing the implementation workflow section for a \
business process being automated with AI agents at a large enterprise. You are given the process's \
name and description, plus source material from three places: uploaded project documents (RFPs, \
policy documents, process manuals, ...), free-text notes the project team has written, and a log of \
project discussion messages.

Read all of it and produce a concrete implementation write-up covering:
- What the process currently involves, grounded in the source material (not invented).
- The systems, data sources, and stakeholders it touches, if the material says.
- A step-by-step implementation approach: how to actually build and roll out the agentic automation \
for this process, in the order that makes sense.
- Key risks, constraints, or open questions the source material raises or leaves unanswered.

Only state what the source material supports or what's a reasonable, clearly-flagged inference — \
never invent specifics (system names, numbers, policies) the material doesn't mention. If a source is \
sparse or absent, say so plainly rather than padding with generic content. If there is no source \
material at all, say that clearly and offer only a minimal, generic skeleton.

Respond with ONLY a single JSON object (no markdown fences, no commentary) matching exactly this shape:
{"content": string}

Where "content" is the full write-up formatted as Markdown (headings, bullet lists as needed)."""


def _truncate(text: str, limit: int) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit] + "\n\n[...truncated...]"


def build_user_message(
    business_process_name: str,
    description: str,
    documents: list[tuple[str, str]],
    notes: list[tuple[str, str]],
    discussions: list[tuple[str, str, str]],
) -> str:
    """`documents`/`notes` are (title, text) pairs; `discussions` are (author, message, created_at)."""
    parts = [f"Business process: {business_process_name.strip() or '(untitled)'}"]
    if description.strip():
        parts.append(f"\nDescription: {description.strip()}")

    doc_sections = [f"### Document: {title}\n{text.strip()}" for title, text in documents if text.strip()]
    note_sections = [f"### Note: {title}\n{body.strip()}" for title, body in notes if body.strip()]
    discussion_lines = [f"- [{ts}] {author}: {message}" for author, message, ts in discussions if message.strip()]

    if doc_sections:
        parts.append("\n## Project documents\n" + "\n\n".join(doc_sections))
    if note_sections:
        parts.append("\n## Project notes\n" + "\n\n".join(note_sections))
    if discussion_lines:
        parts.append("\n## Project discussion log\n" + "\n".join(discussion_lines))

    if not (doc_sections or note_sections or discussion_lines):
        parts.append("\nNo project documents, notes, or discussion messages are available.")

    return _truncate("\n".join(parts), MAX_SOURCE_CHARS)
