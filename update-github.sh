
#!/bin/bash

echo "🚀 Actualizando repositorio GitHub..."

# Verificar que estamos en el directorio correcto
if [ ! -d ".git" ]; then
    echo "❌ Error: No se encuentra el repositorio Git"
    exit 1
fi

# Mostrar estado actual
echo "📋 Estado actual del repositorio:"
git status

# Verificar si hay commits para hacer push
git log origin/main..HEAD --oneline > /dev/null 2>&1
if [ $? -eq 0 ] && [ -n "$(git log origin/main..HEAD --oneline)" ]; then
    echo "📦 Commits pendientes encontrados:"
    git log origin/main..HEAD --oneline
    echo ""
    echo "🔑 Para hacer push, necesitas un token de GitHub."
    echo "   1. Ve a https://github.com/settings/tokens"
    echo "   2. Genera un token con permisos 'repo'"
    echo "   3. Ejecuta: git push https://[TOKEN]@github.com/qhosting/muebleria-la-economica.git main"
    echo ""
    echo "   O configura credenciales con:"
    echo "   git config --global credential.helper store"
    echo "   git push origin main"
else
    echo "✅ El repositorio está actualizado"
fi

echo ""
echo "📊 Últimos 5 commits:"
git log --oneline -5

echo ""
echo "🌐 URL del repositorio: https://github.com/qhosting/muebleria-la-economica"
