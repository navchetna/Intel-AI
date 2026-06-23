---
name: write-docs
description: Keep Intel-AI documentation correct and in the right place. Use whenever code behavior, structure, commands, modules or workflows change — ALL documentation must live in the docs/ folder (plus the top-level README.md), never scattered elsewhere.
---

## Description

Documentation for Intel-AI is centralized. Every documentation update must be
written into the `docs/` folder (or the root `README.md` for the high-level
overview / quick start). Do not create ad-hoc markdown files elsewhere in the
repository for documentation purposes. This keeps a single source of truth that
the whole team can rely on.

## Instructions

1. Decide the target file in `docs/`:
   - `docs/architecture.md` — system design, data flow, cross-cutting changes.
   - `docs/backend.md` — backend structure, modules, config, database.
   - `docs/frontend.md` — frontend structure, features, API layer.
   - `docs/contributing.md` — branching, PRs, reviews, CI.
   - `docs/workflow.md` — developer commands and day-to-day flow.
   - `docs/index.md` — update the index if you add a new doc page.
   - Root `README.md` — only the high-level overview, quick start, and links.

2. Rules:
   - NEVER place documentation outside `docs/` (the only exceptions are
     `README.md` files that already exist at the repo/backend/frontend roots).
   - If a topic doesn't fit an existing page, add a new `docs/<topic>.md` AND
     link it from `docs/index.md`.
   - Keep docs in sync with code in the SAME pull request as the change.

3. When adding a module/feature, update the matching section:
   - new backend module → `docs/backend.md`
   - new frontend feature → `docs/frontend.md`
   - new command / make target → `docs/workflow.md` (and `Makefile` help text)

4. Style:
   - Short sections, fenced code blocks for commands, relative links between
     docs.
   - Prefer updating an existing section over appending duplicate content.

5. Before finishing, verify links resolve and that `docs/index.md` lists every
   page in `docs/`.
