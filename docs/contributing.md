# Contributing

## Branching

- Branch off `main`: `feature/<module>-<short-desc>`, `fix/<module>-<short-desc>`.
- Keep each PR scoped to **one module** where possible.

## Pull requests

1. Fill in the PR template (auto-loaded from `.github/pull_request_template.md`).
2. Ensure `make lint` and `make test` pass locally.
3. Update `docs/` if behavior changed (use the `write-docs` skill).
4. Request review — `CODEOWNERS` routes reviewers automatically.
## Pre-commit hooks & sign-off

Install the hooks once after cloning:

```bash
pip install pre-commit
pre-commit install --hook-type pre-commit --hook-type commit-msg
```

- **Lint before commit:** ruff (backend) and eslint + typecheck (frontend) run
  automatically on staged files.
- **DCO sign-off:** every commit must carry a `Signed-off-by` trailer. Commit
  with `git commit -s` (or amend with `git commit -s --amend`). The local
  `commit-msg` hook and the CI **DCO** job both reject commits without it.
## Continuous integration

CI is **manually triggered** to conserve runners and give control over when PRs
are validated:

1. Push your branch / open the PR.
2. Go to the **Actions** tab → **CI** → **Run workflow**.
3. Optionally enter the branch or PR ref in the `ref` input.
4. All jobs must be green: **DCO sign-off check**, **Backend (lint + test)** and
   **Frontend (lint + build)**.

## Code ownership

`.github/CODEOWNERS` maps areas to the four developers. Update the placeholder
`@dev1..@dev4` handles with real GitHub usernames.

## Conventions

- Backend: ruff (line length 100), pytest (`asyncio_mode=auto`).
- Frontend: eslint (`next/core-web-vitals`), strict TypeScript.
- New modules must follow the relevant `.claude/skills/` skill.
