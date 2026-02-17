# Roadmap - Pendientes y Futuras Mejoras

Este documento detalla las características planificadas, mejoras técnicas y nuevas funcionalidades sugeridas para futuras versiones de VertexERP Muebles.

## 📅 Próximas Implementaciones (Backlog)

### 🔴 Prioridad Alta (Q1 2026)

#### 1. Aplicación Nativa Android 📱 (Solo Cobradores) [✅ EN PROGRESO - 90%]
- **Alcance:** App exclusiva para cobradores en campo (no incluye módulos administrativos).
- **Plugins Nativos:** Bluetooth para impresoras, GPS, almacenamiento offline (Dexie/Preferences).
- **Funcionalidades:** Lista de clientes, registro de pagos con WhatsApp, caja diaria, mapas.
- **Estado:** Vistas móviles creadas, lógica de sincronización offline implementada. Pendiente: Notificaciones Push.

#### 2. Optimización Inteligente de Rutas [🟡 EN PROGRESO - 50%]
- **Visualización en Mapa:** ✅ Implementado componente de mapa con Leaflet para la app móvil.
- **Planificación de Recorrido:** ⏳ Pendiente algoritmo de optimización (TSP).
- **Navegación:** ✅ Implementado botón para abrir Google Maps/Waze nativo.

#### 3. Notificaciones y Comunicación [🟡 EN PROGRESO - 40%]
- **Integración con WhatsApp:** ✅ Implementado envío de recibos digitales vía wa.me desde la app móvil.
- **Notificaciones Push:** ⏳ Pendiente configuración de Firebase Cloud Messaging (FCM).
- **Recordatorios SMS:** ⏳ Pendiente integración con Twilio o similar.

#### 4. Mejoras en Importación de Datos [✅ COMPLETADO]
- **Asistente de Migración:** ✅ Implementada herramienta de carga masiva desde Excel con vista previa y validación.
- **Exportación Avanzada:** ⏳ Pendiente reportes personalizados en PDF/Excel.

### 🟡 Prioridad Media (Q2 2026)

#### 5. Gestión de Inventario Completa
- **Control de Stock:** Módulo para administrar existencias de muebles en bodega y tiendas.
- **Movimientos:** Registro de entradas, salidas y traspasos entre sucursales.
- **Vinculación con Ventas:** Descuento automático del inventario al realizar una venta a crédito.

#### 6. Pasarela de Pagos en Línea
- **Portal de Cliente:** Permitir que los clientes consulten su saldo y realicen pagos en línea mediante tarjeta o transferencia.
- **Referencias Bancarias:** Generación de fichas de depósito referenciadas (OXXO, Bancos).

### 🟢 Mejoras Técnicas y Mantenimiento

#### 7. Calidad de Código y Testing
- **Cobertura de Pruebas:** Implementar pruebas unitarias (Jest) y E2E (Playwright) para flujos críticos de cobranza.
- **Refactorización:** Optimización de consultas a base de datos para grandes volúmenes de clientes.

#### 8. Internacionalización (i18n)
- **Soporte Multi-idioma:** Abstraer textos de la interfaz para soportar inglés y otros idiomas, facilitando la expansión del software.
