"""Projects module routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.projects import service
from app.projects.models import Project as ProjectModel
from app.projects.schemas import Project, ProjectCreate, ProjectDataUpdate, ProjectSummary

router = APIRouter()


async def _get_or_404(db: AsyncSession, project_id: int) -> ProjectModel:
    project = await service.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


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


@router.patch("/{project_id}", response_model=Project, summary="Replace a project's data")
async def update_project(
    project_id: int, payload: ProjectDataUpdate, db: AsyncSession = Depends(get_db)
) -> ProjectModel:
    project = await _get_or_404(db, project_id)
    return await service.update_project_data(db, project, payload.data)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a project")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)) -> None:
    project = await _get_or_404(db, project_id)
    await service.delete_project(db, project)
