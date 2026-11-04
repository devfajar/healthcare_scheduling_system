#!/bin/sh
set -e

echo "🔄 Checking database connection and synchronizing Prisma schema for Auth Service..."
npx prisma db push --skip-generate || {
  echo "⚠️ Warning: Failed to push schema directly to DB. Attempting migration deploy..."
  npx prisma migrate deploy || true
}

echo "🚀 Starting Auth Microservice..."
exec "$@"
