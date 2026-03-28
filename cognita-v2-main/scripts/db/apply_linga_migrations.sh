#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

DB_URL="${DATABASE_URL:-${SUPABASE_DB_URL:-${POSTGRES_URL:-}}}"
if [[ -z "$DB_URL" ]]; then
  echo "ERROR: DATABASE_URL (veya SUPABASE_DB_URL / POSTGRES_URL) tanimli degil."
  exit 1
fi

run_sql_file() {
  local sql_file="$1"
  echo "Applying: $sql_file"

  if command -v psql >/dev/null 2>&1; then
    PGPASSWORD="${PGPASSWORD:-}" psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$sql_file"
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    docker run --rm -i postgres:16-alpine \
      psql "$DB_URL" -v ON_ERROR_STOP=1 -f - < "$sql_file"
    return
  fi

  echo "ERROR: ne psql ne docker bulundu."
  exit 1
}

run_sql_file "supabase/v5_features_migration.sql"
run_sql_file "supabase/linga_reader_migration.sql"

echo "DONE: Linga migrationlari uygulandi."
