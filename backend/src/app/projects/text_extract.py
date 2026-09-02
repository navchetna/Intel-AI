"""Best-effort plain-text extraction from an uploaded project document, for feeding
document content into an LLM prompt (see the Implementation Workflow extractor)."""

from __future__ import annotations

from pathlib import Path

MAX_CHARS_PER_DOCUMENT = 20000


def extract_text(file_path: Path, content_type: str) -> str:
    """Returns as much plain text as can be pulled from the file, or "" if the type
    isn't supported / extraction fails — callers should treat that as "no content",
    not an error, since a document being unreadable shouldn't block the whole request."""
    try:
        if content_type == "application/pdf" or file_path.suffix.lower() == ".pdf":
            return _extract_pdf(file_path)
        if (
            content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            or file_path.suffix.lower() == ".docx"
        ):
            return _extract_docx(file_path)
        if content_type.startswith("text/") or file_path.suffix.lower() in (".md", ".txt", ".csv"):
            return file_path.read_text(encoding="utf-8", errors="ignore")[:MAX_CHARS_PER_DOCUMENT]
    except Exception:
        return ""
    return ""


def _extract_pdf(file_path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(file_path))
    parts: list[str] = []
    total = 0
    for page in reader.pages:
        text = page.extract_text() or ""
        parts.append(text)
        total += len(text)
        if total >= MAX_CHARS_PER_DOCUMENT:
            break
    return "\n".join(parts)[:MAX_CHARS_PER_DOCUMENT]


def _extract_docx(file_path: Path) -> str:
    from docx import Document

    doc = Document(str(file_path))
    text = "\n".join(p.text for p in doc.paragraphs)
    return text[:MAX_CHARS_PER_DOCUMENT]
