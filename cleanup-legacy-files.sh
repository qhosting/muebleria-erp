
#!/bin/bash
# Limpiar archivos legacy de Yarn (ya no se usan, el proyecto usa npm)

set -e
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

echo "🧹 Limpiando archivos legacy de Yarn..."
echo ""

REMOVED=0

# Remover yarn.lock
if [ -f "app/yarn.lock" ]; then
    git rm -f app/yarn.lock
    echo -e "${GREEN}✓${NC} app/yarn.lock removido"
    REMOVED=$((REMOVED + 1))
else
    echo "  yarn.lock ya no existe"
fi

# Remover .yarn/
if [ -d "app/.yarn" ]; then
    git rm -rf app/.yarn
    echo -e "${GREEN}✓${NC} app/.yarn/ removido"
    REMOVED=$((REMOVED + 1))
else
    echo "  .yarn/ ya no existe"
fi

echo ""
if [ $REMOVED -gt 0 ]; then
    echo "✅ $REMOVED item(s) removidos"
    echo ""
    echo "Ahora ejecuta:"
    echo "   git commit -m \"chore: remover archivos legacy de yarn\""
    echo "   git push origin main"
else
    echo "✅ No hay archivos legacy que remover"
fi
