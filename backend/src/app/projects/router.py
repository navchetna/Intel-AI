"""Projects module routes."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.projects import service
from app.projects.models import Project as ProjectModel
from app.projects.models import ProjectDocument as ProjectDocumentModel
from app.projects.schemas import (
    Project,
    ProjectCreate,
    ProjectDataUpdate,
    ProjectDocumentRead,
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
