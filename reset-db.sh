#!/bin/sh
# Reset database and seed with initial data
# Run inside the container: sh reset-db.sh

set -e

echo "=========================================="
echo "  DATABASE RESET"
echo "=========================================="

cd /app
export PATH="$PATH:/app/node_modules/.bin"

echo ""
echo "WARNING: This will DELETE ALL DATA!"
echo "Resetting in 3 seconds..."
sleep 3

echo ""
echo "--- Step 1: Force reset database ---"
npx prisma db push --force-reset --accept-data-loss

echo ""
echo "--- Step 2: Seeding admin user ---"
npx tsx scripts/seed-admin.ts

echo ""
echo "=========================================="
echo "  DATABASE RESET COMPLETE"
echo "=========================================="
echo ""
echo "Admin credentials:"
echo "  Email:    admin@laeconomica.com"
echo "  Password: Admin123!"
echo ""
echo "To load full demo data, run:"
echo "  npx tsx scripts/seed.ts"
echo ""
