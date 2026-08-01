"""Business logic for the projects module."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.projects.models import Project, ProjectDocument


async def list_projects(db: AsyncSession) -> list[Project]:
    stmt = select(Project).order_by(Project.updated_at.desc())
    return list((await db.execute(stmt)).scalars().all())


async def get_project(db: AsyncSession, project_id: int) -> Project | None:
    return await db.get(Project, project_id)


async def create_project(db: AsyncSession, name: str, data: dict) -> Project:
    project = Project(name=name, data=data)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def update_project(db: AsyncSession, project: Project, *, name: str | None = None, data: dict | None = None) -> Project:
    if name is not None:
        project.name = name
    if data is not None:
        project.data = data
    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project: Project) -> None:
    await db.delete(project)
    await db.commit()


async def list_documents(db: AsyncSession, project_id: int) -> list[ProjectDocument]:
    stmt = (
        select(ProjectDocument)
        .where(ProjectDocument.project_id == project_id)
        .order_by(ProjectDocument.created_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_document(db: AsyncSession, project_id: int, document_id: int) -> ProjectDocument | None:
    stmt = select(ProjectDocument).where(
        ProjectDocument.id == document_id, ProjectDocument.project_id == project_id
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def create_document(
    db: AsyncSession,
    *,
    project_id: int,
    title: str,
    filename: str,
    stored_name: str,
    content_type: str,
    size_bytes: int,
) -> ProjectDocument:
    document = ProjectDocument(
        project_id=project_id,
        title=title,
        filename=filename,
        stored_name=stored_name,
        content_type=content_type,
        size_bytes=size_bytes,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)
    return document


async def delete_document(db: AsyncSession, document: ProjectDocument) -> None:
    await db.delete(document)
    await db.commit()
