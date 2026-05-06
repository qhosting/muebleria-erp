
#!/bin/bash

echo "🚀 VertexERP Muebles - Deployment Script"
echo "=============================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 INFORMACIÓN DEL DEPLOYMENT:${NC}"
echo "Repositorio: https://github.com/qhosting/muebleria-la-economica.git"
echo "Rama: main"
echo "Build Pack: Docker"
echo ""

echo -e "${YELLOW}🔑 VARIABLES DE ENTORNO REQUERIDAS:${NC}"
echo ""
echo "# Base de datos (Coolify la generará automáticamente)"
echo "DATABASE_URL=postgresql://usuario:password@postgres:5432/muebleria_db"
echo ""
echo "# NextAuth (CRÍTICO - actualizar con URL real después del deploy)"
echo "NEXTAUTH_URL=https://tu-app.coolify.com"
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo 'genera-un-secreto-de-32-caracteres-aqui')"
echo ""
echo "# Configuración"
echo "NODE_ENV=production"
echo "PORT=3000"
echo ""

echo -e "${YELLOW}👥 USUARIOS ESENCIALES DEL SISTEMA:${NC}"
echo "Admin:    admin@vertexerp.local / admin123"
echo "Gestor:   gestor@vertexerp.local / gestor123" 
echo "Cobrador: cobrador@vertexerp.local / cobrador123"
echo "Reportes: reportes@vertexerp.local / reportes123"
echo ""

echo -e "${GREEN}✅ PASOS PARA DEPLOYMENT EN COOLIFY:${NC}"
echo ""
echo "1️⃣  Ir al panel de Coolify"
echo "2️⃣  Crear 'New Application'"
echo "3️⃣  Seleccionar 'Public Repository'"
echo "4️⃣  URL: https://github.com/qhosting/muebleria-la-economica.git"
echo "5️⃣  Rama: main"
echo "6️⃣  Build Pack: Docker"
echo "7️⃣  Agregar PostgreSQL 15 como servicio"
echo "8️⃣  Configurar variables de entorno (mostradas arriba)"
echo "9️⃣  Hacer clic en 'Deploy'"
echo "🔟 Actualizar NEXTAUTH_URL con la URL real asignada"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANTE DESPUÉS DEL DEPLOYMENT:${NC}"
echo "- Cambiar passwords por defecto"
echo "- Actualizar NEXTAUTH_URL con dominio real"
echo "- Probar funcionalidades en móvil"
echo "- Verificar sincronización de datos"
echo ""

echo -e "${GREEN}🎯 ¡Tu aplicación está lista para producción!${NC}"

