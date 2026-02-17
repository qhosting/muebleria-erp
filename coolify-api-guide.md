
# 🚀 Guía de Despliegue Automático en Coolify

## 📋 Métodos de Despliegue

### 1️⃣ **Script Automatizado (Recomendado)**

El script `coolify-deploy.sh` automatiza todo el proceso:

```bash
# Hacer ejecutable el script
chmod +x coolify-deploy.sh

# Ejecutar despliegue automático
./coolify-deploy.sh
```

**¿Qué hace el script?**
- ✅ Configura la conexión con Coolify
- ✅ Crea la aplicación automáticamente
- ✅ Configura variables de entorno
- ✅ Inicia el despliegue
- ✅ Monitorea el progreso

---

### 2️⃣ **API Manual de Coolify**

#### **Paso 1: Obtener Token de API**
```bash
# Ir a tu panel de Coolify
# Settings > API Tokens > Create New Token
```

#### **Paso 2: Crear Aplicación**
```bash
curl -X POST "https://tu-coolify.com/api/v1/applications" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "muebleria-la-economica",
    "git_repository": "https://github.com/qhosting/muebleria-la-economica.git",
    "git_branch": "main",
    "build_pack": "dockerfile",
    "server_id": "TU_SERVER_ID",
    "destination_id": "TU_DESTINATION_ID"
  }'
```

#### **Paso 3: Configurar Variables de Entorno**
```bash
curl -X POST "https://tu-coolify.com/api/v1/applications/{APP_UUID}/environment" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "NODE_ENV": "production",
    "PORT": "3000",
    "DATABASE_URL": "postgresql://...",
    "NEXTAUTH_SECRET": "tu-secret-aqui",
    "NEXTAUTH_URL": "https://tu-dominio.com"
  }'
```

#### **Paso 4: Desplegar**
```bash
curl -X POST "https://tu-coolify.com/api/v1/applications/{APP_UUID}/deploy" \
  -H "Authorization: Bearer TU_TOKEN"
```

---

### 3️⃣ **Variables de Entorno Requeridas**

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@host:5432/muebleria_db

# Autenticación NextAuth
NEXTAUTH_URL=https://tu-dominio.com
NEXTAUTH_SECRET=genera-un-secret-seguro-aqui

# JWT para la aplicación
JWT_SECRET=otro-secret-para-jwt

# Configuración de la aplicación
NODE_ENV=production
PORT=3000
```

---

### 4️⃣ **Configuración Docker para Coolify**

Tu proyecto ya incluye:
- ✅ `Dockerfile` optimizado
- ✅ `docker-compose.yml` para testing local
- ✅ Variables de entorno configuradas
- ✅ Scripts de inicialización

---

## 🔧 **Comandos Útiles de la API**

### **Listar Aplicaciones**
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://tu-coolify.com/api/v1/applications"
```

### **Obtener Estado de Aplicación**
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://tu-coolify.com/api/v1/applications/{UUID}/status"
```

### **Ver Logs de Despliegue**
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://tu-coolify.com/api/v1/applications/{UUID}/logs"
```

### **Redeployar Aplicación**
```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  "https://tu-coolify.com/api/v1/applications/{UUID}/deploy"
```

---

## 📊 **Flujo de Despliegue Automático**

```mermaid
graph TD
    A[Ejecutar Script] --> B[Verificar Conexión]
    B --> C[Comprobar App Existente]
    C --> D{¿App Existe?}
    D -->|No| E[Crear Nueva App]
    D -->|Sí| F[Usar App Existente]
    E --> G[Configurar Variables]
    F --> G
    G --> H[Iniciar Despliegue]
    H --> I[Monitorear Progreso]
    I --> J[App Lista! 🎉]
```

---

## 🚨 **Solución de Problemas**

### **Error: "Could not connect to Coolify"**
- ✅ Verifica la URL de Coolify
- ✅ Confirma que el token sea válido
- ✅ Asegúrate que Coolify esté accesible

### **Error: "Application creation failed"**
- ✅ Verifica que el SERVER_ID sea correcto
- ✅ Confirma que el DESTINATION_ID exista
- ✅ Revisa que tengas permisos de creación

### **Error: "Deployment failed"**
- ✅ Revisa los logs en el panel de Coolify
- ✅ Verifica que las variables de entorno sean correctas
- ✅ Confirma que la base de datos sea accesible

---

## 🎯 **Ventajas del Despliegue Automatizado**

- ⚡ **Rapidez**: Despliegue en < 5 minutos
- 🔄 **Repetible**: Mismo proceso cada vez
- 🛡️ **Seguro**: Variables de entorno protegidas
- 📊 **Monitoreable**: Estado en tiempo real
- 🚀 **Escalable**: Fácil replicación en múltiples servidores

---

## 📞 **Próximos Pasos**

1. **Ejecutar el script**: `./coolify-deploy.sh`
2. **Seguir las instrucciones** del script interactivo
3. **Monitorear** el despliegue en tu panel de Coolify
4. **Acceder** a tu aplicación en el dominio configurado

---

*¿Necesitas ayuda? El script incluye verificaciones automáticas y mensajes detallados para guiarte en cada paso.*
