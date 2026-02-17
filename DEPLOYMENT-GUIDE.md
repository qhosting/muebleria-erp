
# 🚀 Guía de Deployment - MUEBLERIA LA ECONOMICA

## Opción 1: Deployment en Coolify (Recomendado)

### Prerrequisitos
- ✅ Repositorio GitHub actualizado
- ✅ Acceso a panel de Coolify
- ✅ Checkpoint creado exitosamente

### Paso 1: Crear Nueva Aplicación en Coolify

1. Accede a tu panel de Coolify
2. Haz clic en **"New Application"**
3. Selecciona **"Public Repository"**
4. Ingresa la URL: `https://github.com/qhosting/muebleria-la-economica.git`
5. Rama: `main`
6. Build Pack: **Docker**

### Paso 2: Configurar Variables de Entorno

```env
# Base de datos (Coolify generará automáticamente)
DATABASE_URL=postgresql://usuario:password@postgres:5432/muebleria_db

# NextAuth (IMPORTANTE: Actualizar después del deployment)
NEXTAUTH_URL=https://tu-app.coolify.com
NEXTAUTH_SECRET=tu-secreto-muy-seguro-de-32-caracteres

# Configuración
NODE_ENV=production
PORT=3000
```

### Paso 3: Configurar Base de Datos

1. En Coolify, agregar **PostgreSQL 17** (Recomendado) o **PostgreSQL 15**
2. Conectar con la aplicación
3. Coolify generará automáticamente DATABASE_URL

### Paso 4: Deploy

1. Haz clic en **"Deploy"**
2. Coolify construirá la imagen Docker
3. Desplegará automáticamente
4. Asignará una URL pública

---

## Opción 2: Deployment Manual con Docker

### Comandos para ejecutar en tu servidor:

```bash
# 1. Clonar repositorio
git clone https://github.com/qhosting/muebleria-la-economica.git
cd muebleria-la-economica

# 2. Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con tus valores

# 3. Construir y ejecutar
docker-compose up -d --build

# 4. Inicializar base de datos
docker-compose exec app npx prisma db push
docker-compose exec app npx prisma db seed
```

---

## Variables de Entorno Críticas

### 🔑 NEXTAUTH_SECRET
Genera un secreto seguro:
```bash
openssl rand -base64 32
```

### 🌐 NEXTAUTH_URL
Actualiza después del deployment con la URL real asignada por Coolify

### 🗄️ DATABASE_URL
Formato: `postgresql://usuario:password@host:5432/database`

---

## Post-Deployment

### 1. Verificar Funcionamiento
- ✅ Acceder a la URL asignada
- ✅ Login con credenciales por defecto
- ✅ Probar funcionalidades principales

### 2. Configuración Inicial
- 🔐 Cambiar passwords por defecto
- 👥 Crear usuarios necesarios
- 📊 Verificar reportes
- 📱 Probar PWA móvil

### 3. Usuarios por Defecto (Solo usuarios esenciales)
```
Admin:    admin@economica.local / admin123
Gestor:   gestor@economica.local / gestor123  
Cobrador: cobrador@economica.local / cobrador123
Reportes: reportes@economica.local / reportes123
```

---

## Troubleshooting

### Error de Base de Datos
```bash
# Reinicializar BD
docker-compose exec app npx prisma db push --force-reset
docker-compose exec app npx prisma db seed
```

### Error de Build
```bash
# Limpiar y reconstruir
docker-compose down
docker system prune -f
docker-compose up -d --build
```

### Error de Autenticación
- Verificar NEXTAUTH_URL coincida con dominio real
- Verificar NEXTAUTH_SECRET sea de 32+ caracteres

---

## 📱 Optimizaciones Móviles Incluidas

- ✅ PWA optimizada para cobradores
- ✅ Sincronización offline mejorada
- ✅ Rendimiento móvil optimizado
- ✅ Sin cuelgues en dispositivos móviles

---

¡Tu aplicación está lista para producción! 🏢✨
