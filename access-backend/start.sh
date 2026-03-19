#!/usr/bin/env bash
set -e

echo "Starting access-backend boot sequence..."

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  if [ -f "package-lock.json" ]; then
    npm ci
  else
    npm install
  fi
fi

echo "Generating Prisma client..."
npm run prisma:generate

if [ -d "./prisma/migrations" ]; then
  echo "Running Prisma migrations (deploy)..."
  npm run prisma:deploy
else
  echo "No prisma/migrations directory found. Skipping migrate deploy."
fi

if [ "${BOOTSTRAP_ADMIN:-false}" = "true" ]; then
  echo "Bootstrapping default admin..."
  npm run bootstrap:admin
fi

if [ ! -f "./dist/server.js" ]; then
  echo "Build output missing. Building TypeScript..."
  npm run build
fi

echo "Launching access-backend..."
exec node ./dist/server.js
