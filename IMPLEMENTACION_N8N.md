# 🤖 Guía de Implementación: Integración ERP ↔️ n8n

Este documento detalla cómo conectar tu flujo existente de n8n (basado en el archivo `TICKETS.json`) con el nuevo sistema ERP utilizando el Webhook unificado.

## 🔗 Endpoint del Webhook
`POST /api/webhooks/n8n`

---

## 🛠️ Configuración de Nodos en n8n

Debes sustituir los nodos de **MySQL** por nodos **HTTP Request** con las siguientes configuraciones según el caso:

### 1. Caso: Imagen recibida sin número de contrato
**Nodo:** `Guardar Ticket Pendiente`
*   **Método:** `POST`
*   **Body (JSON):**
```json
{
  "action": "pending",
  "remitente": "{{ $json.body.data.key.remoteJid }}",
  "base64Data": "{{ $json.body.data.message.base64 }}",
  "tipoArchivo": "{{ $json.body.data.message.imageMessage.mimetype }}"
}
```

### 2. Caso: Usuario envía su contrato (Resolución)
**Nodo:** `Buscar Ticket Pendiente`
*   **Método:** `POST`
*   **Body (JSON):**
```json
{
  "action": "resolve",
  "remitente": "{{ $json.body.data.key.remoteJid }}",
  "contrato": "{{ $json.contrato_capturado }}"
}
```
*   **Respuesta esperada:** Este nodo te devolverá el `base64Data`, el `tipoArchivo` y el `contrato` normalizado para que puedas pasarlo al nodo de IA (GPT-4o).

### 3. Caso: Registro Final del Ticket (IA finalizada)
**Nodo:** `Insertar_Ticket`
*   **Método:** `POST`
*   **Body (JSON):**
```json
{
  "action": "create",
  "contrato": "{{ $json.contrato }}",
  "monto": "{{ $json.monto }}",
  "referencia": "{{ $json.referencia }}",
  "folio": "{{ $json.folio }}",
  "fecha": "{{ $json.fecha }}",
  "hr": "{{ $json.hr }}",
  "claverastreo": "{{ $json.claverastreo }}",
  "remitente": "{{ $json.remitente }}"
}
```

---

## 🛡️ Seguridad
Actualmente el Webhook está abierto para pruebas. Se recomienda añadir una API Key en el futuro.
Si deseas activarlo, añade este header en n8n:
*   **Header:** `x-api-key`
*   **Valor:** `TU_CLAVE_SECRETA`

---

## ✅ Beneficios de esta Integración
1.  **Validación de Datos**: El ERP rechaza automáticamente tickets si el contrato no existe en la DB.
2.  **Prevención de Duplicados**: El ERP verifica por `claveRastreo` o por la combinación monto/fecha/cliente antes de insertar.
3.  **Integridad de Prisma**: Al usar el API del ERP, te aseguras de que todas las relaciones de base de datos se mantengan consistentes.
4.  **Log de Auditoría**: Cada inserción a través del Webhook queda registrada en los logs del servidor del ERP.

---

## 📝 Notas Adicionales
*   Los valores `null` extraídos por la IA deben enviarse como la cadena de texto `"null"` o ser omitidos del JSON.
*   El campo `contrato` debe ser el formato estándar del sistema (ej: `DQ2506016`).
