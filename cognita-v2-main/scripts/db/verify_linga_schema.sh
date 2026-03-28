#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-${POSTGRES_URL:-}}}"
if [[ -z "$DB_URL" ]]; then
  echo "ERROR: DATABASE_URL (veya SUPABASE_DB_URL / POSTGRES_URL) tanimli degil."
  exit 1
fi

if command -v psql >/dev/null 2>&1; then
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f scripts/db/verify_linga_schema.sql
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  docker run --rm -i postgres:16-alpine \
    psql "$DB_URL" -v ON_ERROR_STOP=1 -f - < scripts/db/verify_linga_schema.sql
  exit 0
fi

echo "ERROR: ne psql ne docker bulundu."
exit 1
