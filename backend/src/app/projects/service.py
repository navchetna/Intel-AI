"""Business logic for the projects module."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.projects.models import (
    Project,
    ProjectDiscussionMessage,
    ProjectDocument,
    ProjectNote,
)


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


async def list_notes(db: AsyncSession, project_id: int) -> list[ProjectNote]:
    stmt = (
        select(ProjectNote)
        .where(ProjectNote.project_id == project_id)
        .order_by(ProjectNote.updated_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_note(db: AsyncSession, project_id: int, note_id: int) -> ProjectNote | None:
    stmt = select(ProjectNote).where(ProjectNote.id == note_id, ProjectNote.project_id == project_id)
    return (await db.execute(stmt)).scalar_one_or_none()


async def create_note(db: AsyncSession, *, project_id: int, title: str, body: str) -> ProjectNote:
    note = ProjectNote(project_id=project_id, title=title, body=body)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def update_note(db: AsyncSession, note: ProjectNote, *, title: str | None, body: str | None) -> ProjectNote:
    if title is not None:
        note.title = title
    if body is not None:
        note.body = body
    await db.commit()
    await db.refresh(note)
    return note


async def delete_note(db: AsyncSession, note: ProjectNote) -> None:
    await db.delete(note)
    await db.commit()


async def list_discussion_messages(db: AsyncSession, project_id: int) -> list[ProjectDiscussionMessage]:
    stmt = (
        select(ProjectDiscussionMessage)
        .where(ProjectDiscussionMessage.project_id == project_id)
        .order_by(ProjectDiscussionMessage.created_at.asc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_discussion_message(
    db: AsyncSession, project_id: int, message_id: int
) -> ProjectDiscussionMessage | None:
    stmt = select(ProjectDiscussionMessage).where(
        ProjectDiscussionMessage.id == message_id, ProjectDiscussionMessage.project_id == project_id
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def create_discussion_message(
    db: AsyncSession, *, project_id: int, author: str, message: str
) -> ProjectDiscussionMessage:
    row = ProjectDiscussionMessage(project_id=project_id, author=author, message=message)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def delete_discussion_message(db: AsyncSession, row: ProjectDiscussionMessage) -> None:
    await db.delete(row)
    await db.commit()
