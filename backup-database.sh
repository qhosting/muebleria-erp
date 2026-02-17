
#!/bin/bash

# ================================
# SCRIPT DE RESPALDO AUTOMÁTICO
# Mueblería La Económica
# ================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
BACKUP_DIR="./backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sql"
LATEST_LINK="${BACKUP_DIR}/latest.sql"

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  RESPALDO DE BASE DE DATOS${NC}"
echo -e "${BLUE}================================${NC}"

# Crear directorio de backups si no existe
mkdir -p "${BACKUP_DIR}"

# Verificar si el contenedor está corriendo
if ! docker compose ps postgres | grep -q "Up"; then
    echo -e "${RED}❌ El contenedor de PostgreSQL no está corriendo${NC}"
    echo -e "${YELLOW}   Ejecuta: docker compose up -d postgres${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Creando respaldo...${NC}"

# Crear el backup
docker compose exec -T postgres pg_dump \
    -U "${POSTGRES_USER:-postgres}" \
    -d "${POSTGRES_DB:-muebleria_db}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    > "${BACKUP_FILE}"

# Comprimir el backup
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Crear enlace simbólico al último backup
ln -sf "$(basename ${BACKUP_FILE})" "${LATEST_LINK}.gz"

# Obtener tamaño del archivo
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo -e "${GREEN}✅ Respaldo creado exitosamente${NC}"
echo -e "   📁 Archivo: ${BACKUP_FILE}"
echo -e "   📊 Tamaño: ${BACKUP_SIZE}"

# Limpiar backups antiguos (mantener últimos 30)
echo -e "${YELLOW}🧹 Limpiando respaldos antiguos...${NC}"
cd "${BACKUP_DIR}"
ls -t backup_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm
BACKUP_COUNT=$(ls -1 backup_*.sql.gz 2>/dev/null | wc -l)
cd - > /dev/null

echo -e "${GREEN}✅ Respaldos mantenidos: ${BACKUP_COUNT}${NC}"
echo -e "${BLUE}================================${NC}"
