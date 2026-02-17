
#!/bin/bash

# ================================
# CONFIGURAR RESPALDOS AUTOMÁTICOS
# Crea un cron job para backups diarios
# ================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Obtener el directorio actual
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  CONFIGURAR BACKUPS AUTOMÁTICOS${NC}"
echo -e "${BLUE}================================${NC}"

echo ""
echo -e "${YELLOW}Selecciona la frecuencia de respaldos:${NC}"
echo -e "  ${BLUE}[1]${NC} Diario a las 2:00 AM"
echo -e "  ${BLUE}[2]${NC} Cada 12 horas (2:00 AM y 2:00 PM)"
echo -e "  ${BLUE}[3]${NC} Cada 6 horas"
echo -e "  ${BLUE}[4]${NC} Personalizado"
echo ""

read -p "Selección: " SELECTION

case $SELECTION in
    1)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="Diario a las 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 2,14 * * *"
        DESCRIPTION="Cada 12 horas (2:00 AM y 2:00 PM)"
        ;;
    3)
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="Cada 6 horas"
        ;;
    4)
        echo ""
        echo -e "${YELLOW}Formato cron:${NC} minuto hora día mes día-semana"
        echo -e "${YELLOW}Ejemplo:${NC} 0 3 * * * (todos los días a las 3:00 AM)"
        read -p "Ingresa la expresión cron: " CRON_SCHEDULE
        DESCRIPTION="Personalizado: $CRON_SCHEDULE"
        ;;
    *)
        echo -e "${RED}❌ Selección inválida${NC}"
        exit 1
        ;;
esac

# Crear el script wrapper para cron
CRON_SCRIPT="${SCRIPT_DIR}/cron-backup-wrapper.sh"
cat > "${CRON_SCRIPT}" <<EOF
#!/bin/bash
cd "${SCRIPT_DIR}"
bash backup-database.sh >> "${SCRIPT_DIR}/backups/backup.log" 2>&1
EOF

chmod +x "${CRON_SCRIPT}"

# Agregar al crontab
CRON_LINE="${CRON_SCHEDULE} ${CRON_SCRIPT}"

# Verificar si ya existe
if crontab -l 2>/dev/null | grep -q "${CRON_SCRIPT}"; then
    echo -e "${YELLOW}⚠️  Ya existe un cron job configurado${NC}"
    read -p "¿Deseas reemplazarlo? (s/n): " REPLACE
    if [ "$REPLACE" = "s" ]; then
        # Eliminar línea existente
        (crontab -l 2>/dev/null | grep -v "${CRON_SCRIPT}"; echo "${CRON_LINE}") | crontab -
        echo -e "${GREEN}✅ Cron job actualizado${NC}"
    else
        echo -e "${YELLOW}❌ Operación cancelada${NC}"
        exit 0
    fi
else
    # Agregar nueva línea
    (crontab -l 2>/dev/null; echo "${CRON_LINE}") | crontab -
    echo -e "${GREEN}✅ Cron job creado${NC}"
fi

echo ""
echo -e "${GREEN}✅ Respaldos automáticos configurados${NC}"
echo -e "   📅 Frecuencia: ${DESCRIPTION}"
echo -e "   📁 Directorio: ${SCRIPT_DIR}/backups/"
echo -e "   📝 Log: ${SCRIPT_DIR}/backups/backup.log"
echo ""
echo -e "${YELLOW}Para verificar el cron job:${NC}"
echo -e "   crontab -l"
echo ""
echo -e "${YELLOW}Para desactivar los backups automáticos:${NC}"
echo -e "   crontab -e"
echo -e "   (Elimina la línea que contiene: ${CRON_SCRIPT})"
echo -e "${BLUE}================================${NC}"
