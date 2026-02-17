
#!/bin/bash

echo "🚀 Actualizando GitHub con archivos Docker"
echo "==========================================="

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

# Verificar que estemos en el directorio correcto
if [ ! -f "Dockerfile" ] || [ ! -f "docker-compose.yml" ]; then
    print_error "No se encuentran archivos Docker. Asegúrate de estar en el directorio del proyecto."
    exit 1
fi

# Mostrar estado actual
print_info "Verificando estado del repositorio..."
git status

print_info "Archivos Docker encontrados:"
ls -la | grep -E "(docker|Docker|\.env)" | head -10

print_info "Commits pendientes de push:"
git log origin/main..HEAD --oneline

echo ""
print_info "Para continuar, necesitas proporcionar tu token de GitHub."
print_warning "IMPORTANTE: No compartas tu token públicamente."

echo ""
echo "Opciones para hacer push:"
echo ""
echo "1) Con token temporal (recomendado para esta sesión):"
echo '   read -s TOKEN'
echo '   git remote set-url origin https://$TOKEN@github.com/qhosting/muebleria-la-economica.git'
echo '   git push origin main'
echo '   git remote set-url origin https://github.com/qhosting/muebleria-la-economica.git'
echo ""
echo "2) Con GitHub CLI (si está instalado):"
echo '   gh auth login'
echo '   git push origin main'
echo ""
echo "3) Configurar SSH (más seguro para uso continuado):"
echo '   ssh-keygen -t ed25519 -C "tu-email@ejemplo.com"'
echo '   cat ~/.ssh/id_ed25519.pub  # Agregar a GitHub'
echo '   git remote set-url origin git@github.com:qhosting/muebleria-la-economica.git'
echo '   git push origin main'

echo ""
print_message "Archivos Docker listos para subir:"
echo "📁 Dockerfile"
echo "📁 docker-compose.yml"
echo "📁 docker-compose.external-db.yml"
echo "📁 docker-production.yml"
echo "📁 start.sh"
echo "📁 docker-deploy.sh"
echo "📁 quick-deploy.sh"
echo "📁 install-docker.sh"
echo "📁 nginx.conf"
echo "📁 README-DOCKER.md"
echo "📁 DOCKER-COMPLETE-GUIDE.md"
echo "📁 .dockerignore"
echo "📁 .env.docker"

echo ""
print_info "Una vez que hagas push, tu repositorio tendrá configuración Docker completa"
print_info "para despliegue en cualquier servidor con Docker instalado."
