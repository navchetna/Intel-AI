"""Projects module routes."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent_suggestions.groq_client import GroqError, request_json_completion
from app.app_settings import service as app_settings_service
from app.core.config import settings
from app.core.database import get_db
from app.projects import implementation_extract_prompts, service, text_extract
from app.projects.models import Project as ProjectModel
from app.projects.models import ProjectDiscussionMessage as ProjectDiscussionMessageModel
from app.projects.models import ProjectDocument as ProjectDocumentModel
from app.projects.models import ProjectNote as ProjectNoteModel
from app.projects.schemas import (
    ImplementationExtractRequest,
    ImplementationExtractResponse,
    Project,
    ProjectCreate,
    ProjectDataUpdate,
    ProjectDiscussionMessageCreate,
    ProjectDiscussionMessageRead,
    ProjectDocumentRead,
    ProjectNoteCreate,
    ProjectNoteRead,
    ProjectNoteUpdate,
    ProjectSummary,
)

router = APIRouter()


def _upload_dir() -> Path:
    path = Path(settings.upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def _get_or_404(db: AsyncSession, project_id: int) -> ProjectModel:
    project = await service.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


async def _get_document_or_404(
    db: AsyncSession, project_id: int, document_id: int
) -> ProjectDocumentModel:
    document = await service.get_document(db, project_id, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


async def _get_note_or_404(db: AsyncSession, project_id: int, note_id: int) -> ProjectNoteModel:
    note = await service.get_note(db, project_id, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


async def _get_discussion_message_or_404(
    db: AsyncSession, project_id: int, message_id: int
) -> ProjectDiscussionMessageModel:
    row = await service.get_discussion_message(db, project_id, message_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discussion message not found")
    return row


@router.get("", response_model=list[ProjectSummary], summary="List projects")
async def list_projects(db: AsyncSession = Depends(get_db)) -> list[ProjectModel]:
    return await service.list_projects(db)


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED, summary="Create a project")
async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)) -> ProjectModel:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name is required")
    try:
        return await service.create_project(db, name, payload.data)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A project with this name already exists") from exc


@router.get("/{project_id}", response_model=Project, summary="Get a project")
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)) -> ProjectModel:
    return await _get_or_404(db, project_id)


@router.patch("/{project_id}", response_model=Project, summary="Update a project's name and/or data")
async def update_project(
    project_id: int, payload: ProjectDataUpdate, db: AsyncSession = Depends(get_db)
) -> ProjectModel:
    project = await _get_or_404(db, project_id)
    name = payload.name.strip() if payload.name is not None else None
    if name == "":
        raise HTTPException(status_code=400, detail="Project name is required")
    try:
        return await service.update_project(db, project, name=name, data=payload.data)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A project with this name already exists") from exc


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a project")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)) -> None:
    project = await _get_or_404(db, project_id)
    await service.delete_project(db, project)


@router.get(
    "/{project_id}/documents",
    response_model=list[ProjectDocumentRead],
    summary="List a project's documents",
)
async def list_documents(project_id: int, db: AsyncSession = Depends(get_db)) -> list[ProjectDocumentModel]:
    await _get_or_404(db, project_id)
    return await service.list_documents(db, project_id)


@router.post(
    "/{project_id}/documents",
    response_model=ProjectDocumentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document to a project",
)
async def upload_document(
    project_id: int,
    title: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> ProjectDocumentModel:
    await _get_or_404(db, project_id)

    title = title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Document title is required")

    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(status_code=413, detail="File is too large")

    original_name = file.filename or "document"
    stored_name = f"{uuid.uuid4().hex}{Path(original_name).suffix}"
    (_upload_dir() / stored_name).write_bytes(content)

    return await service.create_document(
        db,
        project_id=project_id,
        title=title,
        filename=original_name,
        stored_name=stored_name,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(content),
    )


@router.get(
    "/{project_id}/documents/{document_id}/file",
    summary="Stream a document's file content (renders inline, e.g. for a PDF viewer)",
)
async def get_document_file(
    project_id: int, document_id: int, db: AsyncSession = Depends(get_db)
) -> Response:
    document = await _get_document_or_404(db, project_id, document_id)
    file_path = _upload_dir() / document.stored_name
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Stored file is missing")
    return Response(
        content=file_path.read_bytes(),
        media_type=document.content_type,
        headers={"Content-Disposition": f'inline; filename="{document.filename}"'},
    )


@router.delete(
    "/{project_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project document",
)
async def delete_document(
    project_id: int, document_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    document = await _get_document_or_404(db, project_id, document_id)
    file_path = _upload_dir() / document.stored_name
    await service.delete_document(db, document)
    file_path.unlink(missing_ok=True)


@router.get("/{project_id}/notes", response_model=list[ProjectNoteRead], summary="List a project's notes")
async def list_notes(project_id: int, db: AsyncSession = Depends(get_db)) -> list[ProjectNoteModel]:
    await _get_or_404(db, project_id)
    return await service.list_notes(db, project_id)


@router.post(
    "/{project_id}/notes",
    response_model=ProjectNoteRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a note to a project",
)
async def create_note(
    project_id: int, payload: ProjectNoteCreate, db: AsyncSession = Depends(get_db)
) -> ProjectNoteModel:
    await _get_or_404(db, project_id)
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Note title is required")
    return await service.create_note(db, project_id=project_id, title=title, body=payload.body)


@router.patch(
    "/{project_id}/notes/{note_id}",
    response_model=ProjectNoteRead,
    summary="Update a project note",
)
async def update_note(
    project_id: int, note_id: int, payload: ProjectNoteUpdate, db: AsyncSession = Depends(get_db)
) -> ProjectNoteModel:
    note = await _get_note_or_404(db, project_id, note_id)
    title = payload.title.strip() if payload.title is not None else None
    if title == "":
        raise HTTPException(status_code=400, detail="Note title is required")
    return await service.update_note(db, note, title=title, body=payload.body)


@router.delete(
    "/{project_id}/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project note",
)
async def delete_note(project_id: int, note_id: int, db: AsyncSession = Depends(get_db)) -> None:
    note = await _get_note_or_404(db, project_id, note_id)
    await service.delete_note(db, note)


@router.get(
    "/{project_id}/discussions",
    response_model=list[ProjectDiscussionMessageRead],
    summary="List a project's discussion messages",
)
async def list_discussion_messages(
    project_id: int, db: AsyncSession = Depends(get_db)
) -> list[ProjectDiscussionMessageModel]:
    await _get_or_404(db, project_id)
    return await service.list_discussion_messages(db, project_id)


@router.post(
    "/{project_id}/discussions",
    response_model=ProjectDiscussionMessageRead,
    status_code=status.HTTP_201_CREATED,
    summary="Post a discussion message to a project",
)
async def create_discussion_message(
    project_id: int, payload: ProjectDiscussionMessageCreate, db: AsyncSession = Depends(get_db)
) -> ProjectDiscussionMessageModel:
    await _get_or_404(db, project_id)
    author = payload.author.strip()
    message = payload.message.strip()
    if not author:
        raise HTTPException(status_code=400, detail="Author name is required")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    return await service.create_discussion_message(db, project_id=project_id, author=author, message=message)


@router.delete(
    "/{project_id}/discussions/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a project discussion message",
)
async def delete_discussion_message(
    project_id: int, message_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    row = await _get_discussion_message_or_404(db, project_id, message_id)
    await service.delete_discussion_message(db, row)


@router.post(
    "/{project_id}/business-processes/extract-implementation-workflow",
    response_model=ImplementationExtractResponse,
    summary="Extract an implementation workflow write-up from the project's documents, notes, and discussions",
)
async def extract_implementation_workflow(
    project_id: int, payload: ImplementationExtractRequest, db: AsyncSession = Depends(get_db)
) -> ImplementationExtractResponse:
    await _get_or_404(db, project_id)

    api_key = await app_settings_service.get_groq_api_key(db)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No GROQ API key configured — set one in Settings (gear icon in the top-right) first.",
        )

    documents = await service.list_documents(db, project_id)
    upload_dir = _upload_dir()
    document_texts = [
        (doc.title, text_extract.extract_text(upload_dir / doc.stored_name, doc.content_type))
        for doc in documents
    ]

    notes = await service.list_notes(db, project_id)
    note_texts = [(note.title, note.body) for note in notes]

    discussion_rows = await service.list_discussion_messages(db, project_id)
    discussion_texts = [
        (row.author, row.message, row.created_at.isoformat()) for row in discussion_rows
    ]

    user_message = implementation_extract_prompts.build_user_message(
        payload.business_process_name, payload.description, document_texts, note_texts, discussion_texts
    )

    try:
        raw = await request_json_completion(
            api_key, implementation_extract_prompts.SYSTEM_PROMPT, user_message
        )
    except GroqError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    try:
        return ImplementationExtractResponse.model_validate(raw)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GROQ's response didn't match the expected shape: {e}",
        ) from e
