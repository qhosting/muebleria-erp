
#!/bin/bash

# =============================================================================
# 🚀 DESPLIEGUE MANUAL PARA COOLIFY ESCALAFIN
# =============================================================================
# Script personalizado para tu servidor específico
# Configuración: adm.escalafin.com -> app.mueblerialaeconomica.com

set -e

# Colores
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_header() { echo -e "${CYAN}$1${NC}"; }

# Configuración específica de Escalafin
COOLIFY_URL="https://adm.escalafin.com"
COOLIFY_TOKEN="1|z32aRhNoGHLcpyMRdB985TkQx5pjf2n5nsVNxGyp28d211f7"
APP_DOMAIN="app.mueblerialaeconomica.com"
APP_NAME="muebleria-la-economica"
REPO_URL="https://github.com/qhosting/muebleria-la-economica.git"

# Generar secrets seguros
NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

print_header "🚀 DESPLIEGUE ESCALAFIN - VertexERP Muebles"
print_header "================================================="
echo ""

print_info "Configuración detectada:"
echo "  🌐 Coolify: $COOLIFY_URL"
echo "  🚀 App: https://$APP_DOMAIN"
echo "  📦 Repo: $REPO_URL"
echo ""

# Función para hacer peticiones API
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
            "$COOLIFY_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $COOLIFY_TOKEN" \
            -H "Accept: application/json" \
            "$COOLIFY_URL$endpoint"
    fi
}

# Probar diferentes endpoints de API
test_api_endpoints() {
    print_info "🔍 Probando endpoints de API de Coolify..."
    
    local endpoints=(
        "/api/v1/ping"
        "/api/ping"
        "/api/v1/servers"
        "/api/servers"
        "/api/v1/applications"
        "/api/applications"
    )
    
    for endpoint in "${endpoints[@]}"; do
        echo -n "   Probando $endpoint... "
        response=$(coolify_api "GET" "$endpoint" 2>/dev/null || echo "error")
        
        if [ "$response" != "error" ] && [[ ! $response =~ "Not found" ]]; then
            echo -e "${GREEN}✓${NC}"
            echo "   Respuesta: $(echo "$response" | head -c 100)..."
            WORKING_ENDPOINT="$endpoint"
            break
        else
            echo -e "${RED}✗${NC}"
        fi
    done
    
    if [ -z "$WORKING_ENDPOINT" ]; then
        print_warning "No se encontró un endpoint de API funcional."
        print_info "Opciones alternativas:"
        echo ""
        print_info "1️⃣ Verifica que el token de API sea correcto"
        print_info "2️⃣ Accede manualmente al panel de Coolify"
        print_info "3️⃣ Usar la interfaz web de Coolify para crear la aplicación"
        echo ""
        return 1
    else
        print_success "Endpoint funcional encontrado: $WORKING_ENDPOINT"
        return 0
    fi
}

# Obtener información de servidores manualmente
get_servers_manual() {
    print_info "📡 Intentando obtener servidores..."
    
    local server_endpoints=(
        "/api/v1/servers"
        "/api/servers" 
        "/servers"
        "/api/v1/server"
    )
    
    for endpoint in "${server_endpoints[@]}"; do
        print_info "Probando $endpoint..."
        response=$(coolify_api "GET" "$endpoint")
        
        if [[ ! $response =~ "Not found" ]] && [[ ! $response =~ "error" ]]; then
            print_success "Servidores encontrados:"
            echo "$response" | jq '.' 2>/dev/null || echo "$response"
            break
        fi
    done
}

# Crear aplicación manualmente
create_application_manual() {
    print_info "📦 Configurando aplicación..."
    
    # Solicitar información necesaria
    echo ""
    read -p "📝 ID del servidor (número): " SERVER_ID
    read -p "📝 ID del destino (número): " DESTINATION_ID
    read -p "📝 URL de la base de datos PostgreSQL: " DATABASE_URL
    
    echo ""
    print_info "Creando aplicación con los siguientes datos:"
    echo "  Server ID: $SERVER_ID"
    echo "  Destination ID: $DESTINATION_ID"
    echo "  Database: $DATABASE_URL"
    echo ""
    
    # Crear payload de la aplicación
    local app_data=$(cat << EOF
{
    "name": "$APP_NAME",
    "description": "Sistema de gestión VertexERP Muebles",
    "git_repository": "$REPO_URL",
    "git_branch": "main",
    "build_pack": "dockerfile",
    "dockerfile_location": "./Dockerfile",
    "server_id": "$SERVER_ID",
    "destination_id": "$DESTINATION_ID",
    "environment_variables": {
        "NODE_ENV": "production",
        "PORT": "3000",
        "NEXTAUTH_URL": "https://$APP_DOMAIN",
        "NEXTAUTH_SECRET": "$NEXTAUTH_SECRET",
        "JWT_SECRET": "$JWT_SECRET",
        "DATABASE_URL": "$DATABASE_URL"
    },
    "domains": [
        {
            "domain": "$APP_DOMAIN",
            "path": "/"
        }
    ]
}
EOF
    )
    
    # Probar diferentes endpoints para crear aplicación
    local app_endpoints=(
        "/api/v1/applications"
        "/api/applications"
        "/applications"
    )
    
    for endpoint in "${app_endpoints[@]}"; do
        print_info "Intentando crear aplicación en $endpoint..."
        
        response=$(coolify_api "POST" "$endpoint" "$app_data")
        
        if [[ ! $response =~ "Not found" ]] && [[ ! $response =~ "error" ]] && [[ $response =~ "uuid\|id" ]]; then
            print_success "¡Aplicación creada exitosamente!"
            
            # Extraer UUID/ID
            APP_UUID=$(echo "$response" | grep -o '"uuid":"[^"]*' | cut -d'"' -f4)
            [ -z "$APP_UUID" ] && APP_UUID=$(echo "$response" | grep -o '"id":[^,}]*' | cut -d':' -f2)
            
            print_info "UUID/ID de la aplicación: $APP_UUID"
            
            # Iniciar despliegue
            deploy_application "$endpoint" "$APP_UUID"
            return 0
        else
            print_warning "Respuesta: $(echo "$response" | head -c 200)..."
        fi
    done
    
    print_error "No se pudo crear la aplicación automáticamente."
    show_manual_instructions
}

