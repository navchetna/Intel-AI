# Frontend

Next.js (App Router) + TypeScript + Tailwind CSS.

## Layout

```
frontend/
├── app/
│   ├── layout.tsx          root layout (mounts the Navbar)
│   ├── page.tsx            Intel-themed landing (renders the nav registry)
│   └── (modules)/          thin feature routes
│       ├── dashboard/      → imports from modules/dashboard
│       ├── llm-bench/      → imports from modules/llm-bench
│       ├── serving-engines/
│       ├── silicon/
│       └── intel-bluelens/
├── components/             shared UI (Navbar, Logo, FeatureLanding)
├── lib/navigation.ts       central nav registry (navRoutes — single source of truth)
├── modules/                feature business/core logic (mini-projects)
│   └── dashboard/
│       ├── types.ts        domain types (core)
│       ├── api.ts          data access over lib/api/client (core)
│       ├── service.ts      business logic (loadDashboard)
│       ├── components/     presentational UI
│       └── index.ts        public surface (routes import from here)
├── lib/api/
│   ├── client.ts           fetch wrapper (uses config base URL)
│   └── endpoints.ts        shared/system endpoints only (e.g. health)
├── config/settings.ts      runtime config (app name, API base URL)
└── .claude/skills/         add-feature, dashboard-feature
```

> The four feature routes (`llm-bench`, `serving-engines`, `silicon`,
> `intel-bluelens`) and how to extend them into real backend pipelines are
> documented in [routes.md](routes.md).

## A feature module

A feature is split so routing stays separate from logic, mirroring the backend:

| File / folder                   | Responsibility                          |
| ------------------------------- | --------------------------------------- |
| `modules/<name>/types.ts`       | Domain types (core)                     |
| `modules/<name>/api.ts`         | HTTP data access over `lib/api/client`  |
| `modules/<name>/service.ts`     | Business logic, error shaping           |
| `modules/<name>/components/`    | Presentational UI                       |
| `modules/<name>/index.ts`       | Public surface (routes import from here)|
| `app/(modules)/<name>/page.tsx` | Thin route wiring service + UI to a URL |

Routes and components call the module's `service`, never `api.ts` or `fetch`
directly:

```ts
import { loadDashboard, ItemList } from "@/modules/dashboard";
const { items, error } = await loadDashboard();
```

Only cross-cutting endpoints (e.g. health) live in `lib/api/endpoints.ts`.

> Prefer the `add-feature` skill to scaffold a new feature consistently.

## Configuration

`config/settings.ts` centralizes runtime config. Set
`NEXT_PUBLIC_API_BASE_URL` (see `.env.example`) to point at the backend; never
hardcode URLs in components.

## Commands

```bash
npm run dev         # dev server on :3000
npm run lint        # eslint (next)
npm run typecheck   # tsc --noEmit
npm run build       # production build
```
