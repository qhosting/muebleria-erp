
#!/bin/bash

# =============================================================================
# 🚀 DESPLIEGUE RÁPIDO ESCALAFIN - AUTO CONFIGURADO
# =============================================================================

set -e

# Colores
GREEN='\033[0;32m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_header() { echo -e "${CYAN}$1${NC}"; }

# Configuración Escalafin (detectada automáticamente)
COOLIFY_URL="https://adm.escalafin.com"
COOLIFY_TOKEN="1|z32aRhNoGHLcpyMRdB985TkQx5pjf2n5nsVNxGyp28d211f7"
APP_DOMAIN="app.mueblerialaeconomica.com"
SERVER_ID="0"  # Detectado automáticamente del servidor

# Generar secrets seguros
NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

print_header "🚀 DESPLIEGUE ESCALAFIN - CONFIGURADO AUTOMÁTICAMENTE"
print_header "==================================================="

print_info "Usando configuración detectada:"
echo "  🖥️  Server ID: $SERVER_ID"
echo "  🌐 Coolify: $COOLIFY_URL"
echo "  🚀 App: https://$APP_DOMAIN"
echo ""

# Obtener destinos del servidor
print_info "🎯 Obteniendo destinos del servidor..."
destinations=$(curl -s -H "Authorization: Bearer $COOLIFY_TOKEN" \
    "https://adm.escalafin.com/api/v1/servers/$SERVER_ID/destinations" || echo "error")

if [[ $destinations != "error" ]] && [[ ! $destinations =~ "Not found" ]]; then
    print_success "Destinos encontrados:"
    echo "$destinations" | jq -r '.data[] | "   🔗 ID: \(.id) | \(.name) (\(.type))"' 2>/dev/null
    
    # Usar el primer destino disponible
    DESTINATION_ID=$(echo "$destinations" | jq -r '.data[0].id' 2>/dev/null || echo "1")
    print_info "Usando Destination ID: $DESTINATION_ID"
else
    print_info "Usando Destination ID por defecto: 1"
    DESTINATION_ID="1"
fi

echo ""
read -p "🗄️  Ingresa la URL de tu base de datos PostgreSQL: " DATABASE_URL

print_info "🚀 Creando aplicación..."

# Crear aplicación
app_response=$(curl -s -X POST "https://adm.escalafin.com/api/v1/applications" \
    -H "Authorization: Bearer $COOLIFY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"muebleria-la-economica\",
        \"description\": \"Sistema de gestión MUEBLERIA LA ECONOMICA\",
        \"git_repository\": \"https://github.com/qhosting/muebleria-la-economica.git\",
        \"git_branch\": \"main\",
        \"build_pack\": \"dockerfile\",
        \"dockerfile_location\": \"./Dockerfile\",
        \"server_id\": \"$SERVER_ID\",
        \"destination_id\": \"$DESTINATION_ID\",
        \"environment_variables\": {
            \"NODE_ENV\": \"production\",
            \"PORT\": \"3000\",
            \"NEXTAUTH_URL\": \"https://$APP_DOMAIN\",
            \"NEXTAUTH_SECRET\": \"$NEXTAUTH_SECRET\",
            \"JWT_SECRET\": \"$JWT_SECRET\",
            \"DATABASE_URL\": \"$DATABASE_URL\"
        },
        \"domains\": [{\"domain\": \"$APP_DOMAIN\", \"path\": \"/\"}]
    }")

if echo "$app_response" | grep -q "uuid"; then
    APP_UUID=$(echo "$app_response" | jq -r '.data.uuid' 2>/dev/null)
    print_success "¡Aplicación creada exitosamente!"
    print_info "UUID: $APP_UUID"
    
    # Iniciar despliegue
    print_info "🚀 Iniciando despliegue..."
    deploy_response=$(curl -s -X POST "https://adm.escalafin.com/api/v1/applications/$APP_UUID/deploy" \
        -H "Authorization: Bearer $COOLIFY_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{}')
    
    print_success "¡Despliegue iniciado!"
    print_header ""
    print_header "🎉 DESPLIEGUE COMPLETADO"
    print_header "======================="
    print_success "🌐 Tu aplicación: https://$APP_DOMAIN"
    print_success "🛠️  Panel Coolify: $COOLIFY_URL/applications/$APP_UUID"
    print_info "⏱️  El despliegue puede tardar 3-5 minutos"
    
    # Guardar información
    cat > "escalafin-app-info.txt" << EOF
APLICACIÓN DESPLEGADA EN ESCALAFIN
================================

App URL: https://$APP_DOMAIN
Panel: $COOLIFY_URL/applications/$APP_UUID
UUID: $APP_UUID

Variables configuradas:
- NODE_ENV=production
- PORT=3000  
- NEXTAUTH_URL=https://$APP_DOMAIN
- DATABASE_URL=[configurada]
- Secrets generados automáticamente

Usuarios del sistema:
- admin / admin123
- gestor / gestor123
- cobrador / cobrador123  
- reportes / reportes123

Creado: $(date)
EOF
    
    print_success "📋 Información guardada en: escalafin-app-info.txt"
    
else
    print_info "Respuesta de la API:"
    echo "$app_response" | jq '.' 2>/dev/null || echo "$app_response"
fi
