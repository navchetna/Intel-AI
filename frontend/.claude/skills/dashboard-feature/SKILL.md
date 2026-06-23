---
name: dashboard-feature
description: Reference for the Intel-AI frontend "dashboard" feature — the canonical mini-project showing the modules/<name>/ business-logic layer plus a thin app/(modules)/ route. Use when building or modifying a feature that reads backend data.
---

## Description

`dashboard` is the example feature module. It demonstrates the intended
separation of concerns:

- `frontend/modules/dashboard/` — `types.ts` (core), `api.ts` (data access),
  `service.ts` (`loadDashboard` business logic), `components/ItemList.tsx` (UI),
  `index.ts` (public surface).
- `frontend/app/(modules)/dashboard/page.tsx` — a thin Server Component route
  that calls `loadDashboard()` and renders `ItemList`, handling the error state.

Use it as the copy-from template for new read-oriented features.

## Instructions

1. Read these files to learn the pattern:
   - `modules/dashboard/service.ts` — try/catch returns `{ items, error }`.
   - `modules/dashboard/api.ts` — wraps `apiClient`, no hardcoded URLs.
   - `modules/dashboard/components/ItemList.tsx` — empty + populated states.
   - `app/(modules)/dashboard/page.tsx` — thin route importing from
     `@/modules/dashboard`.

2. To create a similar feature, copy `modules/dashboard/` to
   `modules/<name>/`, rename symbols, and add a thin route. Follow the
   `add-feature` skill for the full checklist.

3. Conventions:
   - Business logic lives in `service.ts`; routes/components never call `api.ts`
     or `fetch` directly.
   - Use the `@/` path alias; import a feature only via its `index.ts`.
   - Style with Tailwind utility classes; container `mx-auto max-w-2xl p-10`.
   - Add `"use client"` only for interactive components.

4. For mutations (create/update/delete), add the operation to the module's
   `api.ts`, expose a `service.ts` function, and call it from a client
   component, then revalidate as needed.
