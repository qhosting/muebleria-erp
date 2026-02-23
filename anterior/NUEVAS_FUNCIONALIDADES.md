# Nuevas Funcionalidades (Carpeta `/anterior`)

Este documento detalla todas las funcionalidades encontradas en los archivos alojados en la carpeta `/anterior`, los cuales contienen la lógica para el sistema anterior de gestión, conciliación y cobranza.

## Archivos PHP (Lógica y Vistas)

### 1. `bancos.php` (Conciliación Manual y Reportes)
- **[REALIZADO] Conciliación Manual de Bancos**: Permite vincular movimientos bancarios no conciliados (`estado_de_cuenta`) con tickets generados. Al conciliar, se actualiza el estado de la cuenta, se asocia el ticket y se marca el ticket como conciliado.
- **[REALIZADO] Filtros de Búsqueda y Visualización**: Permite filtrar los movimientos bancarios por rango de fechas, términos de búsqueda (descripción, referencia, concepto) y estado (conciliado, no conciliado, todos).
- **[REALIZADO] Resumen Estadístico por Gestor**: Genera una tabla resumen detallando la cantidad de cuentas y los montos recaudados, dividiendo los totales entre depósitos bancarios y pagos directos al gestor.
- **[REALIZADO] Exportación a Excel**: Genera un archivo Excel con múltiples hojas que incluye el detalle de los movimientos, el resumen por gestor y un reporte general de tickets.

### 2. `conciliador.php` (Conciliador Automático de Bancos - BOT)
- **[REALIZADO] Sugerencias de Conciliación Automáticas**: Usa lógica para encontrar coincidencias óptimas entre un ticket no conciliado y movimientos bancarios huérfanos. Organiza las sugerencias basado en la prioridad (por similitud de contrato, número de folio, nombre del cliente, rango de horas cercano o coincidencia exacta de monto).
- **[REALIZADO] Filtro Dinámico de Movimientos**: Permite filtrar las opciones de la lista desplegable de movimientos bancarios basados en el monto del ticket.
- **[REALIZADO] Gestión de Tickets Pendientes**: Permite eliminar tickets si son erróneos y conciliar los válidos registrando los datos exactos del banco.
- **[REALIZADO] Contadores AJAX en Tiempo Real**: Contabiliza y muestra de manera asíncrona la cantidad de comprobantes o tickets que están pendientes de envío (cola de procesamientos).
- **[REALIZADO] Exportación a Excel**: Exporta específicamente la lista de tickets que aún se encuentran pendientes de conciliar.

### 3. `cuadre.php` (Cuadre de Cobranza Semanal)
- **[REALIZADO] Reporte Semanal de Cuadre**: Calcula y estructura resúmenes semanales de cobranza por gestor y rango de fechas. Agrupa los datos entre las categorías "ACTUAL" (semana en curso) y "ANTERIOR".
- **[REALIZADO] Separación de Carteras**: Separa los resúmenes financieros por prefijos de cartera de clientes, específicamente para las carteras `DP` y `DQ` (e.g. Reporte de Morosidad implementado).
- **[REALIZADO] Detección de Discrepancias**: Compara los tickets creados frente a los estados de cuenta bancarios para detectar anomalías (tickets sin ingresos en bancos, o ingresos bancarios sin tickets generados).
- **[REALIZADO] Clasificación del Origen del Pago**: Diferencia los montos generados entre *BANCOS BOT* (tickets conciliados automáticamente), *BANCOS GESTOR* (pagos reportados como bancarios pero no procesados por el bot), y *COBRANZA GESTOR* (efectivo/pago directo al cobrador).
- **[REALIZADO] Cierre Semanal Dinámico (Rollover)**: Detecta si un gestor ya realizó su cierre correspondiente de los viernes a mediodía, y automáticamente empuja/traspasa cualquier pago posterior registrado hacia la contabilidad del día sábado (la semana siguiente).
- **[REALIZADO] Desconciliación**: Permite deshacer la conciliación de un pago directamente desde la tabla de resultados.

### 4. `mostrarvd.php` (Mostrar Verificaciones Domiciliarias)
- **[REALIZADO] Historial de Verificaciones Domiciliarias**: Presenta una vista tabular para revisar el archivo de VD (Verificaciones Domiciliarias) aplicadas a clientes.
- **[REALIZADO] Filtro por Rango de Fechas**: Permite delimitar los resultados con una fecha de inicio y una fecha de fin de aplicación de la verificación.
- **[REALIZADO] Tabla Dinámica Interactiva**: Hace uso de *DataTables* (o equivalentes modernos en React) para permitir realizar búsquedas específicas en cada columna de forma individual o una búsqueda global sobre toda la tabla mostrada.
- **[REALIZADO] Exportación a Excel**: Brinda un botón para exportar la tabla visible hacia un formato de hoja de cálculo.

### 5. `pagosgestordp.php` y `pagosgestor.php` (Gestor de Pagos de Cobradores)
- **[REALIZADO] Visualización de Pagos por Cobrador**: Muestra el historial de pagos y cobros filtrado por el código de un gestor/cobrador en un rango de fechas.
- **[REALIZADO] Control de Caja (Apertura y Cierre)**: Incluye la lógica para que un gestor pueda marcar la "Apertura de Caja" al iniciar el día, y el "Cierre de Caja" al finalizar su recorrido, registrando la hora exacta.
- **[REALIZADO] Rehabilitación Automática**: Cuenta con lógica para auto-abrir/rehabilitar las cajas de todos los gestores de forma masiva (configurado vía CRON/API).
- **[REALIZADO] Exportación e Impresión**: Provee funcionalidades para exportar los detalles y resúmenes filtrados hacia hojas de Excel y formatos listos para imprimir.

### 6. `ticket.php` (Administración Global de Tickets)
- **[REALIZADO] Gestión Básica**: Permite crear, visualizar, editar y eliminar tickets de interacción o pago en el sistema.
- **[REALIZADO] Vinculación Multi-Tabular**: Une la información del cliente, las referencias de pago, y sirve como puente para enlazarse con los movimientos bancarios definitivos (`estado_de_cuenta`).

---

## Archivos de Base de Datos e Importación (.sql y .json)

Estos archivos representan los esquemas de tablas crudos y la data exportada de este sistema. Las funcionalidades implícitas en sus estructuras dictan la base del ERP:

- **`cat_clientes.sql`**: Catálogo general de clientes. Almacena direcciones, estatus de saldo, crédito, tipo de cartera y el gestor asignado a la cuenta.
- **`convenios_pagos.sql`**: Registro de compromisos de pago e interacciones directas con el cliente, además de guardar geolocalizaciones (latitud/longitud) tomadas en campo.
- **`estado_de_cuenta.sql`**: Refleja la ingesta directa de movimientos provenientes del banco (abonos, cargos, banco de origen, hora exacta) listos para conciliarse.
- **`pagos.sql`**: Almacena el histórico y desglose técnico de cada pago efectuado, referenciando tickets de origen y gestores.
- **`ticket.sql`** / `TICKETS.json`: Bitácora histórica de tickets referenciando folios y estatus de conciliación final.
- **`vd.sql`**: Registro de las Verificaciones Domiciliarias previas a otorgar un crédito o servicio.
