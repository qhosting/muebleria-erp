
#!/bin/bash

# Script para probar login de todos los perfiles
echo "🔍 Probando login de todos los perfiles..."
echo ""

BASE_URL="http://localhost:3000"

# Usuarios de prueba
declare -A usuarios=(
    ["admin"]="admin@vertexerp.local:admin123"
    ["gestor"]="gestor@vertexerp.local:gestor123"
    ["cobrador"]="cobrador@vertexerp.local:cobrador123"
    ["reportes"]="reportes@vertexerp.local:reportes123"
)

for rol in "${!usuarios[@]}"; do
    IFS=':' read -r email password <<< "${usuarios[$rol]}"
    
    echo "👤 Probando $rol: $email"
    
    # Obtener CSRF token
    csrf_response=$(curl -s "$BASE_URL/api/auth/csrf")
    csrf_token=$(echo "$csrf_response" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$csrf_token" ]; then
        echo "   ❌ Error: No se pudo obtener CSRF token"
        echo ""
        continue
    fi
    
    # Intentar login
    login_response=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "email=$email&password=$password&csrfToken=$csrf_token&callbackUrl=$BASE_URL/dashboard&json=true" \
        "$BASE_URL/api/auth/callback/credentials")
    
    if [ "$login_response" = "200" ] || [ "$login_response" = "302" ]; then
        echo "   ✅ Login exitoso para $rol (HTTP: $login_response)"
    else
        echo "   ❌ Error en login para $rol (HTTP: $login_response)"
    fi
    
    echo ""
done

echo "🏁 Pruebas de login completadas"
