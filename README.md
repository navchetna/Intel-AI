# Intel-AI

Modular full-stack boilerplate: **FastAPI** (backend) + **Next.js** (frontend),
designed for multiple developers to work in parallel with minimal merge
conflicts. Each feature is a self-contained *module* (backend) or *feature route
group* (frontend), so PRs stay scoped and independent.

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

### Option A — Docker (full stack)

```bash
cp .env.example .env
make build
make up                 # backend :8000, frontend :3000, postgres :5432
make logs
```

### Option B — Local dev

```bash
make install            # uv sync + npm install
make dev-backend        # terminal 1 → http://localhost:8000/docs
make dev-frontend       # terminal 2 → http://localhost:3000
```

**NOTE** - Incase of port conflicts, update the port in the Makefile and run the commands again.

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

## Working as a team (4 developers)

- Branch per change: `feature/<module>-<short-desc>`; keep PRs scoped to one module.
- Install git hooks once:
  `pre-commit install --hook-type pre-commit --hook-type commit-msg`
  (lints backend + frontend before every commit).
- **Sign off every commit** with `git commit -s` (DCO). The commit-msg hook and
  the CI **DCO** job both reject commits without a `Signed-off-by` trailer.
- Reviews are routed by [.github/CODEOWNERS](.github/CODEOWNERS) — update the handles.
- CI is **manually triggered**: Actions tab → **CI** → **Run workflow** (optionally pass a ref).
- Every PR uses the checklist in [.github/pull_request_template.md](.github/pull_request_template.md).

See [docs/](docs/) for architecture, backend, frontend, contributing and workflow guides.
