#!/usr/bin/env bash
# Dump the Intel-AI Postgres database to a single portable file, for seeding a
# new deployment via db_restore.sh.
#
# Usage:
#   backend/scripts/db_dump.sh [output-file]
#
# Env overrides (defaults match docker-compose.yml / Makefile):
#   DB_CONTAINER   docker container running Postgres      (default: intel-ai-db-1)
#   POSTGRES_USER  db user                                (default: intelai)
#   POSTGRES_DB    db name                                (default: intelai)
#
# The dump is taken with `pg_dump -Fc` (custom format: compressed, and the
# only format pg_restore can do selective/parallel restores from).
#
# app_settings is schema-only in the dump (--exclude-table-data) so a
# plaintext secret (the GROQ API key, if one has been configured) never ends
# up in a file you might hand to a teammate or another environment. The new
# deployment starts with no key configured and picks its own via Settings.

set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-intel-ai-db-1}"
POSTGRES_USER="${POSTGRES_USER:-intelai}"
POSTGRES_DB="${POSTGRES_DB:-intelai}"

OUT="${1:-intel-ai-$(date +%Y%m%d-%H%M%S).dump}"

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "error: container '$DB_CONTAINER' is not running (docker ps to check; override with DB_CONTAINER=...)" >&2
  exit 1
fi

echo "Dumping $POSTGRES_DB from $DB_CONTAINER -> $OUT ..."
docker exec "$DB_CONTAINER" pg_dump \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -Fc \
  --exclude-table-data=app_settings \
  > "$OUT"

echo "Done: $(du -h "$OUT" | cut -f1) written to $OUT"
echo "Share this file + backend/scripts/db_restore.sh to seed a new deployment."