# Desplegar aplicación
deploy_application() {
    local base_endpoint=$1
    local app_id=$2
    
    print_info "🚀 Iniciando despliegue..."
    
    # Construir endpoint de despliegue
    local deploy_endpoint="${base_endpoint%applications*}applications/$app_id/deploy"
    
    response=$(coolify_api "POST" "$deploy_endpoint" '{}')
    
    if [[ ! $response =~ "Not found" ]] && [[ ! $response =~ "error" ]]; then
        print_success "¡Despliegue iniciado exitosamente!"
        print_info "🌐 Monitorea el progreso en: $COOLIFY_URL/applications/$app_id"
        print_success "🎯 Tu aplicación estará disponible en: https://$APP_DOMAIN"
    else
        print_warning "Respuesta del despliegue: $response"
        print_info "Intenta iniciar el despliegue manualmente desde el panel de Coolify"
    fi
}

# Mostrar instrucciones manuales
show_manual_instructions() {
    print_header "📋 INSTRUCCIONES MANUALES"
    print_header "========================="
    echo ""
    
    print_info "Si la creación automática no funciona, sigue estos pasos en el panel web:"
    echo ""
    print_info "1️⃣ Accede a: $COOLIFY_URL"
    print_info "2️⃣ Ve a 'Applications' → 'Create New'"
    print_info "3️⃣ Configura la aplicación con estos datos:"
    echo ""
    echo "   📦 Nombre: $APP_NAME"
    echo "   🔗 Repositorio: $REPO_URL"
    echo "   🌿 Rama: main"
    echo "   🐳 Build Pack: Dockerfile"
    echo "   📁 Dockerfile: ./Dockerfile"
    echo "   🌐 Dominio: $APP_DOMAIN"
    echo ""
    print_info "4️⃣ Variables de entorno a configurar:"
    echo ""
    echo "   NODE_ENV=production"
    echo "   PORT=3000"
    echo "   NEXTAUTH_URL=https://$APP_DOMAIN"
    echo "   NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
    echo "   JWT_SECRET=$JWT_SECRET"
    echo "   DATABASE_URL=[tu-conexión-postgresql]"
    echo ""
    print_info "5️⃣ Guarda y despliega desde el panel"
    echo ""
    
    print_success "📋 Datos guardados en: escalafin-deployment-info.txt"
    
    # Guardar información para referencia
    cat > "escalafin-deployment-info.txt" << EOF
CONFIGURACIÓN DE DESPLIEGUE ESCALAFIN
====================================

Coolify URL: $COOLIFY_URL
Dominio App: https://$APP_DOMAIN
Repositorio: $REPO_URL

Variables de Entorno:
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://$APP_DOMAIN
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
JWT_SECRET=$JWT_SECRET
DATABASE_URL=[CONFIGURAR_MANUALMENTE]

Usuarios del Sistema:
- admin / admin123
- gestor / gestor123  
- cobrador / cobrador123
- reportes / reportes123

Generado: $(date)
EOF
}

# Función principal
main() {
    print_info "🚀 Iniciando despliegue para servidor Escalafin..."
    echo ""
    
    # Probar endpoints
    if test_api_endpoints; then
        print_info "API accesible. Continuando con despliegue automático..."
        get_servers_manual
        create_application_manual
    else
        print_warning "API no accesible. Mostrando instrucciones manuales..."
        show_manual_instructions
    fi
}

# Ejecutar
main "$@"

print_header ""
print_header "🎉 PROCESO COMPLETADO"
print_header "===================="
print_success "Configuración: $COOLIFY_URL → https://$APP_DOMAIN"
print_info "En caso de problemas, revisa: escalafin-deployment-info.txt"

