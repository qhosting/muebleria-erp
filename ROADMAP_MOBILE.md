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

### 🟢 Fase 2: Operación en Campo (100%)
- [x] Lista de clientes asignados con búsqueda.
- [x] Registro de pagos (Capital, Interés, Moras).
- [x] Registro de "Motararios" (visitas sin pago).
- [x] Impresión de tickets vía Bluetooth.
- [x] Envío de recibos y Avisos de Cobro por WhatsApp.
- [x] Refinar captura de gastos administrativos.
- [x] Identificar depósitos bancarios (Gestor vs Bot) en CAJA.

### 🟡 Fase 3: Optimización y Notificaciones (85%)
- [x] Visualización de clientes en mapa (Leaflet).
- [x] Apertura de navegación en Google Maps/Waze.
- [x] Algoritmo de ruta óptima (TSP).
- [x] Registro de Avisos de Cobro (Auditoría).
- [x] Seguimiento de Convenios de Pago en la App.
- [x] Indicadores de notificación (Red dots) en navegación.
- [x] Registro de ubicación forzada al cobrar.

### 🟠 Fase 4: Expansión e IA (30%)
- [x] Registro de Leads en campo.
- [ ] **Prioridad:** Conversión Lead -> Cliente desde la App (Flujo de aprobación).
- [ ] **Pendiente:** Asistente de voz para notas de cobranza.
- [ ] **Pendiente:** Dashboard de metas y gamificación para el cobrador.

---

## 🛠️ Próximos Pasos Inmediatos
1. **Flujo Lead -> Cliente:** Implementar la lógica para que el cobrador pueda formalizar un contrato desde el celular.
2. **Validación de Avisos:** Revisar en el panel administrativo el reporte de avisos entregados.

---
*Ultima actualización: 5 de Mayo de 2026*
