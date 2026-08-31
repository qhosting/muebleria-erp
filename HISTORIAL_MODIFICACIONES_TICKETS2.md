# 📜 Historial de Modificaciones y Soluciones de Raíz: Flujo n8n TICKETS2 & Webhooks ERP

Este documento mantiene el registro estructurado de todas las incidencias, modificaciones, causas raíz y soluciones definitivas aplicadas al flujo de automatización de WhatsApp (`TICKETS2`), al motor de conciliación y a los endpoints receptores en el ERP.

---

## 🎯 Objetivo de este Registro
Evitar la recurrencia de errores, documentar los mecanismos de auto-sanación y mantener la trazabilidad de los cambios en el pipeline de:
`WhatsApp (WAHA) ➔ n8n (TICKETS2) ➔ ERP Webhook (/api/webhooks/n8n) ➔ PostgreSQL / ContPAQi`

---

## 📋 Registro Cronológico de Modificaciones y Soluciones

### 📅 [31-AGO-2026] - Fix: Falsos Duplicados por Cuentas Destino Recurrentes (ej. OXXO `1858`, `2837`)
* **Incidencia Detectada:**
  * Al enviar un comprobante nuevo del cliente `DQ2601027` (depósito OXXO de $320), el bot respondió inmediatamente:
    > *"⚠️ ESTE COMPROBANTE YA FUE REGISTRADO PREVIAMENTE (ID Y9VZE9BQ)"*
  * El nuevo ticket no se insertaba y el pago no se reflejaba en el ERP.
* **Causa Raíz:**
  * En los depósitos en efectivo (OXXO/tiendas), la referencia bancaria extraída por OpenAI suele ser la terminación de la tarjeta destino (`1858`).
  * En `/api/webhooks/n8n`, la lógica de deduplicación consideraba cualquier referencia numérica de $\ge 4$ dígitos como un identificador único en **todo el historial del cliente**.
  * Como el cliente ya había depositado en esa misma tarjeta en meses anteriores, el sistema detectaba una coincidencia histórica de referencia `1858` y marcaba el ticket nuevo como duplicado del ticket antiguo.
* **Solución de Raíz Implementada:**
  1. Se incorporó una lista de exclusión para terminaciones de tarjetas/cuentas conocidas de la empresa (`'0228372', '22001022837', '65505732541', '0330253963', '1858', '2837', '5396', '0228'`).
  2. Para números de referencia o folios que no sean claves de rastreo SPEI (SPEI $\ge 10$ caracteres), la búsqueda de duplicados ahora **exige coincidencia exacta de fecha de operación** (`fechaTicket`).
  3. Esto permite que un cliente deposite cada semana a la misma tarjeta terminación `1858` sin que sus pagos se bloqueen entre sí.
