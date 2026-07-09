# Routes Guide

This guide explains **where each top-level route lives** and the exact steps to
turn one of the dummy landing pages into a real, full-stack feature pipeline.

The landing UI ships with four feature routes plus the home page:

| Route             | Frontend route file                          | Feature module                       | Planned API prefix |
| ----------------- | -------------------------------------------- | ------------------------------------ | ------------------ |
| `/`               | `frontend/app/page.tsx`                      | — (renders the nav registry)         | —                  |
| `/llm-bench`      | `frontend/app/(modules)/llm-bench/page.tsx`      | `frontend/modules/llm-bench/`      | `/llm-bench`       |
| `/inference`      | `frontend/app/(modules)/inference/page.tsx`      | `frontend/modules/inference/`      | `/inference`       |
| `/silicon`        | `frontend/app/(modules)/silicon/page.tsx`        | `frontend/modules/silicon/`        | `/silicon`         |
| `/intel-bluelens` | `frontend/app/(modules)/intel-bluelens/page.tsx` | `frontend/modules/intel-bluelens/` | `/intel-bluelens`  |

## How a route is wired together

A route is intentionally split into small, single-responsibility pieces so four
developers can work in parallel without colliding.

```
frontend/
├── lib/navigation.ts                    # 1. Central nav registry (single source of truth)
├── components/
│   ├── Navbar.tsx                        # 2. Renders links from the registry
│   ├── Logo.tsx                          #    Intel logo (next/image)
│   └── FeatureLanding.tsx                # 3. Shared presentational landing + FeatureContent type
├── modules/<route>/
│   ├── content.ts                        # 4. The route's data (FeatureContent object)
│   └── index.ts                          #    Public surface of the module
└── app/(modules)/<route>/page.tsx        # 5. Thin route — imports content + FeatureLanding
```

1. **`lib/navigation.ts`** — the `navRoutes` array is the single source of truth.
   The navbar and the home page both render from it. Adding an entry here is what
   makes a route appear in the UI.
2. **`components/Navbar.tsx`** (`"use client"`) maps over `navRoutes` and uses
   `usePathname()` to highlight the active link. It is mounted once in
   `frontend/app/layout.tsx`, so every page gets the nav for free.
3. **`components/FeatureLanding.tsx`** is a reusable server component. It also
   exports the `FeatureContent` / `FeatureHighlight` TypeScript interfaces that
   every feature module conforms to.
4. **`modules/<route>/content.ts`** holds the route's content as a typed
   `FeatureContent` object (title, tagline, description, `apiPrefix`, highlights).
   This is where a developer owns their feature's data/logic.
5. **`app/(modules)/<route>/page.tsx`** is a thin route: it imports the module's
   content and renders `<FeatureLanding content={...} />` plus page `metadata`.

> `(modules)` is a Next.js **route group** — the parentheses keep the folder out
> of the URL. So `app/(modules)/silicon/page.tsx` serves at `/silicon`.

## Add a brand-new route (frontend only)

1. Register it in `frontend/lib/navigation.ts`:
   ```ts
   { slug: "my-feature", label: "My Feature", module: "my-feature", apiPrefix: "/my-feature" }
   ```
2. Create the module content:
   - `frontend/modules/my-feature/content.ts` — export a `FeatureContent` object.
   - `frontend/modules/my-feature/index.ts` — `export { myFeatureContent } from "./content";`
3. Create the route:
   - `frontend/app/(modules)/my-feature/page.tsx` — import the content and render
     `<FeatureLanding content={myFeatureContent} />` with a `metadata` export.
4. Verify: `cd frontend && npm run typecheck && npm run lint && npm run build`.

> Tip: the `add-feature` skill (`frontend/.claude/skills/add-feature/`) automates
> steps 2–3 with the richer data-fetching module layout (`types.ts` / `api.ts` /
> `service.ts` / `components/`).

## Turn a dummy page into a real pipeline (full stack)

Each route already declares the backend `apiPrefix` it intends to call. To make
it live, add a matching backend subproject and wire the frontend to fetch from it.

### 1. Backend — add the subproject

Backend subprojects are self-contained packages directly under
`backend/src/app/<name>/` (see [backend.md](backend.md) and the
`add-domain` skill at `backend/.claude/skills/add-domain/`).

```
backend/src/app/llm_bench/
├── __init__.py
├── router.py      # APIRouter with the route's endpoints
├── schemas.py     # Pydantic request/response models
├── service.py     # Business logic
└── models.py      # SQLAlchemy models (optional — only if it needs the DB)
```

Then register it in `backend/src/app/api/router.py` by adding one line to the
`DOMAINS` list (keep it alphabetised) with the prefix that matches the
frontend's `apiPrefix`:

```python
DOMAINS = [
    # ...existing entries...
    ("app.llm_bench", "/llm-bench", "llm-bench"),
]
```

> Backend folders use `snake_case` (`llm_bench`); the URL prefix uses the
> hyphenated slug (`/llm-bench`) so it lines up with the frontend route.

### 2. Frontend — call the backend

1. Add the endpoint(s) to `frontend/lib/api/endpoints.ts`, scoped by the route's
   `apiPrefix` (the API base + `/api` prefix come from `frontend/config/settings.ts`).
2. Grow the feature module into the data-fetching layout:
   - `modules/llm-bench/types.ts` — response/request types (mirror backend schemas).
   - `modules/llm-bench/api.ts` — typed calls via `apiClient` (`lib/api/client.ts`).
   - `modules/llm-bench/service.ts` — business logic / data shaping.
   - `modules/llm-bench/components/` — feature UI that consumes the service.
3. Render real data in `app/(modules)/llm-bench/page.tsx` (a Server Component can
   `await` the service directly, or delegate to a client component for interactivity).

### 3. Verify end to end

```bash
make dev          # backend (uvicorn) + frontend (next dev)
# or individually:
cd backend  && uv run uvicorn app.main:app --app-dir src --reload
cd frontend && npm run dev
```

Open the route (e.g. http://localhost:3000/llm-bench) and confirm it reads from
the backend at its `apiPrefix`.

## Theme reference

Intel brand colors are exposed as Tailwind utilities via the `@theme` block in
`frontend/app/globals.css`:

| Utility            | Hex       | Use                       |
| ------------------ | --------- | ------------------------- |
| `*-intel-blue`     | `#0071c5` | Primary actions, accents  |
| `*-intel-dark`     | `#003c71` | Headings                  |
| `*-intel-energy`   | `#00c7fd` | Highlights / dividers     |
| `*-intel-haze`     | `#e9f4fb` | Section backgrounds       |

The Intel logo is loaded by `components/Logo.tsx` via `next/image`; its remote
host is allow-listed in `frontend/next.config.ts` (`images.remotePatterns`).
