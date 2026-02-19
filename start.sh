#!/bin/sh

echo "🚀 Iniciando MUEBLERIA LA ECONOMICA..."
echo "   📂 Working directory: $(pwd)"
echo "   🌐 Hostname: ${HOSTNAME:-0.0.0.0}"
echo "   🔌 Port: ${PORT:-3000}"

# Configure PATH to include node_modules/.bin for Prisma CLI
export PATH="$PATH:/app/node_modules/.bin"

# Verify Next.js build exists
if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ ERROR: .next/BUILD_ID not found! Build may have failed."
    ls -la .next/ 2>/dev/null || echo "No .next directory found!"
    exit 1
fi

echo "✅ Build ID: $(cat .next/BUILD_ID)"

# Try Prisma operations but don't fail if DB is not ready
echo "📊 Attempting database sync..."

PRISMA_CMD="node_modules/.bin/prisma"
if [ ! -f "$PRISMA_CMD" ]; then
    PRISMA_CMD="npx prisma"
fi

# Generate Prisma client if missing
if [ ! -f "node_modules/.prisma/client/index.js" ]; then
    echo "⚙️ Generating Prisma client..."
    $PRISMA_CMD generate 2>&1 || echo "⚠️ Prisma generate failed, continuing..."
fi

# Sync schema - non-blocking
$PRISMA_CMD db push --skip-generate 2>&1 || echo "⚠️ DB push failed (DB might not be ready yet), continuing..."

echo ""
echo "🚀 Starting Next.js server..."
exec npx next start -H 0.0.0.0 -p ${PORT:-3000}
