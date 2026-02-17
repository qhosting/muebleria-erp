#!/bin/bash
# Pre-deploy check - Validación completa antes de push/deploy
# Basado en 18 errores resueltos documentados en ERRORES-DEPLOY-RESUELTOS.md

set -e
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
print_ok() { echo -e "${GREEN}✓${NC} $1"; }
print_err() { echo -e "${RED}✗${NC} $1"; }
print_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

echo "🔍 Pre-deploy check (18 validaciones)..."
ERRORS=0
WARNINGS=0

# ============================================================
# VALIDACIONES DE DEPENDENCIAS Y LOCK FILES
# ============================================================

# 1. package-lock.json debe existir y no ser symlink (#13)
if [ -L "app/package-lock.json" ]; then
    print_err "package-lock.json es un symlink (Error #13)"
    ERRORS=$((ERRORS + 1))
elif [ ! -f "app/package-lock.json" ]; then
    print_err "package-lock.json no existe (#12, #13)"
    ERRORS=$((ERRORS + 1))
else
    SIZE=$(du -h app/package-lock.json | cut -f1)
    print_ok "package-lock.json existe ($SIZE)"
fi

# 2. NO debe existir yarn.lock (#12, #13, #14) - WARNING only
if [ -f "app/yarn.lock" ]; then
    print_warn "yarn.lock existe (ignorado en Docker) - ejecuta cleanup-legacy-files.sh"
    WARNINGS=$((WARNINGS + 1))
else
    print_ok "yarn.lock no existe (npm mode)"
fi

# 3. NO debe existir .yarn/ directory (#15) - WARNING only
if [ -d "app/.yarn" ]; then
    print_warn ".yarn/ directory existe (ignorado en Docker) - ejecuta cleanup-legacy-files.sh"
    WARNINGS=$((WARNINGS + 1))
else
    print_ok ".yarn/ no existe"
fi

# ============================================================
# VALIDACIONES DE PRISMA
# ============================================================

# 4. Prisma schema debe existir
if [ ! -f "app/prisma/schema.prisma" ]; then
    print_err "app/prisma/schema.prisma no existe"
    ERRORS=$((ERRORS + 1))
else
    ENUMS=$(grep -c "^enum " app/prisma/schema.prisma || echo 0)
    print_ok "Prisma schema OK ($ENUMS enums)"
fi

# 5. Prisma schema NO debe tener output hardcodeado (#18)
if grep -q "output.*=.*home/ubuntu" app/prisma/schema.prisma 2>/dev/null; then
    print_err "Prisma schema tiene output hardcodeado (#18)"
    ERRORS=$((ERRORS + 1))
else
    print_ok "Prisma schema sin output hardcodeado"
fi

# 6. Verificar enums críticos en schema
REQUIRED_ENUMS=("UserRole" "StatusCuenta" "Periodicidad" "TipoPago")
for enum in "${REQUIRED_ENUMS[@]}"; do
    if ! grep -q "enum $enum" app/prisma/schema.prisma; then
        print_err "Enum '$enum' no encontrado en schema (#16, #17)"
        ERRORS=$((ERRORS + 1))
    fi
done
if [ $ERRORS -eq 0 ]; then
    print_ok "Todos los enums críticos presentes"
fi

# ============================================================
# VALIDACIONES DEL DOCKERFILE
# ============================================================

# 7. Alpine version debe ser 3.19 (#2, #3)
if grep -q "FROM node:.*alpine3.19" Dockerfile; then
    print_ok "Dockerfile usa Alpine 3.19"
elif grep -q "FROM node:.*alpine3.21" Dockerfile; then
    print_err "Dockerfile usa Alpine 3.21 (repositorios rotos) (#2, #3)"
    ERRORS=$((ERRORS + 1))
else
    print_warn "Alpine version desconocida - verificar manualmente"
    WARNINGS=$((WARNINGS + 1))
fi

# 8. Dockerfile debe usar npm ci (no yarn) (#12, #13, #14)
if grep -q "npm ci" Dockerfile; then
    print_ok "Dockerfile usa npm ci"
else
    print_err "Dockerfile debe usar npm ci (#12, #13, #14)"
    ERRORS=$((ERRORS + 1))
fi

