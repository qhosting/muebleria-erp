
#!/bin/bash

echo "🔍 DIAGNOSTICANDO PROBLEMA: 'no available server'"
echo "=============================================="

echo ""
echo "📋 1. VERIFICANDO ESTADO DEL DEPLOYMENT:"
echo "Commit actual: d8d7d813827a3f9eb732782062a8832d8d823f75"
echo "URL: https://app.mueblerialaeconomica.com"
echo "Status: HTTP 503 - Service Unavailable"

echo ""
echo "📋 2. POSIBLES CAUSAS:"
echo "❌ Container crashed durante el startup"
echo "❌ Puerto 3000 no está respondiendo"  
echo "❌ start.sh script falló"
echo "❌ Variables de entorno faltantes"
echo "❌ Error en la aplicación Next.js"

echo ""
echo "📋 3. ACCIONES INMEDIATAS REQUERIDAS:"
echo "🔧 1. Verificar logs del container en Coolify"
echo "🔧 2. Revisar variables de entorno DATABASE_URL"
echo "🔧 3. Verificar start.sh script"
echo "🔧 4. Revisar conexión a PostgreSQL"
echo "🔧 5. Re-deploy si es necesario"

echo ""
echo "📋 4. COMO ACCEDER A LOS LOGS:"
echo "✅ Ve a: http://38.242.250.40:8000"
echo "✅ EscalaFin → App 'laeconomica'"  
echo "✅ Tab 'Logs' → Ver últimos logs del container"
echo "✅ Buscar errores de startup"

echo ""
echo "📋 5. VARIABLES DE ENTORNO CRITICAS:"
echo "DATABASE_URL=postgresql://..."
echo "NEXTAUTH_URL=https://app.mueblerialaeconomica.com"
echo "NEXTAUTH_SECRET=..."
echo ""

echo "🚨 DEPLOYMENT STATUS: FAILED - APPLICATION NOT RESPONDING"
echo "🔧 NEXT ACTION: CHECK CONTAINER LOGS IN COOLIFY"
