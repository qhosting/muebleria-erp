# 📱 Roadmap: Aplicación Móvil & Modo Cobrador
 
## 🎯 Objetivo
Digitalizar y optimizar la operación de cobranza y ventas en campo, proporcionando herramientas 100% offline, geolocalización, formalización de créditos e impresión de tickets en tiempo real.

---

## 📅 Estado de Desarrollo (v3.0.0)

### 🟢 Fase 1: Infraestructura Base (100%)
- [x] Configuración de Capacitor y Plugins (GPS, BT, Network, Camera).
- [x] Arquitectura de almacenamiento local (Dexie/IndexedDB con reconciliación de IDs).
- [x] Lógica de autenticación con sesión persistente (Soporte offline NextAuth e inmunidad a caídas de red en DeviceLockGuard).
- [x] Sincronización bidireccional de clientes y pagos.

### 🟢 Fase 2: Operación en Campo (100%)
- [x] Lista de clientes asignados con búsqueda y filtros por día de cobro.
- [x] Registro de pagos (Capital, Interés, Moras) offline.
- [x] Registro de "Motararios" (visitas sin pago con captura de motivos y fotos).
- [x] Impresión de tickets vía Bluetooth térmica ESC/POS.
- [x] Envío de recibos y Avisos de Cobro por WhatsApp (generación y compartición local offline de PDF).
- [x] Captura de gastos de ruta y control de sesión de caja.
- [x] Identificación y auditoría de depósitos bancarios.

### 🟢 Fase 3: Optimización y Navegación en Ruta (100%)
- [x] Visualización de clientes en mapa interactivo (Leaflet).
- [x] Apertura de navegación guiada en Google Maps/Waze.
- [x] Algoritmo de ruta óptima (TSP).
- [x] Registro de Avisos de Cobro (Auditoría con fotos geolocalizadas).
- [x] Seguimiento de Convenios de Pago en la App.
- [x] Indicadores de estado de sincronización y conectividad en tiempo real.
- [x] Registro forzoso de coordenadas GPS al registrar cobros.

### 🟢 Fase 4: Build & Distribución Nativa (100%)
- [x] Script de build estático para Capacitor (`scripts/build-native.js`).
- [x] Keystore de firma creado (`android/app/vertexerp-release.jks`).
- [x] `signingConfigs` configurado en `android/app/build.gradle`.
- [x] Integración de Firebase Cloud Messaging (FCM) con `google-services.json` y el plugin de Google Services.
- [x] **APK Release firmado generado con FCM** — `app-release.apk` (9.28 MB).
  - App ID: `com.vertexerp.cobrador`
  - Versión: `3.0.0` (versionCode 3)
  - Herramienta: Capacitor 8 + Gradle + JDK 21
  - 12 plugins nativos incluidos (GPS, BT, Cámara, Push, etc.)

### 🟢 Fase 5: Expansión de Ventas y Formalización (100%)
- [x] Registro de Leads / Prospectos en campo con geolocalización.
- [x] **Formalización Lead → Solicitud → Cliente:** Aprobación de créditos con creación automática de cuenta, calendario de pagos y vinculación de expedientes en Bóveda.
- [x] Bóveda Digital móvil para digitalización de INE, pagarés y comprobantes de domicilio.
- [x] Tablero de metas y presupuestos mensuales por asesor con avance diario.

### 🔵 Fase 6: Publicación Play Store & Próximas Mejoras (Backlog)
- [ ] Generar AAB (Android App Bundle) para Play Store.
- [ ] Subir a Play Console y enviar a revisión.
- [ ] Dictado por voz de notas de visita durante cobranza en ruta.
- [ ] Firma digital biométrica en pantalla para pagarés.

---

## 🔑 Datos del Keystore (guardar en lugar seguro)
| Campo | Valor |
|-------|-------|
| Archivo | `android/app/vertexerp-release.jks` |
| Store Password | `VertexERP2024!` |
| Key Alias | `vertexerp` |
| Key Password | `VertexERP2024!` |

---
*Última actualización: Versión 3.0.0 (Formalización integral de créditos, historial de inventario y soporte offline avanzado)*

