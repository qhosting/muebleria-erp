#!/bin/sh
set -e

echo "=========================================="
echo "  MUEBLERIA LA ECONOMICA - STARTING UP"
echo "=========================================="
echo "Date: $(date)"
echo "PWD: $(pwd)"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: ${PORT:-3000}"
echo "HOSTNAME: ${HOSTNAME:-0.0.0.0}"
echo "DATABASE_URL set: $(if [ -n "$DATABASE_URL" ]; then echo YES; else echo NO; fi)"
echo "NEXTAUTH_URL: ${NEXTAUTH_URL:-NOT SET}"
echo "NEXTAUTH_SECRET set: $(if [ -n "$NEXTAUTH_SECRET" ]; then echo YES; else echo NO; fi)"
echo "=========================================="

# Configure PATH
export PATH="$PATH:/app/node_modules/.bin"

# Verify Node.js
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Verify Next.js build exists
echo ""
echo "--- Checking build ---"
if [ ! -f ".next/BUILD_ID" ]; then
    echo "ERROR: .next/BUILD_ID not found!"
    ls -la .next/ 2>/dev/null || echo "No .next directory!"
    echo "Listing /app:"
    ls -la /app/
    exit 1
fi
echo "Build ID: $(cat .next/BUILD_ID)"

# Verify next.config.js
if [ -f "next.config.js" ]; then
    echo "next.config.js: EXISTS"
else
    echo "WARNING: next.config.js not found"
fi

# Verify package.json
if [ -f "package.json" ]; then
    echo "package.json: EXISTS"
else
    echo "ERROR: package.json not found!"
    exit 1
fi

# Prisma - non-blocking
echo ""
echo "--- Prisma Setup ---"
PRISMA_CMD="node_modules/.bin/prisma"
if [ ! -f "$PRISMA_CMD" ]; then
    echo "Prisma CLI not at $PRISMA_CMD, trying npx..."
    PRISMA_CMD="npx prisma"
fi

if [ ! -f "node_modules/.prisma/client/index.js" ]; then
    echo "Generating Prisma client..."
    $PRISMA_CMD generate 2>&1 || echo "WARNING: Prisma generate failed"
else
    echo "Prisma client: EXISTS"
fi

echo "Pushing DB schema..."
$PRISMA_CMD db push --skip-generate 2>&1 || echo "WARNING: DB push failed (will retry on first request)"

# Start Next.js
echo ""
echo "=========================================="
echo "  STARTING NEXT.JS ON 0.0.0.0:${PORT:-3000}"
echo "=========================================="
exec node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}
