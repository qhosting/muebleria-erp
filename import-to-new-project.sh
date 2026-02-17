
#!/bin/bash

# ============================================
# SCRIPT DE IMPORTACIÓN A NUEVO PROYECTO
# ============================================

echo "🔄 Script de Importación de Recursos de Deployment"
echo "=================================================="
echo ""

# Solicitar información del nuevo proyecto
read -p "📁 Ruta completa del nuevo proyecto: " NEW_PROJECT_PATH
read -p "📝 Nombre del nuevo proyecto: " NEW_PROJECT_NAME
read -p "🌐 Dominio del nuevo proyecto (ej: app.ejemplo.com): " NEW_DOMAIN
read -p "🔢 Puerto del nuevo proyecto (default 3000): " NEW_PORT
NEW_PORT=${NEW_PORT:-3000}

# Verificar que el proyecto existe
if [ ! -d "$NEW_PROJECT_PATH" ]; then
    echo "❌ Error: El directorio $NEW_PROJECT_PATH no existe"
    exit 1
fi

echo ""
echo "📋 Configuración:"
echo "  Proyecto origen: /home/ubuntu/muebleria_la_economica"
echo "  Proyecto destino: $NEW_PROJECT_PATH"
echo "  Nombre: $NEW_PROJECT_NAME"
echo "  Dominio: $NEW_DOMAIN"
echo "  Puerto: $NEW_PORT"
echo ""
read -p "¿Continuar? (s/n): " CONFIRM

if [ "$CONFIRM" != "s" ]; then
    echo "❌ Cancelado"
    exit 0
fi

