
#!/bin/bash

echo "🚀 Script para actualizar repositorio GitHub"
echo "============================================="

# Verificar estado
echo "📋 Estado actual del repositorio:"
git status

echo ""
echo "📦 Commits pendientes para push:"
git log origin/main..HEAD --oneline 2>/dev/null || echo "No se puede verificar commits remotos"

echo ""
echo "🔑 OPCIONES PARA HACER PUSH:"
echo ""
echo "1️⃣  OPCIÓN 1: Usar token temporal (recomendado)"
echo "   git push https://[TU_TOKEN]@github.com/qhosting/muebleria-la-economica.git main"
echo ""
echo "2️⃣  OPCIÓN 2: Configurar credenciales permanentes"
echo "   git config --global user.name 'Tu Nombre'"
echo "   git config --global user.email 'tu@email.com'"
echo "   git push origin main"
echo ""
echo "3️⃣  OPCIÓN 3: Usar GitHub CLI (si tienes gh instalado)"
echo "   gh auth login"
echo "   git push origin main"

echo ""
echo "🌐 URL del repositorio: https://github.com/qhosting/muebleria-la-economica"
echo ""
echo "📝 Para obtener un token:"
echo "   1. Ve a https://github.com/settings/tokens"
echo "   2. Crea un 'Personal access token (classic)'"
echo "   3. Selecciona permisos: repo"
echo "   4. Copia el token generado"

echo ""
echo "✅ Commits listos para subir:"
git log --oneline -3
