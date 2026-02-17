# Roadmap - Pendientes y Futuras Mejoras

Este documento detalla las características planificadas, mejoras técnicas y nuevas funcionalidades sugeridas para futuras versiones de VertexERP Muebles.

## 📅 Próximas Implementaciones (Backlog)

### 🔴 Prioridad Alta (Q1 2026)

#### 1. Aplicación Nativa Android 📱 (Solo Cobradores)
- **Alcance:** App exclusiva para cobradores en campo (no incluye módulos administrativos).
- **Compatibilidad Universal:** Funciona en Android 5.0+ (vs PWA que requiere Android 8.0+).
- **Distribución Play Store:** Mayor alcance y credibilidad con app oficial.
- **Plugins Nativos:** Bluetooth para impresoras térmicas, GPS para navegación, almacenamiento offline.
- **Funcionalidades:** Lista de clientes, registro de pagos, motararios, caja diaria, impresión de tickets.
- **Mejor Rendimiento:** App ligera (~25 MB) optimizada para dispositivos de gama baja.
- **Documentación:** Plan completo en `PLAN-APP-COBRADOR-ANDROID.md` y script `setup-capacitor-cobrador.sh`.
- **Tiempo estimado:** 7-10 días de implementación.

#### 2. Optimización Inteligente de Rutas
- **Visualización en Mapa:** Integración con servicios de mapas (Google Maps / Mapbox) para ver la ubicación de los clientes de una ruta.
- **Planificación de Recorrido:** Algoritmo para sugerir el orden óptimo de visita basado en la ubicación geográfica para ahorrar tiempo y combustible.
- **Navegación:** Botón directo para iniciar navegación GPS hacia el domicilio del cliente.

#### 3. Notificaciones y Comunicación
- **Integración con WhatsApp:** Envío automático de recibos de pago digitales y recordatorios de cobro a través de WhatsApp API.
- **Notificaciones Push:** Alertas a los cobradores sobre cambios en la ruta o avisos urgentes.
- **Recordatorios SMS:** Envío programado de recordatorios de pago a clientes.

#### 4. Mejoras en Importación de Datos
- **Asistente de Migración:** Herramienta robusta para importar clientes y saldos históricos desde Excel/CSV con validación de datos en tiempo real.
- **Exportación Avanzada:** Capacidad de exportar reportes personalizados en múltiples formatos (PDF, Excel, JSON).

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
