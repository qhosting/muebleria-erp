# 📱 App Nativa Android - VertexERP Cobrador

**Versión:** 1.0  
**Fecha:** 2026-02-07  
**Alcance:** Aplicación exclusiva para cobradores en campo  
**Plataforma:** Android 5.0+ (API 21+)

---

## 🎯 Objetivo

Crear una **aplicación nativa Android ligera y especializada** para cobradores en campo, que funcione en dispositivos Android que no soportan PWA. La app se enfocará únicamente en las funcionalidades de cobranza móvil, sin incluir módulos administrativos.

---

## 📱 Alcance de la Aplicación

### ✅ Funcionalidades Incluidas (Solo Cobranza)

#### 1. **Autenticación**
- Login con email y contraseña
- Sesión persistente
- Logout

#### 2. **Cobranza Móvil** (Módulo Principal)
- ✅ Lista de clientes asignados al cobrador
- ✅ Búsqueda y filtrado de clientes
- ✅ Vista detallada del cliente (saldo, historial, datos)
- ✅ Registro de pagos
- ✅ Registro de motararios (visitas sin cobro)
- ✅ Caja diaria (resumen de cobros del día)
- ✅ Cierre de caja

#### 3. **Impresión de Tickets**
- ✅ Conexión Bluetooth con impresoras térmicas
- ✅ Configuración personal de impresora
- ✅ Impresión de recibos de pago
- ✅ Plantillas personalizables

#### 4. **Modo Offline**
- ✅ Sincronización automática cuando hay internet
- ✅ Almacenamiento local de datos (IndexedDB)
- ✅ Cola de sincronización de pagos pendientes
- ✅ Indicador de estado de conexión

#### 5. **Geolocalización**
- ✅ Ubicación actual del cobrador
- ✅ Navegación a domicilio del cliente (integración con Google Maps)
- ✅ Registro de ubicación al momento del pago

#### 6. **Perfil de Usuario**
- ✅ Ver información personal
- ✅ Configuración de impresora
- ✅ Cambiar contraseña
- ✅ Cerrar sesión

---

### ❌ Funcionalidades NO Incluidas (Solo Web Admin)

Estas funcionalidades permanecerán **exclusivamente en la versión web** para administradores:

- ❌ Dashboard administrativo
- ❌ Gestión de usuarios
- ❌ Gestión de clientes (crear, editar, eliminar)
- ❌ Reportes avanzados
- ❌ Configuración del sistema
- ❌ Gestión de plantillas de tickets
- ❌ Importación de datos
- ❌ Estadísticas y gráficas

---

## 🏗️ Arquitectura Simplificada

### Estructura de la App Nativa

```
VertexERP Cobrador/
├── Pantalla de Login
├── Dashboard Cobrador (Home)
│   ├── Resumen del día
│   ├── Total cobrado
│   └── Clientes pendientes
│
├── Mis Clientes
│   ├── Lista de clientes asignados
│   ├── Búsqueda y filtros
│   └── Detalle del cliente
│       ├── Información
│       ├── Saldo actual
│       ├── Historial de pagos
│       ├── Botón: Registrar Pago
│       ├── Botón: Registrar Motarario
│       └── Botón: Navegar (Google Maps)
│
├── Registrar Pago
│   ├── Monto
│   ├── Tipo de pago
│   ├── Método de pago
│   ├── Ubicación automática
│   └── Botón: Guardar e Imprimir
│
├── Caja Diaria
│   ├── Total cobrado hoy
│   ├── Número de pagos
│   ├── Lista de pagos del día
│   └── Botón: Cerrar Caja
│
└── Mi Perfil
    ├── Información personal
    ├── Configuración de impresora
    ├── Cambiar contraseña
    └── Cerrar sesión
```

---

## 🚀 Plan de Implementación Simplificado

### Fase 1: Instalación de Dependencias (Pendiente)

Los archivos de configuración ya han sido creados (`capacitor.config.ts`, `next.config.js`, etc.). Solo falta instalar las librerías:

> **Nota:** Usar `--legacy-peer-deps` para evitar conflictos de dependencias.

```bash
cd app

# 1. Instalar utilidad cross-env (necesario para Windows)
npm install cross-env --save-dev --legacy-peer-deps

# 2. Instalar núcleo de Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android --legacy-peer-deps

# 3. Instalar plugins nativos ya configurados
npm install @capacitor-community/bluetooth-le @capacitor/geolocation @capacitor/preferences @capacitor/network @capacitor/app @capacitor/status-bar @capacitor/splash-screen --legacy-peer-deps

# 4. Inicializar plataforma Android
// Si falla este paso, verifica que tengas Java instalado y la variable ANDROID_HOME
npx cap add android

# 5. Sincronizar proyecto
npm run cobrador:sync
```

