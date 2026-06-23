# Architecture

Intel-AI is a two-tier application with a clear module boundary that lets four
developers work in parallel without stepping on each other.

```
┌────────────┐        HTTP/JSON        ┌────────────┐      asyncpg      ┌────────────┐
│  Next.js   │ ───────────────────────▶│  FastAPI   │ ─────────────────▶│ PostgreSQL │
│ (frontend) │   /api/* via client     │  (backend) │   SQLAlchemy 2.0  │            │
└────────────┘                         └────────────┘                   └────────────┘
```

## Principles

1. **Module isolation.** A feature is a self-contained package
   (`backend/src/app/modules/<name>/`) or route group
   (`frontend/app/(modules)/<name>/`). Adding one touches only that folder plus a
   single registration line.
2. **Single registration point.** Backend routers are aggregated in
   `backend/src/app/api/router.py`; frontend endpoints are registered in
   `frontend/lib/api/endpoints.ts`.
3. **Config at the edges.** Backend config is `pydantic-settings`
   (`core/config.py`); frontend config is `config/settings.ts`. No hardcoded URLs
   inside modules.

## Request flow

1. A frontend Server Component / handler calls `endpoints.<group>.<op>()`.
2. `lib/api/client.ts` prefixes `apiBaseUrl + apiPrefix` and issues the fetch.
3. FastAPI routes the request to the module router mounted under `/api`.
4. The module's `service.py` runs business logic against the DB session.

## Why this scales to a team

- Conflicts are confined to the two registries (small, append-only).
- `CODEOWNERS` routes reviews per area.
- CI validates each PR on demand (manual `workflow_dispatch`).
