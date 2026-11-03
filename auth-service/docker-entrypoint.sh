#!/bin/sh
set -e

echo "🔄 Checking database connection and synchronizing Prisma schema..."
npx prisma db push --accept-data-loss || {
  echo "⚠️ Warning: Failed to push schema directly to DB. Attempting migration deploy..."
  npx prisma migrate deploy || true
}

echo "🚀 Starting Auth Microservice..."
exec "$@"
