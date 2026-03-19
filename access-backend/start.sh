#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Railway should build the app during deploy; keep boot focused on starting
# the HTTP server as early as possible.
if [ ! -f ./dist/server.js ]; then
  npm run build
fi

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Running Prisma migrations (best effort)..."
  if ! npm run prisma:deploy; then
    echo "Warning: prisma migrate deploy failed; continuing startup."
  fi

  echo "Ensuring default admin account exists (best effort)..."
  if ! node ./dist/scripts/bootstrap-admin.js; then
    echo "Warning: default admin bootstrap failed; continuing startup."
  fi
else
  echo "DATABASE_URL is not set; skipping Prisma deploy and admin bootstrap."
fi

exec node ./dist/server.js
