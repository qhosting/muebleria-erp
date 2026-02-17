#!/bin/bash

echo "=========================================="
echo "🔍 DIAGNÓSTICO DE BUILD"
echo "=========================================="
echo ""

echo "📋 1. Verificando next.config.js"
echo "=========================================="
cat app/next.config.js | grep -A5 -B5 "output:"
echo ""

echo "📦 2. Verificando package.json scripts"
echo "=========================================="
cat app/package.json | grep -A10 "scripts"
echo ""

echo "📁 3. Verificando estructura del proyecto"
echo "=========================================="
ls -la app/ | head -20
echo ""

echo "🔧 4. Verificando Prisma schema"
echo "=========================================="
ls -la app/prisma/
echo ""

echo "🚀 5. Intentando build simulado (sin standalone check)"
echo "=========================================="
cd app
echo "Instalando dependencias..."
yarn install --frozen-lockfile || echo "⚠️ Error en yarn install"
echo ""

echo "Generando Prisma client..."
npx prisma generate || echo "⚠️ Error en prisma generate"
echo ""

echo "Ejecutando build de Next.js..."
NODE_ENV=production yarn build 2>&1 | tee /tmp/build-output.log
BUILD_EXIT_CODE=${PIPESTATUS[0]}
echo ""

echo "=========================================="
echo "📊 RESULTADO DEL BUILD"
echo "=========================================="
echo "Exit code: $BUILD_EXIT_CODE"
echo ""

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ Build completado exitosamente"
    echo ""
    echo "📁 Verificando estructura .next:"
    ls -la .next/ | head -20
    echo ""
    
    if [ -d ".next/standalone" ]; then
        echo "✅ Directorio standalone encontrado!"
        ls -la .next/standalone/ | head -20
        echo ""
        echo "📄 Buscando server.js:"
        find .next/standalone -name "server.js" -type f
    else
        echo "❌ Directorio standalone NO encontrado"
        echo "Posibles razones:"
        echo "1. output: 'standalone' no está en next.config.js"
        echo "2. Next.js version no soporta standalone"
        echo "3. Error durante el build que no fue capturado"
    fi
else
    echo "❌ Build FALLÓ con exit code: $BUILD_EXIT_CODE"
    echo ""
    echo "📋 Últimas 50 líneas del build:"
    tail -50 /tmp/build-output.log
fi

echo ""
echo "=========================================="
echo "✅ Diagnóstico completo"
echo "=========================================="
