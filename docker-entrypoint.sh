#!/bin/sh
set -e

echo "=========================================="
echo "🚀 Initializing VELOUR eCommerce Container"
echo "=========================================="

# ─── DATABASE MIGRATION STRATEGY ─────────────────────────────────────────────
# 1. On a fresh DB (first deploy): prisma migrate deploy creates all tables cleanly.
# 2. On an existing DB with migrations history: migrate deploy applies any new migrations.
# 3. On an existing DB without migration history (legacy db push setup): fall back to
#    db push with NO accept-data-loss flag — schema sync only, never drops data.
# ─────────────────────────────────────────────────────────────────────────────

echo "🔄 Synchronizing database schema..."

if npx prisma migrate deploy 2>&1; then
  echo "✅ Prisma migrate deploy succeeded."
else
  echo "⚠️  migrate deploy encountered an issue (likely a baseline-less existing DB)."
  echo "🔄 Falling back to safe schema sync (prisma db push — NO data loss flag)..."
  npx prisma db push --skip-generate
  echo "✅ Schema sync complete."
fi

# ─── CONDITIONAL SEED ────────────────────────────────────────────────────────
# Only seed if the database is completely empty (zero users).
# This preserves all real admin registrations, customer accounts, and orders
# across every docker compose up --build.
# ─────────────────────────────────────────────────────────────────────────────

if [ "$AUTO_SEED" = "true" ]; then
  echo "🔍 Checking if database needs initial seed..."

  USER_COUNT=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.count()
      .then(count => { process.stdout.write(String(count)); return prisma.\$disconnect(); })
      .catch(() => { process.stdout.write('0'); });
  " 2>/dev/null || echo "0")

  if [ "$USER_COUNT" = "0" ]; then
    echo "🌱 Empty database detected — running initial seed..."
    if [ -f "dist/prisma/seed.js" ]; then
      node dist/prisma/seed.js || echo "⚠️  Seeding completed with warnings."
    elif [ -f "dist/seed.js" ]; then
      node dist/seed.js || echo "⚠️  Seeding completed with warnings."
    else
      echo "⚠️  Seed file not found in dist, skipping."
    fi
  else
    echo "✅ Database already has $USER_COUNT user(s) — skipping seed to preserve data."
  fi
fi

echo "✨ Initialization complete. Starting NestJS application..."
echo "=========================================="

exec "$@"
