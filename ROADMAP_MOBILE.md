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
- [ ] **Pendiente:** Refinar captura de gastos administrativos.

### 🟠 Fase 3: Optimización y Notificaciones (50%)
- [x] Visualización de clientes en mapa (Leaflet).
- [x] Apertura de navegación en Google Maps/Waze.
- [ ] **Pendiente:** Algoritmo de ruta óptima (TSP).
- [ ] **Pendiente:** Notificaciones Push para nuevas asignaciones (FCM).
- [ ] **Pendiente:** Registro de ubicación forzada al cobrar.

### ⚪ Fase 4: Expansión e IA (20%)
- [x] Registro de Leads en campo.
- [ ] **Pendiente:** Conversión Lead -> Cliente desde la App.
- [ ] **Pendiente:** Asistente de voz para notas de cobranza.
- [ ] **Pendiente:** Dashboard de metas y gamificación para el cobrador.

---

## 🛠️ Próximos Pasos Inmediatos
1. **Configuración de FCM:** Implementar las notificaciones push para mejorar la comunicación con los cobradores.
2. **Optimización de Batería:** Revisar el uso de GPS en segundo plano.
3. **Beta Testing:** Despliegue con 2 cobradores para validar el flujo de sincronización en condiciones de red inestable.

---
*Ultima actualización: 5 de Mayo de 2026*
