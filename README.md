# Intel-AI

Full-stack AI platform: **FastAPI** (backend) + **Next.js** (frontend) + **Intel BlueLens** (trace visualization).
Modular architecture designed for parallel development with minimal conflicts. Features include silicon products,
AI workflows, serving engines, model catalog, and integrated performance profiling.

```
Intel-AI/
├── backend/            FastAPI app (uv, src/ layout, Postgres, Alembic)
│   ├── src/app/
│   │   ├── main.py         app factory
│   │   ├── core/           config + database
│   │   ├── api/router.py   aggregates every subproject router
│   │   ├── health/         ← one folder per subproject (no-DB example)
│   │   └── llm_bench/ …     ← feature subprojects (silicon, serving_engines, intel_bluelens)
│   ├── tests/
│   └── .claude/skills/     backend scaffolding skills (add-domain)
├── frontend/           Next.js App Router (TypeScript, Tailwind)
│   ├── app/(modules)/      ← thin route per feature (llm-bench, silicon, ...)
│   ├── modules/            ← feature business/core logic (types, api, service, components)
│   ├── lib/api/            shared transport + system endpoint registry
│   ├── config/settings.ts  runtime config
│   └── .claude/skills/     frontend scaffolding skills (add-feature)
├── docs/               all project documentation
├── .claude/skills/      cross-cutting skills (write-docs)
├── .github/            manual CI (+ DCO), CODEOWNERS, PR/contrib templates
├── scripts/            check-signoff.sh (DCO hook)
├── Makefile            developer task runner
├── .pre-commit-config.yaml  lint-before-commit + DCO sign-off
└── docker-compose.yml  postgres + backend + frontend
```

> **Skills layout:** backend and frontend each own a `.claude/skills/` folder so
> Claude auto-loads the right scaffolding skill when you work in that package
> (the standard monorepo pattern). Cross-cutting skills live in the root
> `.claude/skills/`.

## Quick start

### Development (local)

```bash
cp .env.example .env
make install            # uv sync + npm install
make dev-backend        # terminal 1 → http://localhost:8000/docs
make dev-frontend       # terminal 2 → http://localhost:3000
```

### Production deployment

```bash
# Configure environment (optional - defaults provided)
# NEXT_PUBLIC_BASE_PATH=/intel-ai    # URL prefix for frontend
# FRONTEND_PORT=3005                 # Frontend exposed port
# DB_PORT=5435                       # PostgreSQL exposed port

# Build and start all services (backend, frontend, db, intel-bluelens)
docker compose -f docker-compose-prod.yml up -d --build

# Services:
# - Frontend: localhost:3005 (serve under /intel-ai via nginx)
# - Backend API: internal only, proxied via frontend
# - PostgreSQL: localhost:5435
# - Intel BlueLens: /intel-ai/intel-bluelens (internal routing only)
```

**Nginx reverse proxy required** — see deployment notes below.

Run `make help` to see all targets.

## Common tasks

| Task                       | Command                         |
| -------------------------- | ------------------------------- |
| Run backend tests          | `make test`                     |
| Lint everything            | `make lint`                     |
| Auto-format backend        | `make format`                   |
| Create a DB migration      | `make migration m="add users"`  |
| Apply migrations           | `make migrate`                  |

## Adding features

- **New backend subproject:** follow [backend/.claude/skills/add-domain/SKILL.md](backend/.claude/skills/add-domain/SKILL.md)
- **New frontend feature:** follow [frontend/.claude/skills/add-feature/SKILL.md](frontend/.claude/skills/add-feature/SKILL.md)
- **Writing docs:** follow [.claude/skills/write-docs/SKILL.md](.claude/skills/write-docs/SKILL.md)

A new module should touch **only its own folder** plus a single line in the
router/endpoint registry — this is what keeps parallel work conflict-free.

## Deployment notes

**Nginx reverse proxy configuration:**

The application expects to run behind nginx with the following routing:

```nginx
# Main frontend and API
location /intel-ai {
    proxy_pass http://localhost:3005;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Intel BlueLens assets (required for asset loading)
location /intel-bluelens/ {
    proxy_pass http://localhost:3005/intel-bluelens/;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

After nginx configuration, access the application at: `http://your-host/intel-ai`

## Team workflow

- Branch per module: `feature/<module>-<desc>`, keep PRs scoped
- Install hooks: `pre-commit install --hook-type pre-commit --hook-type commit-msg`
- Sign commits: `git commit -s` (DCO required)
- CI is manually triggered via GitHub Actions

See [docs/](docs/) for detailed architecture and guides.
