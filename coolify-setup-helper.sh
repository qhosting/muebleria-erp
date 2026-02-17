
#!/bin/bash

# =============================================================================
# 🔧 COOLIFY SETUP HELPER - Obtener IDs necesarios
# =============================================================================
# Este script ayuda a obtener los IDs necesarios de tu instalación de Coolify

set -e

# Colores
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_header() { echo -e "${CYAN}$1${NC}"; }

print_header "🔧 COOLIFY SETUP HELPER"
print_header "================================"
echo ""

print_info "Este script te ayuda a obtener los IDs necesarios para el despliegue automático"
echo ""

# Solicitar datos básicos
read -p "🌐 URL de tu servidor Coolify (ej: https://coolify.tu-dominio.com): " COOLIFY_URL
echo ""

read -p "🔑 Token de API de Coolify: " -s COOLIFY_TOKEN
echo ""
echo ""

# Función para hacer peticiones API
coolify_api() {
    local method=$1
    local endpoint=$2
    
    curl -s -X "$method" \
        -H "Authorization: Bearer $COOLIFY_TOKEN" \
        -H "Accept: application/json" \
        "$COOLIFY_URL/api/v1$endpoint" 2>/dev/null || echo "error"
}

# Verificar conexión
print_info "🔄 Verificando conexión con Coolify..."

ping_response=$(coolify_api "GET" "/ping")
if [ "$ping_response" = "error" ] || [ -z "$ping_response" ]; then
    print_error "No se pudo conectar a Coolify. Verifica la URL y el token."
    exit 1
fi

print_success "Conexión establecida con Coolify"
echo ""

# Obtener información de servidores
print_header "📡 SERVIDORES DISPONIBLES"
print_header "=========================="

servers=$(coolify_api "GET" "/servers")
if [ "$servers" != "error" ]; then
    echo "$servers" | jq -r '.data[] | "🖥️  ID: \(.id) | Nombre: \(.name) | IP: \(.ip) | Estado: \(.status)"' 2>/dev/null || {
        print_warning "Instalando jq para mejor formato..."
        sudo apt update && sudo apt install -y jq
        echo "$servers" | jq -r '.data[] | "🖥️  ID: \(.id) | Nombre: \(.name) | IP: \(.ip) | Estado: \(.status)"'
    }
else
    print_error "No se pudieron obtener los servidores"
    exit 1
fi
echo ""

# Solicitar SERVER_ID
read -p "📝 Ingresa el ID del servidor que quieres usar: " SERVER_ID
echo ""

# Obtener destinos para el servidor seleccionado
print_header "🎯 DESTINOS DISPONIBLES PARA SERVIDOR $SERVER_ID"
print_header "=============================================="

destinations=$(coolify_api "GET" "/servers/$SERVER_ID/destinations")
if [ "$destinations" != "error" ]; then
    echo "$destinations" | jq -r '.data[] | "🔗 ID: \(.id) | Nombre: \(.name) | Tipo: \(.type) | Red: \(.network)"' 2>/dev/null
else
    print_error "No se pudieron obtener los destinos para el servidor $SERVER_ID"
    exit 1
fi
echo ""

# Solicitar DESTINATION_ID
read -p "📝 Ingresa el ID del destino que quieres usar: " DESTINATION_ID
echo ""

# Obtener aplicaciones existentes
print_header "📱 APLICACIONES EXISTENTES"
print_header "=========================="

apps=$(coolify_api "GET" "/applications")
if [ "$apps" != "error" ]; then
    existing_apps=$(echo "$apps" | jq -r '.data[] | "📦 \(.name) | UUID: \(.uuid) | Estado: \(.status)"' 2>/dev/null)
    if [ -n "$existing_apps" ]; then
        echo "$existing_apps"
    else
        print_info "No hay aplicaciones existentes"
    fi
else
    print_warning "No se pudieron obtener las aplicaciones existentes"
fi
echo ""

# Generar configuración
print_header "📋 CONFIGURACIÓN GENERADA"
print_header "=========================="

print_success "Datos obtenidos exitosamente:"
echo ""
echo "COOLIFY_URL=$COOLIFY_URL"
echo "COOLIFY_TOKEN=$COOLIFY_TOKEN"
echo "SERVER_ID=$SERVER_ID"
echo "DESTINATION_ID=$DESTINATION_ID"
echo ""

# Crear archivo de configuración
CONFIG_FILE="coolify-auto-config.env"
cat > "$CONFIG_FILE" << EOF
# Configuración automática de Coolify
# Generado el $(date)

COOLIFY_URL=$COOLIFY_URL
COOLIFY_TOKEN=$COOLIFY_TOKEN
SERVER_ID=$SERVER_ID
DESTINATION_ID=$DESTINATION_ID

# Configuración de la aplicación (editar según sea necesario)
APP_NAME=muebleria-la-economica
APP_DOMAIN=muebleria.tu-dominio.com
DATABASE_URL=postgresql://usuario:password@host:5432/muebleria_db

# Secrets (se generan automáticamente)
NEXTAUTH_SECRET=auto-generated
JWT_SECRET=auto-generated
EOF

print_success "Configuración guardada en: $CONFIG_FILE"
print_warning "⚠️  IMPORTANTE: Edita $CONFIG_FILE y configura APP_DOMAIN y DATABASE_URL"
echo ""

# Instrucciones para usar
print_header "🚀 PRÓXIMOS PASOS"
print_header "================="
echo ""
print_info "1. Edita el archivo $CONFIG_FILE:"
echo "   - APP_DOMAIN: tu-dominio-real.com"
echo "   - DATABASE_URL: tu-conexión-postgresql-real"
echo ""
print_info "2. Ejecuta el despliegue automático:"
echo "   ./coolify-deploy.sh"
echo ""
print_info "O para un despliegue ultra-rápido (una línea):"
echo "   # Edita coolify-one-click.sh con los datos de arriba"
echo "   ./coolify-one-click.sh"
echo ""

print_header "🎉 ¡Setup Helper completado!"
print_info "Ya tienes toda la información necesaria para desplegar automáticamente"
