
#!/bin/bash

echo "🔍 MUEBLERIA LA ECONOMICA - Verificación Post-Deployment"
echo "======================================================"

# Función para verificar URL
check_url() {
    local url=$1
    local name=$2
    echo -n "Verificando $name... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|302"; then
        echo "✅ OK"
    else
        echo "❌ ERROR"
    fi
}

# Solicitar URL de la aplicación
echo ""
echo "🌐 Ingresa la URL de tu aplicación desplegada:"
read -p "URL: " APP_URL

if [ -z "$APP_URL" ]; then
    echo "❌ URL no proporcionada. Saliendo..."
    exit 1
fi

echo ""
echo "🔍 Verificando endpoints de la aplicación..."
echo ""

# Verificar endpoints principales
check_url "$APP_URL" "Página principal"
check_url "$APP_URL/login" "Página de login"
check_url "$APP_URL/api/auth/signin" "Autenticación"
check_url "$APP_URL/dashboard" "Dashboard"

echo ""
echo "📱 Verificaciones manuales recomendadas:"
echo "1. ✅ Login con usuario admin: admin@economica.local / admin123"
echo "2. ✅ Acceso al dashboard de administración"
echo "3. ✅ Creación/edición de clientes"
echo "4. ✅ Sistema de cobranza móvil"
echo "5. ✅ Generación de reportes"
echo "6. ✅ PWA móvil funcionando sin cuelgues"

echo ""
echo "🔐 Configuraciones post-deployment:"
echo "1. 🔄 Actualizar NEXTAUTH_URL con: $APP_URL"
echo "2. 🔒 Cambiar passwords por defecto"
echo "3. 👥 Crear usuarios reales del sistema"
echo "4. 📊 Verificar reportes con datos reales"

echo ""
echo "✅ Verificación completada para: $APP_URL"
