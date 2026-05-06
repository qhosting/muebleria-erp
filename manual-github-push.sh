
#!/bin/bash

echo "🔐 Push Manual a GitHub - VertexERP Muebles"
echo "==============================================="

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_message() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

echo ""
print_warning "El token proporcionado no funcionó automáticamente."
print_info "Esto puede deberse a:"
echo "  - Token inválido o expirado"
echo "  - Permisos insuficientes del token"
echo "  - Problema de autenticación"

echo ""
print_info "SOLUCIONES ALTERNATIVAS:"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 OPCIÓN 1: Crear un nuevo token de GitHub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Ve a: https://github.com/settings/tokens"
echo "2. Click 'Generate new token' → 'Generate new token (classic)'"
echo "3. Selecciona estos permisos:"
echo "   ✓ repo (Full control of private repositories)"
echo "   ✓ workflow (Update GitHub Action workflows)"
echo "4. Copia el nuevo token"
echo "5. Ejecuta estos comandos:"
echo ""
echo "   git remote set-url origin https://NUEVO_TOKEN@github.com/qhosting/muebleria-la-economica.git"
echo "   git push origin main"
echo "   git remote set-url origin https://github.com/qhosting/muebleria-la-economica.git"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🖥️ OPCIÓN 2: GitHub CLI (recomendado)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Instalar GitHub CLI:"
echo "   sudo apt update && sudo apt install gh"
echo "2. Autenticarse:"
echo "   gh auth login"
echo "3. Hacer push:"
echo "   git push origin main"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 OPCIÓN 3: SSH (más seguro)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Generar clave SSH:"
echo "   ssh-keygen -t ed25519 -C \"tu-email@ejemplo.com\""
echo "2. Mostrar clave pública:"
echo "   cat ~/.ssh/id_ed25519.pub"
echo "3. Agregar la clave a GitHub:"
echo "   https://github.com/settings/ssh/new"
echo "4. Cambiar remote a SSH:"
echo "   git remote set-url origin git@github.com:qhosting/muebleria-la-economica.git"
echo "5. Hacer push:"
echo "   git push origin main"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ESTADO ACTUAL DEL REPOSITORIO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Commits listos para push:"
git log --oneline origin/main..HEAD 2>/dev/null || git log --oneline -5

echo ""
print_info "Archivos Docker incluidos:"
echo "📦 Dockerfile"
echo "📦 docker-compose.yml"
echo "📦 docker-compose.external-db.yml"
echo "📦 docker-production.yml"
echo "📦 start.sh, docker-deploy.sh, quick-deploy.sh"
echo "📦 install-docker.sh"
echo "📦 README-DOCKER.md"
echo "📦 DOCKER-COMPLETE-GUIDE.md"
echo "📦 nginx.conf, .dockerignore, .env.docker"

echo ""
print_message "Una vez que hagas push exitosamente, tu proyecto tendrá:"
echo "  🚀 Despliegue con un comando: ./quick-deploy.sh"
echo "  🐳 Configuración Docker completa"
echo "  📚 Documentación detallada"
echo "  🔧 Scripts de instalación automática"
echo "  ⚡ Optimizaciones de producción"

