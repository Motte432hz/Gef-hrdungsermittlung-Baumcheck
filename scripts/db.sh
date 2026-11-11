#!/usr/bin/env bash
# Runs SQL against the Supabase project through the management API.
#   scripts/db.sh migrate            – applies all files in supabase/migrations not yet applied
#   scripts/db.sh test               – runs supabase/tests/*.sql (in transactions, rolled back)
#   scripts/db.sh query "select 1"   – runs one query
# Needs a Supabase personal access token in SUPABASE_ACCESS_TOKEN (in the cloud dev environment
# the network proxy adds it automatically, then any placeholder value works).
set -euo pipefail
cd "$(dirname "$0")/.."
REF="${SUPABASE_PROJECT_REF:-fjrhcvgiyivanikgazyk}"
TOKEN="${SUPABASE_ACCESS_TOKEN:-proxy-injected}"

run_sql() {
  local body status
  body=$(python3 -c 'import json,sys; print(json.dumps({"query": sys.stdin.read()}))')
  status=$(curl -sS -o /tmp/db-sh-out.json -w '%{http_code}' -X POST \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    "https://api.supabase.com/v1/projects/$REF/database/query" --data-binary "$body")
  if [[ "$status" != 2* ]]; then
    echo "HTTP $status: $(cat /tmp/db-sh-out.json)" >&2
    return 1
  fi
  cat /tmp/db-sh-out.json
  echo
}

case "${1:-}" in
  query) printf '%s' "$2" | run_sql ;;
  migrate)
    printf '%s' "create schema if not exists app; create table if not exists app.migrations (name text primary key, applied_at timestamptz not null default now());" | run_sql >/dev/null
    applied=$(printf '%s' "select coalesce(json_agg(name), '[]') as names from app.migrations" | run_sql)
    for f in supabase/migrations/*.sql; do
      name=$(basename "$f")
      if python3 -c "import json,sys; sys.exit(0 if '$name' in json.loads(sys.argv[1])[0]['names'] else 1)" "$applied"; then
        echo "= $name (already applied)"
        continue
      fi
      { echo 'begin;'; cat "$f"; echo; echo "insert into app.migrations (name) values ('$name');"; echo 'commit;'; } | run_sql >/dev/null
      echo "+ $name"
    done
    ;;
  test)
    for f in supabase/tests/*.sql; do
      echo "== $(basename "$f")"
      run_sql < "$f"
    done
    ;;
  *) echo "usage: $0 migrate|test|query <sql>" >&2; exit 2 ;;
esac
