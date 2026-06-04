# 📱 Roadmap: Aplicación Móvil & Modo Cobrador

## 🎯 Objetivo
Digitalizar y optimizar la operación de cobranza en campo, proporcionando herramientas offline, geolocalización e impresión de tickets en tiempo real.

---

## 📅 Estado de Desarrollo (Junio 2026)

### 🟢 Fase 1: Infraestructura Base (100%)
- [x] Configuración de Capacitor y Plugins (GPS, BT, Network).
- [x] Arquitectura de almacenamiento local (Dexie/IndexedDB).
- [x] Lógica de autenticación con sesión persistente.
- [x] Sincronización básica de clientes y pagos.

### 🟢 Fase 2: Operación en Campo (100%)
- [x] Lista de clientes asignados con búsqueda.
- [x] Registro de pagos (Capital, Interés, Moras).
- [x] Registro de "Motararios" (visitas sin pago).
- [x] Impresión de tickets vía Bluetooth.
- [x] Envío de recibos y Avisos de Cobro por WhatsApp.
- [x] Refinar captura de gastos administrativos.
- [x] Identificar depósitos bancarios (Gestor vs Bot) en CAJA.

### 🟢 Fase 3: Optimización y Notificaciones (100%)
- [x] Visualización de clientes en mapa (Leaflet).
- [x] Apertura de navegación en Google Maps/Waze.
- [x] Algoritmo de ruta óptima (TSP).
- [x] Registro de Avisos de Cobro (Auditoría).
- [x] Seguimiento de Convenios de Pago en la App.
- [x] Indicadores de notificación (Red dots) en navegación.
- [x] Registro de ubicación forzada al cobrar.

### 🟢 Fase 4: Build & Distribución Nativa (100%) ✅ *Junio 2026*
- [x] Script de build estático para Capacitor (`scripts/build-native.js`).
- [x] Keystore de firma creado (`android/app/vertexerp-release.jks`).
- [x] `signingConfigs` configurado en `android/app/build.gradle`.
- [x] Integración de Firebase Cloud Messaging (FCM) con `google-services.json` y el plugin de Google Services.
- [x] **APK Release firmado generado con FCM** — `app-release.apk` (9.28 MB).
  - App ID: `com.vertexerp.cobrador`
  - Versión: `2.9.34` (versionCode 2)
  - Herramienta: Capacitor 8 + Gradle + JDK 21
  - 12 plugins nativos incluidos (GPS, BT, Cámara, Push, etc.)

### 🟠 Fase 5: Expansión e IA (30%)
- [x] Registro de Leads en campo.
- [ ] **Prioridad:** Conversión Lead -> Cliente desde la App (Flujo de aprobación).
- [ ] **Pendiente:** Asistente de voz para notas de cobranza.
- [ ] **Pendiente:** Dashboard de metas y gamificación para el cobrador.

### 🔵 Fase 6: Publicación Play Store (0%)
- [ ] Crear cuenta Google Play Developer ($25 USD, pago único).
- [ ] Generar AAB (Android App Bundle) para Play Store.
- [ ] Crear assets: icono verde (192x192, 512x512), screenshots.
- [ ] Subir a Play Console y enviar a revisión.

---

## 🛠️ Próximos Pasos Inmediatos
1. **Flujo Lead → Cliente:** Implementar la lógica para que el cobrador pueda formalizar un contrato desde el celular.
2. **Testing en campo:** Instalar el APK en dispositivos de cobradores y recolectar feedback.
3. **Play Store:** Publicar para distribución masiva.

---

## 🔑 Datos del Keystore (guardar en lugar seguro)
| Campo | Valor |
|-------|-------|
| Archivo | `android/app/vertexerp-release.jks` |
| Store Password | `VertexERP2024!` |
| Key Alias | `vertexerp` |
| Key Password | `VertexERP2024!` |

---
*Última actualización: 4 de Junio de 2026 (v2.9.34 con soporte para notificaciones push FCM)*
