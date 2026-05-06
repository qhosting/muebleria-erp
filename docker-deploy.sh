
#!/bin/bash

echo "🚀 Desplegando VertexERP Muebles con Docker"
echo "================================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
print_message() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi

# Verificar que Docker Compose esté instalado
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose no está instalado. Por favor instala Docker Compose primero."
    exit 1
fi

# Parar contenedores existentes
print_info "Parando contenedores existentes..."
docker-compose down --remove-orphans

# Limpiar imágenes antiguas (opcional)
read -p "¿Deseas limpiar las imágenes Docker antiguas? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Limpiando imágenes antiguas..."
    docker system prune -f
fi

# Construir imágenes
print_info "Construyendo imágenes Docker..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    print_error "Error al construir las imágenes Docker"
    exit 1
fi

print_message "Imágenes construidas exitosamente"

# Iniciar servicios
print_info "Iniciando servicios..."
docker-compose up -d

if [ $? -ne 0 ]; then
    print_error "Error al iniciar los servicios"
    exit 1
fi

print_message "Servicios iniciados exitosamente"

# Esperar a que la base de datos esté lista
print_info "Esperando a que la base de datos esté lista..."
sleep 10

# Verificar estado de los contenedores
print_info "Estado de los contenedores:"
docker-compose ps

# Mostrar logs recientes
print_info "Logs recientes de la aplicación:"
docker-compose logs --tail=20 app

echo ""
echo "🎉 ¡Despliegue completado!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Aplicación disponible en: http://localhost:3000"
echo "🗄️  Base de datos PostgreSQL en puerto: 5432"
echo ""
echo "👥 Usuarios disponibles:"
echo "   📧 admin@muebleria.com (admin)"
echo "   📧 gestor@muebleria.com (gestor_cobranza)" 
echo "   📧 cobrador@muebleria.com (cobrador)"
echo "   📧 reportes@muebleria.com (reporte_cobranza)"
echo "   🔑 Contraseña para todos: password123"
echo ""
echo "📊 Comandos útiles:"
echo "   Ver logs: docker-compose logs -f app"
echo "   Parar servicios: docker-compose down"
echo "   Reiniciar: docker-compose restart"
echo "   Acceder a la BD: docker-compose exec postgres psql -U postgres -d muebleria_db"
echo ""
print_message "¡El sistema está listo para usar!"

