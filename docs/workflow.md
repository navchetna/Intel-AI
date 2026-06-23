# Developer Workflow

Day-to-day reference. Run `make help` for the full target list.

## First-time setup

```bash
git clone <repo> && cd Intel-AI
cp .env.example .env
make install            # backend (uv) + frontend (npm)
```

## Running locally

```bash
make dev-backend        # http://localhost:8000/docs
make dev-frontend       # http://localhost:3000
```

Or the full containerized stack (includes PostgreSQL):

```bash
make up                 # build/start; make logs to follow; make down to stop
```

## Building a feature

1. Scaffold using the matching skill (`add-module` for backend or `add-feature` for frontend).
2. Implement logic inside the module folder.
3. Register it (backend `api/router.py` / frontend `lib/api/endpoints.ts`).
4. Add/extend tests (`backend/tests/`), then `make test` and `make lint`.
5. Update `docs/` via the `write-docs` skill.
6. Open a PR and trigger CI manually.

## Database changes

```bash
make migration m="describe change"   # create revision
make migrate                         # apply
```

## Cleanup

```bash
make clean              # remove venv, node_modules, .next, volumes
```
