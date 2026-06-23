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
│   ├── api/router.py       aggregates subproject routers under /api
│   ├── health/             no-DB example subproject
│   ├── items/              CRUD example subproject
│   ├── llm_bench/          feature subproject
│   ├── serving_engines/    feature subproject
│   ├── silicon/            feature subproject
│   └── intel_bluelens/     feature subproject
└── tests/                  pytest suite
```

## A subproject

Each feature is a self-contained package directly under `src/app/<name>/`,
colocating its routes and business logic. It has up to four files:

| File         | Responsibility                                  |
| ------------ | ----------------------------------------------- |
| `router.py`  | `APIRouter` + path operations (transport)       |
| `schemas.py` | Pydantic request/response models (contract)     |
| `service.py` | Business logic / DB access                       |
| `models.py`  | SQLAlchemy ORM models (only if it needs the DB) |

Register it by adding one line to the `DOMAINS` list in `api/router.py`:

```python
("app.<name>", "/<name>", "<name>"),
```

> Prefer the `add-domain` skill to scaffold a new subproject consistently.

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
