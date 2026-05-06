
#!/bin/bash
set -e

echo "🚀 Iniciando despliegue de VertexERP Muebles..."

# Wait for database to be ready
echo "⏳ Esperando conexión a la base de datos..."
npx prisma db push --accept-data-loss

# Run database migrations
echo "🔄 Ejecutando migraciones de base de datos..."
npx prisma migrate deploy

# Generate Prisma client
echo "📦 Generando cliente de Prisma..."
npx prisma generate

echo "✅ Configuración completada, iniciando aplicación..."

# Start the application
if [ -z "$*" ]; then
  exec npm start
else
  exec "$@"
fi

