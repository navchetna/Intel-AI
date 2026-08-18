#!/usr/bin/env bash
# Restore an Intel-AI Postgres dump (from db_dump.sh) into a new deployment.
#
# Usage:
#   backend/scripts/db_restore.sh path/to/intel-ai-YYYYMMDD-HHMMSS.dump
#
# Prerequisites on the target machine:
#   - Docker, with the project's `db` service already up: `docker compose up -d db`
#     (or `make dev-db`). This script restores INTO that running container —
#     no local Postgres client tools needed.
#
# Env overrides (defaults match docker-compose.yml / Makefile):
#   DB_CONTAINER   docker container running Postgres      (default: intel-ai-db-1)
#   POSTGRES_USER  db user                                (default: intelai)
#   POSTGRES_DB    db name                                (default: intelai)
#
# If your container has a different name (docker-compose names it
# `<project-dir>-db-1` by default), find it with `docker ps` and pass e.g.
#   DB_CONTAINER=myproject-db-1 backend/scripts/db_restore.sh dump.dump
#
# This DROPS AND RECREATES every object in the dump (pg_restore --clean
# --if-exists) — safe to run against a fresh DB or one seeded by Alembic
# (`make migrate`), but it will overwrite any existing data in this database.

set -euo pipefail

DUMP_FILE="${1:?usage: db_restore.sh path/to/dump-file}"
DB_CONTAINER="${DB_CONTAINER:-intel-ai-db-1}"
POSTGRES_USER="${POSTGRES_USER:-intelai}"
POSTGRES_DB="${POSTGRES_DB:-intelai}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "error: dump file not found: $DUMP_FILE" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "error: container '$DB_CONTAINER' is not running." >&2
  echo "  Start it first: docker compose up -d db   (or: make dev-db)" >&2
  echo "  Then find its real name with: docker ps" >&2
  echo "  and re-run with: DB_CONTAINER=<name> $0 $DUMP_FILE" >&2
  exit 1
fi

echo "Restoring $DUMP_FILE -> $POSTGRES_DB on $DB_CONTAINER ..."
echo "(this overwrites any existing data in that database)"

docker exec -i "$DB_CONTAINER" pg_restore \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner --no-privileges \
  < "$DUMP_FILE"

echo "Restore complete."
echo
echo "Next steps:"
echo "  1. Bring the schema up to date with this codebase's migrations (the"
echo "     dump may predate newer ones):"
echo "       cd backend && DB_PORT=<published-port> uv run alembic upgrade head"
echo "  2. app_settings was restored schema-only (no secrets in the dump) —"
echo "     set a GROQ API key for AI-Suggested-Flow from the app's Navbar"
echo "     settings gear if this deployment needs it."
