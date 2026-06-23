"""Async database engine, session factory, and FastAPI dependency.

Uses SQLAlchemy 2.0 async with the asyncpg driver for PostgreSQL. Modules
should define ORM models inheriting from :class:`Base` and depend on
:func:`get_db` to obtain a session.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base shared by all module ORM models."""


engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=settings.db_echo,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session per request."""
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    """Create tables for all imported models (dev/test convenience).

    In production prefer Alembic migrations (``make migrate``).
    """
    # Import models so they register on Base.metadata before create_all.
    from app.api.router import import_module_models  # local import avoids cycles

    import_module_models()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
