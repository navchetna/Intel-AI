---
name: add-feature
description: Scaffold a new frontend feature mini-project in the Intel-AI Next.js app. Use when adding a new page/feature with its own components, business logic and API access under frontend/modules/ plus a thin route under app/(modules)/.
---

## Description

A frontend "feature module" is a self-contained mini-project that separates
business/core logic from routing, mirroring the backend:

- `frontend/modules/<name>/` — the feature's own logic:
  - `types.ts` — domain types (core)
  - `api.ts` — data access over the shared transport `lib/api/client.ts` (core)
  - `service.ts` — business logic that orchestrates `api.ts` and shapes data
  - `components/` — presentational UI
  - `index.ts` — barrel export (the module's public surface)
- `frontend/app/(modules)/<name>/page.tsx` — a THIN route that wires the
  module's `service` + `components` to a URL.

Use the `dashboard` feature as the canonical template. Only truly cross-cutting
endpoints (e.g. health) belong in the shared `lib/api/endpoints.ts`.

## Instructions

1. Create the module folder `frontend/modules/<name>/`:

   `types.ts`
   ```ts
   export interface <Thing> { id: number; /* ... */ }
   export interface <Thing>Create { /* ... */ }
   ```

   `api.ts` (never hardcode the base URL — `client.ts` reads it from `config/settings.ts`)
   ```ts
   import { apiClient } from "@/lib/api/client";
   import type { <Thing>, <Thing>Create } from "./types";

   export const <name>Api = {
     list: () => apiClient.get<<Thing>[]>("/<name>"),
     create: (data: <Thing>Create) => apiClient.post<<Thing>>("/<name>", data),
   };
   ```

   `service.ts` (business logic; handle the backend-down case)
   ```ts
   import { <name>Api } from "./api";
   import type { <Thing> } from "./types";

   export async function load<Name>(): Promise<{ data: <Thing>[]; error: string | null }> {
     try {
       return { data: await <name>Api.list(), error: null };
     } catch (e) {
       return { data: [], error: e instanceof Error ? e.message : "Failed to load" };
     }
   }
   ```

   `components/<Name>List.tsx` — presentational only.

   `index.ts`
   ```ts
   export * from "./types";
   export { <name>Api } from "./api";
   export { load<Name> } from "./service";
   export { <Name>List } from "./components/<Name>List";
   ```

2. Add the thin route `frontend/app/(modules)/<name>/page.tsx`:
   ```tsx
   import { load<Name>, <Name>List } from "@/modules/<name>";

   export default async function <Name>Page() {
     const { data, error } = await load<Name>();
     return <main className="mx-auto max-w-2xl p-10">{/* render data / error */}</main>;
   }
   ```
   Server Component by default; add `"use client"` only for interactive
   components inside `components/`.

3. Add a link from `app/page.tsx` (or the relevant nav) so the feature is
   reachable.

4. Verify before opening a PR:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```
   (or `make lint-frontend`).

5. Update documentation via the `write-docs` skill (note the new feature in
   `docs/frontend.md`).
