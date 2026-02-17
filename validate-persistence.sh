
#!/bin/bash

# ================================
# VALIDAR CONFIGURACIÓN DE PERSISTENCIA
# Verifica volúmenes, backups y estado de la base de datos
# ================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  VALIDACIÓN DE PERSISTENCIA${NC}"
echo -e "${BLUE}================================${NC}"

# Verificar docker-compose.yml
echo -e "\n${YELLOW}📄 Verificando docker-compose.yml...${NC}"
if grep -q "postgres_data:/var/lib/postgresql/data" docker-compose.yml; then
    echo -e "${GREEN}✅ Volumen de PostgreSQL configurado correctamente${NC}"
else
    echo -e "${RED}❌ Volumen de PostgreSQL NO configurado${NC}"
    exit 1
fi

# Verificar volúmenes de Docker
echo -e "\n${YELLOW}📦 Verificando volúmenes de Docker...${NC}"
if docker volume ls | grep -q "postgres_data"; then
    VOLUME_NAME=$(docker volume ls | grep "postgres_data" | awk '{print $2}')
    VOLUME_SIZE=$(docker system df -v | grep "$VOLUME_NAME" | awk '{print $3}')
    echo -e "${GREEN}✅ Volumen encontrado: ${VOLUME_NAME}${NC}"
    echo -e "   📊 Tamaño: ${VOLUME_SIZE}"
else
    echo -e "${YELLOW}⚠️  Volumen no encontrado (se creará al iniciar Docker Compose)${NC}"
fi

# Verificar estado de contenedores
echo -e "\n${YELLOW}🐳 Verificando contenedores...${NC}"
if docker compose ps postgres | grep -q "Up"; then
    echo -e "${GREEN}✅ Contenedor PostgreSQL está corriendo${NC}"
    
    # Verificar conexión a la base de datos
    if docker compose exec postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Base de datos respondiendo correctamente${NC}"
        
        # Obtener estadísticas de la base de datos
        echo -e "\n${YELLOW}📊 Estadísticas de la base de datos:${NC}"
        docker compose exec -T postgres psql -U postgres -d muebleria_db -c "
SELECT 
    'Usuarios' as tabla,
    COUNT(*) as registros
FROM \"User\"
UNION ALL
SELECT 
    'Clientes' as tabla,
    COUNT(*) as registros
FROM \"Cliente\"
UNION ALL
SELECT 
    'Pagos' as tabla,
    COUNT(*) as registros
FROM \"Pago\"
ORDER BY tabla;" 2>/dev/null || echo -e "${YELLOW}   (Base de datos vacía o no inicializada)${NC}"
        
    else
        echo -e "${RED}❌ Base de datos no responde${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Contenedor PostgreSQL no está corriendo${NC}"
    echo -e "   Ejecuta: ${BLUE}docker compose up -d${NC}"
fi

# Verificar directorio de backups
echo -e "\n${YELLOW}💾 Verificando sistema de respaldos...${NC}"
if [ -d "backups" ]; then
    BACKUP_COUNT=$(ls -1 backups/backup_*.sql.gz 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ Directorio de backups existe${NC}"
    echo -e "   📁 Backups disponibles: ${BACKUP_COUNT}"
    
    if [ $BACKUP_COUNT -gt 0 ]; then
        LATEST_BACKUP=$(ls -t backups/backup_*.sql.gz 2>/dev/null | head -1)
        BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
        BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" | cut -d' ' -f1,2 | cut -d'.' -f1)
        echo -e "   📄 Último backup: $(basename $LATEST_BACKUP)"
        echo -e "   📊 Tamaño: ${BACKUP_SIZE}"
        echo -e "   📅 Fecha: ${BACKUP_DATE}"
    fi
else
    echo -e "${YELLOW}⚠️  Directorio de backups no existe${NC}"
    echo -e "   Se creará automáticamente al hacer el primer backup"
fi

# Verificar cron jobs
echo -e "\n${YELLOW}⏰ Verificando backups automáticos...${NC}"
if crontab -l 2>/dev/null | grep -q "backup-database.sh"; then
    echo -e "${GREEN}✅ Backup automático configurado${NC}"
    echo -e "   $(crontab -l | grep backup-database.sh)"
else
    echo -e "${YELLOW}⚠️  No hay backups automáticos configurados${NC}"
    echo -e "   Ejecuta: ${BLUE}./cron-backup.sh${NC} para configurarlos"
fi

# Verificar scripts
echo -e "\n${YELLOW}🔧 Verificando scripts disponibles...${NC}"
SCRIPTS=(
    "backup-database.sh:Crear respaldo manual"
    "restore-database.sh:Restaurar desde respaldo"
    "run-seed-safe.sh:Ejecutar seed seguro"
    "cron-backup.sh:Configurar backups automáticos"
    "validate-persistence.sh:Validar configuración (este script)"
)

for SCRIPT_INFO in "${SCRIPTS[@]}"; do
    SCRIPT=$(echo $SCRIPT_INFO | cut -d':' -f1)
    DESC=$(echo $SCRIPT_INFO | cut -d':' -f2)
    if [ -f "$SCRIPT" ] && [ -x "$SCRIPT" ]; then
        echo -e "${GREEN}✅${NC} ${SCRIPT} - ${DESC}"
    else
        echo -e "${RED}❌${NC} ${SCRIPT} - ${DESC}"
    fi
done

# Resumen final
echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}  RESUMEN DE PERSISTENCIA${NC}"
echo -e "${BLUE}================================${NC}"

ISSUES=0

# Validaciones críticas
if ! grep -q "postgres_data:/var/lib/postgresql/data" docker-compose.yml; then
    echo -e "${RED}❌ Configuración de volumen en docker-compose.yml${NC}"
    ISSUES=$((ISSUES + 1))
fi

if ! docker compose ps postgres 2>/dev/null | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  PostgreSQL no está corriendo${NC}"
    echo -e "   Esto es normal si no has iniciado los servicios aún"
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "\n${GREEN}✅ CONFIGURACIÓN CORRECTA${NC}"
    echo -e "${GREEN}   Tu base de datos está configurada para persistencia${NC}"
    echo -e "${GREEN}   Los datos NO se perderán en los deploys${NC}"
else
    echo -e "\n${RED}❌ SE ENCONTRARON $ISSUES PROBLEMA(S)${NC}"
    echo -e "${YELLOW}   Revisa los mensajes anteriores${NC}"
    exit 1
fi

echo -e "\n${BLUE}================================${NC}"
echo -e "${YELLOW}Comandos útiles:${NC}"
echo -e "  ${BLUE}./backup-database.sh${NC}     - Crear respaldo ahora"
echo -e "  ${BLUE}./restore-database.sh${NC}    - Restaurar desde respaldo"
echo -e "  ${BLUE}./run-seed-safe.sh${NC}       - Ejecutar seed (sin borrar datos)"
echo -e "  ${BLUE}./cron-backup.sh${NC}         - Configurar backups automáticos"
echo -e "${BLUE}================================${NC}"
