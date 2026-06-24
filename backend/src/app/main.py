"""FastAPI application factory."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Startup
    if settings.environment != "production":
        # Convenience auto-create for local/dev; production uses Alembic.
        from app.core.database import init_db

        await init_db()
    yield
    # Shutdown
    from app.core.database import engine

    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_prefix)

    @app.get("/", tags=["root"])
    async def root() -> dict[str, str]:
        return {"app": settings.app_name, "status": "ok", "docs": "/docs"}

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        # Root-level liveness probe for containers/orchestrators.
        # The full health payload is also available at f"{settings.api_prefix}/health".
        return {"status": "ok"}

    return app


app = create_app()
