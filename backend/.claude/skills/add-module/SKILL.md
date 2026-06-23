---
name: add-module
description: Scaffold a new backend mini-project (module) in the Intel-AI FastAPI app. Use when adding a new API area with its own routes, schemas, service and (optional) database models under backend/src/app/modules/.
---

## Description

A backend "module" is a self-contained mini-project under
`backend/src/app/modules/<name>/`. It owns its routes, Pydantic schemas,
business logic and (optionally) SQLAlchemy models. Modules are wired into the
app through a single `MODULES` list in `backend/src/app/api/router.py`, so
adding one only touches the new folder plus one line — keeping parallel
development conflict-free.

Use the `items` module as the canonical template for DB-backed modules and the
`health` module for stateless ones.

## Instructions

1. Create the package folder `backend/src/app/modules/<name>/` with an empty
   `__init__.py`.

2. Add `schemas.py` — Pydantic v2 models for requests/responses:
   ```python
   from pydantic import BaseModel

   class <Name>Read(BaseModel):
       id: int
       # ... fields
       model_config = {"from_attributes": True}

   class <Name>Create(BaseModel):
       # ... fields
       ...
   ```

3. If the module persists data, add `models.py` with a SQLAlchemy model that
   inherits the shared `Base`:
   ```python
   from sqlalchemy.orm import Mapped, mapped_column
   from app.core.database import Base

   class <Name>(Base):
       __tablename__ = "<name>s"
       id: Mapped[int] = mapped_column(primary_key=True)
       # ... columns
   ```

4. Add `service.py` for business logic / DB access. Accept an
   `AsyncSession` and keep route handlers thin. Mirror `modules/items/service.py`.

5. Add `router.py` exposing an `APIRouter` named `router`. Paths are relative
   (the prefix is applied at registration). Inject the DB with
   `db: AsyncSession = Depends(get_db)` when needed:
   ```python
   from fastapi import APIRouter
   router = APIRouter()

   @router.get("", summary="List <name>")
   async def list_<name>(): ...
   ```

6. Register the module in `backend/src/app/api/router.py` by adding ONE line to
   the `MODULES` list (keep it alphabetised):
   ```python
   ("app.modules.<name>", "/<name>", "<name>"),
   ```

7. Add tests in `backend/tests/test_<name>.py` using the async `client` fixture
   from `conftest.py`. Cover the happy path and at least one error case.

8. If you added `models.py`, create a migration:
   ```bash
   make migration m="add <name> table"
   ```

9. Verify before opening a PR:
   ```bash
   make test
   make lint
   ```

10. Update documentation via the `write-docs` skill (note the new module in
    `docs/backend.md`).
