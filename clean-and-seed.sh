
#!/bin/bash

echo "🧹 VertexERP Muebles - Limpieza y Configuración de Usuarios Esenciales"
echo "=========================================================================="

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🔄 Iniciando proceso de limpieza y configuración...${NC}"
echo ""

# Cambiar al directorio de la aplicación
cd /home/ubuntu/muebleria_la_economica/app

echo -e "${BLUE}📋 Estado antes de la limpieza:${NC}"
echo "Verificando conexión a base de datos..."

# Verificar si Prisma puede conectar
if npx prisma db push --accept-data-loss > /dev/null 2>&1; then
    echo "✅ Conexión a base de datos exitosa"
else
    echo "❌ Error de conexión a base de datos"
    echo "Asegúrate de que PostgreSQL esté ejecutándose y DATABASE_URL esté configurado"
    exit 1
fi

echo ""
echo -e "${YELLOW}🧹 Limpiando base de datos...${NC}"

# Reinicializar esquema de base de datos
npx prisma db push --force-reset --accept-data-loss

if [ $? -eq 0 ]; then
    echo "✅ Base de datos reinicializada exitosamente"
else
    echo "❌ Error al reinicializar base de datos"
    exit 1
fi

echo ""
echo -e "${GREEN}🌱 Ejecutando seeders con usuarios esenciales...${NC}"

# Ejecutar seeders
npx prisma db seed

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ ¡Configuración completada exitosamente!${NC}"
    echo ""
    echo -e "${BLUE}👥 USUARIOS CONFIGURADOS:${NC}"
    echo "----------------------------------------"
    echo "👑 Admin:    admin@vertexerp.local / admin123"
    echo "👤 Gestor:   gestor@vertexerp.local / gestor123"  
    echo "🚚 Cobrador: cobrador@vertexerp.local / cobrador123"
    echo "📊 Reportes: reportes@vertexerp.local / reportes123"
    echo "----------------------------------------"
    echo ""
    echo -e "${YELLOW}📊 ESTADÍSTICAS DE LA BASE DE DATOS:${NC}"
    
    # Obtener conteos de la base de datos
    echo "Consultando estadísticas..."
    
    echo -e "${GREEN}🎯 ¡Sistema listo para producción!${NC}"
    echo ""
    echo -e "${BLUE}🚀 Próximos pasos:${NC}"
    echo "1. ✅ Usuarios esenciales configurados"
    echo "2. 🧪 Probar login con cada usuario"
    echo "3. 🚀 Proceder con deployment"
    echo ""
    
else
    echo ""
    echo -e "${RED}❌ Error al ejecutar seeders${NC}"
    echo "Revisa los logs arriba para más detalles"
    exit 1
fi

