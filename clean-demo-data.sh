#!/bin/bash

# ============================================
# SCRIPT DE LIMPIEZA DE DATOS DEMO
# VertexERP Muebles
# ============================================

set -e

echo "🧹 LIMPIEZA DE DATOS DEMO - VertexERP Muebles"
echo "=================================================="
echo ""
echo "⚠️  ADVERTENCIA: Este script eliminará TODOS los datos demo"
echo "    Solo se mantendrá el usuario admin"
echo ""
echo "📊 Datos que serán eliminados:"
echo "   - Todos los clientes"
echo "   - Todos los productos"
echo "   - Todos los proveedores"
echo "   - Todas las ventas"
echo "   - Todos los abonos"
echo "   - Todos los pagos"
echo "   - Todos los gastos"
echo "   - Usuarios (excepto admin@admin.com)"
echo ""

# Verificar que DATABASE_URL esté configurada
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está configurada"
    echo "💡 Por favor, configura la variable de entorno DATABASE_URL"
    echo ""
    echo "Ejemplo:"
    echo "export DATABASE_URL='postgresql://user:password@host:5432/database'"
    exit 1
fi

echo "✅ DATABASE_URL configurada"
echo ""

# Mostrar confirmación
read -p "¿Estás seguro de que quieres continuar? (escribe 'SI' para confirmar): " confirmacion

if [ "$confirmacion" != "SI" ]; then
    echo "❌ Operación cancelada"
    exit 0
fi

echo ""
echo "🔄 Ejecutando limpieza de datos..."
echo ""

# Ejecutar el script SQL
if command -v psql &> /dev/null; then
    # Si psql está disponible, usarlo directamente
    psql "$DATABASE_URL" -f clean-demo-data.sql
else
    # Si no hay psql, usar npx prisma db execute
    echo "📦 Usando Prisma para ejecutar el script..."
    npx prisma db execute --file clean-demo-data.sql --schema app/prisma/schema.prisma
fi

echo ""
echo "✅ ¡Limpieza completada exitosamente!"
echo ""
echo "📊 Resumen:"
echo "   - Todos los datos demo han sido eliminados"
echo "   - Usuario admin mantenido: admin@admin.com"
echo "   - La base de datos está lista para datos de producción"
echo ""
echo "🎯 Próximos pasos:"
echo "   1. Inicia sesión con el usuario admin"
echo "   2. Crea tus datos reales de producción"
echo "   3. Los datos serán persistentes en todos los deploys"
echo ""

