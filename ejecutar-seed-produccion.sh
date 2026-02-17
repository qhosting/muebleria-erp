
#!/bin/bash

echo "🌱 Ejecutando seed en base de datos de producción..."
echo ""
echo "⚠️  IMPORTANTE: Este script creará los usuarios en la base de datos."
echo ""

# Verificar que existe el archivo .env
if [ ! -f "app/.env" ]; then
    echo "❌ Error: No se encontró el archivo .env"
    echo "Por favor crea el archivo app/.env con tu DATABASE_URL"
    exit 1
fi

# Mostrar la conexión (sin password)
echo "📊 Verificando conexión a la base de datos..."
cd app

# Verificar que Prisma puede conectarse
echo "🔍 Verificando Prisma Client..."
npx prisma --version

echo ""
echo "🔄 Ejecutando migraciones (si es necesario)..."
npx prisma migrate deploy

echo ""
echo "🌱 Ejecutando seed para crear usuarios..."
npx tsx scripts/seed.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Seed ejecutado exitosamente!"
    echo ""
    echo "👤 Usuarios creados:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📧 Email: admin@economica.local"
    echo "🔑 Password: admin123"
    echo "👔 Rol: admin"
    echo ""
    echo "📧 Email: gestor@economica.local"
    echo "🔑 Password: gestor123"
    echo "👔 Rol: gestor_cobranza"
    echo ""
    echo "📧 Email: cobrador@economica.local"
    echo "🔑 Password: cobrador123"
    echo "👔 Rol: cobrador"
    echo ""
    echo "📧 Email: reportes@economica.local"
    echo "🔑 Password: reportes123"
    echo "👔 Rol: reporte_cobranza"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Ahora puedes iniciar sesión en:"
    echo "https://app.mueblerialaeconomica.com/login"
else
    echo ""
    echo "❌ Error al ejecutar el seed"
    echo "Por favor revisa los logs arriba para más detalles"
    exit 1
fi
