
#!/bin/bash

# Script para ejecutar seed dentro de un contenedor Docker
# Uso: ./run-seed-docker.sh [nombre-del-contenedor]

set -e

echo "🐳 SEED EN CONTENEDOR DOCKER"
echo "============================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Obtener nombre del contenedor
CONTAINER_NAME=$1

if [ -z "$CONTAINER_NAME" ]; then
    echo -e "${YELLOW}📦 Buscando contenedores de la aplicación...${NC}"
    echo ""
    
    # Buscar contenedores que contengan "muebleria" o "economica"
    CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep -i "muebleria\|economica" || true)
    
    if [ -z "$CONTAINERS" ]; then
        echo -e "${RED}❌ No se encontraron contenedores en ejecución${NC}"
        echo ""
        echo "Contenedores disponibles:"
        docker ps --format "table {{.Names}}\t{{.Status}}"
        echo ""
        echo -e "${YELLOW}Uso:${NC} ./run-seed-docker.sh <nombre-del-contenedor>"
        exit 1
    fi
    
    echo "Contenedores encontrados:"
    echo "$CONTAINERS"
    echo ""
    
    # Si hay solo uno, usarlo automáticamente
    CONTAINER_COUNT=$(echo "$CONTAINERS" | wc -l)
    if [ "$CONTAINER_COUNT" -eq 2 ]; then  # 2 porque incluye el header
        CONTAINER_NAME=$(echo "$CONTAINERS" | tail -n 1 | awk '{print $1}')
        echo -e "${GREEN}✓ Usando contenedor: $CONTAINER_NAME${NC}"
    else
        echo -e "${YELLOW}Múltiples contenedores encontrados. Por favor especifica uno:${NC}"
        echo -e "${YELLOW}Uso:${NC} ./run-seed-docker.sh <nombre-del-contenedor>"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}🔍 Verificando contenedor: $CONTAINER_NAME${NC}"

# Verificar que el contenedor existe y está corriendo
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ Error: El contenedor '$CONTAINER_NAME' no está en ejecución${NC}"
    echo ""
    echo "Contenedores disponibles:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    exit 1
fi

echo -e "${GREEN}✓ Contenedor encontrado y en ejecución${NC}"

# Verificar que el contenedor tiene el directorio correcto
echo ""
echo -e "${BLUE}📂 Verificando estructura del contenedor...${NC}"
if ! docker exec "$CONTAINER_NAME" test -f "scripts/seed.ts" 2>/dev/null; then
    echo -e "${RED}❌ Error: No se encuentra scripts/seed.ts en el contenedor${NC}"
    echo "   El contenedor puede no tener la aplicación correctamente instalada"
    exit 1
fi

echo -e "${GREEN}✓ Estructura de archivos correcta${NC}"

# Ejecutar el seed
echo ""
echo -e "${BLUE}🌱 Ejecutando seed en el contenedor...${NC}"
echo "================================================"

# Intentar con npx tsx primero
if docker exec "$CONTAINER_NAME" npx tsx --require dotenv/config scripts/seed.ts 2>/dev/null; then
    echo ""
    echo -e "${GREEN}✅ ¡Seed completado exitosamente!${NC}"
    echo ""
    echo -e "${BLUE}📊 Usuarios creados:${NC}"
    echo "   - admin@economica.local (admin123)"
    echo "   - gestor@economica.local (gestor123)"
    echo "   - cobrador@economica.local (cobrador123)"
    echo "   - reportes@economica.local (reportes123)"
    exit 0
fi

# Si falla, intentar con yarn prisma db seed
echo ""
echo -e "${YELLOW}⚠️  Método 1 falló, intentando con Prisma seed...${NC}"
if docker exec "$CONTAINER_NAME" sh -c "cd /app && yarn prisma db seed" 2>/dev/null; then
    echo ""
    echo -e "${GREEN}✅ ¡Seed completado exitosamente!${NC}"
    exit 0
fi

# Si todo falla, mostrar error y sugerencias
echo ""
echo -e "${RED}❌ Error: No se pudo ejecutar el seed${NC}"
echo ""
echo -e "${YELLOW}💡 Soluciones alternativas:${NC}"
echo "   1. Acceder al contenedor:"
echo "      docker exec -it $CONTAINER_NAME sh"
echo ""
echo "   2. Dentro del contenedor, ejecutar:"
echo "      npx tsx --require dotenv/config scripts/seed.ts"
echo ""
echo "   3. O revisar los logs del contenedor:"
echo "      docker logs $CONTAINER_NAME"
exit 1
