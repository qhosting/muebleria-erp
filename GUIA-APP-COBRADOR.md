# 📱 Guía Técnica: App Nativa para Cobradores

**Versión:** 1.0  
**Objetivo:** Instalación y ejecución de la app Android exclusiva para cobradores.

---

## 🚀 Inicio Rápido

La infraestructura ya está implementada en el repositorio. Sigue estos pasos para ejecutar la app:

### 1. Instalación de Dependencias

> **⚠️ Nota para usuarios de Windows:** Si encuentras errores de dependencias (ERESOLVE), agrega `--legacy-peer-deps` al final de los comandos de instalación.

```bash
cd app

# Instalar utilidad para variables de entorno (Windows)
npm install cross-env --save-dev --legacy-peer-deps

# Instalar núcleo y plugins de Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android --legacy-peer-deps
npm install @capacitor-community/bluetooth-le @capacitor/geolocation @capacitor/preferences @capacitor/network @capacitor/app @capacitor/status-bar @capacitor/splash-screen --legacy-peer-deps

# Inicializar plataforma Android
npx cap add android
```

### 2. Sincronización y Ejecución

```bash
# Sincronizar cambios web con nativo
npm run cobrador:sync

# Abrir Android Studio
npm run cobrador:open

# O ejecutar directamente en dispositivo conectado
npm run cobrador:run
```

---

## 📂 Archivos Clave

| Archivo | Ubicación | Descripción |
|---|---|---|
| **Detector** | `hooks/usePlatform.ts` | Detecta si es App Nativa vs Web |
| **Config** | `capacitor.config.ts` | ID de aplicación `com.vertexerp.cobrador` |
| **Printer** | `lib/native/printer.ts` | Wrapper para impresión Bluetooth |
| **GPS** | `lib/native/location.ts` | Wrapper para geolocalización |
| **Storage** | `lib/native/storage.ts` | Wrapper para persistencia de datos |
| **Manifest** | `public/manifest-cobrador.json` | Iconos y configuración PWA de cobrador |

---

## 🛠️ Comandos Disponibles

| Comando | Acción |
|---|---|
| `npm run build:cobrador` | Genera build estático optimizado para cobrador |
| `npm run cobrador:dev` | Build + Sync + Open Android Studio |
| `npm run cobrador:build:apk` | Genera APK de producción (Release) |
| `npm run cobrador:build:aab` | Genera AAB para Play Store |

---

## 📱 Notas de Desarrollo

- **Modo Cobrador:** La app se ejecuta con `NEXT_PUBLIC_APP_MODE=cobrador`.
- **Bluetooth:** El plugin `@capacitor-community/bluetooth-le` se carga dinámicamente en `printer.ts` para evitar errores en compilación web.
- **Navegación:** En Android usa `geo:` para abrir Google Maps nativo; en web usa URL estándar.