### Fase 2: Archivos Implementados (✅ COMPLETADO)

Se han creado los siguientes módulos nativos en el repositorio:

- ✅ **Configuración:** `capacitor.config.ts` (ID: `com.vertexerp.cobrador`)
- ✅ **Build:** `next.config.js` (Soporte static export)
- ✅ **Scripts:** `package.json` (Comandos `npm run cobrador:*`)
- ✅ **Plataforma:** `hooks/usePlatform.ts` (Detector de entorno)
- ✅ **Impresión:** `lib/native/printer.ts` (Bluetooth wrapper)
- ✅ **GPS:** `lib/native/location.ts` (Geolocalización wrapper)
- ✅ **Storage:** `lib/native/storage.ts` (Persistencia nativa)
- ✅ **Red:** `lib/native/network.ts` (Monitor de conexión)

### Fase 3: Crear Vista Específica para Cobrador (En Progreso)

#### 3.1 Crear Ruta Dedicada

```typescript
// app/cobrador-app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePlatform } from '@/hooks/usePlatform';

export default function CobradorAppPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isNative } = usePlatform();

  useEffect(() => {
    // Solo permitir acceso a cobradores
    if (status === 'authenticated' && session?.user?.role !== 'cobrador') {
      router.push('/dashboard');
    }
  }, [session, status]);

  // Si es app nativa, redirigir a la vista móvil optimizada
  useEffect(() => {
    if (isNative && status === 'authenticated') {
      router.push('/dashboard/cobranza-mobile');
    }
  }, [isNative, status]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Vista optimizada para cobrador */}
    </div>
  );
}
```

#### 3.2 Configurar Capacitor para Cobrador

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vertexerp.cobrador',
  appName: 'VertexERP Cobrador',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // Redirigir directamente a la vista de cobrador
    url: undefined // Se usará el build estático
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F172A',
      showSpinner: true,
      spinnerColor: '#10B981', // Verde para cobradores
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F172A'
    }
  }
};

