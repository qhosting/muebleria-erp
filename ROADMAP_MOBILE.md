# 📱 Roadmap: Aplicación Móvil & Modo Cobrador

## 🎯 Objetivo
Digitalizar y optimizar la operación de cobranza en campo, proporcionando herramientas offline, geolocalización e impresión de tickets en tiempo real.

---

## 📅 Estado de Desarrollo (Mayo 2026)

### 🟢 Fase 1: Infraestructura Base (100%)
- [x] Configuración de Capacitor y Plugins (GPS, BT, Network).
- [x] Arquitectura de almacenamiento local (Dexie/IndexedDB).
- [x] Lógica de autenticación con sesión persistente.
- [x] Sincronización básica de clientes y pagos.

### 🟡 Fase 2: Operación en Campo (90%)
- [x] Lista de clientes asignados con búsqueda.
- [x] Registro de pagos (Capital, Interés, Moras).
- [x] Registro de "Motararios" (visitas sin pago).
- [x] Impresión de tickets vía Bluetooth.
- [x] Envío de recibos por WhatsApp.
- [x] Refinar captura de gastos administrativos (Desglose de capital vs. gastos).
- [x] Identificar depósitos bancarios (Gestor vs Bot) en CAJA.

### 🟠 Fase 3: Optimización y Notificaciones (50%)
- [x] Visualización de clientes en mapa (Leaflet).
- [x] Apertura de navegación en Google Maps/Waze.
- [x] Algoritmo de ruta óptima (TSP).
- [x] Notificaciones Push para nuevas asignaciones (FCM/WebPush).
- [x] Registro de ubicación forzada al cobrar.

### ⚪ Fase 4: Expansión e IA (20%)
- [x] Registro de Leads en campo.
- [ ] **Pendiente:** Conversión Lead -> Cliente desde la App.
- [ ] **Pendiente:** Asistente de voz para notas de cobranza.
- [ ] **Pendiente:** Dashboard de metas y gamificación para el cobrador.

---

## 🛠️ Próximos Pasos Inmediatos
1. **Beta Testing:** Despliegue con 2 cobradores para validar el flujo de sincronización en condiciones de red inestable.
2. **Capacitación:** Sesión con el equipo de cobranza sobre el nuevo desglose de pagos y optimización de rutas.

---
*Ultima actualización: 5 de Mayo de 2026*
