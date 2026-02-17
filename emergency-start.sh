
#!/bin/sh

echo "🚨 EMERGENCY START - Diagnóstico y Fix"
echo "====================================="

# Verificar entorno
echo "📋 Verificando entorno de ejecución..."
echo "NODE_ENV: $NODE_ENV"
echo "HOSTNAME: $HOSTNAME" 
echo "PORT: $PORT"
echo "PWD: $(pwd)"

# Listar contenido completo
echo ""
echo "📁 Contenido del directorio de trabajo:"
ls -la

echo ""
echo "📁 Verificando si existe .next/standalone:"
if [ -d ".next/standalone" ]; then
    echo "✅ .next/standalone EXISTS"
    ls -la .next/standalone/
else
    echo "❌ .next/standalone NO EXISTE"
    echo "📁 Contenido de .next/:"
    ls -la .next/ || echo "❌ .next directory no existe"
fi

# Verificar server.js
echo ""
echo "🔍 Buscando server.js..."
if [ -f "server.js" ]; then
    echo "✅ server.js encontrado en directorio raíz"
elif [ -f ".next/standalone/server.js" ]; then
    echo "✅ server.js encontrado en .next/standalone/"
    echo "🔧 Copiando server.js al directorio raíz..."
    cp .next/standalone/server.js .
    cp -r .next/standalone/.next .
else
    echo "❌ server.js NO ENCONTRADO - Build standalone falló"
fi

# Verificar variables críticas
echo ""
echo "🔍 Verificando variables de entorno críticas..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL no está definida"
else
    echo "✅ DATABASE_URL está configurada"
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
    echo "❌ NEXTAUTH_SECRET no está definida"
else
    echo "✅ NEXTAUTH_SECRET está configurada"
fi

# Configure PATH to include node_modules/.bin for Prisma CLI
export PATH="$PATH:/app/node_modules/.bin"
echo "📍 PATH configurado con Prisma local: $PATH"

# Verify .bin directory and Prisma CLI exist with fallbacks
echo "🔍 Verificando Prisma CLI disponible..."
if [ -f "node_modules/.bin/prisma" ]; then
    echo "✅ Prisma CLI encontrado en node_modules/.bin/prisma"
    PRISMA_CMD="node_modules/.bin/prisma"
elif [ -f "node_modules/prisma/build/index.js" ]; then
    echo "⚠️  Usando Prisma directamente desde build/index.js"
    PRISMA_CMD="node node_modules/prisma/build/index.js"
else
    echo "❌ Prisma CLI no encontrado - intentando con npx (puede causar permission errors)"
    PRISMA_CMD="npx prisma"
fi

echo "🎯 Comando Prisma configurado: $PRISMA_CMD"

# Verificar y reparar cliente Prisma
echo ""
echo "🔧 Verificando instalación de Prisma..."
if [ ! -d "node_modules/@prisma/client" ]; then
    echo "❌ Cliente Prisma no encontrado, intentando reparar..."
    npm install @prisma/client || echo "⚠️  Error instalando @prisma/client"
    $PRISMA_CMD generate || echo "⚠️  Error generando cliente"
fi

# Verificar archivos críticos de Prisma
echo "🔍 Verificando archivos runtime de Prisma..."
find node_modules/@prisma -name "*.wasm*" 2>/dev/null || echo "⚠️  Archivos WASM no encontrados"
find node_modules/.prisma -name "*.js" 2>/dev/null | head -3 || echo "⚠️  Archivos JS no encontrados"
ls -la node_modules/.bin/prisma 2>/dev/null || echo "⚠️  Prisma CLI no encontrado en .bin"

# Verificar base de datos con manejo de P3005
echo ""
echo "📊 Probando conexión a la base de datos..."
echo "🔧 Usando db push para base de datos existente (evita P3005)..."
timeout 15 $PRISMA_CMD db push --accept-data-loss || echo "⚠️  Timeout o error en conexión DB - continuando..."

# Intentar diferentes métodos de inicio
echo ""
echo "🚀 Intentando iniciar la aplicación..."

if [ -f "server.js" ]; then
    echo "✅ Método 1: Iniciando con server.js standalone"
    exec node server.js
elif [ -f ".next/standalone/server.js" ]; then
    echo "✅ Método 2: Iniciando desde .next/standalone/"
    cd .next/standalone
    exec node server.js
else
    echo "⚠️  Método 3: Fallback a next start"
    exec npx next start
fi
