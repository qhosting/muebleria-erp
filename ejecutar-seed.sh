
#!/bin/bash

# ============================================
# SCRIPT PARA EJECUTAR SEED EN PRODUCCIÓN
# ============================================

echo "🌱 Script de Seed para Mueblería La Económica"
echo "=============================================="
echo ""

# Detectar el nombre del contenedor
CONTAINER_NAME=$(docker ps --filter "name=muebleria" --format "{{.Names}}" | head -1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ No se encontró ningún contenedor de Mueblería corriendo"
    echo "💡 Verifica que el contenedor esté activo con: docker ps"
    exit 1
fi

echo "📦 Contenedor encontrado: $CONTAINER_NAME"
echo ""

# Preguntar si quiere hacer backup
read -p "💾 ¿Deseas hacer un backup de la base de datos antes? (s/n): " BACKUP

if [ "$BACKUP" = "s" ]; then
    echo ""
    echo "💾 Creando backup..."
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # Buscar contenedor de PostgreSQL
    POSTGRES_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -1)
    
    if [ -z "$POSTGRES_CONTAINER" ]; then
        echo "⚠️  No se encontró contenedor de PostgreSQL"
        echo "💡 Continuando sin backup..."
    else
        docker exec $POSTGRES_CONTAINER pg_dump -U postgres -d muebleria_db > "$BACKUP_FILE"
        echo "✅ Backup creado: $BACKUP_FILE"
    fi
    echo ""
fi

# Advertencia sobre limpieza de datos
echo "⚠️  ADVERTENCIA ⚠️"
echo "El seed eliminará TODOS los datos existentes y creará:"
echo "  - 4 usuarios base"
echo "  - 200 clientes de demostración"
echo "  - ~50 pagos de ejemplo"
echo "  - 10 rutas de cobranza"
echo "  - 2 plantillas de ticket"
echo ""
read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo "❌ Operación cancelada"
    exit 0
fi

echo ""
echo "🚀 Ejecutando seed..."
echo "=============================================="
echo ""

# Método 1: Intentar con npx tsx
echo "📝 Intentando Método 1: npx tsx..."
docker exec $CONTAINER_NAME sh -c "cd /app/app && npx tsx --require dotenv/config scripts/seed.ts" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "✅ Seed ejecutado exitosamente con npx tsx"
    echo ""
    echo "🔑 Credenciales de acceso:"
    echo "   👑 Admin:    admin@vertexerp.local / admin123"
    echo "   👤 Gestor:   gestor@vertexerp.local / gestor123"
    echo "   🚚 Cobrador: cobrador@vertexerp.local / cobrador123"
    echo "   📊 Reportes: reportes@vertexerp.local / reportes123"
    echo ""
    echo "🌐 Accede al sistema en: https://app.mueblerialaeconomica.com"
    echo "=============================================="
    exit 0
fi

# Método 2: Instalar tsx temporalmente
echo ""
echo "⚠️  Método 1 falló, intentando Método 2: Instalar tsx temporalmente..."
echo ""

docker exec $CONTAINER_NAME sh -c "cd /app/app && npm install tsx && npx tsx --require dotenv/config scripts/seed.ts" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "✅ Seed ejecutado exitosamente después de instalar tsx"
    echo ""
    echo "🔑 Credenciales de acceso:"
    echo "   👑 Admin:    admin@vertexerp.local / admin123"
    echo "   👤 Gestor:   gestor@vertexerp.local / gestor123"
    echo "   🚚 Cobrador: cobrador@vertexerp.local / cobrador123"
    echo "   📊 Reportes: reportes@vertexerp.local / reportes123"
    echo ""
    echo "🌐 Accede al sistema en: https://app.mueblerialaeconomica.com"
    echo "=============================================="
    exit 0
fi

# Método 3: Usar ts-node
echo ""
echo "⚠️  Método 2 falló, intentando Método 3: ts-node..."
echo ""

docker exec $CONTAINER_NAME sh -c "cd /app/app && npx ts-node -r dotenv/config scripts/seed.ts" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "=============================================="
    echo "✅ Seed ejecutado exitosamente con ts-node"
    echo ""
    echo "🔑 Credenciales de acceso:"
    echo "   👑 Admin:    admin@vertexerp.local / admin123"
    echo "   👤 Gestor:   gestor@vertexerp.local / gestor123"
    echo "   🚚 Cobrador: cobrador@vertexerp.local / cobrador123"
    echo "   📊 Reportes: reportes@vertexerp.local / reportes123"
    echo ""
    echo "🌐 Accede al sistema en: https://app.mueblerialaeconomica.com"
    echo "=============================================="
    exit 0
fi

# Si todos los métodos fallan
echo ""
echo "=============================================="
echo "❌ Todos los métodos fallaron"
echo ""
echo "💡 Soluciones alternativas:"
echo ""
echo "1️⃣  Ejecutar manualmente dentro del contenedor:"
echo "   docker exec -it $CONTAINER_NAME sh"
echo "   cd /app/app"
echo "   npm install tsx"
echo "   npx tsx --require dotenv/config scripts/seed.ts"
echo ""
echo "2️⃣  Ejecutar desde el host (requiere Node.js):"
echo "   cd /home/ubuntu/muebleria_la_economica/app"
echo "   export DATABASE_URL='tu_connection_string'"
echo "   npm install"
echo "   npm run seed"
echo ""
echo "3️⃣  Revisar logs para más detalles:"
echo "   docker logs $CONTAINER_NAME"
echo ""
echo "📚 Documentación completa en:"
echo "   /home/ubuntu/muebleria_la_economica/SOLUCION-ERROR-SEED.md"
echo "=============================================="
exit 1

