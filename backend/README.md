# Intel-AI Backend

Modular FastAPI backend boilerplate.

Each feature is a self-contained subproject package directly under
`src/app/<name>/` (its own `router.py`, `schemas.py`, `service.py`, `models.py`)
and is mounted by the aggregator in `src/app/api/router.py`. This keeps parallel
development conflict-free: adding a subproject touches only its own folder plus
one registration line.

## Quick start

```bash
uv sync --extra dev          # install deps
uv run uvicorn app.main:app --reload --app-dir src
uv run pytest                # run tests
uv run ruff check .          # lint
```

See the repository root `README.md` and `docs/` for full guidelines.
