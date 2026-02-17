
#!/bin/bash
# Instalar Git hooks para validación automática

set -e
GREEN='\033[0;32m'; NC='\033[0m'

echo "📦 Instalando Git hooks..."

# Crear pre-push hook
cat > .git/hooks/pre-push << 'HOOK'
#!/bin/bash
# Git pre-push hook - ejecuta validaciones antes de push

echo ""
echo "🔐 Ejecutando pre-push validations..."
echo ""

# Ejecutar pre-deploy check
if ./pre-deploy-check.sh; then
    echo ""
    echo "✅ Validaciones OK - continuando con push..."
    exit 0
else
    echo ""
    echo "❌ Push cancelado por errores en validación"
    echo ""
    echo "Para saltar validaciones (NO recomendado):"
    echo "   git push --no-verify"
    echo ""
    exit 1
fi
HOOK

# Hacer ejecutable
chmod +x .git/hooks/pre-push

echo -e "${GREEN}✓${NC} Pre-push hook instalado"
echo ""
echo "Ahora cada 'git push' ejecutará validaciones automáticamente"
echo ""
echo "Para deshabilitar temporalmente:"
echo "   git push --no-verify"
echo ""
