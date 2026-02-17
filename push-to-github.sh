
#!/bin/bash
set -e

echo "🚀 Push a GitHub: https://github.com/qhosting/muebleria-la-economica"
echo "=================================================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "Dockerfile" ]; then
    echo "❌ Error: Ejecuta este script desde el directorio del proyecto."
    exit 1
fi

# Verificar configuración de Git
echo "👤 Configuración de Git actual:"
echo "   Nombre: $(git config user.name || echo 'NO CONFIGURADO')"
echo "   Email: $(git config user.email || echo 'NO CONFIGURADO')"
echo ""

# Configurar Git si no está configurado
if [ -z "$(git config user.name)" ] || [ -z "$(git config user.email)" ]; then
    echo "🔧 Configurando Git..."
    read -p "Tu nombre para Git: " git_name
    read -p "Tu email para Git: " git_email
    git config user.name "$git_name"
    git config user.email "$git_email"
    echo "✅ Git configurado correctamente"
fi

# Mostrar información del repositorio
echo "📊 Estado del repositorio local:"
echo "   Rama actual: $(git branch --show-current)"
echo "   Último commit: $(git log --oneline -1)"
echo "   Remote configurado: $(git remote get-url origin)"
echo ""

# Mostrar archivos principales incluidos
echo "📁 Archivos principales para Coolify incluidos:"
echo "   ✅ Dockerfile"
echo "   ✅ docker-compose.yml"
echo "   ✅ .coolify/docker-compose.yml"
echo "   ✅ README-COOLIFY.md"
echo "   ✅ .env.example"
echo "   ✅ .gitignore / .dockerignore"
echo ""

echo "⚠️  OPCIONES PARA HACER PUSH:"
echo ""

echo "🔑 OPCIÓN 1 - Con Token (GitHub CLI o manual):"
echo "   git push -u origin main"
echo "   (Te pedirá usuario y contraseña/token)"
echo ""

echo "🔐 OPCIÓN 2 - Con SSH (si tienes SSH key configurada):"
echo "   git remote set-url origin git@github.com:qhosting/muebleria-la-economica.git"
echo "   git push -u origin main"
echo ""

echo "💻 OPCIÓN 3 - Con GitHub CLI (si está instalado):"
echo "   gh repo create qhosting/muebleria-la-economica --private"
echo "   git push -u origin main"
echo ""

read -p "¿Quieres intentar hacer push ahora? (y/n): " do_push

if [ "$do_push" = "y" ] || [ "$do_push" = "Y" ]; then
    echo ""
    echo "🚀 Intentando push a GitHub..."
    echo "   Si te pide credenciales, usa tu usuario de GitHub y el token como contraseña"
    echo ""
    
    # Intentar push
    if git push -u origin main; then
        echo ""
        echo "✅ ¡Push exitoso!"
        echo "🌐 Tu repositorio está en: https://github.com/qhosting/muebleria-la-economica"
        echo ""
        echo "📋 Próximos pasos para Coolify:"
        echo "   1. Ir a Coolify Dashboard"
        echo "   2. Nueva Aplicación → Git Repository"
        echo "   3. URL: https://github.com/qhosting/muebleria-la-economica.git"
        echo "   4. Configurar variables de entorno"
        echo "   5. Deploy!"
    else
        echo ""
        echo "❌ Error en el push. Posibles causas:"
        echo "   - Token expirado o inválido"
        echo "   - Repositorio no existe en GitHub"
        echo "   - Sin permisos de escritura"
        echo ""
        echo "💡 Soluciones:"
        echo "   - Crea el repositorio en GitHub primero"
        echo "   - Verifica que el token tenga permisos de 'repo'"
        echo "   - Usa tu username de GitHub y el token como contraseña"
    fi
else
    echo ""
    echo "⏸️  Push cancelado."
    echo "🔗 El remote ya está configurado para: https://github.com/qhosting/muebleria-la-economica.git"
    echo "💡 Puedes hacer push manualmente cuando estés listo con: git push -u origin main"
fi

echo ""
echo "📖 Consulta README-COOLIFY.md para instrucciones completas de deployment"
