# Roadmap - VertexERP Muebles

## 🚀 Estado Actual del Proyecto (v2.9.34)

VertexERP Muebles es un sistema integral de gestión de cobranza y administración de clientes diseñado específicamente para mueblerías que operan con créditos y cobranza en campo. El sistema funciona tanto como PWA (Progressive Web App) como **App Nativa Android** para cobradores en campo.

### ✅ Funcionalidades Implementadas

#### 1. Gestión de Clientes y Créditos
- **Base de Datos de Clientes:** Registro completo con geolocalización y datos de contacto.
- **Historial de Créditos:** Seguimiento detallado de cuentas, abonos y saldos.
- **Estado de Cuenta:** Visualización clara del estado actual de cada cliente.

#### 2. Módulo de Cobranza (Campo)
- **App Móvil (PWA):** Interfaz optimizada para cobradores en ruta.
- **App Nativa Android:** APK compilado y firmado (`com.vertexerp.cobrador`, v2.9.34). ✅ *Junio 2026*
- **Modo Offline:** Capacidad de registrar cobros sin conexión a internet y sincronización automática.
- **Rutas de Cobro:** Organización lógica de clientes por zonas o rutas asignadas.
- **Caja Diaria:** Cierre de caja y resumen de cobranza por usuario.

#### 3. Módulo de Ventas y Prospección
- **Metas Flexibles:** Configuración de presupuestos por rangos de fechas (Monto, Piezas, Leads).
- **Control de Leads:** Registro de prospectos en campo con geolocalización.
- **Avance en Tiempo Real:** Dashboard móvil para vendedores con seguimiento de KPIs.
- **Equipos de Ventas:** Organización de vendedores bajo líderes de equipo.

#### 4. Finanzas y Reportes
- **Dashboard Principal:** Métricas clave (KPIs) en tiempo real.
- **Control de Morosidad:** Identificación automática de cuentas vencidas.
- **Reportes de Saldos:** Análisis de cartera vencida y por vencer.
- **Historial de Pagos:** Trazabilidad completa de todas las transacciones.

#### 5. Configuración y Hardware
- **Impresión Bluetooth:** Soporte nativo para impresoras térmicas portátiles (plugin Capacitor).
- **Plantillas de Tickets:** Editor de plantillas para recibos de pago personalizables.
- **Gestión de Usuarios:** Sistema de roles (Administrador, Cobrador, Supervisor).

#### 6. Infraestructura y Despliegue
- **Contenedores:** Soporte completo para Docker y Docker Compose.
- **Plataformas PaaS:** Scripts optimizados para despliegue en Coolify y Easypanel.
- **Persistencia:** Estrategias de backup y persistencia de datos configuradas.
- **Compatibilidad:** Optimizado para Android 13+ y navegadores modernos (Chrome/Edge).
- **Distribución Android:** APK Release firmado listo para Play Store o distribución directa.

---

## 📋 Próximos Pasos

### 🔴 Alta Prioridad
- [ ] **Play Store:** Publicar APK en Google Play Console (requiere cuenta Developer $25 USD).
- [ ] **Flujo Lead → Cliente:** Formalizar contratos desde la app del cobrador.
- [ ] **Testing en campo:** Pruebas con cobradores reales en dispositivos físicos.

### 🟡 Media Prioridad
- [ ] **Asistente de voz:** Notas de cobranza por voz.
- [ ] **Dashboard de metas:** Gamificación y seguimiento de KPIs para el cobrador.
- [ ] **Validación de Avisos:** Panel admin con reporte de avisos entregados.

### 🟢 Mejoras Futuras
- [ ] Soporte iOS (requiere cuenta Apple Developer $99 USD/año).
- [x] Notificaciones push configuradas con FCM (google-services.json integrado, plugin aplicado y APK compilada).
- [ ] Actualización OTA (Over-The-Air) sin pasar por Play Store.
