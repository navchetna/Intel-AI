# Intel-AI Frontend

Modular Next.js (App Router, TypeScript) frontend boilerplate.

Each feature is a self-contained route group under `app/(modules)/<name>/`.
Shared API access goes through `lib/api/client.ts` + `lib/api/endpoints.ts`,
and runtime config lives in `config/settings.ts`. This keeps parallel work
conflict-free: a new feature touches only its own folder plus the endpoint
registry.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run build
```

Set `NEXT_PUBLIC_API_BASE_URL` (see `.env.example`) to point at the backend.