* **Archivos Modificados:**
  * [`app/app/api/webhooks/n8n/route.ts`](file:///c:/Users/AurumArch/Documents/PROYECTOS/muebleria-erp/app/app/api/webhooks/n8n/route.ts) (Líneas 650-675)

---

### 📅 [31-AGO-2026] - Fix: Discrepancia de Prefijo de Contrato (DP vs DQ) y Búsqueda por Teléfono
* **Incidencia Detectada:**
  * Comprobantes enviados con textos como `DP2601027` cuando el contrato real es `DQ2601027` quedaban rechazados o no vinculados a clientes.
* **Causa Raíz:**
  * Error humano de digitación del cliente o gestor al escribir la letra de serie (`DP` en lugar de `DQ`).
  * El sistema buscaba coincidencia estricta de código y fallaba si la letra no coincidía.
* **Solución de Raíz Implementada:**
  1. En `/api/webhooks/n8n` (`action: "buscar_cliente"`), si el código directo no coincide, se ejecuta una búsqueda secundaria automática por los últimos 10 dígitos del número telefónico del remitente de WhatsApp contra la base de datos de PostgreSQL y en vivo contra la API de ContPAQi.
  2. Si no se encuentra, el comprobante se resguarda en `BuzonTesoreria` con estado `PENDIENTE` y metadatos completos para asignación manual en 1 clic desde el conciliador de tesorería.
* **Archivos Modificados:**
  * [`app/app/api/webhooks/n8n/route.ts`](file:///c:/Users/AurumArch/Documents/PROYECTOS/muebleria-erp/app/app/api/webhooks/n8n/route.ts) (Líneas 50-100)

---

### 📅 [31-AGO-2026] - Fix: Conciliación Atómica de Tickets en PostgreSQL & Buzón de Tesorería
* **Incidencia Detectada:**
  * Existían 4 tickets huérfanos históricos (`REIG9ISW`, `BZF3BBFM`, `HBD6J6NM`, `RD8ZQJ9Y`) y registros en el Buzón de Tesorería que no habían generado su registro correspondiente en la tabla `pagos` ni descontado el `saldoActual` del cliente.
* **Causa Raíz:**
  * Inserción parcial en versiones anteriores donde se creaba el `Ticket` pero un fallo de red o excepción impedía la creación del `Pago`.
* **Solución de Raíz Implementada:**
  1. Se unificó toda la operación de:
     - Creación de `Ticket`
     - Creación de `Pago`
     - Descuento de `saldoActual` en `Cliente`
     - Actualización de estado en `BuzonTesoreria`
     dentro de una única **transacción atómica (`prisma.$transaction`)**.
  2. Si cualquier paso falla, la transacción se revierte por completo evitando inconsistencias de saldo.
* **Archivos Modificados:**
  * [`app/app/api/webhooks/n8n/route.ts`](file:///c:/Users/AurumArch/Documents/PROYECTOS/muebleria-erp/app/app/api/webhooks/n8n/route.ts)
  * [`app/app/api/tesoreria/tickets/route.ts`](file:///c:/Users/AurumArch/Documents/PROYECTOS/muebleria-erp/app/app/api/tesoreria/tickets/route.ts)

---

### 📅 [30-AGO-2026] - Fix: Manejo de Identificadores de Privacidad de WhatsApp (`@lid`)
* **Incidencia Detectada:**
  * Mensajes provenientes de cuentas de WhatsApp que utilizan identificadores privados tipo `136988535562466@lid` no encontraban al cliente por número de teléfono directo (`@c.us`).
* **Causa Raíz:**
  * Las nuevas versiones de WhatsApp ocultan el número telefónico real del remitente bajo un identificador LID temporal o permanente.
* **Solución de Raíz Implementada:**
  1. En `EXTRAE_DATOS` y `Enrutador Principal` de n8n, se prioriza la extracción del código de contrato escrito en el cuerpo del mensaje (`body`), pie de foto (`caption`) o extraído por OCR de la imagen.
  2. En el webhook del ERP, el campo `remitente` acepta indistintamente `@lid` y `@c.us`, asociando el registro al contrato detectado.

---

## 📊 Matriz de Causa-Raíz y Prevención

| Tipo de Problema | Causa Raíz | Solución Definitiva | Mecanismo de Prevención |
| :--- | :--- | :--- | :--- |
| **Comprobante rechazado como duplicado** | Terminación de tarjeta (`1858`) compartida entre muchos tickets | Lista de exclusión + filtro obligatorio de fecha para no-SPEI | Excluir cuentas recolectoras y verificar fecha |
| **Código de cliente con letra errónea** | Confusión DP / DQ en digitación del cliente | Búsqueda cruzada por teléfono + ContPAQi API en tiempo real | Fallback a teléfono y resguardo en `BuzonTesoreria` |
| **Ticket creado sin pago aplicado** | Ejecución en pasos separados no atómicos | Transacción Prisma atómica (`prisma.$transaction`) | Todo o nada en base de datos |
| **Chat de WhatsApp con `@lid`** | Ocultamiento de teléfono por privacidad de WhatsApp | Extracción de contrato desde imagen y caption antes del teléfono | Priorizar OCR / Caption sobre remitente crudo |

---

## 🛠️ Buenas Prácticas para Futuros Cambios en `TICKETS2`
1. **Nunca usar terminaciones de 4 dígitos como clave primaria de deduplicación.**
2. **Las claves de rastreo SPEI ($\ge 10$ caracteres) sí son únicas globalmente.**
3. **Cualquier nuevo endpoint que modifique saldos debe ejecutarse en transacción `prisma.$transaction`.**
4. **Registrar cada ajuste en este documento con fecha, causa raíz y archivo modificado.**
