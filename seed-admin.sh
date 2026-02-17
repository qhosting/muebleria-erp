
#!/bin/bash

echo "🌱 Ejecutando seed de usuario admin..."
echo "========================================"
echo ""

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está configurado"
    exit 1
fi

echo "✅ DATABASE_URL configurado"
echo ""

# Navegar al directorio de la app
cd /app || cd app || {
    echo "❌ No se puede acceder al directorio de la app"
    exit 1
}

# Ejecutar seed
echo "🔨 Ejecutando seed..."

# Intentar primero con la versión JavaScript (más confiable)
if [ -f "scripts/seed-admin.js" ]; then
    echo "📄 Usando versión JavaScript compilada..."
    node scripts/seed-admin.js
elif command -v tsx >/dev/null 2>&1; then
    echo "📄 Usando tsx para ejecutar TypeScript..."
    npx tsx scripts/seed-admin.ts
else
    echo "📄 Usando ts-node para ejecutar TypeScript..."
    npx ts-node scripts/seed-admin.ts
fi

echo ""
echo "========================================"
echo "✅ Seed completado"
echo "========================================"
