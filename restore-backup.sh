
#!/bin/bash

# Script para restaurar un backup de la base de datos
# Uso: ./restore-backup.sh <archivo-backup>

if [ -z "$1" ]; then
    echo "❌ ERROR: Debes especificar el archivo de backup"
    echo ""
    echo "Uso: ./restore-backup.sh <archivo-backup>"
    echo ""
    echo "📋 Backups disponibles:"
    ls -lh /backup/*.sql 2>/dev/null || echo "   (ninguno)"
    exit 1
fi

BACKUP_FILE=$1

echo "🔄 Restaurando backup de base de datos..."
echo "========================================"
echo ""

# Verificar que existe el archivo
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ ERROR: El archivo $BACKUP_FILE no existe"
    exit 1
fi

# Verificar variables de entorno
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está configurado"
    exit 1
fi

# Extraer información de la DATABASE_URL
DB_USER=$(echo $DATABASE_URL | grep -oP '(?<=://).*?(?=:)')
DB_PASS=$(echo $DATABASE_URL | grep -oP '(?<=:).*?(?=@)' | tail -1)
DB_HOST=$(echo $DATABASE_URL | grep -oP '(?<=@).*?(?=:)')
DB_PORT=$(echo $DATABASE_URL | grep -oP '(?<=:)[0-9]+(?=/)')
DB_NAME=$(echo $DATABASE_URL | grep -oP '(?<=/)[^/?]+' | head -1)

echo "⚠️  ADVERTENCIA: Esto REEMPLAZARÁ todos los datos actuales"
echo "📊 Base de datos: $DB_NAME"
echo "📁 Backup: $BACKUP_FILE"
echo ""
read -p "¿Estás seguro? (escribe 'SI' para confirmar): " confirm

if [ "$confirm" != "SI" ]; then
    echo "❌ Restauración cancelada"
    exit 0
fi

echo ""
echo "🔄 Restaurando backup..."

# Restaurar backup
PGPASSWORD=$DB_PASS pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c -v $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backup restaurado exitosamente!"
else
    echo ""
    echo "❌ Error al restaurar backup"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ Restauración completada"
echo "========================================"
