
#!/bin/bash

# Script para ejecutar seed en producción
# Uso: ./run-seed-production.sh

set -e

echo "🌱 SEED EN PRODUCCIÓN - MUEBLERÍA LA ECONÓMICA"
echo "=============================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "app/package.json" ]; then
    echo -e "${RED}❌ Error: Debes ejecutar este script desde el directorio raíz del proyecto${NC}"
    echo "   Directorio actual: $(pwd)"
    exit 1
fi

# Verificar que existe el archivo .env
if [ ! -f "app/.env" ]; then
    echo -e "${RED}❌ Error: No se encuentra el archivo app/.env${NC}"
    echo "   Debes configurar las variables de entorno primero"
    exit 1
fi

echo -e "${BLUE}📋 Verificando configuración...${NC}"
cd app

# Verificar DATABASE_URL
if ! grep -q "DATABASE_URL" .env; then
    echo -e "${RED}❌ Error: DATABASE_URL no está configurado en .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Variables de entorno encontradas${NC}"

# Opción 1: Intentar con npx tsx (recomendado)
echo ""
echo -e "${BLUE}🚀 Método 1: Usando npx tsx...${NC}"
if npx tsx --require dotenv/config scripts/seed.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Seed completado exitosamente con npx tsx${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  npx tsx falló, intentando método alternativo...${NC}"
fi

# Opción 2: Usar ts-node si está disponible
echo ""
echo -e "${BLUE}🚀 Método 2: Usando ts-node...${NC}"
if command -v ts-node &> /dev/null; then
    if ts-node --require dotenv/config scripts/seed.ts; then
        echo -e "${GREEN}✅ Seed completado exitosamente con ts-node${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  ts-node falló, intentando compilar a JavaScript...${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  ts-node no está instalado${NC}"
fi

# Opción 3: Instalar tsx temporalmente y ejecutar
echo ""
echo -e "${BLUE}🚀 Método 3: Instalando tsx temporalmente...${NC}"
if yarn add tsx --dev; then
    if npx tsx --require dotenv/config scripts/seed.ts; then
        echo -e "${GREEN}✅ Seed completado exitosamente${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${RED}❌ Error: No se pudo completar el seed${NC}"
echo -e "${YELLOW}💡 Soluciones alternativas:${NC}"
echo "   1. Ejecutar desde el contenedor: docker exec -it <container-name> sh"
echo "   2. Luego dentro del contenedor: npx tsx --require dotenv/config scripts/seed.ts"
echo "   3. O usar el script: ./run-seed-docker.sh <container-name>"
exit 1
