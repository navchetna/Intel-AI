# Backend

FastAPI app using `uv`, a `src/` layout, async SQLAlchemy 2.0 + asyncpg
(PostgreSQL), and Alembic migrations.

## Layout

```
backend/
├── pyproject.toml          deps + ruff + pytest config
├── alembic.ini, alembic/   migrations
├── src/app/
│   ├── main.py             create_app() factory
│   ├── core/
│   │   ├── config.py       Settings (pydantic-settings)
│   │   └── database.py     async engine + session dependency
│   ├── api/router.py       aggregates module routers under /api
│   └── modules/
│       ├── health/         no-DB example module
│       └── items/          CRUD example module
└── tests/                  pytest suite
```

## A module

Each module is a package with up to four files:

| File         | Responsibility                                  |
| ------------ | ----------------------------------------------- |
| `router.py`  | `APIRouter` + path operations                   |
| `schemas.py` | Pydantic request/response models                |
| `service.py` | Business logic / DB access                       |
| `models.py`  | SQLAlchemy ORM models (only if it needs the DB) |

Register it by adding one line to `api/router.py`:

```python
from app.modules.<name>.router import router as <name>_router
api_router.include_router(<name>_router)
```

> Prefer the `add-module` skill to scaffold a new module consistently.

## Configuration

`core/config.py` reads environment variables (and `.env`). Key setting:
`DATABASE_URL` (e.g. `postgresql+asyncpg://user:pass@db:5432/intelai`).

## Database & migrations

```bash
make migration m="add users table"   # autogenerate revision
make migrate                          # apply to head
```

## Testing

`tests/conftest.py` provides an async httpx client against the app with an
isolated test database. Run with `make test` (or `uv run pytest`).
