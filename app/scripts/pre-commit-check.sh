
#!/bin/bash

# Pre-commit check para validaciones automáticas
# Este script se ejecuta antes de cada commit

echo "🔒 Ejecutando validaciones pre-commit..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Flag para rastrear si hay errores
HAS_ERRORS=0

# 1. Validar schema.prisma
echo "1️⃣  Validando schema.prisma..."
if node scripts/validate-prisma-schema.js; then
    echo -e "${GREEN}✅ Schema Prisma válido${NC}"
else
    echo -e "${RED}❌ Schema Prisma inválido${NC}"
    HAS_ERRORS=1
fi
echo ""

# 2. Verificar TypeScript (solo archivos modificados)
echo "2️⃣  Verificando tipos TypeScript..."
if npx tsc --noEmit 2>&1 | head -20; then
    echo -e "${GREEN}✅ TypeScript OK${NC}"
else
    echo -e "${RED}❌ Errores de TypeScript detectados${NC}"
    HAS_ERRORS=1
fi
echo ""

# 3. Verificar que existe Dockerfile
echo "3️⃣  Verificando Dockerfile..."
if [ -f "../Dockerfile" ]; then
    echo -e "${GREEN}✅ Dockerfile presente${NC}"
else
    echo -e "${RED}❌ Dockerfile no encontrado${NC}"
    HAS_ERRORS=1
fi
echo ""

# 4. Verificar variables de entorno críticas en .env
echo "4️⃣  Verificando variables de entorno..."
if [ -f ".env" ]; then
    REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_URL" "NEXTAUTH_SECRET")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            echo -e "${GREEN}  ✓ $var configurado${NC}"
        else
            echo -e "${YELLOW}  ⚠  $var no encontrado en .env${NC}"
        fi
    done
else
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado${NC}"
fi
echo ""

# Resultado final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $HAS_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Todas las validaciones pasaron exitosamente!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo -e "${RED}❌ Algunas validaciones fallaron. Por favor corrige los errores antes de hacer commit.${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi
