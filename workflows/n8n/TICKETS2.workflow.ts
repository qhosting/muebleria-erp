import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : TICKETS2
// Nodes   : 81  |  Connections: 79
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// Imagen                             convertToFile
// AnalyzeImage                       openAi                     [creds]
// InsertarTicket                     httpRequest
// ExtraeDatos                        code
// Mensaje                            code
// EnrutadorPrincipal                 code
// SelectorDeAccion                   switch
// GuardarTicketPendiente             httpRequest
// GenerarMensajeDePeticion           code
// BuscarTicketPendiente              httpRequest
// SeEncontroPendiente                if
// EliminarPendiente                  code
// IntentarConciliacionInteligente    code
// HttpRequest                        httpRequest
// Code1                              code
// ValidacionExitosa                  if
// ExecuteASqlQuery                   httpRequest
// Switch_                            switch
// SantanderCsv                       convertToFile
// BanorteCsv                         convertToFile
// Code2                              code
// CodeSantander                      code
// MensajeError                       httpRequest
// ExtraerDatosSantander              extractFromFile
// ExtraerDatosBanorte                extractFromFile
// Switch1                            switch
// InsertarBanorte                    httpRequest
// InsertaSantander                   httpRequest
// GranEnrutador                      code
// GranEnrutador2                     switch
// IntentarConciliacionPorTicket      code
// HayTicketsPorConciliar             if
// GenerarMensajeSinNovedades         code
// ConciliacionExitosa1               if
// EnviarMensajeAlAdmin               httpRequest                [onError→regular]
// MensajeRemitente                   httpRequest                [onError→regular]
// GenerarResumenParaAdmin            code
// EnviarMensajeAlAdmin1              httpRequest                [onError→regular]
// ObtenerTicketsPendientes1          httpRequest
// HayTicketsPorConciliar1            if
// GenerarMensajeSinNovedades1        code
// ConciliacionExitosa2               if
// EnviarMensajeAlAdmin5              httpRequest                [onError→regular]
// GenerarResumenParaAdmin1           code
// EnviarMensajeAlAdmin6              httpRequest                [onError→regular]
// DiarioConciliacionSpei             scheduleTrigger
// ObtenerTicketsConClaveDeRastreo    httpRequest
// GenerarMensajeDeFormatoInvalido    code
// EnviarMensajeDeErrorDeFormato      httpRequest
// BuscarClientePorTelefono           httpRequest
// ClienteEncontrado                  if
// ConciliarDeposito                  scheduleTrigger
// ValidarRespuestaDeTexto            code
// RespuestaConFormatoValido          if
// GenerarMensajeDeFormatoIncorrecto  code
// MensajeTicket2                     httpRequest
// PrepararMensajeDeNotificacion      code
// Merge                              merge
// EstandarizarVariablesDeImagen      set
// UnirDatosDeBusqueda                set                        [alwaysOutput]
// AsignaGestor                       code
// IntentarConciliacionDepositoEfectivo code
// EnvioDeSaldos                      scheduleTrigger
// ObtenerPagosPendientesDeNotificar  httpRequest
// Code3                              code
// ActualizarTicketEnviado            httpRequest
// ActualizarTicketEnviado1           code
// If_                                if
// If1                                if
// NumeroInvalido                     httpRequest
// EnviarPorWaha                      httpRequest
// WebhookWaha                        webhook
// TieneImagen                        if
// DescargarMediaWaha                 httpRequest
// AdaptadorAFormatoEvolution         code
// EnviarPorWaha1                     httpRequest
// EnviarPorWaha2                     httpRequest
// EnviarPorWaha3                     httpRequest
// EnviarPorWaha4                     httpRequest
// EnviarPorWaha5                     httpRequest
// NextjsErpWebhook                   httpRequest                [onError→regular] [retry]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// DiarioConciliacionSpei
//    → ObtenerTicketsConClaveDeRastreo
//      → HayTicketsPorConciliar
//        → IntentarConciliacionPorTicket
//          → ConciliacionExitosa1
//            → MensajeRemitente
//          → GenerarResumenParaAdmin
//            → EnviarMensajeAlAdmin1
//       .out(1) → GenerarMensajeSinNovedades
//          → EnviarMensajeAlAdmin
// ConciliarDeposito
//    → ObtenerTicketsPendientes1
//      → HayTicketsPorConciliar1
//        → IntentarConciliacionDepositoEfectivo
//          → ConciliacionExitosa2
//          → GenerarResumenParaAdmin1
//            → EnviarMensajeAlAdmin6
//       .out(1) → GenerarMensajeSinNovedades1
//          → EnviarMensajeAlAdmin5
// EnvioDeSaldos
//    → ObtenerPagosPendientesDeNotificar
//      → If_
//        → Code3
//          → ActualizarTicketEnviado1
//          → EnviarPorWaha1
//            → If1
//              → ActualizarTicketEnviado
//             .out(1) → NumeroInvalido
//                → EnviarPorWaha4
// WebhookWaha
//    → TieneImagen
//      → DescargarMediaWaha
//        → AdaptadorAFormatoEvolution
//          → GranEnrutador
//            → GranEnrutador2
//              → Code1
//                → ValidacionExitosa
//                  → Switch1
//                    → HttpRequest
//                      → ExecuteASqlQuery
//                   .out(1) → Switch_
//                      → SantanderCsv
//                        → ExtraerDatosSantander
//                          → CodeSantander
//                            → InsertaSantander
//                              → EnviarPorWaha2
//                     .out(1) → BanorteCsv
//                        → ExtraerDatosBanorte
//                          → Code2
//                            → InsertarBanorte
//                              → EnviarPorWaha3
//                     .out(2) → MensajeError
//             .out(1) → EnrutadorPrincipal
//                → SelectorDeAccion
//                  → Merge
//                    → EstandarizarVariablesDeImagen
//                      → Imagen
//                        → AnalyzeImage
//                          → ExtraeDatos
//                            → InsertarTicket
//                              → Mensaje
//                                → IntentarConciliacionInteligente
//                                  → PrepararMensajeDeNotificacion
//                                    → EnviarPorWaha
//                              → AsignaGestor
//                            → NextjsErpWebhook
//                 .out(1) → BuscarClientePorTelefono
//                    → ClienteEncontrado
//                      → UnirDatosDeBusqueda
//                        → Merge.in(1) (↩ loop)
//                     .out(1) → GuardarTicketPendiente
//                        → GenerarMensajeDePeticion
//                          → EnviarPorWaha5
//                 .out(2) → ValidarRespuestaDeTexto
//                    → RespuestaConFormatoValido
//                      → BuscarTicketPendiente
//                        → SeEncontroPendiente
//                          → EliminarPendiente
//                          → Merge.in(1) (↩ loop)
//                     .out(1) → GenerarMensajeDeFormatoIncorrecto
//                        → MensajeTicket2
//                 .out(3) → GenerarMensajeDeFormatoInvalido
//                    → EnviarMensajeDeErrorDeFormato
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'Omtx9gdMcKNFHHAi',
    name: 'TICKETS2',
    active: true,
    isArchived: false,
    settings: {
        executionOrder: 'v1',
        availableInMCP: false,
        callerPolicy: 'workflowsFromSameOwner',
        binaryMode: 'separate',
    },
})
export class Tickets2Workflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'a7d11f04-bf4f-4bd6-a570-3fd5b38c36d7',
        name: 'IMAGEN',
        type: 'n8n-nodes-base.convertToFile',
        version: 1.1,
        position: [1616, 784],
    })
    Imagen = {
        operation: 'toBinary',
        sourceProperty: 'base64',
        binaryPropertyName: '=data',
        options: {
            mimeType: '={{ $json.mimetype }}',
        },
    };

    @node({
        id: '92a5f21e-ac50-45b8-ac37-a4fe35512bf4',
        name: 'Analyze image',
        type: '@n8n/n8n-nodes-langchain.openAi',
        version: 1.8,
        position: [1840, 784],
        credentials: { openAiApi: { id: 'uMn7PDgesW1Ke2yM', name: 'OpenAi account' } },
    })
    AnalyzeImage = {
        resource: 'image',
        operation: 'analyze',
        modelId: {
            __rl: true,
            value: 'gpt-4o-mini',
            mode: 'list',
            cachedResultName: 'GPT-4O-MINI',
        },
        text: `=Tu única función es actuar como un API de extracción de datos de recibos de pago y comprobantes digitales. Analiza la imagen y devuelve **exclusivamente un objeto JSON válido**. Si un campo no se encuentra, su valor debe ser \`null\`. No inventes datos ni incluyas texto adicional.

**INSTRUCCIONES POR CAMPO:**

-   \`contrato\`: Este valor se proporciona externamente, no lo busques en la imagen.
-   \`monto\`: El importe principal de la transacción, ignorando siempre comisiones, IVA o el "PAGO TOTAL".
-   \`referencia\`: Busca el número de "REFERENCIA". Si está oculto con asteriscos (ej: \`**********1858\`), extrae solo la parte numérica. Si el campo no existe, el valor es \`null\`.
-   \`folio\`: **INSTRUCCIÓN ACTUALIZADA:**
    1.  **Prioridad 1 (Depósitos en efectivo):** Busca un campo etiquetado como "# DE AFILIACION" o "AFILIACION". Este es el valor más importante para los tickets de OXXO o tiendas similares.
    2.  **Prioridad 2 (Otros comprobantes):** Si no encuentras una afiliación, busca el número de "AUTORIZACION".
    3.  **Prioridad 3 (Último recurso):** Si ninguno de los anteriores existe, busca "FOLIO DE VENTA".
    4.  Si no encuentras ninguno de los tres, el valor debe ser \`null\`.
-   \`fecha\`: La fecha de la operación, formateada obligatoriamente como \`AAAA-MM-DD\`.
-   \`hr\`: La hora de la operación, formateada obligatoriamente como \`HH:MM:SS\` (completa con \`:00\` si es necesario).
-   \`claverastreo\`: **INSTRUCCIÓN ACTUALIZADA:** Busca un campo explícitamente llamado "CLAVE DE RASTREO". **Si el valor aparece en dos líneas o párrafos, júntalos en una sola cadena de texto sin espacios ni guiones en medio.** Si el campo no está claramente presente en la imagen, el valor **debe ser \`null\`**.

**EJEMPLOS DE RESPUESTAS ESPERADAS:**

1.  **Para un depósito en efectivo (OXXO, con # DE AFILIACION):**
    \`{"contrato":"DQ2506016","monto":500.00,"referencia":"1858","folio":"4090400","fecha":"2025-08-11","hr":"11:25:00","claverastreo":null}\`

2.  **Para una transferencia digital simple (sin folio ni referencia):**
    \`{"contrato":"DQ2506016","monto":200.00,"referencia":null,"folio":null,"fecha":"2025-08-08","hr":"07:29:09","claverastreo":null}\`
    
3.  **Para una transferencia SPEI de Spin (con clave de rastreo en dos líneas):**
    \`{"contrato":"DQ2411240","monto":460.00,"referencia":"9135156","folio":null,"fecha":"2025-09-06","hr":"18:30:00","claverastreo":"SPIN20250906183029308UEQ0SSPJC"}\`

4.  **Para una transferencia SPEI completa (ejemplo hipotético):**
    \`{"contrato":"DQ2506016","monto":123.45,"referencia":"98765","folio":"99887766","fecha":"2025-08-12","hr":"15:30:10","claverastreo":"STP012345ABC67890DEF"}\``,
        inputType: 'base64',
        options: {},
    };

    @node({
        id: '01db9b1e-612f-4431-8512-1c61f339cd75',
        name: 'Insertar_Ticket',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [2224, 784],
    })
    InsertarTicket = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "action": "create",
  "contrato": "{{ $('EXTRAE_DATOS').item.json.contrato }}",
  "monto": "{{ $('EXTRAE_DATOS').item.json.monto }}",
  "referencia": "{{ $('EXTRAE_DATOS').item.json.referencia }}",
  "folio": "{{ $('EXTRAE_DATOS').item.json.folio }}",
  "claverastreo": "{{ $('EXTRAE_DATOS').item.json.claverastreo }}",
  "fecha": "{{ $('EXTRAE_DATOS').item.json.fecha }}",
  "hr": "{{ $('EXTRAE_DATOS').item.json.hr }}",
  "remitente": "{{ $('EXTRAE_DATOS').item.json.remitente }}",
  "base64Data": "{{ $('Estandarizar Variables de Imagen').item.json.base64 }}",
  "tipoArchivo": "{{ $('Estandarizar Variables de Imagen').item.json.mimetype }}"
}`,
        options: {},
    };

    @node({
        id: 'f8212705-11c5-4776-9818-84ce4f6e8932',
        name: 'EXTRAE_DATOS',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2032, 784],
    })
    ExtraeDatos = {
        jsCode: `// Nodo: EXTRAE_DATOS (Versión final que maneja bloques de código)

// PASO 1: OBTENER EL CONTRATO Y EL REMITENTE
let contratoInicial = null;
let remitenteInicial = null;
try {
  contratoInicial = $('Enrutador Principal')?.item?.json?.contrato;
  remitenteInicial = $('Enrutador Principal')?.item?.json?.body?.data?.key?.remoteJid;
} catch (e) {}

if (!contratoInicial || !remitenteInicial) {
  try {
    if (!contratoInicial) contratoInicial = $('Unir Datos de Busqueda')?.item?.json?.contrato;
    if (!remitenteInicial) remitenteInicial = $('Unir Datos de Busqueda')?.item?.json?.remitente;
  } catch (e) {}
}

if (!remitenteInicial) {
  try {
    remitenteInicial = $('Webhook WAHA')?.first()?.json?.body?.payload?.from || 
                       $('Webhook')?.first()?.json?.body?.data?.key?.remoteJid ||
                       $('Adaptador a Formato Evolution')?.first()?.json?.body?.data?.key?.remoteJid;
  } catch (e) {}
}

// PASO 2: OBTENER Y LIMPIAR LA RESPUESTA DE LA IA
const iaResponseString = $('Analyze image').first().json.content;
let jsonText = iaResponseString;

const jsonMatch = iaResponseString.match(/{[\\s\\S]*}/);
if (jsonMatch) {
  jsonText = jsonMatch[0];
}

// PASO 3: PARSEAR EL JSON LIMPIO
let parsedJson = {};
try {
  parsedJson = JSON.parse(jsonText);
} catch (error) {
  return [{ json: { validData: false, error: "Formato de IA inválido." } }];
}

// PASO 4: CONSTRUIR EL OBJETO DE DATOS FINAL
const extractedData = {
  contrato: contratoInicial,
  remitente: remitenteInicial, // <-- MODIFICACIÓN AÑADIDA
  monto: parsedJson.monto || null,
  referencia: parsedJson.referencia || null,
  folio: parsedJson.folio || null,
  fecha: parsedJson.fecha || null,
  hr: parsedJson.hr || null,
  claverastreo: parsedJson.claverastreo || null,
  validData: false
};

// PASO 5: VALIDACIÓN DE LOS DATOS
if (extractedData.monto && extractedData.fecha) {
  const montoNumerico = parseFloat(extractedData.monto);
  const fechaValida = /^\\d{4}-\\d{2}-\\d{2}$/.test(extractedData.fecha);
  const horaValida = !extractedData.hr || /^\\d{2}:\\d{2}:\\d{2}$/.test(extractedData.hr);

  if (!isNaN(montoNumerico) && fechaValida && horaValida) {
    extractedData.monto = montoNumerico.toFixed(2);
    extractedData.validData = true;
  }
}

return [{ json: extractedData }];`,
    };

    @node({
        id: '84e5ab5f-4739-4545-a427-9d1d0488077a',
        name: 'MENSAJE',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2432, 784],
    })
    Mensaje = {
        jsCode: `// Asegura que sqlResult sea un array u objeto
const sqlResult = Array.isArray($json) ? $json[0] : $json;

// Obtiene los datos de EXTRAE_DATOS de forma segura
const ticketDataNode = ($('EXTRAE_DATOS') ? $('EXTRAE_DATOS').first()?.json : null) || {};

// Variables iniciales
let mensajeBase = '❌ Error: No se pudo insertar el ticket.';
let ticketId = sqlResult?.ticketId || sqlResult?.ticket_id || sqlResult?.id || null;
let yaExiste = !!(sqlResult?.yaExiste || sqlResult?.ya_existe);
let remitente = sqlResult?.remitente || ticketDataNode?.remitente || null;
let idPagoGenerado = sqlResult?.pagoId || sqlResult?.idPagoGenerado || null;
let saldoActual = sqlResult?.saldoNuevo ?? sqlResult?.saldo_actual ?? null;
let contrato = ticketDataNode?.contrato || sqlResult?.contrato || sqlResult?.cod_cliente || null;

if (ticketId) {
  mensajeBase = yaExiste
    ? \`⚠️ Este comprobante ya existe con ID \${ticketId}.\`
    : '✅ ¡Comprobante EN PROCESO de VALIDACIÓN!';
}

let mensajeFinal = mensajeBase;

if (ticketId) {
  mensajeFinal +=
    \`\\n\\n📌 *Detalles del Ticket*\` +
    \`\\n- 🆔 ID: \${ticketId}\` +
    \`\\n- 📄 Contrato: \${contrato || 'N/A'}\` +
    \`\\n- 📅 Fecha: \${ticketDataNode.fecha || sqlResult?.fecha || 'N/A'}\` +
    \`\\n- ⏰ Hora: \${ticketDataNode.hr || sqlResult?.hr || 'N/A'}\` +
    \`\\n- 💰 Monto: $\${parseFloat(ticketDataNode.monto || sqlResult?.monto || 0).toFixed(2)}\` +
    \`\\n- 🔢 Referencia: \${ticketDataNode.referencia || sqlResult?.referencia || 'N/A'}\` +
    \`\\n- 📝 Folio: \${ticketDataNode.folio || sqlResult?.folio || 'N/A'}\` +
    \`\\n- 📦 Clave de rastreo: \${ticketDataNode.claverastreo || sqlResult?.claverastreo || 'N/A'}\` +
    \`\\n\\n⚡ *TICKET EN PROCESO DE CONCILIACION* ⚡\`;
}

return [{
  json: {
    mensaje: mensajeFinal,
    ticketId: ticketId,
    pagoId: idPagoGenerado,
    idPagoGenerado: idPagoGenerado,
    saldo_actual: saldoActual,
    saldoNuevo: saldoActual,
    yaExiste: yaExiste,
    ya_existe: yaExiste,
    contrato: contrato,
    cod_cliente: contrato,
    fecha: ticketDataNode.fecha || null,
    monto: ticketDataNode.monto || null,
    hr: ticketDataNode.hr || null,
    referencia: ticketDataNode.referencia || null,
    folio: ticketDataNode.folio || null,
    claverastreo: ticketDataNode.claverastreo || null,
    remitente: remitente
  }
}];`,
    };

    @node({
        id: '43744ccf-e360-4994-b156-96c68cb744ed',
        name: 'Enrutador Principal',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1392, 832],
    })
    EnrutadorPrincipal = {
        jsCode: `const body = $json.body;
const tipoMensaje = body.data.messageType;
let accion = ''; // Variable para decidir la ruta a seguir
let contrato = null; // Variable para guardar el contrato

// --- ESCENARIO 1: El mensaje es una IMAGEN ---
if (tipoMensaje === 'imageMessage') {
  // Limpiamos y pasamos a mayúsculas el caption
  const caption = (body.data.message.imageMessage.caption || '').trim().toUpperCase();
  
  if (caption !== '') {
    // A. SI HAY CAPTION: Validamos el formato
    const formatoValido = /^(DQ|DP)\\d{7}$/.test(caption);

    if (formatoValido) {
      // A1. Formato VÁLIDO: Guardamos el contrato y continuamos.
      accion = 'CONTINUAR_CON_CAPTION';
      contrato = caption; // <-- ¡CORRECCIÓN CLAVE! Guardamos el contrato aquí.
    } else {
      // A2. Formato INVÁLIDO: Activamos la ruta para notificar el error.
      accion = 'FORMATO_CAPTION_INVALIDO';
    }
  } else {
    // B. SI NO HAY CAPTION: Activamos la búsqueda por teléfono.
    accion = 'BUSCAR_POR_TELEFONO';
  }
} 
// --- ESCENARIO 2: El mensaje es TEXTO ---
else if (tipoMensaje === 'conversation' || tipoMensaje === 'extendedTextMessage') {
  // Si es un mensaje de texto, lo guardamos como 'contrato' para su posterior validación
  contrato = (body.data.message.conversation || body.data.message.extendedTextMessage.text || '').trim().toUpperCase();
  accion = 'VERIFICAR_PENDIENTE';
} 
// --- ESCENARIO 3: Otro tipo de mensaje ---
else {
  // Cualquier otro tipo (audio, sticker, etc.) se ignora.
  accion = 'IGNORAR';
}

// Devolvemos la acción y el contrato para que los siguientes nodos puedan usarlos.
return [{
  json: {
    ...$json, // Pasamos todos los datos originales
    accion: accion,
    contrato: contrato // <-- ¡CORRECCIÓN CLAVE! Devolvemos el contrato.
  }
}];`,
    };

    @node({
        id: '7fb4520f-3d0b-42e8-bb93-b58a0c61b07d',
        name: 'Selector de Acción',
        type: 'n8n-nodes-base.switch',
        version: 3.2,
        position: [-1232, 800],
        alwaysOutputData: false,
    })
    SelectorDeAccion = {
        rules: {
            values: [
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 2,
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.accion }}',
                                rightValue: '=CONTINUAR_CON_CAPTION',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                                id: '9e4ddaa6-9e9a-4cb1-b5d0-1478f864ca1e',
                            },
                        ],
                        combinator: 'and',
                    },
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 2,
                        },
                        conditions: [
                            {
                                id: '2eddb45d-4cc6-4fc8-923c-c807c3bc1156',
                                leftValue: '={{ $json.accion }}',
                                rightValue: 'BUSCAR_POR_TELEFONO',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                    name: 'filter.operator.equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 2,
                        },
                        conditions: [
                            {
                                id: 'f72ca788-c811-4f44-a7cd-e57d97ed2cbc',
                                leftValue: '={{ $json.accion }}',
                                rightValue: 'VERIFICAR_PENDIENTE',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                    name: 'filter.operator.equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 2,
                        },
                        conditions: [
                            {
                                id: 'b5644131-d2b6-4d3c-962a-bdd3837e9c4a',
                                leftValue: '={{ $json.accion }}',
                                rightValue: 'FORMATO_CAPTION_INVALIDO',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                    name: 'filter.operator.equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                },
            ],
        },
        options: {},
    };

    @node({
        id: '9cb20f26-e17f-44a8-9279-3d07e60ee95e',
        name: 'Guardar_Ticket_Pendiente',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-224, 1072],
    })
    GuardarTicketPendiente = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "action": "pending",
  "remitente": "{{ $('Enrutador Principal')?.item?.json?.body?.data?.key?.remoteJid || $('Webhook WAHA')?.item?.json?.body?.payload?.from || '' }}",
  "base64Data": "{{ $('Descargar Media WAHA')?.item?.binary?.data?.data || $('Adaptador a Formato Evolution')?.first()?.json?.body?.data?.message?.base64 || '' }}",
  "tipoArchivo": "{{ $('Descargar Media WAHA')?.item?.binary?.data?.mimeType || $('Adaptador a Formato Evolution')?.first()?.json?.body?.data?.message?.imageMessage?.mimetype || 'image/jpeg' }}"
}`,
        options: {},
    };

    @node({
        id: '4bdfc171-739e-4960-9aed-f0f68849f94f',
        name: 'Generar Mensaje de Petición',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [256, 896],
    })
    GenerarMensajeDePeticion = {
        jsCode: `const mensaje = "✅ *¡Comprobante Recibido!*\\n\\nPara registrar tu pago correctamente en el sistema, por favor responde a este mensaje enviando tu *número de cliente o contrato* (ejemplo: *DP2601001* o *DQ2501001*).";

return [{
  json: {
    mensaje: mensaje
  }
}];`,
    };

    @node({
        id: 'be8b1fc5-257c-4861-ad77-3e8ea5e8f192',
        name: 'Buscar_Ticket_Pendiente',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-448, 1264],
    })
    BuscarTicketPendiente = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "action": "resolve",
  "remitente": "{{ $('Enrutador Principal')?.item?.json?.body?.data?.key?.remoteJid || $('Webhook WAHA')?.item?.json?.body?.payload?.from }}",
  "contrato": "{{ $json.contrato || $json.contrato_respuesta || $('Validar Respuesta de Texto')?.item?.json?.contrato }}"
}`,
        options: {},
    };

    @node({
        id: '74c9342d-ecda-4fc7-a24d-1dff9d288f93',
        name: '¿Se Encontró Pendiente?',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [640, 1040],
    })
    SeEncontroPendiente = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: 'ed558fad-5def-481b-b800-a1f0ee171431',
                    leftValue: '={{ $json.base64Data || $json.base64_data }}',
                    rightValue: '',
                    operator: {
                        type: 'string',
                        operation: 'notEmpty',
                        singleValue: true,
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: '9f5a7da0-3c2f-4e08-9df8-b541a3bc8ef0',
        name: 'Eliminar_Pendiente',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [0, 1264],
    })
    EliminarPendiente = {
        jsCode: 'return $input.all();',
    };

    @node({
        id: '67cb1565-d419-4824-8b63-95844855f4c4',
        name: 'Intentar_Conciliacion_Inteligente',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2672, 784],
    })
    IntentarConciliacionInteligente = {
        jsCode: 'return $input.all().map(item => ({ json: { ...item.json, conc_status: item.json.conciliado ? "CONCILIADO" : "PENDIENTE" } }));',
    };

    @node({
        id: 'cb56fa15-ffd3-4958-b6c8-aa5bda0f8e04',
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [0, 0],
    })
    HttpRequest = {
        method: 'POST',
        url: "=https://evo.whatscloud.site/message/sendText/{{ $('Webhook1').item.json.body.instance }}",
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'apikey',
                    value: "={{ $('Webhook1').item.json.body.apikey }}",
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'number',
                    value: "={{ $('Webhook1').item.json.body.data.key.remoteJid }}",
                },
                {
                    name: 'text',
                    value: "={{ $('Code1').item.json.razon }}",
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'f2cbd29c-0b2e-4100-a552-8e9ad937850e',
        name: 'Code1',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-864, 224],
    })
    Code1 = {
        jsCode: `// La única variable que necesitas actualizar con tus propios números
const numerosPermitidos = ['5214425060999', '5214271914642', '5215512345678','5214424793320','183785962352805','92341880795364']; 

const body = $json.body;

// Validar que el cuerpo del mensaje y la clave existan para evitar errores.
if (!body || !body.data || !body.data.key) {
  return [{ 
    json: {
      validar: false,
      razon: 'Datos de webhook incompletos o en formato inesperado. No se puede procesar.'
    }
  }];
}

// CORRECCIÓN HÍBRIDA: Extrae de manera limpia la parte numérica sin importar si termina en @s.whatsapp.net o @lid
const numeroRemitente = body.data.key.remoteJid.split('@')[0];
const mensajeDeTexto = (body.data.message.conversation || '').toLowerCase();

// *** MODIFICACIÓN AQUÍ ***
// Agregamos explicitamente chatId al objeto resultado inicial (Mantiene el JID completo original para responder)
let resultado = {
  chatId: body.data.key.remoteJid, 
  validar: false,
  razon: 'Acceso denegado.'
};

// ** Extracción de datos del archivo y del mensaje general **
const message = body.data.message;
const documentMessage = message.documentMessage;

if (documentMessage) {
  resultado.mimetype = documentMessage.mimetype;
  resultado.caption = (documentMessage.caption || '').toLowerCase();
  resultado.filename = documentMessage.fileName;
}

// Extraer el base64 del mensaje, si existe
resultado.base64 = message.base64;

// Lógica de validación
if (!numerosPermitidos.includes(numeroRemitente)) {
  resultado.razon = \`Número de teléfono no autorizado 🚫: \${numeroRemitente}\`;
  return [{ json: resultado }];
}

if (mensajeDeTexto.includes('autorizar')) {
  resultado.validar = true;
  resultado.razon = 'Autorizado. 😉 Por favor, envía el archivo para actualizar (CSV o Excel).';
  resultado.accion = 'autorizar';
  return [{ json: resultado }];
}

const captionDelArchivo = resultado.caption;
const tipoDeArchivo = resultado.mimetype;
// Validamos CSV o Excel (xls y xlsx)
const tipoDeArchivoValido = (tipoDeArchivo === 'text/csv' || tipoDeArchivo === 'application/vnd.ms-excel' || tipoDeArchivo === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

if (captionDelArchivo && captionDelArchivo.includes('actualizar') && tipoDeArchivoValido) {
  resultado.validar = true;
  resultado.razon = 'Archivo recibido. Procesando actualización...';
  resultado.accion = 'actualizar';
  // Pasamos también el body original por si el siguiente nodo necesita más datos crudos
  resultado.originalBody = body; 
  return [{ json: resultado }];
}

if (captionDelArchivo && captionDelArchivo.includes('actualizar') && !tipoDeArchivoValido) {
  resultado.razon = \`Archivo incorrecto. Solo se aceptan archivos CSV y Excel. Tipo de archivo recibido: \${tipoDeArchivo}\`;
  return [{ json: resultado }];
}

resultado.razon = 'Frase de activación incorrecta o no se adjuntó un archivo válido. 😕';
return [{ json: resultado }];`,
    };

    @node({
        id: '4aa23079-1238-41c4-a6d6-5d152263b941',
        name: 'Validacion exitosa',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [-656, 224],
    })
    ValidacionExitosa = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: '8746b4b1-9d99-4cd2-a20d-16f3c3c6ba24',
                    leftValue: '={{ $json.accion }}',
                    rightValue: '=autorizar',
                    operator: {
                        type: 'string',
                        operation: 'equals',
                    },
                },
                {
                    id: '4cfb6e34-48f3-49a4-ac2a-734e0a0d009b',
                    leftValue: '={{ $json.accion }}',
                    rightValue: 'actualizar',
                    operator: {
                        type: 'string',
                        operation: 'equals',
                        name: 'filter.operator.equals',
                    },
                },
                {
                    id: '593e540c-cc07-4465-bcc7-1e32b8a786b2',
                    leftValue: '={{ $json.validar }}',
                    rightValue: '',
                    operator: {
                        type: 'boolean',
                        operation: 'true',
                        singleValue: true,
                    },
                },
            ],
            combinator: 'or',
        },
        options: {},
    };

    @node({
        id: '3ff94b05-c47d-4dfb-8a56-6218d6e38b30',
        name: 'Execute a SQL query',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [320, 0],
    })
    ExecuteASqlQuery = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "action": "importar_banco",
  "movimientos": {{ JSON.stringify($json) }}
}`,
        options: {},
    };

    @node({
        id: '70569040-2e39-48fc-897e-48c441965da8',
        name: 'Switch',
        type: 'n8n-nodes-base.switch',
        version: 3.2,
        position: [48, 384],
    })
    Switch_ = {
        rules: {
            values: [
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 2,
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.filename }}',
                                rightValue: '=santander.csv',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                                id: '7ef71d22-3131-4f34-912e-afda9df026b0',
                            },
                        ],
                        combinator: 'and',
                    },
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 2,
                        },
                        conditions: [
                            {
                                id: 'a712ba66-7cba-47a4-8cf3-23a69c231a44',
                                leftValue: '={{ $json.filename }}',
                                rightValue: 'banorte.csv',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                    name: 'filter.operator.equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 2,
                        },
                        conditions: [
                            {
                                id: 'c017f439-8a65-40e3-8a6c-b1aaa0775194',
                                leftValue: '=',
                                rightValue: '',
                                operator: {
                                    type: 'string',
                                    operation: 'empty',
                                    singleValue: true,
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                },
            ],
        },
        options: {},
    };

    @node({
        id: '60ceae94-48ba-440e-808f-b33fa6ec9ca3',
        name: 'santander.csv',
        type: 'n8n-nodes-base.convertToFile',
        version: 1.1,
        position: [336, 224],
    })
    SantanderCsv = {
        operation: 'toBinary',
        sourceProperty: 'base64',
        binaryPropertyName: '=data {{ $json.filename }}',
        options: {
            mimeType: '={{ $json.mimetype }}',
        },
    };

    @node({
        id: 'f657a246-a044-4d8e-8233-e0f879de5084',
        name: 'banorte.csv',
        type: 'n8n-nodes-base.convertToFile',
        version: 1.1,
        position: [336, 400],
    })
    BanorteCsv = {
        operation: 'toBinary',
        sourceProperty: 'base64',
        binaryPropertyName: '=data {{ $json.filename }}',
        options: {
            mimeType: '={{ $json.mimetype }}',
        },
    };

    @node({
        id: '8e0f6054-5f10-455e-b500-283a514d2242',
        name: 'Code2',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [784, 400],
        alwaysOutputData: false,
    })
    Code2 = {
        jsCode: `// Obtenemos todas las filas del CSV que nos llegan en el array 'items'.
const allItems = items;

// --- Funciones Auxiliares (las definimos una sola vez) ---

function extractDetail(regex, text) {
  if (!text) return null;
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function cleanCurrency(value) {
  if (!value || value.trim() === '-') return null;
  const cleaned = value.replace(/[$,\\sMXN]/g, '');
  return parseFloat(cleaned) || null;
}

// --- Lógica Principal de Transformación ---

const resultados = allItems.map(inputItem => {
  const item = inputItem.json;
  const descripcionDetallada = item['DESCRIPCIÓN DETALLADA'] || "";
  
  let fecha = item['FECHA DE OPERACIÓN'];
  if (fecha) {
    const partes = fecha.split('/');
    if (partes.length === 3) {
      fecha = \`\${partes[2]}-\${partes[1]}-\${partes[0]}\`;
    }
  }

  const abono = cleanCurrency(item['DEPÓSITOS']);
  const cargo = cleanCurrency(item['RETIROS']);

  // Creamos un objeto base para el resultado.
  const resultado = {
    json: {
      fecha: fecha,
      hora: null,
      tipoOperacion: item['DESCRIPCIÓN'],
      abono: abono,
      cargo: cargo,
      concepto: null,
      claveRastreo: null,
      bancoEmisor: null,
      bank: 'banorte'
    }
  };

  // --- Lógica Diferenciada por Tipo de Movimiento ---

  // CASO 1: Es una transferencia SPEI recibida
  if (descripcionDetallada.includes('SPEI RECIBIDO')) {
    resultado.json.claveRastreo = extractDetail(/CVE RAST: ([\\w.\\/-]+)/, descripcionDetallada);
    resultado.json.concepto = extractDetail(/CONCEPTO: (.*?)(?:, REFERENCIA:|, DEL CLIENTE:|, DE LA CLABE)/, descripcionDetallada);
    resultado.json.bancoEmisor = extractDetail(/BCO:\\d+\\s(.*?):/, descripcionDetallada)?.replace(/\\s+/g, ' ');
    resultado.json.hora = extractDetail(/HR LIQ: (\\d{2}:\\d{2}:\\d{2})/, descripcionDetallada);
  
  // CASO 2: Es un TRASPASO interno
  } else if (item['DESCRIPCIÓN'] === 'TRASPASO') {
    resultado.json.tipoOperacion = 'TRASPASO INTERNO';
    // Para traspasos, el concepto está en la descripción detallada.
    resultado.json.concepto = extractDetail(/DE LA CUENTA: \\d+, (.*)/, descripcionDetallada);
    // La clave de rastreo es la referencia del CSV.
    resultado.json.claveRastreo = item['REFERENCIA'];
    resultado.json.bancoEmisor = 'BANORTE'; // Es una operación interna.
  }
  
  return resultado;
});

// Devolvemos el array completo con todos los registros procesados.
return resultados;`,
    };

    @node({
        id: '41c5b36e-8cc6-4dc3-a4c7-107d3c1b099a',
        name: 'Code_Santander',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [784, 224],
    })
    CodeSantander = {
        jsCode: `function cleanNumber(val) {
  const cleaned = (val || '0').toString().replace(/[$,'\\- ]/g, '');
  return parseFloat(cleaned) || 0;
}

function cleanString(val) {
  if (!val) return null;
  return val.replace(/['\\u0000-\\u001F]/g, '').trim();
}

function formatDate(dateString) {
  const cleaned = cleanString(dateString);
  if (!cleaned || !/^\\d{8}$/.test(cleaned)) return null;
  const day = cleaned.substring(0, 2);
  const month = cleaned.substring(2, 4);
  const year = cleaned.substring(4, 8);
  return \`\${year}-\${month}-\${day}\`;
}

// Mapa para evitar duplicados por referencia + clave_rastreo + fecha_operacion
const seen = new Set();

const cleanedItems = [];

for (const item of items) {
  const json = item.json;

  const referencia = cleanString(json['Referencia']) || 'N/A';
  const claveRastreo = cleanString(json['Clave de Rastreo']) || 'N/A'; // <-- Aquí se fuerza que nunca sea null
  const fechaOperacion = formatDate(json['Fecha']) || 'N/A';

  const uniqueKey = \`\${referencia}-\${claveRastreo}-\${fechaOperacion}\`;
  if (seen.has(uniqueKey)) continue;
  seen.add(uniqueKey);

  const cargoAbono = cleanString(json['Cargo/Abono']);
  const importe = cleanNumber(json['Importe']);
  const cargo = cargoAbono === '-' ? importe : 0;
  const abono = cargoAbono === '+' ? importe : 0;

  const descripcionGeneral = cleanString(json['Descripcion']);
  const concepto = cleanString(json['Concepto']);
  const nombreOrdenante = cleanString(json['Nombre Ordenante']);
  const bancoParticipante = cleanString(json['Banco Participante']);

  const descripcionDetallada = \`\${descripcionGeneral} | \`
    + \`Concepto: \${concepto} | \`
    + \`Origen: \${nombreOrdenante || 'N/A'} (\${bancoParticipante || 'N/A'})\`;

  cleanedItems.push({
    json: {
      bank: "santander",
      banco_origen: bancoParticipante || 'N/A',
      fecha_operacion: fechaOperacion,
      hora_operacion: cleanString(json['Hora']) || '00:00',
      descripcion_general: descripcionGeneral,
      cargo: cargo,
      abono: abono,
      saldo: cleanNumber(json['Saldo']),
      referencia: referencia,
      clave_rastreo: claveRastreo,
      concepto: concepto,
      descripcion_detallada: descripcionDetallada
    }
  });
}

return cleanedItems;
`,
    };

    @node({
        id: 'cf00bee6-fcc3-4f8c-b510-4f2489c9dce6',
        name: 'Mensaje_Error',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [352, 592],
    })
    MensajeError = {
        method: 'POST',
        url: "=https://evo.whatscloud.site/message/sendText/{{ $('Webhook1').item.json.body.instance }}",
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'apikey',
                    value: '=key_6sb3iX5hc4sGOGL8HDKWr4ySh4aPvORP',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'number',
                    value: "={{ $('Webhook1').item.json.body.data.key.remoteJid }}",
                },
                {
                    name: 'text',
                    value: '=⚠️ No se encontraron datos para procesar o no se reconoció el archivo de origen (**Santander** o **Banorte**).',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '238ce0e4-060d-4a58-a631-3dc8bf957570',
        name: 'Extraer datos Santander',
        type: 'n8n-nodes-base.extractFromFile',
        version: 1,
        position: [576, 224],
    })
    ExtraerDatosSantander = {
        binaryPropertyName: 'data santander.csv',
        options: {},
    };

    @node({
        id: '1e768f29-3c2a-43c8-b492-7ea79cf38eed',
        name: 'Extraer datos Banorte',
        type: 'n8n-nodes-base.extractFromFile',
        version: 1,
        position: [576, 400],
    })
    ExtraerDatosBanorte = {
        binaryPropertyName: 'data banorte.csv',
        options: {},
    };

    @node({
        id: '07a31d72-d0ab-401e-a536-71adea881a4a',
        name: 'Switch1',
        type: 'n8n-nodes-base.switch',
        version: 3.2,
        position: [-400, 208],
    })
    Switch1 = {
        rules: {
            values: [
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 2,
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.accion }}',
                                rightValue: 'autorizar',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                                id: '47f1a22f-f921-4156-8a5b-6a0bd9136c6e',
                            },
                        ],
                        combinator: 'and',
                    },
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 2,
                        },
                        conditions: [
                            {
                                id: '27a1eeae-c8d6-4858-b56b-fc3e538f78fe',
                                leftValue: '={{ $json.accion }}',
                                rightValue: 'actualizar',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                    name: 'filter.operator.equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                },
            ],
        },
        options: {
            allMatchingOutputs: false,
        },
    };

    @node({
        id: 'c65d6a28-e365-4cf9-99f2-7053375d2910',
        name: 'Insertar_Banorte',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [992, 400],
    })
    InsertarBanorte = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "action": "importar_banco",
  "banco": "banorte",
  "movimientos": {{ JSON.stringify($json) }}
}`,
        options: {},
    };

    @node({
        id: '474e835d-ca3d-4fc1-946c-01d36526206e',
        name: 'Inserta_Santander',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [992, 224],
    })
    InsertaSantander = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "action": "importar_banco",
  "banco": "santander",
  "movimientos": {{ JSON.stringify($json) }}
}`,
        options: {},
    };

    @node({
        id: '94096b5f-2352-44cd-a797-cb2edf1cf3a2',
        name: 'Gran Enrutador',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1728, 816],
    })
    GranEnrutador = {
        jsCode: `// Lista de números autorizados para operaciones de Tesorería.
const numerosTesoreria = ['5214271914642', '5215512345678','5214424793320','5214425060999','183785962352805','92341880795364']; 

const body = $json.body;
const remitenteCompleto = body.data.key.remoteJid;

// SOPORTE HÍBRIDO: Corta en el '@' de forma limpia. 
// Si viene '183785962352805@lid' -> resulta '183785962352805'
// Si viene '5214271914642@s.whatsapp.net' -> resulta '5214271914642'
const remitenteCorto = remitenteCompleto.split('@')[0];

const tipoMensaje = body.data.messageType;
const textoMensaje = (body.data.message.conversation || '').toLowerCase();

// Por defecto, la acción es para el sistema de tickets.
let ruta = 'RUTA_TICKET';

// Verificamos si es una operación de Tesorería.
const esUsuarioTesoreria = numerosTesoreria.includes(remitenteCorto);
const esMensajeTesoreria = tipoMensaje === 'documentMessage' || textoMensaje.includes('autorizar') || (body.data.message.documentMessage && body.data.message.documentMessage.caption.toLowerCase().includes('actualizar'));

if (esUsuarioTesoreria && esMensajeTesoreria) {
  // Si cumple las condiciones, cambiamos la ruta.
  ruta = 'RUTA_TESORERIA';
}

// Devolvemos la ruta decidida y toda la información original para los siguientes nodos.
return [{
  json: {
    ...$json, // Pasamos todos los datos originales
    accion: ruta // Añadimos nuestra decisión
  }
}];`,
    };

    @node({
        id: '91961f65-b4f1-485c-9c93-59611b054281',
        name: 'Gran Enrutador2',
        type: 'n8n-nodes-base.switch',
        version: 3.2,
        position: [-1568, 816],
    })
    GranEnrutador2 = {
        rules: {
            values: [
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 2,
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.accion }}',
                                rightValue: 'RUTA_TESORERIA',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                                id: 'ec00b754-581e-4371-9f55-432dc67628be',
                            },
                        ],
                        combinator: 'and',
                    },
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 2,
                        },
                        conditions: [
                            {
                                id: '03ce4a90-c726-4947-add8-e752c7fc4a97',
                                leftValue: '={{ $json.accion }}',
                                rightValue: 'RUTA_TICKET',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                    name: 'filter.operator.equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                },
            ],
        },
        options: {},
    };

    @node({
        id: '5188f6f7-1a53-46f8-9d39-1d274f0342b9',
        name: 'Intentar Conciliación por Ticket',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1504, 1488],
    })
    IntentarConciliacionPorTicket = {
        jsCode: 'const res = $input.first().json; return (res.conciliados || []).map(c => ({ json: c }));',
    };

    @node({
        id: '0915c3a1-c71a-40e9-8909-79635a179531',
        name: '¿Hay Tickets por Conciliar?',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [-1728, 1504],
        alwaysOutputData: false,
    })
    HayTicketsPorConciliar = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: '0baa5522-1179-4adc-adf3-2d7db51b541d',
                    leftValue: '={{ $items("Obtener Tickets con Clave de Rastreo")[0].json.id }}',
                    rightValue: 0,
                    operator: {
                        type: 'number',
                        operation: 'gt',
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: '82bf18fb-e4c1-4d1d-9554-45da367f2ed1',
        name: 'Generar Mensaje "Sin Novedades"',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1504, 1744],
    })
    GenerarMensajeSinNovedades = {
        jsCode: `const fechaHora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
const mensaje = \`✅ Tarea de conciliación ejecutada a las \${fechaHora}.\` +
                \`\\n\\nNo se encontraron tickets pendientes por procesar.\`;

return [{ json: { mensaje: mensaje } }];`,
    };

    @node({
        id: '2667ad24-5f60-4cc3-ac57-434112bca132',
        name: '¿Conciliación Exitosa?1',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [-1296, 1392],
    })
    ConciliacionExitosa1 = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: 'f4cce7a2-e0bd-49fe-8df6-3ad6670682a5',
                    leftValue: '={{ $json.estado }}',
                    rightValue: 'EXITO',
                    operator: {
                        type: 'string',
                        operation: 'equals',
                        name: 'filter.operator.equals',
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: '3fc2aa84-2713-421c-a791-7e342383a426',
        name: 'Enviar Mensaje al Admin',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-1296, 1744],
        onError: 'continueRegularOutput',
    })
    EnviarMensajeAlAdmin = {
        method: 'POST',
        url: '=https://evo.whatscloud.site/message/sendText/CobranzaDASO',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'apikey',
                    value: '=708EA971097C-48EC-9B1A-830B4F416880',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'number',
                    value: '=5214425060999@s.whatsapp.net',
                },
                {
                    name: '=text',
                    value: '={{ $json.mensaje }}',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'aabbdddd-acc9-4975-98cf-b4a8d8350561',
        name: 'Mensaje_Remitente',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-1088, 1376],
        onError: 'continueRegularOutput',
    })
    MensajeRemitente = {
        method: 'POST',
        url: '=https://evo.whatscloud.site/message/sendText/CobranzaDASO',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'apikey',
                    value: '=708EA971097C-48EC-9B1A-830B4F416880',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'number',
                    value: '={{ $("Obtener Tickets con Clave de Rastreo").item.json.remitente }}',
                },
                {
                    name: '=text',
                    value: `=    ✅ ¡Buenas noticias! Tu ticket ha sido conciliado exitosamente.

    📌 *Detalles del Ticket*
    - 🆔 ID: {{ $("Obtener Tickets con Clave de Rastreo").item.json.id }}
    - 📄 Contrato: {{ $("Obtener Tickets con Clave de Rastreo").item.json.contrato }}
    - 📅 Fecha: {{ new Date($("Obtener Tickets con Clave de Rastreo").item.json.fecha).toLocaleDateString('es-MX') }}
    - 💰 Monto: \${{ parseFloat($("Obtener Tickets con Clave de Rastreo").item.json.monto).toFixed(2) }}
    - 🔢 Referencia: {{ $("Obtener Tickets con Clave de Rastreo").item.json.referencia || 'N/A' }}
    - 📝 Folio: {{ $("Obtener Tickets con Clave de Rastreo").item.json.folio || 'N/A' }}
    - 📦 Clave de rastreo: {{ $("Obtener Tickets con Clave de Rastreo").item.json.claverastreo || 'N/A' }}`,
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'b9210d90-3619-4517-8557-7e5f21ef0384',
        name: 'Generar Resumen para Admin',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1296, 1568],
    })
    GenerarResumenParaAdmin = {
        jsCode: `// Obtenemos todos los resultados de los intentos de conciliación.
const todosLosIntentos = $items("Intentar Conciliación por Ticket");

// Filtramos solo los que tuvieron éxito.
const conciliadosExitosos = todosLosIntentos.filter(item => item.json.estado === 'EXITO');

const totalProcesados = todosLosIntentos.length;
const totalExitosos = conciliadosExitosos.length;
const fechaHora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

// Creamos la base del mensaje.
let mensaje = \`✅ Tarea de conciliación finalizada a las \${fechaHora}.\` +
              \`\\n\\nSe procesaron *\${totalProcesados}* tickets pendientes.\` +
              \`\\nSe conciliaron con éxito: *\${totalExitosos}*.\`;

// Si hubo al menos una conciliación exitosa, añadimos el detalle.
if (totalExitosos > 0) {
  mensaje += "\\n\\n*Detalle de Conciliaciones:*";
  // Creamos una línea por cada ticket conciliado.
  conciliadosExitosos.forEach(item => {
    const ticketId = item.json.ticketId;
    const movimientoId = item.json.movimientoId;
    mensaje += \`\\n- Ticket ID \\\`\${ticketId}\\\` -> Movimiento ID \\\`\${movimientoId}\\\`\`;
  });
}

return [{ json: { mensaje: mensaje } }];`,
    };

    @node({
        id: '68cf947d-a2b2-43a5-8c1c-1238d7744893',
        name: 'Enviar Mensaje al Admin1',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-1088, 1568],
        onError: 'continueRegularOutput',
    })
    EnviarMensajeAlAdmin1 = {
        method: 'POST',
        url: '=https://evo.whatscloud.site/message/sendText/CobranzaDASO',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'apikey',
                    value: '=708EA971097C-48EC-9B1A-830B4F416880',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'number',
                    value: '=5214425060999@s.whatsapp.net',
                },
                {
                    name: '=text',
                    value: '={{ $json.mensaje }}',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '40d64fd3-b75d-400e-8e90-f5fa8689ddf8',
        name: 'Obtener Tickets Pendientes1',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-2176, 2000],
    })
    ObtenerTicketsPendientes1 = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `{
  "action": "conciliar_efectivo"
}`,
        options: {},
    };

    @node({
        id: '40682bba-a35d-4310-9e27-2409b824eb65',
        name: '¿Hay Tickets por Conciliar?1',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [-1968, 2000],
        alwaysOutputData: false,
    })
    HayTicketsPorConciliar1 = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: '0baa5522-1179-4adc-adf3-2d7db51b541d',
                    leftValue: '={{ $items("Obtener Tickets Pendientes1")[0].json.id }}',
                    rightValue: 0,
                    operator: {
                        type: 'number',
                        operation: 'gt',
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: 'b8fc4bc9-3886-4b31-b214-1e8a0d831f00',
        name: 'Generar Mensaje "Sin Novedades"1',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1744, 2144],
    })
    GenerarMensajeSinNovedades1 = {
        jsCode: `const fechaHora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
const mensaje = \`✅ Tarea de conciliación ejecutada a las \${fechaHora}.\` +
                \`\\n\\nNo se encontraron tickets pendientes por procesar.\`;

return [{ json: { mensaje: mensaje } }];`,
    };

    @node({
        id: '7d108ff3-900e-4d83-aab3-af9dc6cb100e',
        name: '¿Conciliación Exitosa?2',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [-1536, 1984],
    })
    ConciliacionExitosa2 = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: 'f4cce7a2-e0bd-49fe-8df6-3ad6670682a5',
                    leftValue: '={{ $json.estado }}',
                    rightValue: 'EXITO',
                    operator: {
                        type: 'string',
                        operation: 'equals',
                        name: 'filter.operator.equals',
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: '0b61a4bb-bd2b-4dad-a6f5-c4fe16bd7fa7',
        name: 'Enviar Mensaje al Admin5',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-1536, 2144],
        onError: 'continueRegularOutput',
    })
    EnviarMensajeAlAdmin5 = {
        method: 'POST',
        url: '=https://evo.whatscloud.site/message/sendText/CobranzaDASO',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'apikey',
                    value: '=708EA971097C-48EC-9B1A-830B4F416880',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'number',
                    value: '=5214425060999@s.whatsapp.net',
                },
                {
                    name: '=text',
                    value: '={{ $json.mensaje }}',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '256d585e-2386-4023-887f-02baf9102818',
        name: 'Generar Resumen para Admin1',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1152, 2000],
    })
    GenerarResumenParaAdmin1 = {
        jsCode: `// Obtenemos todos los resultados de los intentos de conciliación.
const todosLosIntentos = $items("Intentar Conciliación Deposito Efectivo");

// Filtramos solo los que tuvieron éxito.
const conciliadosExitosos = todosLosIntentos.filter(item => item.json.estado === 'EXITO');

const totalProcesados = todosLosIntentos.length;
const totalExitosos = conciliadosExitosos.length;
const fechaHora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

// Creamos la base del mensaje.
let mensaje = \`✅ Tarea de conciliación finalizada a las \${fechaHora}.\` +
              \`\\n\\nSe procesaron *\${totalProcesados}* tickets pendientes.\` +
              \`\\nSe conciliaron con éxito: *\${totalExitosos}*.\`;

// Si hubo al menos una conciliación exitosa, añadimos el detalle.
if (totalExitosos > 0) {
  mensaje += "\\n\\n*Detalle de Conciliaciones:*";
  // Creamos una línea por cada ticket conciliado.
  conciliadosExitosos.forEach(item => {
    const ticketId = item.json.ticketId;
    const movimientoId = item.json.movimientoId;
    mensaje += \`\\n- Ticket ID \\\`\${ticketId}\\\` -> Movimiento ID \\\`\${movimientoId}\\\`\`;
  });
}

return [{ json: { mensaje: mensaje } }];`,
    };

    @node({
        id: '7d8e5447-f5cb-49cf-8934-8592d0f37e50',
        name: 'Enviar Mensaje al Admin6',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-912, 2000],
        onError: 'continueRegularOutput',
    })
    EnviarMensajeAlAdmin6 = {
        method: 'POST',
        url: '=https://evo.whatscloud.site/message/sendText/CobranzaDASO',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'apikey',
                    value: '=708EA971097C-48EC-9B1A-830B4F416880',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'number',
                    value: '=5214425060999@s.whatsapp.net',
                },
                {
                    name: '=text',
                    value: '={{ $json.mensaje }}',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '2d013765-0b2f-4719-910e-121db7bea1f6',
        name: 'Diario - Conciliación SPEI',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [-2144, 1504],
    })
    DiarioConciliacionSpei = {
        rule: {
            interval: [
                {
                    triggerAtHour: 9,
                    triggerAtMinute: 30,
                },
                {
                    triggerAtHour: 16,
                    triggerAtMinute: 30,
                },
            ],
        },
    };

    @node({
        id: '41be118d-defc-479c-b308-9631170ad276',
        name: 'Obtener Tickets con Clave de Rastreo',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-1936, 1504],
    })
    ObtenerTicketsConClaveDeRastreo = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `{
  "action": "conciliar_spei"
}`,
        options: {},
    };

    @node({
        id: 'a6f97f6d-5eca-48e3-9d06-d276fdab3cda',
        name: 'Generar Mensaje de Formato Inválido',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1344, 1200],
    })
    GenerarMensajeDeFormatoInvalido = {
        jsCode: `const mensaje = '❌ *Código no reconocido.*\\n\\nPor favor asegúrate de enviar tu número de contrato que comienza con *DP* o *DQ* (ejemplo: *DP2601001* o *DQ2501001*) junto con tu comprobante para aplicarlo a tu saldo.';

return [{
  json: {
    mensaje: mensaje,
    remitente: $('Enrutador Principal')?.first()?.json?.body?.data?.key?.chatId || $('Enrutador Principal')?.first()?.json?.body?.data?.key?.remoteJid || $('Webhook WAHA')?.first()?.json?.body?.payload?.from
  }
}];`,
    };

    @node({
        id: 'ff092dde-97f6-4f9c-aa96-39c88501e1a3',
        name: 'Enviar Mensaje de Error de Formato',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-1184, 1200],
    })
    EnviarMensajeDeErrorDeFormato = {
        method: 'POST',
        url: 'https://noweb.qhosting.net/api/sendText',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
                {
                    name: 'X-Api-Key',
                    value: 'key_ZsmTBc6xDs7VqR99GfgmM0vBNhlBcSSB',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'session',
                    value: 'GMD3320',
                },
                {
                    name: 'chatId',
                    value: "={{ ($json.remitente || $('Enrutador Principal')?.item?.json?.body?.data?.key?.remoteJid || $('Webhook WAHA')?.item?.json?.body?.payload?.from || '').replace('@s.whatsapp.net', '@c.us') }}",
                },
                {
                    name: 'text',
                    value: '={{ $json.mensaje }}',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'c214d852-d342-4618-aa08-e520dbf0671b',
        name: 'Buscar Cliente por Teléfono',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-816, 848],
    })
    BuscarClientePorTelefono = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "action": "buscar_cliente",
  "telefono": "{{ $('Enrutador Principal')?.item?.json?.body?.data?.key?.remoteJid || $('Webhook WAHA')?.item?.json?.body?.payload?.from }}"
}`,
        options: {},
    };

    @node({
        id: '5f439d60-3c57-4558-be55-8b421c9ecde0',
        name: '¿Cliente Encontrado?',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [-528, 848],
        alwaysOutputData: false,
    })
    ClienteEncontrado = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: '0e6e43f6-4378-4c1d-8aed-84a72b34239a',
                    leftValue: '={{ $json.cod_cliente || $json.cliente?.codigoCliente }}',
                    rightValue: '',
                    operator: {
                        type: 'string',
                        operation: 'notEmpty',
                        singleValue: true,
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: 'e1c315fa-6364-48e2-8f76-e7146581380b',
        name: 'CONCILIAR_DEPOSITO',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [-2384, 2000],
    })
    ConciliarDeposito = {
        rule: {
            interval: [
                {
                    field: 'weeks',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '82357445-38f3-46a3-9a79-599e8a43b0e9',
        name: 'Validar Respuesta de Texto',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-992, 1056],
    })
    ValidarRespuestaDeTexto = {
        jsCode: `const rawText = ($json.body?.data?.message?.conversation || $json.body?.data?.message?.extendedTextMessage?.text || '').trim();
const textoContrato = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '');

// Validamos el texto de la respuesta para contratos DP o DQ
const formatoValido = /^(DP|DQ)\\d{5,8}$/i.test(textoContrato);

$json.formatoRespuestaValido = formatoValido;
$json.contrato = textoContrato;
$json.contrato_respuesta = textoContrato;

return $json;`,
    };

    @node({
        id: 'fd5535d1-e1d6-4ea2-a222-962c7eca7dd0',
        name: '¿Respuesta con Formato Válido?',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [-816, 1056],
    })
    RespuestaConFormatoValido = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: 'edc86eda-d1e5-4d4a-9b8e-85560a9938d5',
                    leftValue: '={{ $json.formatoRespuestaValido }}',
                    rightValue: '',
                    operator: {
                        type: 'boolean',
                        operation: 'true',
                        singleValue: true,
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: '52ae2603-861b-4658-b267-b154bcaf3012',
        name: 'Generar Mensaje de Formato Incorrecto',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-544, 1200],
    })
    GenerarMensajeDeFormatoIncorrecto = {
        jsCode: `const mensaje = '❌ *Código no válido.*\\n\\nPor favor verifica tu número de contrato. Debe comenzar con *DP* o *DQ* seguido de sus números (ejemplo: *DP2601001* o *DQ2501001*).';

const remitente = $('Enrutador Principal')?.first()?.json?.body?.data?.key?.chatId || $('Enrutador Principal')?.first()?.json?.body?.data?.key?.remoteJid || $('Webhook WAHA')?.first()?.json?.body?.payload?.from;

return [{
  json: {
    mensaje: mensaje,
    remitente: remitente
  }
}];`,
    };

    @node({
        id: '567e66fc-4aa4-4afd-818a-2b3f13cfe1c8',
        name: 'Mensaje_Ticket2',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-384, 1200],
    })
    MensajeTicket2 = {
        method: 'POST',
        url: 'https://noweb.qhosting.net/api/sendText',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
                {
                    name: 'X-Api-Key',
                    value: 'key_ZsmTBc6xDs7VqR99GfgmM0vBNhlBcSSB',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'session',
                    value: 'GMD3320',
                },
                {
                    name: 'chatId',
                    value: "={{ ($json.remitente || $('Enrutador Principal')?.item?.json?.body?.data?.key?.remoteJid || $('Webhook WAHA')?.item?.json?.body?.payload?.from || '').replace('@s.whatsapp.net', '@c.us') }}",
                },
                {
                    name: 'text',
                    value: '={{ $json.mensaje }}',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '7c305748-eb6d-4302-a1ed-32531f89ed7b',
        name: 'Preparar Mensaje de Notificación',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2848, 784],
    })
    PrepararMensajeDeNotificacion = {
        jsCode: `// Obtenemos los datos pasados directamente desde el nodo anterior (Intentar_Conciliacion_Inteligente / MENSAJE)
const item = $input.first()?.json || $json || {};

// Extraemos todos los datos necesarios con valores por defecto
const ticketId = item.ticketId || item.id || 'N/A';
const contrato = item.cod_cliente || item.contrato || 'N/A';
const idPago = item.idPagoGenerado || item.idPago || 'N/A';
const saldo = item.saldo_actual ?? item.saldo ?? 0;
const movimientoId = item.movimientoId || 'N/A';
const esDuplicado = item.yaExiste === true;
const remitente = item.remitente || null;

// Construimos la primera parte del mensaje con los detalles del ticket
let mensaje = \`📌 *Detalles del Ticket*\` +
              \`\\n- 🆔 ID: \${ticketId}\` +
              \`\\n- 📅 Fecha: \${item.fecha || 'N/A'}\` +
              \`\\n- ⏰ Hora: \${item.hr || 'N/A'}\` +
              \`\\n- 💰 Monto: $\${parseFloat(item.monto || 0).toFixed(2)}\` +
              \`\\n- 🔢 Referencia: \${item.referencia || 'N/A'}\` +
              \`\\n- 📝 Folio: \${item.folio || 'N/A'}\` +
              \`\\n- 📦 Clave de rastreo: \${item.claverastreo || 'N/A'}\`;

mensaje += \`\\n--------------------------------\\n\`;

// Lógica de respuesta según estado
if (esDuplicado === true) {
  mensaje += \`⚠️ *ESTE COMPROBANTE YA FUE REGISTRADO PREVIAMENTE*\\n\` +
             \`El sistema ya tiene este ticket procesándose con el ID \${ticketId}. \` +
             \`No es necesario subirlo nuevamente.\`;
} else if (item.estado === 'EXITO' || item.estado === 'EXITO_Y_APLICADO' || item.conc_status === 'CONCILIADO') {
  mensaje += \`✅ ¡Tu pago ha sido conciliado y aplicado exitosamente!\` +
             \`\\n\\n- 📄 Contrato: \${contrato}\` +
             \`\\n- 💰 Nuevo Saldo: $\${parseFloat(saldo).toFixed(2)}\` +
             \`\\n- 💳 ID de Pago Aplicado: \${idPago}\` +
             \`\\n- 🏦 ID Bancario: \${movimientoId}\`;
} else {
  mensaje += \`🚨 *Tu comprobante está en proceso de validación.*\\n\` +
             \`Ya lo guardamos en el sistema. En cuanto el banco refleje el movimiento, recibirás tu NUEVO SALDO.\`;
}

return [{
  json: {
    ...item,
    mensaje: mensaje,
    remitente: remitente
  }
}];`,
    };

    @node({
        id: 'e1ec2997-13ef-4af0-b103-1e160f7df1fc',
        name: 'Merge',
        type: 'n8n-nodes-base.merge',
        version: 3.2,
        position: [928, 768],
        alwaysOutputData: false,
    })
    Merge = {
        numberInputs: 3,
    };

    @node({
        id: 'fce7e1c4-bf3d-4e98-86c9-cfa7747bf4ae',
        name: 'Estandarizar Variables de Imagen',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [1408, 784],
    })
    EstandarizarVariablesDeImagen = {
        assignments: {
            assignments: [
                {
                    id: 'c03ccc3a-c1f6-49b5-b587-fef118d98824',
                    name: 'contacto',
                    value: '={{ $json.contrato || $json.cod_cliente || $json.contrato_respuesta }}',
                    type: 'string',
                },
                {
                    id: 'ff22a3c5-be4c-4dab-940c-c64758279f35',
                    name: 'base64',
                    value: '={{ $json.body?.data?.message?.base64 || $json.body?.data?.base64 || $json.base64 || $json.base64_data }}',
                    type: 'string',
                },
                {
                    id: '70b50d23-a404-4ed1-befa-4b3c12edd376',
                    name: 'mimetype',
                    value: '={{ $json.body?.data?.message?.imageMessage?.mimetype || $json.mimetype || $json.tipo_archivo }}',
                    type: 'string',
                },
                {
                    id: 'ee6451bd-b72b-4993-8550-99d5f3b1762f',
                    name: 'remitente',
                    value: '={{ $json.body?.data?.key?.remoteJid || $json.remitente }}',
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'a117194c-73a4-4f2a-9eb9-ab4e13369c1e',
        name: 'Unir Datos de Busqueda',
        type: 'n8n-nodes-base.set',
        version: 3.4,
        position: [-96, 816],
        alwaysOutputData: true,
    })
    UnirDatosDeBusqueda = {
        assignments: {
            assignments: [
                {
                    id: '403811d6-bdb6-48c1-8575-457227817f2e',
                    name: '=contrato',
                    value: "={{ $('Buscar Cliente por Teléfono').item.json.cod_cliente }}",
                    type: 'string',
                },
                {
                    id: 'cea9b660-3630-4638-add9-c58aeec1d14b',
                    name: 'base64',
                    value: "={{ $('Gran Enrutador').item.json.body.data.message.base64 }}",
                    type: 'string',
                },
                {
                    id: '7b7d8acd-5535-49eb-8cca-eb1e308c1a62',
                    name: 'remitente',
                    value: "={{ $('Gran Enrutador').item.json.body.data.key.remoteJid }}",
                    type: 'string',
                },
                {
                    id: '3ad3e148-dd48-4203-904e-5da9af980571',
                    name: 'mimetype',
                    value: "={{ $('Gran Enrutador').item.json.body.data.message.imageMessage.mimetype }}",
                    type: 'string',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'a46c3115-b5e4-455e-b0d4-b9ea3b008081',
        name: 'Asigna Gestor',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2224, 992],
    })
    AsignaGestor = {
        jsCode: 'return $input.all();',
    };

    @node({
        id: '052770d2-f7c6-4eb8-b235-58f3c62cd2de',
        name: 'Intentar Conciliación Deposito Efectivo',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1744, 1984],
    })
    IntentarConciliacionDepositoEfectivo = {
        jsCode: 'const res = $input.first().json; return (res.conciliados || []).map(c => ({ json: c }));',
    };

    @node({
        id: '980d43cc-9fc8-446e-8c74-3ce4f78b3acc',
        name: 'Envio de Saldos',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [-2224, 2464],
    })
    EnvioDeSaldos = {
        rule: {
            interval: [
                {
                    field: 'minutes',
                },
            ],
        },
    };

    @node({
        id: '5e0a467d-b709-4458-875e-ffe8243d7abf',
        name: 'Obtener Pagos Pendientes de Notificar',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-2032, 2464],
    })
    ObtenerPagosPendientesDeNotificar = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `{
  "action": "pagos_pendientes_notificar",
  "limit": 20
}`,
        options: {},
    };

    @node({
        id: '8e7b8756-4633-4bcc-917c-3686217a5a67',
        name: 'Code3',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1488, 2464],
    })
    Code3 = {
        mode: 'runOnceForEachItem',
        jsCode: `// Obtenemos los datos que vienen del nodo MySQL para un cliente a la vez.
const item = $input.item.json;

// Extraemos cada dato para que sea más fácil de usar.
const idPago = item.idPago;
const codCliente = item.cod_cliente;
const ticketId = item.ticket_id;
const fechaPago = item.fechaPago;
const montoPago = parseFloat(item.montoPago).toFixed(2); // Asegura 2 decimales
const nuevoSaldo = parseFloat(item.nuevoSaldo).toFixed(2); // Asegura 2 decimales

// --- Construcción del Mensaje con Formato y Emojis ---
const mensaje = \`✅*¡Pago Aplicado y Conciliado!*✅

Hemos confirmado tu pago y actualizado tu saldo.

🧾 *ID de Pago:* \${idPago}
👤 *Código Cliente:* \${codCliente}
🎫 *Ticket ID:* \${ticketId}
📅 *Fecha Pago:* \${fechaPago}
💵 *Monto Pago:* $\${montoPago}
💰 *Nuevo Saldo:* $\${nuevoSaldo}

Gracias por tu preferencia.
*- Muebles Daso*\`;

// Devolvemos el mensaje formateado y los datos necesarios para los siguientes nodos.
const telefonoFormateado = \`521\${item.tel1_cliente}@s.whatsapp.net\`;

return {
  json: {
    mensaje_final: mensaje,
    telefono_cliente: telefonoFormateado,
    ticket_id: ticketId,
    cod_cliente: codCliente  // <--- ¡AQUÍ ESTÁ EL CAMBIO IMPORTANTE! Agregamos esta línea.
  }
};`,
    };

    @node({
        id: 'c269e308-7f14-4395-8dab-17f5f64cb648',
        name: 'Actualizar Ticket Enviado',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-464, 2464],
    })
    ActualizarTicketEnviado = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "action": "marcar_pago_notificado",
  "pagoId": "{{ $('Code3').item.json.id }}"
}`,
        options: {},
    };

    @node({
        id: 'e3838e3a-4c1b-43ae-91db-8eb603f99c00',
        name: 'Actualizar Ticket Enviado1',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1328, 2656],
    })
    ActualizarTicketEnviado1 = {
        jsCode: 'return $input.all();',
    };

    @node({
        id: '719eb3a7-45da-4d93-847c-01fa20d5d5be',
        name: 'If',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [-1824, 2464],
    })
    If_ = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: 'd74f5f12-1a5e-45a5-a56d-fc0f08ec2110',
                    leftValue: '={{ $json.tel1_cliente }}',
                    rightValue: '',
                    operator: {
                        type: 'string',
                        operation: 'notEmpty',
                        singleValue: true,
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: '515b8fd9-813f-46ce-ad2a-37aec23bbe2f',
        name: 'If1',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [-880, 2464],
    })
    If1 = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: 'ab068154-ac3a-489e-9191-8c1bb7a2f578',
                    leftValue: '={{ $json.error }}',
                    rightValue: '',
                    operator: {
                        type: 'object',
                        operation: 'empty',
                        singleValue: true,
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: '3a548bc6-11b8-48e6-b74d-8485ea3641d6',
        name: 'Numero Invalido',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-704, 2656],
    })
    NumeroInvalido = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "action": "marcar_pago_invalido",
  "pagoId": "{{ $('Code3').item.json.id }}"
}`,
        options: {},
    };

    @node({
        id: 'd079cce5-40ac-45a0-871a-2a90b94ce7d9',
        name: 'Enviar por WAHA',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [3136, 784],
    })
    EnviarPorWaha = {
        method: 'POST',
        url: 'https://noweb.qhosting.net/api/sendText',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
                {
                    name: 'X-Api-Key',
                    value: 'key_ZsmTBc6xDs7VqR99GfgmM0vBNhlBcSSB',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'session',
                    value: 'GMD3320',
                },
                {
                    name: 'chatId',
                    value: "={{ ($json.remitente || $('EXTRAE_DATOS')?.item?.json?.remitente || $('Webhook WAHA')?.item?.json?.body?.payload?.from || '').replace('@s.whatsapp.net', '@c.us') }}",
                },
                {
                    name: 'text',
                    value: '={{ $json.mensaje }}',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '3c7a42e7-f3e1-4688-9c7a-6724d70ebef8',
        webhookId: 'af8e4d08-2565-4a43-9a36-d37d35114da5',
        name: 'Webhook WAHA',
        type: 'n8n-nodes-base.webhook',
        version: 2,
        position: [-2640, 816],
    })
    WebhookWaha = {
        httpMethod: 'POST',
        path: 'webhook-waha-tickets2',
        options: {},
    };

    @node({
        id: 'da0ad587-b6e7-4364-b514-9efdc5d830f1',
        name: '¿Tiene Imagen?',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [-2416, 816],
    })
    TieneImagen = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: 'check-media',
                    leftValue: '={{ $json.body.payload.hasMedia }}',
                    rightValue: true,
                    operator: {
                        type: 'boolean',
                        operation: 'true',
                        singleValue: true,
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: '54c5506d-5b21-4acd-a5ac-2dab47679964',
        name: 'Descargar Media WAHA',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-2192, 688],
    })
    DescargarMediaWaha = {
        url: "={{ $json.body.payload.media.url.replace(/https?:\\/\\/localhost(:[0-9]+)?/, 'https://noweb.qhosting.net') }}",
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'X-Api-Key',
                    value: '2a92eb04791843f5b4093f21a4306960',
                },
            ],
        },
        options: {
            response: {
                response: {
                    responseFormat: 'file',
                },
            },
        },
    };

    @node({
        id: 'e8e8d9c0-f277-421d-8d39-f038a3c96557',
        name: 'Adaptador a Formato Evolution',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-1936, 816],
    })
    AdaptadorAFormatoEvolution = {
        jsCode: `// --- ADAPTADOR WAHA -> EVOLUTION FORMAT (V8 - PRESERVAR NOMBRE ORIGINAL) ---

// 1. Obtenemos los datos ORIGINALES del Webhook
const webhookData = $('Webhook WAHA').first().json; 
const payload = webhookData.body ? webhookData.body.payload : webhookData.payload;

// Unificamos el texto
const textoRaw = payload.body || payload.caption || '';
const textoDetectado = textoRaw.toString(); 

// 2. Procesamos el archivo
let base64String = null;
let mimetype = null;
let hasMedia = false;
let messageType = 'conversation';
// AQUÍ ESTÁ LA MAGIA: Leemos el nombre original del JSON, no del archivo descargado
let originalFileName = payload.media ? payload.media.filename : 'archivo.bin';

// Verificamos si hay archivo descargado
if (items[0].binary && items[0].binary.data) {
    hasMedia = true;
    mimetype = items[0].binary.data.mimeType; 
    
    // Obtener Base64
    try {
        const buffer = await this.helpers.getBinaryDataBuffer(0, 'data');
        base64String = buffer.toString('base64');
    } catch (error) {
        if (items[0].binary.data.data) {
             base64String = items[0].binary.data.data;
        }
    }

    // Clasificación
    if (mimetype.includes('image')) {
        messageType = 'imageMessage';
    } else {
        messageType = 'documentMessage';
    }
}

// 3. Construimos el objeto
const mockEvolution = {
  body: {
    data: {
      key: {
        remoteJid: payload.from.replace('@c.us', '@s.whatsapp.net'),
        id: payload.id
      },
      pushName: payload.pushName || 'Cliente',
      messageType: messageType,
      message: {}
    },
    instance: 'BotDASO', 
    apikey: 'internal_bypass'
  }
};

// 4. Asignamos los datos
if (hasMedia && base64String) {
  
  if (messageType === 'imageMessage') {
      // TICKET (IMAGEN)
      mockEvolution.body.data.message.base64 = base64String;
      mockEvolution.body.data.message.imageMessage = {
        caption: textoDetectado, 
        mimetype: mimetype,
        fileName: 'imagen.jpg'
      };
  } else {
      // DOCUMENTO (EXCEL)
      mockEvolution.body.data.message.base64 = base64String;
      mockEvolution.body.data.message.documentMessage = {
        caption: textoDetectado,
        mimetype: mimetype,
        fileName: originalFileName // <--- Aquí usamos 'santander.csv'
      };
  }

} else {
  // TEXTO
  mockEvolution.body.data.message.conversation = textoDetectado;
  mockEvolution.body.data.message.extendedTextMessage = {
    text: textoDetectado
  };
}

return mockEvolution;`,
    };

    @node({
        id: '38e52d64-5ccf-4145-8b0c-652d0c5302df',
        name: 'Enviar por WAHA1',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-1232, 2288],
    })
    EnviarPorWaha1 = {
        method: 'POST',
        url: 'https://noweb.qhosting.net/api/sendText',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'X-Api-Key',
                    value: 'key_RWIgl9LOofra2y6U23EFZPsK4ihmh5eQ',
                },
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'session',
                    value: 'Daso0772',
                },
                {
                    name: 'chatId',
                    value: "={{ $json.telefono_cliente.replace('@s.whatsapp.net', '@c.us') }}",
                },
                {
                    name: 'text',
                    value: '=  {{ $json.mensaje_final }}',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '886a7e0a-7468-4423-93de-2a7308f75798',
        name: 'Enviar por WAHA2',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [1232, 224],
    })
    EnviarPorWaha2 = {
        method: 'POST',
        url: 'https://noweb.qhosting.net/api/sendText',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
                {
                    name: 'X-Api-Key',
                    value: 'key_ZsmTBc6xDs7VqR99GfgmM0vBNhlBcSSB',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'session',
                    value: 'GMD3320',
                },
                {
                    name: 'chatId',
                    value: "={{ $('Code1').first().json.chatId }}",
                },
                {
                    name: 'text',
                    value: `=✅ Datos de *SANTANDER* procesados y actualizados correctamente en la base de datos.
Actualizado:{{ DateTime.local().setZone('America/Mexico_City').toFormat('yyyy-MM-dd HH:mm:ss') }} `,
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'e5689145-2ad4-4281-92a8-666beaadf914',
        name: 'Enviar por WAHA3',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [1248, 400],
    })
    EnviarPorWaha3 = {
        method: 'POST',
        url: 'https://noweb.qhosting.net/api/sendText',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
                {
                    name: 'X-Api-Key',
                    value: 'key_ZsmTBc6xDs7VqR99GfgmM0vBNhlBcSSB',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'session',
                    value: 'GMD3320',
                },
                {
                    name: 'chatId',
                    value: "={{ $('Code1').first().json.chatId }}",
                },
                {
                    name: 'text',
                    value: `=✅ Datos de *BANORTE* procesados y actualizados correctamente en la base de datos.
Actualizado:{{ DateTime.local().setZone('America/Mexico_City').toFormat('yyyy-MM-dd HH:mm:ss') }}`,
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'd928bde4-f853-41b6-9c8a-4d743408d16d',
        name: 'Enviar por WAHA4',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [-288, 2944],
    })
    EnviarPorWaha4 = {
        method: 'POST',
        url: 'https://noweb.qhosting.net/api/sendText',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'X-Api-Key',
                    value: 'key_RWIgl9LOofra2y6U23EFZPsK4ihmh5eQ',
                },
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'session',
                    value: 'Daso0772',
                },
                {
                    name: 'chatId',
                    value: "={{ $json.telefono_cliente.replace('@s.whatsapp.net', '@c.us') }}",
                },
                {
                    name: 'text',
                    value: '=  {{ $json.mensaje_final }}',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '8449f338-31ab-4b67-8f05-f69b330753d9',
        name: 'Enviar por WAHA5',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [464, 896],
    })
    EnviarPorWaha5 = {
        method: 'POST',
        url: 'https://noweb.qhosting.net/api/sendText',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
                {
                    name: 'X-Api-Key',
                    value: 'key_ZsmTBc6xDs7VqR99GfgmM0vBNhlBcSSB',
                },
            ],
        },
        sendBody: true,
        bodyParameters: {
            parameters: [
                {
                    name: 'session',
                    value: 'GMD3320',
                },
                {
                    name: 'chatId',
                    value: "={{ ($json.remitente || $('Enrutador Principal')?.item?.json?.body?.data?.key?.remoteJid || $('Webhook WAHA')?.item?.json?.body?.payload?.from || '').replace('@s.whatsapp.net', '@c.us') }}",
                },
                {
                    name: 'text',
                    value: '={{ $json.mensaje }}',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '5326747a-99b9-4889-8c0b-1873ad25109c',
        name: 'NextJS_ERP_Webhook',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.4,
        position: [1968, 1120],
        onError: 'continueRegularOutput',
        retryOnFail: true,
        maxTries: 5,
        waitBetweenTries: 3000,
    })
    NextjsErpWebhook = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "action": "create",
  "contrato": "{{ $json.contrato }}",
  "monto": "{{ $json.monto }}",
  "referencia": "{{ $json.referencia }}",
  "folio": "{{ $json.folio }}",
  "fecha": "{{ $json.fecha }}",
  "hr": "{{ $json.hr }}",
  "claverastreo": "{{ $json.claverastreo }}",
  "remitente": "{{ $json.remitente }}",
  "base64Data": "{{ $('EXTRAE_DATOS')?.first()?.json?.base64 || $('Enrutador Principal')?.item?.json?.body?.data?.message?.base64 || null }}"
}
`,
        options: {
            timeout: 30000,
        },
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.Imagen.out(0).to(this.AnalyzeImage.in(0));
        this.AnalyzeImage.out(0).to(this.ExtraeDatos.in(0));
        this.InsertarTicket.out(0).to(this.Mensaje.in(0));
        this.InsertarTicket.out(0).to(this.AsignaGestor.in(0));
        this.ExtraeDatos.out(0).to(this.InsertarTicket.in(0));
        this.ExtraeDatos.out(0).to(this.NextjsErpWebhook.in(0));
        this.Mensaje.out(0).to(this.IntentarConciliacionInteligente.in(0));
        this.EnrutadorPrincipal.out(0).to(this.SelectorDeAccion.in(0));
        this.SelectorDeAccion.out(0).to(this.Merge.in(0));
        this.SelectorDeAccion.out(1).to(this.BuscarClientePorTelefono.in(0));
        this.SelectorDeAccion.out(2).to(this.ValidarRespuestaDeTexto.in(0));
        this.SelectorDeAccion.out(3).to(this.GenerarMensajeDeFormatoInvalido.in(0));
        this.GuardarTicketPendiente.out(0).to(this.GenerarMensajeDePeticion.in(0));
        this.GenerarMensajeDePeticion.out(0).to(this.EnviarPorWaha5.in(0));
        this.BuscarTicketPendiente.out(0).to(this.SeEncontroPendiente.in(0));
        this.SeEncontroPendiente.out(0).to(this.EliminarPendiente.in(0));
        this.SeEncontroPendiente.out(0).to(this.Merge.in(1));
        this.IntentarConciliacionInteligente.out(0).to(this.PrepararMensajeDeNotificacion.in(0));
        this.HttpRequest.out(0).to(this.ExecuteASqlQuery.in(0));
        this.Code1.out(0).to(this.ValidacionExitosa.in(0));
        this.ValidacionExitosa.out(0).to(this.Switch1.in(0));
        this.Switch_.out(0).to(this.SantanderCsv.in(0));
        this.Switch_.out(1).to(this.BanorteCsv.in(0));
        this.Switch_.out(2).to(this.MensajeError.in(0));
        this.SantanderCsv.out(0).to(this.ExtraerDatosSantander.in(0));
        this.BanorteCsv.out(0).to(this.ExtraerDatosBanorte.in(0));
        this.Code2.out(0).to(this.InsertarBanorte.in(0));
        this.CodeSantander.out(0).to(this.InsertaSantander.in(0));
        this.ExtraerDatosSantander.out(0).to(this.CodeSantander.in(0));
        this.ExtraerDatosBanorte.out(0).to(this.Code2.in(0));
        this.Switch1.out(0).to(this.HttpRequest.in(0));
        this.Switch1.out(1).to(this.Switch_.in(0));
        this.InsertarBanorte.out(0).to(this.EnviarPorWaha3.in(0));
        this.InsertaSantander.out(0).to(this.EnviarPorWaha2.in(0));
        this.GranEnrutador.out(0).to(this.GranEnrutador2.in(0));
        this.GranEnrutador2.out(0).to(this.Code1.in(0));
        this.GranEnrutador2.out(1).to(this.EnrutadorPrincipal.in(0));
        this.IntentarConciliacionPorTicket.out(0).to(this.ConciliacionExitosa1.in(0));
        this.IntentarConciliacionPorTicket.out(0).to(this.GenerarResumenParaAdmin.in(0));
        this.HayTicketsPorConciliar.out(0).to(this.IntentarConciliacionPorTicket.in(0));
        this.HayTicketsPorConciliar.out(1).to(this.GenerarMensajeSinNovedades.in(0));
        this.GenerarMensajeSinNovedades.out(0).to(this.EnviarMensajeAlAdmin.in(0));
        this.ConciliacionExitosa1.out(0).to(this.MensajeRemitente.in(0));
        this.GenerarResumenParaAdmin.out(0).to(this.EnviarMensajeAlAdmin1.in(0));
        this.ObtenerTicketsPendientes1.out(0).to(this.HayTicketsPorConciliar1.in(0));
        this.HayTicketsPorConciliar1.out(0).to(this.IntentarConciliacionDepositoEfectivo.in(0));
        this.HayTicketsPorConciliar1.out(1).to(this.GenerarMensajeSinNovedades1.in(0));
        this.GenerarMensajeSinNovedades1.out(0).to(this.EnviarMensajeAlAdmin5.in(0));
        this.GenerarResumenParaAdmin1.out(0).to(this.EnviarMensajeAlAdmin6.in(0));
        this.DiarioConciliacionSpei.out(0).to(this.ObtenerTicketsConClaveDeRastreo.in(0));
        this.ObtenerTicketsConClaveDeRastreo.out(0).to(this.HayTicketsPorConciliar.in(0));
        this.GenerarMensajeDeFormatoInvalido.out(0).to(this.EnviarMensajeDeErrorDeFormato.in(0));
        this.BuscarClientePorTelefono.out(0).to(this.ClienteEncontrado.in(0));
        this.ClienteEncontrado.out(0).to(this.UnirDatosDeBusqueda.in(0));
        this.ClienteEncontrado.out(1).to(this.GuardarTicketPendiente.in(0));
        this.ConciliarDeposito.out(0).to(this.ObtenerTicketsPendientes1.in(0));
        this.ValidarRespuestaDeTexto.out(0).to(this.RespuestaConFormatoValido.in(0));
        this.RespuestaConFormatoValido.out(0).to(this.BuscarTicketPendiente.in(0));
        this.RespuestaConFormatoValido.out(1).to(this.GenerarMensajeDeFormatoIncorrecto.in(0));
        this.GenerarMensajeDeFormatoIncorrecto.out(0).to(this.MensajeTicket2.in(0));
        this.PrepararMensajeDeNotificacion.out(0).to(this.EnviarPorWaha.in(0));
        this.Merge.out(0).to(this.EstandarizarVariablesDeImagen.in(0));
        this.EstandarizarVariablesDeImagen.out(0).to(this.Imagen.in(0));
        this.UnirDatosDeBusqueda.out(0).to(this.Merge.in(1));
        this.IntentarConciliacionDepositoEfectivo.out(0).to(this.ConciliacionExitosa2.in(0));
        this.IntentarConciliacionDepositoEfectivo.out(0).to(this.GenerarResumenParaAdmin1.in(0));
        this.EnvioDeSaldos.out(0).to(this.ObtenerPagosPendientesDeNotificar.in(0));
        this.ObtenerPagosPendientesDeNotificar.out(0).to(this.If_.in(0));
        this.Code3.out(0).to(this.ActualizarTicketEnviado1.in(0));
        this.Code3.out(0).to(this.EnviarPorWaha1.in(0));
        this.If_.out(0).to(this.Code3.in(0));
        this.If1.out(0).to(this.ActualizarTicketEnviado.in(0));
        this.If1.out(1).to(this.NumeroInvalido.in(0));
        this.NumeroInvalido.out(0).to(this.EnviarPorWaha4.in(0));
        this.WebhookWaha.out(0).to(this.TieneImagen.in(0));
        this.TieneImagen.out(0).to(this.DescargarMediaWaha.in(0));
        this.DescargarMediaWaha.out(0).to(this.AdaptadorAFormatoEvolution.in(0));
        this.AdaptadorAFormatoEvolution.out(0).to(this.GranEnrutador.in(0));
        this.EnviarPorWaha1.out(0).to(this.If1.in(0));
    }
}
