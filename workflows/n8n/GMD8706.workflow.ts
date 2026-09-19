import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : GMD8706
// Nodes   : 20  |  Connections: 19
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// Detectartipo                       code
// RuteoPorTipo                       switch
// ParsearDireccion                   code
// FormatearRespuesta                 code
// PorCliente1                        mySql                      [creds] [alwaysOutput]
// Ubica                              mySql                      [creds] [alwaysOutput]
// Tel                                mySql                      [creds] [alwaysOutput]
// Imagen                             convertToFile
// AnalyzeImage                       openAi                     [creds]
// ExtraeIne                          code
// EsImagenOTexto                     if
// WebhookWaha                        webhook
// SoloGrupoGmd8706                   if
// EnviarAlertaWaha2                  httpRequest                [retry]
// ExistenciaCarteraDq                scheduleTrigger
// ExistenciaCarteraDp                scheduleTrigger
// ObtenerExistenciaDq                httpRequest
// ObtenerExistenciaDp                httpRequest
// PrepararMensajeDq                  code
// PrepararMensajeDp                  code
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// WebhookWaha
//    → SoloGrupoGmd8706
//      → Detectartipo
//        → RuteoPorTipo
//          → PorCliente1
//            → FormatearRespuesta
//              → EnviarAlertaWaha2
//         .out(1) → ParsearDireccion
//            → Ubica
//              → FormatearRespuesta (↩ loop)
//         .out(2) → Tel
//            → FormatearRespuesta (↩ loop)
//         .out(3) → ObtenerExistenciaDq
//            → PrepararMensajeDq
//              → EnviarAlertaWaha2 (↩ loop)
//         .out(4) → ObtenerExistenciaDp
//            → PrepararMensajeDp
//              → EnviarAlertaWaha2 (↩ loop)
// ExistenciaCarteraDq
//    → ObtenerExistenciaDq (↩ loop)
// ExistenciaCarteraDp
//    → ObtenerExistenciaDp (↩ loop)
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'ZDlF-ecplZY1m6Ly75w_D',
    name: 'GMD8706',
    active: true,
    isArchived: false,
    settings: {
        executionOrder: 'v1',
        availableInMCP: false,
        timeSavedMode: 'fixed',
        saveDataSuccessExecution: 'all',
        saveManualExecutions: false,
        callerPolicy: 'workflowsFromSameOwner',
        binaryMode: 'separate',
    },
})
export class Gmd8706Workflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '3b464d11-4af7-4026-9f12-6323123a28ea',
        name: 'DetectarTipo',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [992, 1376],
    })
    Detectartipo = {
        jsCode: `// Obtener el cuerpo de la entrada
const root = $input.item.json;
const body = root.body || {};
const payload = body.payload || {};

// Ignorar mensajes enviados por la propia cuenta (fromMe)
if (payload.fromMe === true || body.data?.key?.fromMe === true) {
    return [];
}

// 1. Extraer el mensaje correctamente desde la estructura WAHA
let mensaje = payload.body || ""; 

// Fallback: Si viene vacío, intentar buscar en otros formatos (por seguridad)
if (!mensaje && body.content) mensaje = body.content;

// 2. Limpieza: Convertir a mayúsculas y quitar espacios extra
const msgUpper = mensaje.toUpperCase().trim();

// 3. Variables por defecto
let tipo = "texto_general";
let valor = mensaje;

// 4. Lógica de Detección (Regex)
const regexCliente = /CLIENTE\\s+(.*)/i;
const regexUbica = /UBICA\\s+(.*)/i;
const regexTel = /TEL\\s+(.*)/i;
const regexExistenciaDq = /(?:EXISTENCIA|CARTERA)\\s*DQ/i;
const regexExistenciaDp = /(?:EXISTENCIA|CARTERA)\\s*DP/i;

if (regexCliente.test(msgUpper)) {
    tipo = "cliente";
    valor = msgUpper.match(regexCliente)[1].trim();
} else if (regexUbica.test(msgUpper)) {
    tipo = "ubica";
    valor = msgUpper.match(regexUbica)[1].trim();
} else if (regexTel.test(msgUpper)) {
    tipo = "tel";
    valor = msgUpper.match(regexTel)[1].trim();
} else if (regexExistenciaDq.test(msgUpper)) {
    tipo = "existencia_dq";
    valor = "DQ";
} else if (regexExistenciaDp.test(msgUpper)) {
    tipo = "existencia_dp";
    valor = "DP";
} else {
    // Si no es un comando de consulta válido, ignorar sin contestar
    return [];
}

// 5. Retorno de datos (Incluyendo Session y From para usar después)
return [{
    json: {
        tipo: tipo,          // "cliente", "ubica" o "tel"
        valor: valor,        // El dato limpio (ej: "ANTONIO CRESENCIO VITE")
        from: payload.from,  // ID del remitente (ej: 12036...@g.us)
        session: body.session || "default", // Sesión de WAHA
        raw_msg: mensaje     // Mensaje original por si se necesita
    }
}];`,
    };

    @node({
        id: '4057109e-f7f5-4e1b-ad4d-25b7bdedb0da',
        name: 'Ruteo por Tipo',
        type: 'n8n-nodes-base.switch',
        version: 3.2,
        position: [1472, 1216],
    })
    RuteoPorTipo = {
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
                                leftValue: '={{ $json.tipo }}',
                                rightValue: 'cliente',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                                id: '952b0690-53ec-4fb5-9712-7bb6366183dd',
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
                                id: '3cf069dc-5237-45a4-b2b7-368dd59c5b02',
                                leftValue: '={{ $json.tipo }}',
                                rightValue: 'ubica',
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
                                id: 'bfbfac31-2256-44b2-8935-72b753c74120',
                                leftValue: '={{ $json.tipo }}',
                                rightValue: 'tel',
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
                                id: 'existencia-dq-condition',
                                leftValue: '={{ $json.tipo }}',
                                rightValue: 'existencia_dq',
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
                                id: 'existencia-dp-condition',
                                leftValue: '={{ $json.tipo }}',
                                rightValue: 'existencia_dp',
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
        id: '2648dd5d-3a8b-4ae0-91fe-87b0aa09bb02',
        name: 'Parsear Direccion',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1856, 1232],
    })
    ParsearDireccion = {
        jsCode: `const partes = $json.valor.split(',').map(p => p.trim().toUpperCase());
return [{
  calle: partes[0] || '',
  noext: partes[1] || '',
  noint: partes[2] || '',
  colonia: partes[3] || '',
  municipio: partes[4] || '',
  estado: partes[5] || '',
  from: $json.from
}];
`,
    };

    @node({
        id: '04f54e93-08eb-41a9-8eb4-ae35ab820d76',
        name: 'Formatear Respuesta',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2336, 1216],
        alwaysOutputData: false,
    })
    FormatearRespuesta = {
        jsCode: `// 1. OBTENER TODOS LOS DATOS JUNTOS
// Al estar en "Run Once for All Items", $input.all() trae todo el arreglo de resultados
const resultados = $input.all();
let mensajeCompleto = "";

// 2. RECUPERAR EL CHAT ID Y SESIÓN (CONTEXTO)
// Necesitamos saber a quién responder. Buscamos en los nodos anteriores.
let chatId = "";
let session = "default";

try {
    // Intentamos tomar los datos del primer resultado de la búsqueda
    const itemOrigen = resultados[0];
    
    // A veces n8n pasa los datos del nodo padre en el mismo objeto
    if (itemOrigen.json.chatId) chatId = itemOrigen.json.chatId;
    if (itemOrigen.json.session) session = itemOrigen.json.session;
    
    // Si no están ahí, buscamos explícitamente en el nodo donde detectamos el tipo (Texto)
    if (!chatId) {
        const rootData = $('DetectarTipo').first().json;
        chatId = rootData.from;
        session = rootData.session;
    }
} catch (e) {
    // Si falla (quizás vino de imagen INE), buscamos en el nodo de INE
    try {
        const ineData = $('EXTRAE_INE').first().json;
        chatId = ineData.from;
        session = ineData.session;
    } catch (e2) {
        // Último recurso: Webhook
        try {
             const webhookData = $('Webhook WAHA').first().json.body.payload;
             chatId = webhookData.from;
             session = $('Webhook WAHA').first().json.body.session || "default";
        } catch(e3) {}
    }
}

// 3. VALIDACIÓN: ¿HAY RESULTADOS REALES?
if (!resultados || resultados.length === 0 || !resultados[0].json.folio) {
    return [{
        json: {
            mensaje: "❌ No se encontró información con esos datos.",
            chatId: chatId,
            session: session
        }
    }];
}

// 4. CONSTRUIR EL MENSAJE UNIFICADO
mensajeCompleto = "🔎 *Resultados encontrados:*\\n\\n";

for (const fila of resultados) {
    const d = fila.json;

    mensajeCompleto += \`📄 No. Contrato: \${d.no_contrato || 'N/A'}\\n\`;
    mensajeCompleto += \`📌 Folio: \${d.folio || 'N/A'}\\n\`;
    mensajeCompleto += \`👤 Cliente: \${d.nombre_cliente || 'N/A'}\\n\`;
    
    // (Dirección eliminada según tu solicitud anterior)

    mensajeCompleto += \`📊 Estatus: \${d.estatus || 'N/A'}\\n\`;
    mensajeCompleto += \`🏷 Tipo: \${d.tipo_de_cliente || '(Ninguna)'}\\n\`;
    mensajeCompleto += \`👤 Aval: \${d.ref2 || '(Ninguno)'}\\n\`;
    
    if (d.producto_1 || d.producto_2) {
        mensajeCompleto += "📦 *Productos:*\\n";
        if (d.producto_1) mensajeCompleto += \`   • \${d.producto_1}\\n\`;
        if (d.producto_2) mensajeCompleto += \`   • \${d.producto_2}\\n\`;
    }

    mensajeCompleto += "\\n--------------------------\\n";
}

// 5. RETORNO FINAL (UN SOLO OBJETO)
return [{
    json: {
        mensaje: mensajeCompleto.trim(),
        chatId: chatId,
        session: session
    }
}];`,
    };

    @node({
        id: '95abc90c-7f59-464d-9b85-25b5013d0c90',
        name: 'Por Cliente1',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [1856, 1072],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
        alwaysOutputData: true,
    })
    PorCliente1 = {
        operation: 'executeQuery',
        query: `SELECT
  folio,
  nombre_cliente,
  calle,
  colonia,
  municipio,
  estado,
  no_contrato,
  telefono,
  tipo_de_cliente,
  estatus,
  saldo_actual,
  ref2,
  producto_1,
  producto_2
FROM basescore
WHERE MATCH(nombre_cliente) AGAINST('"{{ $json.valor }}"' IN BOOLEAN MODE)
LIMIT 10`,
        options: {
            detailedOutput: false,
        },
    };

    @node({
        id: '3da64513-01d7-49a8-9b50-31a7e63b1644',
        name: 'UBICA',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [2064, 1232],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
        alwaysOutputData: true,
    })
    Ubica = {
        operation: 'executeQuery',
        query: `SELECT
  folio,
  nombre_cliente,
  calle,
  colonia,
  municipio,
  estado,
  no_contrato,
  telefono,
  tipo_de_cliente,
  estatus,
  saldo_actual,
  ref2,
  -- Creación del puntaje para ordenar por relevancia
  (
    (CASE WHEN calle LIKE CONCAT('%', '{{ $json.calle }}', '%') AND '{{ $json.calle }}' != '' THEN 3 ELSE 0 END) +
    (CASE WHEN colonia LIKE CONCAT('%', '{{ $json.colonia }}', '%') AND '{{ $json.colonia }}' != '' THEN 2 ELSE 0 END) +
    (CASE WHEN municipio LIKE CONCAT('%', '{{ $json.municipio }}', '%') AND '{{ $json.municipio }}' != '' THEN 1 ELSE 0 END)
  ) AS score
FROM basescore
WHERE
  -- La cláusula WHERE busca registros que coincidan con CUALQUIERA de los datos proporcionados
  ('{{ $json.calle }}' != '' AND calle LIKE CONCAT('%', '{{ $json.calle }}', '%'))
  OR ('{{ $json.colonia }}' != '' AND colonia LIKE CONCAT('%', '{{ $json.colonia }}', '%'))
  OR ('{{ $json.municipio }}' != '' AND municipio LIKE CONCAT('%', '{{ $json.municipio }}', '%'))
-- Ordenamos por el puntaje de mayor a menor para mostrar primero los mejores resultados
ORDER BY score DESC
LIMIT 7;`,
        options: {},
    };

    @node({
        id: '892474a6-2d7a-41c8-a5b0-3380557ece4c',
        name: 'TEL',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [1856, 1392],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
        alwaysOutputData: true,
    })
    Tel = {
        operation: 'executeQuery',
        query: `SELECT
  folio,
  nombre_cliente,
  calle,
  colonia,
  municipio,
  estado,
  no_contrato,
  telefono,
  tipo_de_cliente,
  estatus,
  saldo_actual,
  ref2
FROM basescore
WHERE
  REGEXP_REPLACE(telefono, '[^0-9]+', '') LIKE CONCAT('%', REGEXP_REPLACE('{{ $json.valor }}', '[^0-9]+', ''), '%') OR
  REGEXP_REPLACE(ref1, '[^0-9]+', '') LIKE CONCAT('%', REGEXP_REPLACE('{{ $json.valor }}', '[^0-9]+', ''), '%')
LIMIT 5`,
        options: {},
    };

    @node({
        id: 'afb66ef8-1216-4034-995d-a9d59829e0ef',
        name: 'IMAGEN',
        type: 'n8n-nodes-base.convertToFile',
        version: 1.1,
        position: [752, 1008],
    })
    Imagen = {
        operation: 'toBinary',
        sourceProperty: 'body.data.message.base64',
        binaryPropertyName: '=imagen',
        options: {
            mimeType: '={{ $json.body.data.message.imageMessage.mimetype }}',
        },
    };

    @node({
        id: '09c5641d-2cc7-458f-b8d8-da0b5b38bcd5',
        name: 'Analyze image',
        type: '@n8n/n8n-nodes-langchain.openAi',
        version: 1.8,
        position: [992, 1120],
        credentials: { openAiApi: { id: 'SC4pBB6DzDMltOnF', name: 'DASO_GPT' } },
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
        text: `=Tu única función es actuar como un API de extracción de datos de credenciales INE de México. Analiza la imagen y devuelve **exclusivamente un objeto JSON válido** con la información estructurada según las siguientes reglas. Si un dato no se puede leer, su valor debe ser \`null\`. No incluyas explicaciones ni texto adicional.

**REGLAS DE EXTRACCIÓN:**

1.  **Para el nombre:**
    * Identifica los campos de APELLIDO PATERNO, APELLIDO MATERNO y NOMBRE(S).
    * Reordénalos en el formato exacto: "NOMBRE(S) APELLIDO PATERNO APELLIDO MATERNO".
    * Coloca el resultado en el campo \`nombre_completo\` del JSON.

2.  **Para la dirección:**
    * Identifica el campo DOMICILIO.
    * Extrae la calle, número, colonia/localidad y municipio.
    * Formatea el resultado como "CALLE NÚMERO, COLONIA, MUNICIPIO", omitiendo el "C." de la calle si existe.
    * Coloca el resultado en el campo \`direccion_completa\` del JSON.

**EJEMPLO DE SALIDA ESPERADA:**
Si la imagen de un INE muestra:
-   NOMBRE: GONZALEZ, BADILLO, ANGELA MARIA
-   DOMICILIO: C PALO BLANCO 5, OJO DE AGUA, SAN JUAN DEL RIO

Tu respuesta debe ser únicamente este JSON:
{
  "nombre_completo": "ANGELA MARIA GONZALEZ BADILLO",
  "direccion_completa": "PALO BLANCO 5, OJO DE AGUA, SAN JUAN DEL RIO"
}`,
        inputType: 'base64',
        binaryPropertyName: 'imagen',
        options: {},
    };

    @node({
        id: '3f89aae8-2b99-4cae-94e2-c8252b4734fb',
        name: 'EXTRAE_INE',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1232, 1152],
    })
    ExtraeIne = {
        jsCode: `// Lee la respuesta JSON que generó la IA.
const iaResponse = $json.content;
let parsedJson = {};

try {
  // Extrae el JSON del texto de respuesta (esto lo hace más robusto).
  const jsonText = iaResponse.match(/{[\\s\\S]*}/)[0];
  parsedJson = JSON.parse(jsonText);
} catch (e) {
  // Si la IA no devuelve un JSON válido, termina con un error.
  return [{ json: { tipo: 'error', valor: 'Fallo al procesar respuesta de IA' } }];
}

// Prepara el array para los resultados.
const resultados = [];
const remitente = $('Webhook WAHA').first().json.body.data.key.remoteJid;

// Si se encontró un nombre, crea el comando "CLIENTE".
if (parsedJson.nombre_completo) {
  resultados.push({
    json: {
      tipo: 'cliente',
      valor: \`\${parsedJson.nombre_completo}\`,
      from: remitente
    }
  });
}

// Si se encontró una dirección, crea el comando "UBICA".
if (parsedJson.direccion_completa) {
  resultados.push({
    json: {
      tipo: 'ubica',
      valor: \`\${parsedJson.direccion_completa}\`,
      from: remitente
    }
  });
}

// Devuelve los comandos generados para que los siguientes nodos los usen.
return resultados;`,
    };

    @node({
        id: 'd9cfacb7-efd2-40c6-8a66-4c2e9ab11567',
        name: '¿Es Imagen o Texto?',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [464, 1024],
    })
    EsImagenOTexto = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: '45bdd2fc-ddd4-432a-a017-7db95fac9d57',
                    leftValue: '={{ $json.body.content_type }}',
                    rightValue: 'imageMessage',
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
        id: '159c0788-6154-46c3-bb9f-7a1324440ea3',
        webhookId: 'af8e4d08-2565-4a43-9a36-d37d35114da5',
        name: 'Webhook WAHA',
        type: 'n8n-nodes-base.webhook',
        version: 2,
        position: [160, 1024],
    })
    WebhookWaha = {
        httpMethod: 'POST',
        path: 'webhook-waha-consultas',
        options: {},
    };

    @node({
        id: 'c7a2f841-3b5e-4d90-ae12-f96d1047b3c0',
        name: 'Solo Grupo GMD8706',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [320, 1024],
    })
    SoloGrupoGmd8706 = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: 'f1a2b3c4-d5e6-7890-abcd-ef1234567890',
                    leftValue: '={{ $json.body.payload?.from || $json.body.data?.key?.remoteJid }}',
                    rightValue: '120363421891575391@g.us',
                    operator: {
                        type: 'string',
                        operation: 'equals',
                        name: 'filter.operator.equals',
                    },
                },
                {
                    id: 'fa47762b-dfb4-4cb6-9d38-bfc712463101',
                    leftValue: '={{ $json.body.payload?.from || $json.body.data?.key?.remoteJid }}',
                    rightValue: '183785962352805@lid',
                    operator: {
                        type: 'string',
                        operation: 'equals',
                        name: 'filter.operator.equals',
                    },
                },
            ],
            combinator: 'or',
        },
        options: {},
    };

    @node({
        id: '5ff9b08e-e3ea-4cfe-b6ed-80b8c882c222',
        name: 'Enviar_Alerta_Waha2',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [2528, 1216],
        retryOnFail: true,
        maxTries: 2,
    })
    EnviarAlertaWaha2 = {
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
                    value: 'key_PDzXooo4V0WG0veQTUe3OGVWR31JnwgP',
                },
            ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "session": "GMD8706",
  "chatId": "{{ $json.chatId }}",
  "text": {{ JSON.stringify($json.mensaje) }},
  "linkPreview": false
}`,
        options: {},
    };

    @node({
        id: 'dad44561-fce6-48be-ac22-b290e78f9feb',
        name: 'EXISTENCIA_CARTERA DQ',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [1472, 1600],
    })
    ExistenciaCarteraDq = {
        rule: {
            interval: [
                {
                    triggerAtHour: 8,
                    triggerAtMinute: 31,
                },
            ],
        },
    };

    @node({
        id: '7a5e2260-2e54-417a-81c0-27bd91792df5',
        name: 'EXISTENCIA_CARTERA DP',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [1472, 1800],
    })
    ExistenciaCarteraDp = {
        rule: {
            interval: [
                {
                    triggerAtHour: 8,
                    triggerAtMinute: 31,
                },
            ],
        },
    };

    @node({
        id: 'f8721c43-9821-4f9e-bc43-1e5234789012',
        name: 'Obtener Existencia DQ',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [1856, 1600],
    })
    ObtenerExistenciaDq = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `{
  "action": "existencia_cartera",
  "cartera": "DQ"
}`,
        options: {},
    };

    @node({
        id: 'a9834b52-1928-4c8d-ae21-2e6345890123',
        name: 'Obtener Existencia DP',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [1856, 1800],
    })
    ObtenerExistenciaDp = {
        method: 'POST',
        url: 'https://erp.mueblesdaso.com/api/webhooks/n8n',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `{
  "action": "existencia_cartera",
  "cartera": "DP"
}`,
        options: {},
    };

    @node({
        id: 'b1234c56-7890-4def-1234-56789abcdef0',
        name: 'Preparar Mensaje DQ',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2144, 1600],
    })
    PrepararMensajeDq = {
        jsCode: `const res = $input.item.json;
