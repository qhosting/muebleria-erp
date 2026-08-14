# Roadmap - Pendientes y Futuras Mejoras (v3.0.0)

Este documento detalla las características planificadas, mejoras técnicas y nuevas funcionalidades sugeridas para futuras versiones de VertexERP Muebles.

## 📅 Próximas Implementaciones (Backlog)

### 🔴 Prioridad Alta (Q3/Q4 2026)

#### 1. Aplicación Nativa Android 📱 [✅ 100% OPERATIVA]
- **Alcance:** App móvil unificada para cobradores y vendedores en campo.
- **Plugins Nativos:** Impresión Bluetooth ESC/POS, GPS forzado en cobro, almacenamiento offline Dexie, Push FCM.
- **Funcionalidades:** Lista de clientes, registro de cobros con PDF WhatsApp offline, arqueo de caja diaria, mapa con rutas TSP.
- **Estado:** ✅ Build Release firmado (`com.vertexerp.cobrador`, v3.0.0).

#### 2. Formalización de Créditos y Prospección [✅ 100% IMPLEMENTADO]
- **Registro de Leads:** ✅ Captura geolocalizada en campo.
- **Conversión y Aprobación:** ✅ Endpoint transaccional `/api/ventas/solicitudes/status` que genera cuenta de cliente, calendario de pagos, asigna vendedor/cobrador, vincula Bóveda Digital y descuenta inventario.
- **Tablero de Metas:** ✅ Presupuestos por asesor con avance en tiempo real.

#### 3. Control de Inventario y Multialmacén [✅ 100% IMPLEMENTADO]
- **Catálogo y Existencias:** ✅ Catálogo de muebles, sucursales y bodegas.
- **Historial de Movimientos:** ✅ Auditoría completa con filtros por tipo (entrada, salida, venta, traspaso) y sucursal.
- **Sincronización Contpaqi:** ✅ Conector con Contpaqi Comercial / Adminpaq.

#### 4. Pasarela de Pagos en Línea y Portal de Clientes [⏳ PENDIENTE]
- **Portal de Autogestión:** Permitir que los clientes consulten su estado de cuenta y realicen abonos mediante SPEI o tarjeta de débito/crédito.
- **Fichas de Pago Referenciadas:** Generación de referencias automáticas para tiendas de conveniencia (OXXO, 7-Eleven).

### 🟡 Prioridad Media

#### 5. Asistente de Voz y Reconocimiento de Notas
- **Notas de Cobranza por Voz:** Transcripción automática de observaciones de visita mediante Web Speech API / Whisper.
- **Firma Biométrica en Pantalla:** Captura de firma digital para pagarés y solicitudes de crédito en campo.

#### 6. Gamificación y Comisiones para Cobradores
- **Incentivos en Ruta:** Visualización de metas diarias alcanzadas y bonos por cobranza efectiva.

### 🟢 Mejoras Técnicas y Mantenimiento

#### 7. Pruebas Automatizadas y Calidad
- **Tests Unitarios & E2E:** Cobertura para conciliación bancaria y reconciliación offline de Dexie.
- **Monitoreo y Telemetría:** Sentry / Prometheus para detección de anomalías en sincronización.

