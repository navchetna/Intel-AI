"""Business logic for the projects module."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.projects.models import Project


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


async def update_project_data(db: AsyncSession, project: Project, data: dict) -> Project:
    project.data = data
    await db.commit()
    await db.refresh(project)
    return project


async def delete_project(db: AsyncSession, project: Project) -> None:
    await db.delete(project)
    await db.commit()
