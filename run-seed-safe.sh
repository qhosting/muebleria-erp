
#!/bin/bash

# ================================
# EJECUTAR SEED SEGURO
# Solo inserta datos si no existen
# ================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  SEED SEGURO - PRODUCCIÓN${NC}"
echo -e "${BLUE}================================${NC}"

# Verificar si estamos en el contenedor o en el host
if [ -f "/.dockerenv" ]; then
    # Estamos dentro del contenedor
    echo -e "${YELLOW}📦 Ejecutando desde contenedor...${NC}"
    cd /app
    npx tsx /app/scripts/seed-safe.ts
else
    # Estamos en el host
    echo -e "${YELLOW}📦 Ejecutando desde docker compose...${NC}"
    
    # Verificar que el contenedor app esté corriendo
    if ! docker compose ps app | grep -q "Up"; then
        echo -e "${RED}❌ El contenedor app no está corriendo${NC}"
        echo -e "${YELLOW}   Ejecuta: docker compose up -d${NC}"
        exit 1
    fi
    
    # Ejecutar el seed dentro del contenedor
    docker compose exec app sh -c "cd /app && npx tsx scripts/seed-safe.ts"
fi

echo -e "${GREEN}✅ Seed completado${NC}"
echo -e "${BLUE}================================${NC}"
