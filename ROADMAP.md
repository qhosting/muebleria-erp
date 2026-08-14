# Roadmap - VertexERP Muebles

## 🚀 Estado Actual del Proyecto (v3.0.0)

VertexERP Muebles es un sistema integral de gestión de cobranza, ventas a crédito y administración empresarial diseñado específicamente para mueblerías que operan con créditos y cobranza en campo. El sistema funciona como PWA (Progressive Web App) y como **App Nativa Android** para cobradores y vendedores en campo.

### ✅ Funcionalidades Implementadas

#### 1. Gestión de Clientes y Créditos
- **Base de Datos de Clientes:** Registro completo con geolocalización, scoring crediticio y datos de contacto.
- **Historial de Créditos y Calendarios:** Seguimiento detallado de cuentas, abonos, intereses y saldos.
- **Formalización Automática de Créditos (Lead → Solicitud → Cliente):** Creación transaccional de la cuenta de cliente al autorizar la solicitud, vinculación de expedientes digitales en Bóveda y deducción automática de inventario.
- **Bóveda Digital de Documentos:** Digitalización de INE, comprobantes de domicilio y pagarés sincronizados con Google Drive.

#### 2. Módulo de Cobranza (Campo & Offline-First)
- **App Móvil (PWA) & Nativa Android:** Interfaz unificada en `/mobile/home` para cobradores y supervisores.
- **App Nativa Android:** APK Release compilado y firmado (`com.vertexerp.cobrador`) con Capacitor 8 y Firebase Cloud Messaging (FCM).
- **Modo Offline:** Registro autónomo de cobros, visitas ("Motararios") y verificaciones mediante IndexedDB (Dexie). Generación local de recibos PDF y compartición vía WhatsApp sin internet.
- **Rutas de Cobro Inteligentes:** Organización de clientes en mapa interactivo (Leaflet), resolución TSP de ruta óptima y apertura en Google Maps/Waze.
- **Caja Diaria y Arqueos:** Cierre de caja en campo, arqueos por sesión y balance de cobranza por usuario.

#### 3. Módulo de Ventas, Prospección e Inventario
- **Metas y Presupuestos Dinámicos:** Configuración flexible por rangos de fechas (Monto, Piezas, Clientes nuevos) y reportes de logro por asesor en vivo.
- **Control de Leads:** Registro de prospectos en campo con geolocalización y conversión a solicitud de crédito.
- **Catálogo Multialmacén y Control de Stock:** Catálogo con precios a crédito/contado, sucursales y bodegas.
- **Historial de Movimientos de Inventario:** Auditoría completa de entradas, salidas, traspasos entre sucursales y ventas en tiempo real con filtros avanzados.
- **Sincronización Contpaqi:** Integración para sincronizar catálogo de productos, existencias y clientes comerciales.

#### 4. Finanzas, Tesorería y Reportes
- **Dashboard Ejecutivo:** Métricas clave (KPIs), navegación activa por módulos y alertas en tiempo real.
- **Conciliador Bancario Inteligente:** Algoritmo heurístico de conciliación de depósitos bancarios (Banorte, Santander) vs tickets y cobranza en campo.
- **Campañas SMS:** Módulo de envíos masivos y automatizados para recordatorios preventivos y cobranza.
- **Control de Morosidad:** Detección de cuentas vencidas, cálculo automático de moratorios y reportes de discrepancias.

#### 5. Configuración y Hardware
- **Impresión Bluetooth ESC/POS:** Soporte nativo para impresoras térmicas portátiles de 58mm y 80mm.
- **Plantillas de Tickets y Recibos:** Formatos personalizables con logotipo, código de barras y desglose de pago.
- **Gestión de Permisos Granulares:** Roles (Admin, Dirección, Cobrador, Vendedor, Jefe de Ventas, Gestor de Cobranza).

#### 6. Infraestructura y Despliegue
- **Contenedores Docker:** Dockerfile y compose optimizados para producción.
- **Despliegue PaaS:** Compatibilidad verificada con Coolify y Easypanel.
- **Seguridad:** Control de dispositivos autorizados (`DispositivoAutorizado`), cifrado de tokens y NextAuth protegido.

---

## 📋 Próximos Pasos (Backlog Q3/Q4)

### 🔴 Alta Prioridad
- [ ] **Play Store:** Publicación del bundle AAB en Google Play Console.
- [ ] **Testing en Campo:** Jornada de validación presencial con cobradores y retroalimentación de UX.
- [ ] **Pasarela de Cobro Digital:** Portal web para que los clientes paguen sus abonos con tarjeta / SPEI.

### 🟡 Media Prioridad
- [ ] **Asistente de Voz para Notas:** Dictado por voz de notas de visita durante la cobranza en ruta.
- [ ] **Gamificación de Cobranza:** Tablero de logros y comisiones para cobradores en la app móvil.
- [ ] **Firma Digital Biométrica:** Captura de firma en pantalla para pagarés en campo.

### 🟢 Mejoras Futuras
- [ ] Soporte para iOS (requiere cuenta Apple Developer).
- [ ] Actualización OTA (Over-The-Air) para distribución directa de parches en campo.

