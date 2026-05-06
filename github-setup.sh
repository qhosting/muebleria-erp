
#!/bin/bash
set -e

echo "🚀 Configuración de GitHub para VertexERP Muebles"
echo "=================================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Ejecuta este script desde el directorio del proyecto."
    exit 1
fi

# Variables (CAMBIAR ESTOS VALORES)
GITHUB_USERNAME="TU-USUARIO-GITHUB"
REPO_NAME="muebleria-la-economica"

echo "⚠️  IMPORTANTE: Antes de continuar:"
echo "   1. Crea el repositorio 'muebleria-la-economica' en GitHub"
echo "   2. Reemplaza TU-USUARIO-GITHUB con tu usuario real"
echo "   3. Revoca el token expuesto y crea uno nuevo"
echo ""

# Configurar git si no está configurado
if [ -z "$(git config user.name)" ]; then
    echo "🔧 Configurando Git..."
    read -p "Tu nombre para Git: " git_name
    read -p "Tu email para Git: " git_email
    git config user.name "$git_name"
    git config user.email "$git_email"
fi

echo "📦 Usuario Git configurado:"
echo "   Nombre: $(git config user.name)"
echo "   Email: $(git config user.email)"

# Cambiar de master a main (estándar moderno)
echo "🔄 Cambiando rama a 'main'..."
git branch -M main

# Agregar todos los archivos
echo "📁 Agregando archivos al commit..."
git add .

# Verificar si hay cambios para commit
if git diff --staged --quiet; then
    echo "✅ No hay cambios nuevos para commit"
else
    echo "💾 Creando commit con archivos de Coolify..."
    git commit -m "feat: Configuración completa para deploy en Coolify

- Dockerfile optimizado para producción
- docker-compose.yml para desarrollo local
- Configuración específica de Coolify
- Scripts de despliegue automático
- Documentación completa de deployment
- Archivos de configuración (.gitignore, .dockerignore)
- Variables de entorno de ejemplo"
fi

# Mostrar repositorio a conectar
echo ""
echo "🔗 Comandos para conectar con GitHub:"
echo "   git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo "   git push -u origin main"
echo ""

# Preguntar si continuar con la conexión
read -p "¿Has creado el repositorio en GitHub? (y/n): " created_repo

if [ "$created_repo" = "y" ] || [ "$created_repo" = "Y" ]; then
    # Verificar si ya existe el remote
    if git remote get-url origin 2>/dev/null; then
        echo "🔄 Remote origin ya existe, actualizando..."
        git remote set-url origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git
    else
        echo "🔗 Agregando remote origin..."
        git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git
    fi
    
    echo "📤 Haciendo push inicial a GitHub..."
    git push -u origin main
    
    echo ""
    echo "✅ ¡Repositorio subido exitosamente!"
    echo "🌐 URL del repositorio: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo ""
    echo "📋 Próximos pasos:"
    echo "   1. Ir a Coolify"
    echo "   2. Crear nueva aplicación con este repositorio"
    echo "   3. Configurar variables de entorno"
    echo "   4. Deploy!"
else
    echo "⏸️  Proceso pausado. Primero crea el repositorio en GitHub."
fi

