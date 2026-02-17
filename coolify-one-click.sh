
#!/bin/bash

# =============================================================================
# 🚀 COOLIFY ONE-CLICK DEPLOY - MUEBLERIA LA ECONOMICA
# =============================================================================
# Script ultra-simplificado para despliegue en un comando
# Solo necesitas: URL_COOLIFY, TOKEN, SERVER_ID, DESTINATION_ID

set -e

# Colores
GREEN='\033[0;32m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

echo "🚀 COOLIFY ONE-CLICK DEPLOY"
echo "=========================="

# Variables de configuración (editar aquí)
COOLIFY_URL="https://tu-coolify.com"          # ⬅️ EDITAR
COOLIFY_TOKEN="tu-token-aqui"                 # ⬅️ EDITAR  
SERVER_ID="tu-server-id"                      # ⬅️ EDITAR
DESTINATION_ID="tu-destination-id"            # ⬅️ EDITAR
APP_DOMAIN="muebleria.tu-dominio.com"        # ⬅️ EDITAR
DATABASE_URL="postgresql://..."              # ⬅️ EDITAR

# Verificar configuración
if [ "$COOLIFY_URL" = "https://tu-coolify.com" ] || [ "$COOLIFY_TOKEN" = "tu-token-aqui" ]; then
    print_error "❌ Debes editar las variables de configuración en el script"
    print_info "Edita las líneas marcadas con '# ⬅️ EDITAR'"
    exit 1
fi

# Generar secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

print_info "Creando aplicación en Coolify..."

# Crear aplicación con API
response=$(curl -s -X POST "$COOLIFY_URL/api/v1/applications" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"muebleria-la-economica\",
    \"description\": \"Sistema de gestión MUEBLERIA LA ECONOMICA\",
    \"git_repository\": \"https://github.com/qhosting/muebleria-la-economica.git\",
    \"git_branch\": \"main\",
    \"build_pack\": \"dockerfile\",
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

if echo "$response" | grep -q "uuid"; then
    APP_UUID=$(echo "$response" | grep -o '"uuid":"[^"]*' | cut -d'"' -f4)
    print_success "Aplicación creada: $APP_UUID"
    
    print_info "Iniciando despliegue..."
    curl -s -X POST "$COOLIFY_URL/api/v1/applications/$APP_UUID/deploy" \
      -H "Authorization: Bearer $COOLIFY_TOKEN" > /dev/null
    
    print_success "🎉 ¡Despliegue iniciado!"
    print_success "🌐 Panel: $COOLIFY_URL/applications/$APP_UUID"
    print_success "🌍 App: https://$APP_DOMAIN"
else
    print_error "Error al crear la aplicación:"
    echo "$response"
fi
