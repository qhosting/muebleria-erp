
#!/bin/bash

# 🔧 Script para hacer push del yarn.lock fix
# Ejecutar: bash fix-push-yarn-lock.sh TU_GITHUB_TOKEN

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Proporciona tu GitHub token"
    echo "Uso: bash fix-push-yarn-lock.sh TU_GITHUB_TOKEN"
    echo ""
    echo "📋 Para obtener token:"
    echo "1. Ve a GitHub.com > Settings > Developer settings"
    echo "2. Personal access tokens > Tokens (classic)"
    echo "3. Generate new token con permisos 'repo'"
    exit 1
fi

GITHUB_TOKEN="$1"

echo "🚀 Configurando repositorio con nuevo token..."
cd /home/ubuntu/muebleria_la_economica

# Configurar remote con token
git remote set-url origin "https://qhosting:${GITHUB_TOKEN}@github.com/qhosting/muebleria-la-economica.git"

echo "📤 Haciendo push del yarn.lock fix..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! yarn.lock fix pusheado a GitHub"
    echo ""
    echo "🎯 PRÓXIMO PASO:"
    echo "1. Ve a Coolify: http://38.242.250.40:8000"
    echo "2. Navega a tu aplicación 'laeconomica'"
    echo "3. Clic en 'Deploy' - el build ahora funcionará"
    echo ""
    echo "🔧 PROBLEMA SOLUCIONADO:"
    echo "- yarn.lock ya no es symlink, es archivo real"
    echo "- Docker build en Coolify funcionará correctamente"
else
    echo "❌ Error en push. Verifica tu token."
fi
