
#!/bin/bash

echo "🚀 Despliegue Rápido - MUEBLERIA LA ECONOMICA"
echo "============================================="

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo ""
print_info "Selecciona el tipo de despliegue:"
echo "1) Con base de datos PostgreSQL interna (recomendado para desarrollo)"
echo "2) Con base de datos externa existente"
echo ""
read -p "Opción (1-2): " option

case $option in
  1)
    print_info "Desplegando con base de datos PostgreSQL interna..."
    
    # Usar el docker-compose.yml principal
    print_info "Construyendo y iniciando servicios..."
    docker-compose down --remove-orphans
    docker-compose build --no-cache
    docker-compose up -d
    
    print_message "Servicios iniciados con base de datos interna"
    print_info "Esperando a que la base de datos esté lista..."
    sleep 15
    
    print_info "Estado de los contenedores:"
    docker-compose ps
    
    echo ""
    print_message "¡Despliegue completado!"
    echo "📱 Aplicación: http://localhost:3000"
    echo "🗄️ PostgreSQL: localhost:5432"
    ;;
    
  2)
    print_info "Desplegando con base de datos externa..."
    
    # Configurar variables para base de datos externa
    export DATABASE_URL_EXTERNAL='postgresql://role_7dbff157a:aRQiheGruVqcMNKA2fcu6h3czwuC2Mk9@db-7dbff157a.db002.hosteddb.reai.io:5432/7dbff157a?connect_timeout=15'
    export NEXTAUTH_URL="http://localhost:3000"
    export NEXTAUTH_SECRET="muebleria-secret-key-2024-super-secure"
    
    print_info "Construyendo y iniciando servicios..."
    docker-compose -f docker-compose.external-db.yml down --remove-orphans
    docker-compose -f docker-compose.external-db.yml build --no-cache
    docker-compose -f docker-compose.external-db.yml up -d
    
    print_message "Servicio iniciado con base de datos externa"
    print_info "Esperando a que la aplicación esté lista..."
    sleep 10
    
    print_info "Estado del contenedor:"
    docker-compose -f docker-compose.external-db.yml ps
    
    echo ""
    print_message "¡Despliegue completado!"
    echo "📱 Aplicación: http://localhost:3000"
    echo "🗄️ Base de datos: Externa (ya configurada)"
    ;;
    
  *)
    print_warning "Opción inválida. Saliendo..."
    exit 1
    ;;
esac

echo ""
print_info "Logs de la aplicación:"
if [ "$option" == "1" ]; then
    docker-compose logs --tail=10 app
else
    docker-compose -f docker-compose.external-db.yml logs --tail=10 app
fi

echo ""
echo "👥 Usuarios disponibles:"
echo "   📧 admin@muebleria.com (password123)"
echo "   📧 gestor@muebleria.com (password123)"
echo "   📧 cobrador@muebleria.com (password123)"
echo "   📧 reportes@muebleria.com (password123)"
echo ""
print_message "¡Sistema listo para usar!"
