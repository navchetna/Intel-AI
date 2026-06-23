---
name: items-domain
description: Reference for the Intel-AI backend "items" subproject — the canonical CRUD package (router + schemas + service + models). Use when building or modifying a database-backed subproject and you want a concrete, working pattern to copy.
---

## Description

`items` is the example database-backed subproject in
`backend/src/app/items/`. It demonstrates the full pattern a DB-backed
package should follow: REST CRUD routes, Pydantic schemas, an async
service layer, and a SQLAlchemy model registered on the shared `Base`. Use it as
the copy-from template when creating new persistent subprojects.

## Instructions

1. Inspect the four files to learn the pattern:
   - `items/models.py` — `Item` SQLAlchemy model on `Base`.
   - `items/schemas.py` — `ItemCreate`, `ItemUpdate`, `ItemRead`
     (with `model_config = {"from_attributes": True}`).
   - `items/service.py` — async functions taking `AsyncSession`:
     `list_items`, `get_item`, `create_item`, `update_item`, `delete_item`.
   - `items/router.py` — `APIRouter` with `GET/POST/GET{id}/PATCH/DELETE`,
     raising `HTTPException(404)` when missing.

2. To create a similar subproject, copy the folder, rename the symbols, and
   follow the `add-domain` skill for registration and migration steps.

3. Keep the layering rule: routers validate + delegate; services hold logic and
   own the DB session; schemas never import models’ runtime behavior.

4. Conventions:
   - Collection routes use path `""` (prefix supplies `/items`).
   - Return `response_model` schemas, never ORM objects directly.
   - 201 on create, 204 on delete.

5. Tests live in `backend/tests/test_items.py` — mirror its structure
   (`test_<name>_crud_flow`, `test_get_missing_<name>`).
