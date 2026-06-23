# Intel-AI Backend

Modular FastAPI backend boilerplate.

Each feature lives as a self-contained package under `src/app/modules/<name>/`
(its own `router.py`, `schemas.py`, `service.py`, `models.py`) and is mounted by
the aggregator in `src/app/api/router.py`. This keeps parallel development
conflict-free: adding a module touches only its own folder plus one import line.

## Quick start

```bash
uv sync --extra dev          # install deps
uv run uvicorn app.main:app --reload --app-dir src
uv run pytest                # run tests
uv run ruff check .          # lint
```

See the repository root `README.md` and `docs/` for full guidelines.
