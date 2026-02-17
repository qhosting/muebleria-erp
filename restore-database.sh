
#!/bin/bash

# ================================
# SCRIPT DE RESTAURACIÓN
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

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  RESTAURAR BASE DE DATOS${NC}"
echo -e "${BLUE}================================${NC}"

# Verificar que existe el directorio de backups
if [ ! -d "${BACKUP_DIR}" ]; then
    echo -e "${RED}❌ No se encontró el directorio de backups${NC}"
    exit 1
fi

# Listar backups disponibles
echo -e "${YELLOW}📋 Backups disponibles:${NC}"
echo ""
cd "${BACKUP_DIR}"
BACKUPS=($(ls -t backup_*.sql.gz 2>/dev/null))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo -e "${RED}❌ No hay backups disponibles${NC}"
    exit 1
fi

# Mostrar lista numerada
for i in "${!BACKUPS[@]}"; do
    SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
    DATE_STR=$(echo "${BACKUPS[$i]}" | sed 's/backup_\(.*\)\.sql\.gz/\1/' | tr '_' ' ')
    echo -e "  ${BLUE}[$((i+1))]${NC} ${BACKUPS[$i]} (${SIZE}) - ${DATE_STR}"
done

echo ""
echo -e "${YELLOW}También puedes usar:${NC}"
echo -e "  ${BLUE}[L]${NC} Último backup (latest)"
echo ""

# Solicitar selección
read -p "Selecciona el número del backup a restaurar (o 'L' para el último): " SELECTION

cd - > /dev/null

# Determinar archivo a restaurar
if [[ "$SELECTION" =~ ^[Ll]$ ]]; then
    BACKUP_FILE="${BACKUP_DIR}/latest.sql.gz"
    if [ ! -f "${BACKUP_FILE}" ]; then
        echo -e "${RED}❌ No se encontró el enlace al último backup${NC}"
        exit 1
    fi
    BACKUP_FILE=$(readlink -f "${BACKUP_FILE}")
elif [[ "$SELECTION" =~ ^[0-9]+$ ]] && [ "$SELECTION" -ge 1 ] && [ "$SELECTION" -le "${#BACKUPS[@]}" ]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUPS[$((SELECTION-1))]}"
else
    echo -e "${RED}❌ Selección inválida${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⚠️  ADVERTENCIA:${NC}"
echo -e "   Esta operación eliminará TODOS los datos actuales"
echo -e "   y los reemplazará con el backup seleccionado:"
echo -e "   ${BLUE}$(basename ${BACKUP_FILE})${NC}"
echo ""
read -p "¿Estás seguro? (escribe 'SI' para continuar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo -e "${YELLOW}❌ Operación cancelada${NC}"
    exit 0
fi

# Verificar si el contenedor está corriendo
if ! docker compose ps postgres | grep -q "Up"; then
    echo -e "${RED}❌ El contenedor de PostgreSQL no está corriendo${NC}"
    echo -e "${YELLOW}   Ejecuta: docker compose up -d postgres${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Restaurando backup...${NC}"

# Descomprimir y restaurar
gunzip -c "${BACKUP_FILE}" | docker compose exec -T postgres psql \
    -U "${POSTGRES_USER:-postgres}" \
    -d "${POSTGRES_DB:-muebleria_db}"

echo -e "${GREEN}✅ Base de datos restaurada exitosamente${NC}"
echo -e "${BLUE}================================${NC}"