const mensaje = res.mensaje || "⚠️ No se pudo obtener el reporte de existencia DQ del ERP.";
let chatId = "5214422691952-1613513646@g.us"; // Auditores Cobranza DASO

try {
    const fromTrigger = $('DetectarTipo').first()?.json?.from;
    if (fromTrigger) chatId = fromTrigger;
} catch (e) {}

return [{
    json: {
        chatId: chatId,
        mensaje: mensaje
    }
}];`,
    };

    @node({
        id: 'c2345d67-8901-4ef0-2345-6789abcdef01',
        name: 'Preparar Mensaje DP',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2144, 1800],
    })
    PrepararMensajeDp = {
        jsCode: `const res = $input.item.json;
const mensaje = res.mensaje || "⚠️ No se pudo obtener el reporte de existencia DP del ERP.";
let chatId = "5214422691952-1613513646@g.us"; // Auditores Cobranza DASO

try {
    const fromTrigger = $('DetectarTipo').first()?.json?.from;
    if (fromTrigger) chatId = fromTrigger;
} catch (e) {}

return [{
    json: {
        chatId: chatId,
        mensaje: mensaje
    }
}];`,
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.Detectartipo.out(0).to(this.RuteoPorTipo.in(0));
        this.RuteoPorTipo.out(0).to(this.PorCliente1.in(0));
        this.RuteoPorTipo.out(1).to(this.ParsearDireccion.in(0));
        this.RuteoPorTipo.out(2).to(this.Tel.in(0));
        this.RuteoPorTipo.out(3).to(this.ObtenerExistenciaDq.in(0));
        this.RuteoPorTipo.out(4).to(this.ObtenerExistenciaDp.in(0));
        this.ExistenciaCarteraDq.out(0).to(this.ObtenerExistenciaDq.in(0));
        this.ExistenciaCarteraDp.out(0).to(this.ObtenerExistenciaDp.in(0));
        this.ObtenerExistenciaDq.out(0).to(this.PrepararMensajeDq.in(0));
        this.ObtenerExistenciaDp.out(0).to(this.PrepararMensajeDp.in(0));
        this.PrepararMensajeDq.out(0).to(this.EnviarAlertaWaha2.in(0));
        this.PrepararMensajeDp.out(0).to(this.EnviarAlertaWaha2.in(0));
        this.ParsearDireccion.out(0).to(this.Ubica.in(0));
        this.FormatearRespuesta.out(0).to(this.EnviarAlertaWaha2.in(0));
        this.PorCliente1.out(0).to(this.FormatearRespuesta.in(0));
        this.Ubica.out(0).to(this.FormatearRespuesta.in(0));
        this.Tel.out(0).to(this.FormatearRespuesta.in(0));
        this.WebhookWaha.out(0).to(this.SoloGrupoGmd8706.in(0));
        this.SoloGrupoGmd8706.out(0).to(this.Detectartipo.in(0));
    }
}
