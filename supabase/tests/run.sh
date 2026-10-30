#!/usr/bin/env bash
# LOCAL TESTING ONLY: applies migrations to a throw-away Postgres DB and runs behavioural SQL tests.
# Usage (as a user that can run psql as postgres):  bash supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL="psql -X -q -t -A -v ON_ERROR_STOP=1"
su postgres -c "psql -X -q -c 'drop database if exists ngtest' -c 'create database ngtest'" 2>/dev/null
for f in tests/00_stub_supabase.sql migrations/0001_schema.sql migrations/0002_functions_triggers.sql migrations/0003_rls_and_grants.sql migrations/0004_storage.sql tests/01_behaviour.sql; do
  su postgres -c "$PSQL -d ngtest -f $PWD/$f" 2>&1 | grep -v '^$' | grep -E 'ERROR|FAIL|PASSED|^[a-z_.]+\|[0-9]+$|^[a-z_]+$' || true
done
