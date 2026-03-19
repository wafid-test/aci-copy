#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Railway should build the app during deploy; keep boot focused on starting
# the HTTP server as early as possible.
if [ ! -f ./dist/server.js ]; then
  npm run build
fi

exec node ./dist/server.js
