
#!/bin/bash

# =============================================================================
# 🚀 COOLIFY AUTO-DEPLOY SCRIPT - MUEBLERIA LA ECONOMICA
# =============================================================================
# Este script despliega automáticamente la aplicación en Coolify usando la API REST
# Autor: DeepAgent Assistant
# Fecha: Septiembre 2024

set -e  # Salir en caso de error

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_header() { echo -e "${CYAN}$1${NC}"; }

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

APP_NAME="muebleria-la-economica"
REPO_URL="https://github.com/qhosting/muebleria-la-economica.git"
BRANCH="main"

# Verificar si existe archivo de configuración
CONFIG_FILE="coolify-config.env"

print_header "🚀 COOLIFY AUTO-DEPLOY - MUEBLERIA LA ECONOMICA"
echo "=================================================================="

# Función para solicitar datos de configuración
setup_config() {
    print_info "Configuración inicial requerida..."
    echo ""
    
    read -p "🌐 URL de tu servidor Coolify (ej: https://coolify.tu-dominio.com): " COOLIFY_URL
    echo ""
    
    read -p "🔑 API Token de Coolify: " -s COOLIFY_TOKEN
    echo ""
    echo ""
    
    read -p "📦 ID del Servidor (puedes obtenerlo de la API /servers): " SERVER_ID
    echo ""
    
    read -p "🔐 ID del Destino (destination) para deploy: " DESTINATION_ID
    echo ""
    
    # Generar secretos para la aplicación
    print_info "Generando secretos para la aplicación..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    # Configurar variables de entorno de la aplicación
    print_info "Configuración de la aplicación..."
    
    read -p "🗄️ URL de la base de datos PostgreSQL (ej: postgresql://user:pass@host:5432/dbname): " DATABASE_URL
    echo ""
    
    read -p "🌍 Dominio para la aplicación (ej: muebleria.tu-dominio.com): " APP_DOMAIN
    echo ""
    
    # Guardar configuración
    cat > "$CONFIG_FILE" << EOF
COOLIFY_URL=$COOLIFY_URL
COOLIFY_TOKEN=$COOLIFY_TOKEN
SERVER_ID=$SERVER_ID
DESTINATION_ID=$DESTINATION_ID
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
JWT_SECRET=$JWT_SECRET
DATABASE_URL=$DATABASE_URL
APP_DOMAIN=$APP_DOMAIN
EOF
    
    print_success "Configuración guardada en $CONFIG_FILE"
    print_warning "IMPORTANTE: Mantén este archivo seguro y no lo compartas públicamente"
}

# Cargar o crear configuración
if [ ! -f "$CONFIG_FILE" ]; then
    print_warning "Archivo de configuración no encontrado. Configurando por primera vez..."
    setup_config
else
    print_info "Cargando configuración existente..."
    source "$CONFIG_FILE"
fi

# =============================================================================
# FUNCIONES DE API
# =============================================================================

# Función para hacer peticiones a la API de Coolify
coolify_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $COOLIFY_TOKEN" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -d "$data" \
            "$COOLIFY_URL/api/v1$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $COOLIFY_TOKEN" \
            -H "Accept: application/json" \
            "$COOLIFY_URL/api/v1$endpoint"
    fi
}

# =============================================================================
# FUNCIONES DE DESPLIEGUE
# =============================================================================

check_coolify_connection() {
    print_info "Verificando conexión con Coolify..."
    
    response=$(coolify_api "GET" "/ping" 2>/dev/null || echo "error")
    
    if [ "$response" = "error" ]; then
        print_error "No se pudo conectar a Coolify. Verifica la URL y token."
        exit 1
    fi
    
    print_success "Conexión con Coolify establecida"
}

check_existing_app() {
    print_info "Verificando si la aplicación ya existe..."
    
    apps=$(coolify_api "GET" "/applications")
    
    if echo "$apps" | grep -q "\"name\":\"$APP_NAME\""; then
        print_warning "La aplicación '$APP_NAME' ya existe en Coolify"
        read -p "¿Deseas actualizar la aplicación existente? (y/N): " update_app
        
        if [[ $update_app =~ ^[Yy]$ ]]; then
            APP_EXISTS=true
            # Extraer el UUID de la aplicación existente
            APP_UUID=$(echo "$apps" | jq -r ".data[] | select(.name==\"$APP_NAME\") | .uuid" 2>/dev/null || echo "")
            print_info "UUID de aplicación existente: $APP_UUID"
        else
            print_error "Operación cancelada por el usuario"
            exit 1
        fi
    else
        APP_EXISTS=false
        print_success "La aplicación '$APP_NAME' no existe. Se creará una nueva."
    fi
}

