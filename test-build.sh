#!/bin/bash
echo "🧪 Iniciando test de build Docker..."
echo ""
echo "📦 Verificando archivos necesarios..."
echo ""

# Verificar archivos críticos
FILES=(
    "app/package.json"
    "app/package-lock.json"
    "app/prisma/schema.prisma"
    "app/next.config.js"
    "Dockerfile"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file existe"
    else
        echo "❌ $file NO EXISTE"
        exit 1
    fi
done

echo ""
echo "📊 Información de archivos:"
echo "- package.json: $(wc -l < app/package.json) líneas"
echo "- schema.prisma: $(wc -l < app/prisma/schema.prisma) líneas"
echo "- Dockerfile: $(wc -l < Dockerfile) líneas"

echo ""
echo "🔍 Verificando estructura de schema.prisma..."
if grep -q "enum UserRole" app/prisma/schema.prisma; then
    echo "✅ enum UserRole encontrado en schema"
else
    echo "❌ enum UserRole NO encontrado en schema"
fi

if grep -q "enum StatusCuenta" app/prisma/schema.prisma; then
    echo "✅ enum StatusCuenta encontrado en schema"
else
    echo "❌ enum StatusCuenta NO encontrado en schema"
fi

echo ""
echo "✅ Validación pre-build completada"
echo ""
echo "💡 Para hacer build local, ejecuta:"
echo "   docker build -t muebleria-test ."