# 9. Dockerfile NO debe instalar yarn globalmente (#11)
if grep -q "npm install -g yarn" Dockerfile || grep -q "apk add.*yarn" Dockerfile; then
    print_err "Dockerfile intenta instalar yarn globalmente (#11)"
    ERRORS=$((ERRORS + 1))
else
    print_ok "Dockerfile no instala yarn globalmente"
fi

# 10. Dockerfile NO debe copiar .yarn/ (#15)
if grep -q "COPY.*\.yarn" Dockerfile; then
    print_err "Dockerfile copia .yarn/ directory (#15)"
    ERRORS=$((ERRORS + 1))
else
    print_ok "Dockerfile no copia .yarn/"
fi

# 11. Dockerfile debe copiar package.json al builder stage (#16)
if grep -A20 "FROM.*AS builder" Dockerfile | grep -q "COPY.*package.json"; then
    print_ok "Dockerfile copia package.json al builder"
else
    print_err "Dockerfile no copia package.json al builder (#16)"
    ERRORS=$((ERRORS + 1))
fi

# 12. Dockerfile debe limpiar prisma client antes de regenerar (#17)
if grep -q "rm -rf node_modules/\.prisma" Dockerfile; then
    print_ok "Dockerfile limpia prisma client antes de regenerar"
else
    print_warn "Dockerfile no limpia prisma client - puede causar problemas (#17)"
    WARNINGS=$((WARNINGS + 1))
fi

# ============================================================
# VALIDACIONES DE ARCHIVOS CRÍTICOS
# ============================================================

# 13. next.config.js debe existir
if [ ! -f "app/next.config.js" ]; then
    print_err "app/next.config.js no existe"
    ERRORS=$((ERRORS + 1))
else
    print_ok "next.config.js existe"
fi

# 14. Verificar imports de Prisma en tipos (#16, #17, #18)
if [ -f "app/lib/types.ts" ]; then
    if grep -q "from '@prisma/client'" app/lib/types.ts; then
        IMPORTS=$(grep "from '@prisma/client'" app/lib/types.ts | grep -o -E "UserRole|StatusCuenta|Periodicidad|TipoPago|MotivoMotarario" | wc -l)
        if [ "$IMPORTS" -gt 0 ]; then
            print_ok "Imports de Prisma en types.ts ($IMPORTS enums)"
        else
            print_warn "types.ts importa de Prisma pero sin enums"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
fi

# ============================================================
# VALIDACIONES DE GIT
# ============================================================

# 15. Verificar que estamos en branch main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [ "$CURRENT_BRANCH" = "main" ]; then
    print_ok "Branch: main"
else
    print_warn "Branch actual: $CURRENT_BRANCH (no es main)"
    WARNINGS=$((WARNINGS + 1))
fi

# 16. Verificar que no hay archivos sin commitear (si se pasa --strict)
if [ "$1" = "--strict" ]; then
    UNCOMMITTED=$(git status --porcelain | wc -l)
    if [ "$UNCOMMITTED" -eq 0 ]; then
        print_ok "No hay cambios sin commitear"
    else
        print_warn "$UNCOMMITTED archivo(s) sin commitear"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# 17. Verificar conectividad con GitHub (si se pasa --check-remote)
if [ "$1" = "--check-remote" ] || [ "$2" = "--check-remote" ]; then
    if git ls-remote origin HEAD &>/dev/null; then
        print_ok "Conectividad con GitHub OK"
    else
        print_err "No se puede conectar con GitHub"
        ERRORS=$((ERRORS + 1))
    fi
fi

# ============================================================
# RESUMEN FINAL
# ============================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ TODAS LAS VALIDACIONES PASARON${NC}"
    echo "   Listo para push/deploy"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  VALIDACIÓN COMPLETADA CON ADVERTENCIAS${NC}"
    echo "   Errores: 0 | Advertencias: $WARNINGS"
    echo "   Puedes continuar, pero revisa las advertencias"
    exit 0
else
    echo -e "${RED}❌ VALIDACIÓN FALLIDA${NC}"
    echo "   Errores: $ERRORS | Advertencias: $WARNINGS"
    echo ""
    echo "   Consulta ERRORES-DEPLOY-RESUELTOS.md para soluciones"
    exit 1
fi