export default config;
```

#### 3.3 Modificar Manifest para Cobrador

```json
// public/manifest-cobrador.json
{
  "name": "VertexERP Cobrador",
  "short_name": "Cobrador",
  "version": "1.0.0",
  "description": "App de cobranza en campo para VertexERP Muebles",
  "theme_color": "#0F172A",
  "background_color": "#0F172A",
  "display": "standalone",
  "orientation": "portrait-primary",
  "scope": "/",
  "start_url": "/cobrador-app?source=native",
  "icons": [
    {
      "src": "/icon-cobrador-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-cobrador-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["business", "productivity"],
  "shortcuts": [
    {
      "name": "Mis Clientes",
      "url": "/dashboard/cobranza-mobile?source=shortcut",
      "icons": [{ "src": "/icon-cobrador-192.png", "sizes": "192x192" }]
    },
    {
      "name": "Caja Diaria",
      "url": "/dashboard/caja?source=shortcut",
      "icons": [{ "src": "/icon-cobrador-192.png", "sizes": "192x192" }]
    }
  ]
}
```

### Fase 4: Optimizar Build (1 día)

#### 4.1 Crear Script de Build Específico

```json
// package.json
{
  "scripts": {
    "build:cobrador": "BUILD_TARGET=capacitor NEXT_PUBLIC_APP_MODE=cobrador next build",
    "cobrador:sync": "npm run build:cobrador && npx cap sync",
    "cobrador:open": "npx cap open android",
    "cobrador:run": "npx cap run android",
    "cobrador:dev": "npm run build:cobrador && npx cap sync && npx cap open android"
  }
}
```

#### 4.2 Configurar Variables de Entorno

```bash
# .env.cobrador
NEXT_PUBLIC_APP_MODE=cobrador
NEXT_PUBLIC_APP_NAME="VertexERP Cobrador"
NEXT_PUBLIC_ENABLE_ADMIN=false
NEXT_PUBLIC_ENABLE_REPORTS=false
```

### Fase 5: Adaptar UI para Cobrador (2 días)

#### 5.1 Crear Layout Simplificado

```typescript
// components/cobrador/CobradorLayout.tsx
'use client';

import { ReactNode } from 'react';
import { usePlatform } from '@/hooks/usePlatform';

interface CobradorLayoutProps {
  children: ReactNode;
}

export function CobradorLayout({ children }: CobradorLayoutProps) {
  const { isNative } = usePlatform();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header simplificado */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">VertexERP Cobrador</h1>
          {isNative && (
            <div className="flex items-center gap-2">
              <NetworkStatus />
              <SyncIndicator />
            </div>
          )}
        </div>
      </header>

      {/* Contenido */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700">
        <div className="grid grid-cols-4 gap-1 p-2">
          <NavButton icon="home" label="Inicio" href="/cobrador-app" />
          <NavButton icon="users" label="Clientes" href="/dashboard/cobranza-mobile" />
          <NavButton icon="dollar" label="Caja" href="/dashboard/caja" />
          <NavButton icon="user" label="Perfil" href="/dashboard/perfil" />
        </div>
      </nav>
    </div>
  );
}
```

#### 5.2 Optimizar Vista de Clientes

```typescript
// components/cobrador/ClientesList.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePlatform } from '@/hooks/usePlatform';
import { obtenerUbicacionActual } from '@/lib/native/location';

export function ClientesList() {
  const [clientes, setClientes] = useState([]);
  const [ubicacion, setUbicacion] = useState(null);
  const { isNative } = usePlatform();

  useEffect(() => {
    if (isNative) {
      // Obtener ubicación del cobrador
      obtenerUbicacionActual().then(setUbicacion);
    }
  }, [isNative]);

  return (
    <div className="p-4 space-y-3">
      {clientes.map(cliente => (
        <ClienteCard 
          key={cliente.id} 
          cliente={cliente}
          ubicacionCobrador={ubicacion}
        />
      ))}
    </div>
  );
}
```

### Fase 6: Testing y Optimización (2 días)

- Probar en dispositivos de gama baja (Android 5.0-7.0)
- Optimizar rendimiento de sincronización
- Probar impresión Bluetooth con múltiples modelos
- Verificar funcionamiento offline completo

### Fase 7: Publicación en Play Store (3 días)

---

## 📦 Tamaño Estimado de la App

| Componente | Tamaño |
|---|---|
| **APK Base** | ~15 MB |
| **Recursos (imágenes, iconos)** | ~2 MB |
| **Código JavaScript** | ~3 MB |
| **Plugins nativos** | ~5 MB |
| **Total APK** | **~25 MB** |

---

## 🎨 Diseño de Iconos Específicos

### Icono Principal
- **Tema:** Verde (#10B981) para diferenciar de la versión web
- **Símbolo:** Billete o moneda + ubicación
- **Texto:** "Cobrador" o "Campo"

### Splash Screen
- **Fondo:** Slate 900 (#0F172A)
- **Logo:** VertexERP Cobrador
- **Color de acento:** Verde (#10B981)

---

## 🔐 Seguridad y Permisos

### Permisos Necesarios en AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Permisos esenciales para cobrador -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Geolocalización -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    
    <!-- Bluetooth para impresoras -->
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    
    <!-- NO se incluyen permisos de cámara, contactos, etc. -->
</manifest>
```

---

## 📊 Comparativa: Web Admin vs App Cobrador

| Característica | Web Admin | App Cobrador Nativa |
|---|---|---|
| **Usuarios** | Admin, Gestor, Reportes | Solo Cobradores |
| **Funciones** | Todas | Solo cobranza |
| **Plataforma** | Web (cualquier navegador) | Android 5.0+ |
| **Instalación** | No requiere | Play Store |
| **Tamaño** | N/A | ~25 MB |
| **Offline** | Limitado | Completo |
| **Bluetooth** | Web API | Nativo |
| **GPS** | Web API | Nativo |
| **Actualizaciones** | Automáticas | Play Store + OTA |

---

## 🚀 Flujo de Trabajo del Cobrador

### Día Típico con la App

1. **Mañana:**
   - Abrir app
   - Login automático (sesión guardada)
   - Ver resumen del día (clientes pendientes)
   - Sincronizar datos (si hay internet)

2. **En Ruta:**
   - Ver lista de clientes asignados
   - Navegar a domicilio del cliente (Google Maps)
   - Registrar pago o motarario
   - Imprimir ticket (Bluetooth)
   - Datos guardados localmente si no hay internet

3. **Tarde:**
   - Ver caja diaria (total cobrado)
   - Sincronizar pagos pendientes
   - Cerrar caja
   - Logout (opcional)

---

## 💰 Costos Específicos

| Concepto | Costo |
|---|---|
| **Desarrollo** (1 semana) | Gratis (DIY) o $1,500-$3,000 USD |
| **Google Play Developer** | $25 USD (pago único) |
| **Iconos profesionales** | $50-$100 USD (opcional) |
| **Testing en dispositivos** | $0 (usar dispositivos existentes) |
| **Total estimado** | **$25 - $3,125 USD** |

---

## 📱 Ficha de Play Store

### Título
**VertexERP Cobrador - Cobranza en Campo**

### Descripción Corta (80 caracteres)
Gestiona tu cobranza en campo con modo offline e impresión Bluetooth

### Descripción Completa

```
VertexERP Cobrador es la aplicación móvil oficial para cobradores en campo de VertexERP Muebles.

🎯 CARACTERÍSTICAS PRINCIPALES

✅ Cobranza en Campo
• Lista de clientes asignados
• Registro rápido de pagos
• Registro de visitas sin cobro (motararios)
• Caja diaria y cierre de caja

📍 Geolocalización
• Navegación GPS a domicilio del cliente
• Registro automático de ubicación en pagos

🖨️ Impresión Bluetooth
• Conexión con impresoras térmicas portátiles
• Impresión de recibos de pago
• Configuración personal de impresora

📶 Modo Offline
• Funciona sin conexión a internet
• Sincronización automática cuando hay red
• Datos seguros en tu dispositivo

🔒 Seguridad
• Login seguro
• Datos encriptados
• Sincronización protegida

REQUISITOS
• Android 5.0 o superior
• Conexión a internet (para sincronización)
• Impresora térmica Bluetooth (opcional)

SOPORTE
Email: soporte@vertexerp.com
```

### Categoría
**Negocios**

### Clasificación de Contenido
**Para todas las edades**

### Países de Distribución
**México** (inicialmente)

---

## ✅ Checklist de Implementación

### Preparación
- [ ] Instalar Android Studio (Manual por el usuario)
- [ ] Instalar JDK 11+ (Manual por el usuario)
- [ ] Configurar variables de entorno (ANDROID_HOME, JAVA_HOME)
- [ ] Crear cuenta de Google Play Developer ($25 USD)

### Fase 1: Setup (✅ 90%)
- [x] Instalar Capacitor y dependencias
- [x] Agregar plataforma Android (`/android`)
- [x] Configurar build estático en Next.js (`output: 'export'`)
- [ ] Hacer primer build y sincronización exitosa (En proceso ⏳)

### Fase 2: Plugins (✅ 100%)
- [x] Instalar plugin Bluetooth (@capacitor-community/bluetooth-le)
- [x] Instalar plugin Geolocalización (@capacitor/geolocation)
- [x] Instalar plugin Cámara (@capacitor/camera)
- [x] Instalar plugin Notificaciones (@capacitor/push-notifications)
- [x] Instalar plugin Almacenamiento (@capacitor/preferences + IndexedDB)

### Fase 3: Código (✅ 80%)
- [x] Crear hook `usePlatform` para detección nativa
- [x] Adaptar impresión Bluetooth (Refactorización a `WebBluetooth`)
- [x] Crear Launchpad `/cobrador-app` y Layout nativo
- [x] Adaptar rutas móviles `/mobile/*`
- [x] Adaptar almacenamiento local y sincronización offline (Dexie)
- [ ] Adaptar geolocalización nativa (Mapear API browser a plugin)

### Fase 4: Testing
- [ ] Probar en emulador Android
- [ ] Probar en dispositivo real (Android 5.0 - Android 14)
- [ ] Probar impresión Bluetooth física
- [ ] Probar flujo offline/online (Sincronización)

### Fase 5: Publicación
- [ ] Generar keystore de firma
- [ ] Generar AAB de producción
- [ ] Crear assets para Play Store (Icono verde, Splash)
- [ ] Subir a Play Console y enviar a revisión

---

## 🎯 Ventajas de App Exclusiva para Cobrador

### 1. **Más Ligera**
- Solo incluye funcionalidades de cobranza
- Tamaño de APK reducido (~25 MB vs ~40 MB)
- Carga más rápida

### 2. **Más Enfocada**
- UI simplificada para cobradores
- Sin distracciones de módulos administrativos
- Flujo de trabajo optimizado

### 3. **Mejor Rendimiento**
- Menos código JavaScript
- Menos recursos en memoria
- Funciona mejor en dispositivos de gama baja

### 4. **Más Segura**
- Cobradores solo ven sus clientes
- No tienen acceso a funciones administrativas
- Permisos limitados

### 5. **Más Fácil de Mantener**
- Código más simple
- Menos dependencias
- Actualizaciones más rápidas

---

## 📞 Próximos Pasos

1. **Confirmar alcance:**
   - ✅ Solo para cobradores
   - ✅ Solo funcionalidades de cobranza móvil
   - ✅ Administración permanece en web

2. **Preparar entorno:**
   - Instalar Android Studio
   - Configurar dispositivos de prueba

3. **Ejecutar setup:**
   ```bash
   cd app
   bash ../setup-capacitor-cobrador.sh
   ```

4. **Desarrollar y probar:**
   - Implementar fase por fase
   - Testing continuo

5. **Publicar:**
   - Generar APK/AAB
   - Subir a Play Store
   - Distribuir a cobradores

---

**Tiempo Total Estimado:** 7-10 días  
**Costo Total:** $25 USD (Google Play Developer)  
**Resultado:** App nativa Android exclusiva para cobradores en campo

---

**Creado por:** DeepAgent  
**Fecha:** 2026-02-07  
**Versión:** 1.0
