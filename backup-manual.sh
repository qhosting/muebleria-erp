
#!/bin/bash

# Script para backup manual de la base de datos
# Uso: ./backup-manual.sh [nombre-backup-opcional]

BACKUP_NAME=${1:-"manual-$(date +%Y%m%d_%H%M%S)"}
BACKUP_DIR="/backup"
BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.sql"

echo "📦 Creando backup de base de datos..."
echo "========================================"
echo ""

# Verificar que existe el directorio de backup
mkdir -p $BACKUP_DIR

# Verificar variables de entorno
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está configurado"
    exit 1
fi

# Extraer información de la DATABASE_URL
# Formato: postgres://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | grep -oP '(?<=://).*?(?=:)')
DB_PASS=$(echo $DATABASE_URL | grep -oP '(?<=:).*?(?=@)' | tail -1)
DB_HOST=$(echo $DATABASE_URL | grep -oP '(?<=@).*?(?=:)')
DB_PORT=$(echo $DATABASE_URL | grep -oP '(?<=:)[0-9]+(?=/)')
DB_NAME=$(echo $DATABASE_URL | grep -oP '(?<=/)[^/?]+' | head -1)

echo "📊 Información de la base de datos:"
echo "   Host: $DB_HOST"
echo "   Puerto: $DB_PORT"
echo "   Base de datos: $DB_NAME"
echo "   Usuario: $DB_USER"
echo ""

# Crear backup
echo "💾 Creando backup en: $BACKUP_FILE"
PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -F c -b -v -f $BACKUP_FILE $DB_NAME

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backup creado exitosamente!"
    echo "📁 Archivo: $BACKUP_FILE"
    echo "📊 Tamaño: $(du -h $BACKUP_FILE | cut -f1)"
    
    # Listar todos los backups
    echo ""
    echo "📋 Backups disponibles:"
    ls -lh $BACKUP_DIR/*.sql 2>/dev/null || echo "   (ninguno)"
else
    echo ""
    echo "❌ Error al crear backup"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ Proceso completado"
echo "========================================"