# Crear backup del proyecto destino
echo ""
echo "💾 Creando backup..."
BACKUP_DIR="$NEW_PROJECT_PATH/../${NEW_PROJECT_NAME}_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$NEW_PROJECT_PATH"/* "$BACKUP_DIR/" 2>/dev/null
echo "✅ Backup creado en: $BACKUP_DIR"

# Copiar Dockerfile
echo ""
echo "📄 Copiando Dockerfile..."
cp /home/ubuntu/muebleria_la_economica/Dockerfile "$NEW_PROJECT_PATH/"
sed -i "s|muebleria_la_economica|$NEW_PROJECT_NAME|g" "$NEW_PROJECT_PATH/Dockerfile"
echo "✅ Dockerfile copiado y adaptado"

# Copiar docker-compose.yml
echo ""
echo "📄 Copiando docker-compose.yml..."
cp /home/ubuntu/muebleria_la_economica/docker-compose.yml "$NEW_PROJECT_PATH/"
sed -i "s|muebleria-economica|${NEW_PROJECT_NAME}|g" "$NEW_PROJECT_PATH/docker-compose.yml"
sed -i "s|3000|${NEW_PORT}|g" "$NEW_PROJECT_PATH/docker-compose.yml"
echo "✅ docker-compose.yml copiado y adaptado"

# Copiar start.sh
echo ""
echo "📄 Copiando start.sh..."
cp /home/ubuntu/muebleria_la_economica/start.sh "$NEW_PROJECT_PATH/"
chmod +x "$NEW_PROJECT_PATH/start.sh"
echo "✅ start.sh copiado"

# Actualizar next.config.js
echo ""
echo "📄 Actualizando next.config.js..."
if [ -f "$NEW_PROJECT_PATH/app/next.config.js" ]; then
    # Backup del archivo original
    cp "$NEW_PROJECT_PATH/app/next.config.js" "$NEW_PROJECT_PATH/app/next.config.js.backup"
    
    # Verificar si ya tiene output: 'standalone'
    if grep -q "output.*standalone" "$NEW_PROJECT_PATH/app/next.config.js"; then
        echo "⚠️  next.config.js ya tiene configuración standalone"
    else
        echo "⚠️  Necesitas agregar manualmente a next.config.js:"
        echo "     output: 'standalone',"
        echo "     outputFileTracingRoot: path.join(__dirname, '../'),"
    fi
else
    echo "⚠️  No se encontró next.config.js en $NEW_PROJECT_PATH/app/"
fi

# Copiar documentación
echo ""
echo "📚 Copiando documentación..."
cp /home/ubuntu/muebleria_la_economica/README-DOCKER.md "$NEW_PROJECT_PATH/"
cp /home/ubuntu/muebleria_la_economica/EASYPANEL-COMPLETE-GUIDE.md "$NEW_PROJECT_PATH/"
sed -i "s|muebleria-la-economica|${NEW_PROJECT_NAME}|g" "$NEW_PROJECT_PATH/README-DOCKER.md"
sed -i "s|muebleria-la-economica|${NEW_PROJECT_NAME}|g" "$NEW_PROJECT_PATH/EASYPANEL-COMPLETE-GUIDE.md"
sed -i "s|app.mueblerialaeconomica.com|${NEW_DOMAIN}|g" "$NEW_PROJECT_PATH/EASYPANEL-COMPLETE-GUIDE.md"
echo "✅ Documentación copiada y adaptada"

# Crear archivo .env de ejemplo
echo ""
echo "📝 Creando .env.example..."
cat > "$NEW_PROJECT_PATH/.env.example" << 'ENVEOF'
# Database
DATABASE_URL="postgresql://user:password@postgres:5432/dbname"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# App
NODE_ENV="production"
PORT=3000
ENVEOF

sed -i "s|3000|${NEW_PORT}|g" "$NEW_PROJECT_PATH/.env.example"
echo "✅ .env.example creado"

# Copiar scripts útiles
echo ""
echo "🛠️  Copiando scripts útiles..."
cp /home/ubuntu/muebleria_la_economica/deploy-coolify.sh "$NEW_PROJECT_PATH/" 2>/dev/null
chmod +x "$NEW_PROJECT_PATH/deploy-coolify.sh" 2>/dev/null
echo "✅ Scripts copiados"

# Crear README de migración
echo ""
echo "📖 Creando README de migración..."
cat > "$NEW_PROJECT_PATH/MIGRACION-DESDE-MUEBLERIA.md" << 'READMEEOF'
# 📦 Migración desde Mueblería La Económica

Este proyecto ha sido configurado usando los recursos de deployment del proyecto Mueblería La Económica.

## ✅ Archivos Importados

- ✅ Dockerfile (adaptado)
- ✅ docker-compose.yml (adaptado)
- ✅ start.sh
- ✅ README-DOCKER.md
- ✅ EASYPANEL-COMPLETE-GUIDE.md
- ✅ .env.example

## 🔧 Configuraciones Pendientes

### 1. Next.config.js

Asegúrate de que tu `app/next.config.js` incluya:

```javascript
const path = require('path');

module.exports = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../'),
  // ... resto de tu configuración
};
```

### 2. Variables de Entorno

Copia `.env.example` a `.env` y configura tus valores:

```bash
cp .env.example .env
nano .env
```

### 3. Base de Datos

Si usas Prisma, asegúrate de:
- Configurar DATABASE_URL correctamente
- Ejecutar migraciones: `npx prisma migrate deploy`
- Generar cliente: `npx prisma generate`

## 🚀 Despliegue

### Opción 1: Docker Local

```bash
docker-compose up -d
```

### Opción 2: EasyPanel

Sigue la guía en `EASYPANEL-COMPLETE-GUIDE.md`

### Opción 3: Coolify

Usa el script `deploy-coolify.sh` o sigue `README-DOCKER.md`

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs: `docker-compose logs -f`
2. Verifica las variables de entorno
3. Consulta la documentación original en:
   https://github.com/[usuario]/muebleria_la_economica

## 📚 Recursos Adicionales

- [Documentación Next.js Standalone](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [EasyPanel Docs](https://easypanel.io/docs)

READMEEOF

echo "✅ README de migración creado"

# Resumen final
echo ""
echo "============================================"
echo "✅ IMPORTACIÓN COMPLETADA"
echo "============================================"
echo ""
echo "📁 Archivos importados en: $NEW_PROJECT_PATH"
echo "💾 Backup guardado en: $BACKUP_DIR"
echo ""
echo "⚠️  PASOS SIGUIENTES:"
echo ""
echo "1️⃣  Revisa y actualiza next.config.js:"
echo "    cd $NEW_PROJECT_PATH/app"
echo "    nano next.config.js"
echo ""
echo "2️⃣  Configura las variables de entorno:"
echo "    cd $NEW_PROJECT_PATH"
echo "    cp .env.example .env"
echo "    nano .env"
echo ""
echo "3️⃣  Lee la documentación de migración:"
echo "    cat $NEW_PROJECT_PATH/MIGRACION-DESDE-MUEBLERIA.md"
echo ""
echo "4️⃣  Prueba el build Docker:"
echo "    cd $NEW_PROJECT_PATH"
echo "    docker-compose build"
echo ""
echo "5️⃣  Comparte con DeepAgent para ajustes finales"
echo ""
echo "🎉 ¡Listo para deployar!"
echo ""