create_application() {
    print_info "Creando aplicación en Coolify..."
    
    app_data='{
        "name": "'$APP_NAME'",
        "description": "Sistema de gestión y cobranza MUEBLERIA LA ECONOMICA",
        "git_repository": "'$REPO_URL'",
        "git_branch": "'$BRANCH'",
        "build_pack": "dockerfile",
        "dockerfile_location": "./Dockerfile",
        "server_id": "'$SERVER_ID'",
        "destination_id": "'$DESTINATION_ID'",
        "environment_variables": {
            "NODE_ENV": "production",
            "PORT": "3000",
            "NEXTAUTH_URL": "https://'$APP_DOMAIN'",
            "NEXTAUTH_SECRET": "'$NEXTAUTH_SECRET'",
            "JWT_SECRET": "'$JWT_SECRET'",
            "DATABASE_URL": "'$DATABASE_URL'"
        },
        "domains": [
            {
                "domain": "'$APP_DOMAIN'",
                "path": "/"
            }
        ]
    }'
    
    response=$(coolify_api "POST" "/applications" "$app_data")
    
    if echo "$response" | grep -q "\"success\":true\|\"uuid\""; then
        APP_UUID=$(echo "$response" | jq -r '.data.uuid' 2>/dev/null || echo "")
        print_success "Aplicación creada exitosamente"
        print_info "UUID: $APP_UUID"
        
        # Guardar UUID en configuración
        echo "APP_UUID=$APP_UUID" >> "$CONFIG_FILE"
    else
        print_error "Error al crear la aplicación:"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        exit 1
    fi
}

deploy_application() {
    if [ -z "$APP_UUID" ]; then
        print_error "UUID de aplicación no disponible. No se puede desplegar."
        exit 1
    fi
    
    print_info "Iniciando despliegue de la aplicación..."
    
    deploy_response=$(coolify_api "POST" "/applications/$APP_UUID/deploy" '{}')
    
    if echo "$deploy_response" | grep -q "\"success\":true\|\"message\":\"Deployment started\""; then
        print_success "Despliegue iniciado exitosamente"
        print_info "Puedes monitorear el progreso en: $COOLIFY_URL/applications/$APP_UUID"
    else
        print_error "Error al iniciar el despliegue:"
        echo "$deploy_response" | jq '.' 2>/dev/null || echo "$deploy_response"
        exit 1
    fi
}

monitor_deployment() {
    print_info "Monitoreando el despliegue (presiona Ctrl+C para salir)..."
    
    while true; do
        status=$(coolify_api "GET" "/applications/$APP_UUID/status" 2>/dev/null || echo "error")
        
        if [ "$status" != "error" ]; then
            current_status=$(echo "$status" | jq -r '.status' 2>/dev/null || echo "unknown")
            print_info "Estado actual: $current_status"
            
            if [ "$current_status" = "running" ]; then
                print_success "¡Aplicación desplegada y ejecutándose!"
                print_success "🌐 Accede a tu aplicación en: https://$APP_DOMAIN"
                break
            elif [ "$current_status" = "failed" ]; then
                print_error "El despliegue falló. Revisa los logs en Coolify."
                break
            fi
        fi
        
        sleep 10
    done
}

# =============================================================================
# FUNCIÓN PRINCIPAL
# =============================================================================

main() {
    print_header "Iniciando proceso de despliegue automatizado..."
    echo ""
    
    # 1. Verificar conexión
    check_coolify_connection
    
    # 2. Verificar aplicación existente
    check_existing_app
    
    # 3. Crear o actualizar aplicación
    if [ "$APP_EXISTS" = false ]; then
        create_application
    else
        print_info "Usando aplicación existente: $APP_UUID"
    fi
    
    # 4. Desplegar aplicación
    deploy_application
    
    # 5. Monitorear despliegue (opcional)
    read -p "¿Deseas monitorear el despliegue en tiempo real? (Y/n): " monitor
    if [[ ! $monitor =~ ^[Nn]$ ]]; then
        monitor_deployment
    else
        print_info "Despliegue iniciado. Monitorea el progreso en:"
        print_info "$COOLIFY_URL/applications/$APP_UUID"
    fi
    
    echo ""
    print_header "🎉 DESPLIEGUE COMPLETADO"
    print_success "Aplicación: $APP_NAME"
    print_success "Dominio: https://$APP_DOMAIN"
    print_success "Panel Coolify: $COOLIFY_URL/applications/$APP_UUID"
    echo ""
    print_warning "NOTA: El despliegue puede tardar unos minutos en completarse."
    print_info "Revisa los logs en Coolify si encuentras algún problema."
}

# =============================================================================
# EJECUCIÓN
# =============================================================================

# Verificar dependencias
if ! command -v curl &> /dev/null; then
    print_error "curl no está instalado. Instálalo con: sudo apt install curl"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    print_warning "jq no está instalado. Instalando..."
    sudo apt update && sudo apt install -y jq
fi

# Ejecutar función principal
main "$@"
