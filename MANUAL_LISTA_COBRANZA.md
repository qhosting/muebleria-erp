# 📖 Manual Operativo: Lista de Cobranza y Corte Semanal (CEJ)

Guía rápida para la generación, gestión, cierre e impresión de la **Plantilla Lista Cobranza** en el ERP de Mueblería Daso.

---

## 🧭 Acceso al Módulo
- **URL:** [https://erp.mueblesdaso.com/dashboard/cobranza/lista-cobranza](https://erp.mueblesdaso.com/dashboard/cobranza/lista-cobranza)
- **Menú:** Dashboard ➔ Cobranza ➔ **Lista Cobranza**

---

## 1. 📋 Creación y Consulta de la Lista de Cobranza

1. **Seleccionar Parámetros:**
   - **Cobrador / Gestor:** Elige un cobrador específico (ej. `DQCEJ`) o `TODOS LOS COBRADORES (GENERAL)`.
   - **Año:** Año en curso (ej. `2026`).
   - **Semana:** Selecciona la semana del calendario oficial (ciclo Sábado a Viernes). Puedes usar los accesos rápidos: *Esta Sem* o *Sem Anterior*.
2. **Buscar Lista:**
   - Haz clic en **Buscar Lista**.
   - El sistema carga la cartera de clientes asignados con sus contratos, sugerido semanal, saldo vencido y abonos recibidos.

---

## 2. 💾 Guardar el Corte Inicial (Apertura)

Al inicio de la semana (sábado por la mañana):
1. Con la lista en pantalla, haz clic en el botón azul **Guardar Corte del Cobrador**.
2. Ingresa observaciones iniciales si lo requieres y haz clic en **Confirmar y Guardar**.
3. El corte queda guardado con estatus **`ABIERTO (EN CURSO)`**.
   - Esto congela la cartera oficial base para auditoría.
   - Habilita la edición de la columna **PROBLEMA**.

---

## 3. ✏️ Modificación de Cuentas (Columna PROBLEMA)

Durante la semana, los supervisores pueden reclasificar las cuentas directamente en la tabla:
1. En la pestaña **Cartera en Ruta**, ubica la columna **PROBLEMA**.
2. Haz clic en el selector de la cuenta y elige el código correspondiente:
   - **RUTA:** Cuenta normal en cobranza activa de campo.
   - **K:** Cancelado (devolución de mercancía o cuenta cancelada).
   - **IT:** Intervención (caso especial tomado por supervisión/jurídico).
   - **DL:** Dictamen Legal (proceso de demanda o cobranza judicial).
   - **AD:** Adelantado (cliente que cubrió su cuota con anticipación).
   - **PE:** Periodo / Problema Especial (default de cuentas pendientes).
   - **PA / VD / NC / FD:** Promesa de abono, verificación domiciliaria, no contacto o fuera de domicilio.
3. El cambio se guarda automáticamente en la base de datos y actualiza los resúmenes ejecutivos en tiempo real.
   > **Nota:** Si una cuenta clasificada como `PE` registra un pago, el sistema la promueve automáticamente a `RUTA`.

---

## 4. 🔄 Recálculo en Vivo de Nuevos Pagos

A lo largo de la semana ingresan pagos continuamente (vía Bot de WhatsApp, SPEI, depósitos bancarios o efectivo del gestor):
1. Cada vez que abras o consultes la lista, **el sistema recalcula y actualiza automáticamente los abonos** de `prisma.pago`.
2. Para forzar una actualización manual al instante, pulsa el botón **Recalcular Pagos En Vivo**.
3. El sistema sincronizará:
   - Pagos acumulados por cliente.
   - Desglose por canales: **GESTOR (Efectivo)**, **BANCOS BOT** y **BANCOS GESTOR**.
   - Totales globales, **DQ (Querétaro)** y **DP (DasoPlus)**.

---

## 5. 🔒 Cierre Definitivo del Corte Semanal

Al finalizar el ciclo de cobranza (viernes por la tarde):
1. Consulta la semana y cobrador correspondiente.
2. Haz clic en el botón ámbar **🔒 Cerrar Corte Semanal**.
3. Revisa la ventana de confirmación con el resumen auditado (cuentas, cobrado total y desglose).
4. Opcional: Escribe las notas de cierre (ej. *"Corte cuadrado con caja viernes 18:00 hrs"*).
5. Haz clic en **Confirmar y Cerrar**.

### ⚡ ¿Qué sucede al Cerrar el Corte?
- **Congelación total:** La lista, importes, recibos y estatus quedan inmutables para auditoría y nómina.
- **Nuevos pagos:** Cualquier pago posterior que entre para ese cobrador **se transfiere automáticamente a la siguiente semana (`Semana + 1`)**.
- **Nuevos clientes:** Nuevos contratos ya no entran a la semana cerrada; aparecerán en la siguiente semana.
- *Si requieres corregir algo de urgencia:* Puedes pulsar **🔓 Reabrir Corte** para reactivarlo temporalmente.

---

## 6. 🖨️ Impresión y Exportación Oficial

Con la lista en pantalla (sea en vivo, abierta o cerrada):

### A. Exportar a Excel (Formato CEJ Oficial)
1. Haz clic en el botón verde **Excel (Plantilla Lista Cobranza)**.
2. Se descargará un archivo `.xlsx` estructurado con:
   - Cartera detallada de clientes (18 columnas).
   - Resumen ejecutivo oficial (Problemas, Canales de Cobro, Matriz de Periodos y Avance Diario).
   - Fórmulas de pago sugerido, saldo vencido y cobro real.

### B. Imprimir o Guardar en PDF (Resumen de Corte)
1. Haz clic en el botón negro **PDF (Plantilla Lista Cobranza)**.
2. Se generará y abrirá el **Resumen Ejecutivo de Corte Oficial**:
   - Omite el listado masivo individual de clientes para emitir un reporte ejecutivo conciso de 1 página.
   - Incluye comparativo GLOBAL vs DQ vs DP, canales separados (Gestor, Bot, Bancos Gestor), matriz de periodicidad, avance diario de Sábado a Viernes y firmas de auditoría.
3. Opciones en el visor:
   - **Imprimir / Guardar como PDF:** Abre el diálogo de impresión optimizado para hoja carta horizontal.
   - **Abrir en Ventana:** Permite visualizarlo en una pestaña completa.

---

## 7. 🚫 Sección de Clientes Sin Pago y PDF de No Pago

Para enfocar los esfuerzos de cobranza y auditoría en cuentas vencidas sin abono:

1. **Acceder a la pestaña:**
   - Haz clic en la pestaña **Clientes Sin Pago** (muestra un badge rojo con la cantidad exacta de clientes con `$0.00` de pago real).
2. **Columnas de la tabla:**
   - **CÓDIGO:** Código identificador (`DQ` o `DP`) y contrato.
   - **NOMBRE:** Nombre completo del cliente.
   - **DOMICILIO:** Dirección completa del cliente para localización en campo.
   - **GESTOR:** Código y nombre del gestor/cobrador asignado a la cuenta.
   - **SALDO VENCIDO:** Importe vencido en rojo.
   - **PV:** Periodos vencidos.
   - **PROBLEMA (Selector interactivo):** Permite clasificar de inmediato el motivo por el cual no dio abono (`NC`, `VD`, `PA`, `FD`, `PE`, etc.).
   - **TELÉFONO / DÍA PAGO:** Datos complementarios de contacto.
3. **Descargar PDF de Clientes Sin Pago:**
   - Haz clic en el botón **Descargar PDF Sin Pago**.
   - Genera una plantilla horizontal con los domicilios, saldos, motivo asignado, firmas de auditoría y recuadro con líneas para **NOTAS DE RUTA Y FIRMA DE VISITA** en campo.

