import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : GMD0772
// Nodes   : 54  |  Connections: 45
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ComandosVsIa                       switch
// ExtraerDatosActivar                code
// SqlActivarCliente                  mySql                      [creds]
// ParsearJsonIa                      code
// ResponderCliente                   httpRequest
// EsImportante                       if
// EnviarAlertaWaha                   httpRequest
// NormalizarComando                  code
// FormatearAlerta                    code
// FiltrarRuido                       if
// TempCsvcatcliePhp                  httpRequest
// UpdatevdPhp                        httpRequest
// SqlCatclientes                     mySql                      [creds]
// Function_                          code
// Function1                          code
// SqlExistencia                      mySql                      [creds]
// EnviarAlertaWaha1                  httpRequest
// EnviarAlertaWaha2                  httpRequest
// WebhookWaha                        webhook
// EnviarAlertaWaha3                  httpRequest
// RedisChatMemory                    memoryRedisChat            [creds] [ai_memory]
// AiAgent                            agent                      [AI]
// OpenaiChatModel                    lmChatOpenAi               [creds] [ai_languageModel]
// Mysql                              mySql                      [creds]
// AgruparPorGestor                   code
// GenerarExcel                       spreadsheetFile
// EnviarEmail                        emailSend                  [creds]
// NopagoEmail                        scheduleTrigger            [disabled]
// VdARealizarDq                      scheduleTrigger            [disabled]
// ExistenciaCarteraDq                scheduleTrigger            [disabled]
// TempCsvcatcliePhp1                 httpRequest
// UpdatevdPhp1                       httpRequest
// SqlCatclientes1                    mySql                      [creds]
// Function2                          code
// EnviarAlertaWaha4                  httpRequest
// VdARealizarDp                      scheduleTrigger            [disabled]
// Function3                          code
// SqlExistencia1                     mySql                      [creds]
// EnviarAlertaWaha5                  httpRequest
// ExistenciaCarteraDp                scheduleTrigger            [disabled]
// Mysql1                             mySql                      [creds]
// AgruparPorGestor1                  code
// GenerarExcel1                      spreadsheetFile
// EnviarEmail1                       emailSend                  [creds]
// NopagoEmail1                       scheduleTrigger            [disabled]
// ExtraerDatosBorrar                 code
// SqlConsultarPagos                  mySql                      [creds]
// FormatearPagos                     code
// EnviarPagosWaha                    httpRequest
// SqlObtenerPago                     mySql                      [creds]
// SqlBorrarPago                      mySql                      [creds]
// SqlRestaurarSaldo                  mySql                      [creds]
// PrepararBorrado                    code
// ConfirmarBorradoWaha               httpRequest
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// WebhookWaha
//    → NormalizarComando
//      → ComandosVsIa
//        → ExtraerDatosActivar
//          → SqlActivarCliente
//            → EnviarAlertaWaha3
//       .out(2) → AiAgent
//          → ParsearJsonIa
//            → ResponderCliente
//              → EsImportante
//                → FormatearAlerta
//                  → FiltrarRuido
//                    → EnviarAlertaWaha
//       .out(3) → ExtraerDatosBorrar
//          → SqlConsultarPagos
//            → FormatearPagos
//              → EnviarPagosWaha
//       .out(4) → SqlObtenerPago
//          → SqlBorrarPago
//            → SqlRestaurarSaldo
//              → PrepararBorrado
//                → ConfirmarBorradoWaha
// NopagoEmail
//    → Mysql
//      → AgruparPorGestor
//        → GenerarExcel
//          → EnviarEmail
// VdARealizarDq
//    → TempCsvcatcliePhp
//      → UpdatevdPhp
//        → SqlCatclientes
//          → Function_
//            → EnviarAlertaWaha2
// ExistenciaCarteraDq
//    → SqlExistencia
//      → Function1
//        → EnviarAlertaWaha1
// VdARealizarDp
//    → TempCsvcatcliePhp1
//      → UpdatevdPhp1
//        → SqlCatclientes1
//          → Function2
//            → EnviarAlertaWaha4
// ExistenciaCarteraDp
//    → SqlExistencia1
//      → Function3
//        → EnviarAlertaWaha5
// NopagoEmail1
//    → Mysql1
//      → AgruparPorGestor1
//        → GenerarExcel1
//          → EnviarEmail1
//
// AI CONNECTIONS
// AiAgent.uses({ ai_languageModel: OpenaiChatModel, ai_memory: RedisChatMemory })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'r6eB-gYJD4VspSaAGJCY_',
    name: 'GMD0772',
    active: true,
    isArchived: false,
    projectId: 'a7Cqq8ZCzgtHPblJ',
    settings: {
        executionOrder: 'v1',
        availableInMCP: false,
        timeSavedMode: 'fixed',
        callerPolicy: 'workflowsFromSameOwner',
        binaryMode: 'separate',
    },
})
export class Gmd0772Workflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '01a91713-5efb-4371-b4c4-f5bb9ca87032',
        name: 'Comandos_vs_IA',
        type: 'n8n-nodes-base.switch',
        version: 3,
        position: [-576, 192],
    })
    ComandosVsIa = {
        rules: {
            values: [
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 1,
                        },
                        conditions: [
                            {
                                id: 'cmd-activar',
                                leftValue: '={{ $json.tipo }}',
                                rightValue: 'comando_activar',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
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
                            version: 1,
                        },
                        conditions: [
                            {
                                id: 'cmd-eliminar',
                                leftValue: '={{ $json.tipo }}',
                                rightValue: 'comando_eliminar',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
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
                            version: 1,
                        },
                        conditions: [
                            {
                                id: '2ce8ad3b-fa45-479d-8ea8-073dbdc669d7',
                                leftValue: '={{ $json.tipo }}',
                                rightValue: 'ia_autonoma',
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
                            version: 1,
                        },
                        conditions: [
                            {
                                id: 'cmd-borrar-pago',
                                leftValue: '={{ $json.tipo }}',
                                rightValue: 'comando_borrar_pago',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
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
                            version: 1,
                        },
                        conditions: [
                            {
                                id: 'cmd-elimina-pago',
                                leftValue: '={{ $json.tipo }}',
                                rightValue: 'comando_elimina_pago',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                },
            ],
        },
        options: {
            fallbackOutput: 'extra',
        },
    };

    @node({
        id: '532fa1eb-5b0e-4431-8a5f-51353175bd1e',
        name: 'Extraer_Datos_Activar',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [0, 0],
    })
    ExtraerDatosActivar = {
        jsCode: `// Obtenemos los datos limpios que nos pasó el nodo anterior
const data = $input.item.json;

// Validamos que venga el código
if (data.valor) {
  return [{
    json: {
      cod_cliente: data.valor,  // Asignamos "DQ2508119" a la variable que espera tu SQL
      chatId: data.chatId,      // Pasamos el ID para WAHA
      session: data.session     // Pasamos la sesión para WAHA
    }
  }];
} else {
  // Si por alguna razón llegó vacío, detenemos
  return [];
}`,
    };

    @node({
        id: '093e654e-586a-41ff-99ac-d952d3a29dc9',
        name: 'SQL_Activar_Cliente',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [224, 0],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
    })
    SqlActivarCliente = {
        operation: 'executeQuery',
        query: `UPDATE cat_clientes
SET pagar = 0
WHERE cod_cliente = '{{ $json.cod_cliente }}';`,
        options: {},
    };

    @node({
        id: '21454fe8-50e4-401a-ae86-89c65f8f5910',
        name: 'Parsear_JSON_IA',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [0, 544],
    })
    ParsearJsonIa = {
        jsCode: `// 1. Obtener la respuesta del Agente (viene en el campo 'output')
const rawOutput = $input.item.json.output;

let parsed;

// 2. Intentar convertir el TEXTO a JSON (Objeto real)
try {
  // Quitamos las comillas de código Markdown (\`\`\`json ... \`\`\`) por si la IA las puso
  const cleanJson = rawOutput.replace(/\`\`\`json|\`\`\`/g, '').trim();
  parsed = JSON.parse(cleanJson);
} catch (e) {
  // Si falla el JSON, no rompemos el flujo. Asumimos que todo el texto es la respuesta.
  parsed = {
    intencion: "GENERAL",
    respuesta: rawOutput, 
    resumen_interno: "La IA respondió en texto plano.",
    datos_extraidos: {}
  };
}

// 3. RECUPERAR EL CHAT ID PARA RESPONDER
// Importante: Buscamos el ID original en el nodo 'Normalizar_Comando' para saber a quién contestar.
const datosOriginales = $('Normalizar_Comando').first().json;

return [{
  json: {
    ...parsed, // Aquí van: intencion, respuesta, resumen_interno...
    chatId: datosOriginales.chatId,
    session: datosOriginales.session
  }
}];`,
    };

    @node({
        id: '6c8a4b64-3d41-44b4-a93e-09de82f9a651',
        name: 'Responder_Cliente',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [240, 544],
    })
    ResponderCliente = {
        method: 'POST',
        url: '=https://noweb.qhosting.net/api/sendText',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
                {
                    name: 'X-Api-Key',
                    value: '2a92eb04791843f5b4093f21a4306960',
                },
            ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "session": "{{ $json.session }}",
  "chatId": "{{ $json.chatId }}",
  "text": "{{ $json.respuesta }}",
  "linkPreview": false
}`,
        options: {},
    };

    @node({
        id: 'fe3cac48-179c-418c-8617-a740fc5fb9d8',
        name: 'Es_Importante?',
        type: 'n8n-nodes-base.if',
        version: 2.2,
        position: [448, 544],
    })
    EsImportante = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 2,
            },
            conditions: [
                {
                    id: 'es_problema',
                    leftValue: "=  {{ $('Parsear_JSON_IA').first().json.intencion }}",
                    rightValue: 'GARANTIA',
                    operator: {
                        type: 'string',
                        operation: 'equals',
                    },
                },
                {
                    id: 'es_venta',
                    leftValue: "={{ $('Parsear_JSON_IA').first().json.intencion }}",
                    rightValue: 'VENTA',
                    operator: {
                        type: 'string',
                        operation: 'equals',
                    },
                },
                {
                    id: 'es_cobranza',
                    leftValue: "={{ $('Parsear_JSON_IA').first().json.intencion }}",
                    rightValue: 'COBRANZA',
                    operator: {
                        type: 'string',
                        operation: 'equals',
                    },
                },
                {
                    id: 'f950fb07-122c-489c-9ffa-74f406505295',
                    leftValue: "={{ $('Parsear_JSON_IA').first().json.intencion }}",
                    rightValue: 'SOPORTE',
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
        id: 'fbcaa76a-155b-4dcd-a133-77aa6fb2860e',
        name: 'Enviar_Alerta_Waha',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [1168, 512],
    })
    EnviarAlertaWaha = {
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
                    value: 'key_RWIgl9LOofra2y6U23EFZPsK4ihmh5eQ',
                },
            ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "session": "Daso0772",
  "chatId": "{{ $json.telefono_destino }}",
  "text": {{ JSON.stringify($json.mensaje_alerta) }},
  "linkPreview": false
}`,
        options: {},
    };

    @node({
        id: '5e753ec8-3dcd-4dc3-af4f-7cfde4e5d661',
        name: 'Normalizar_Comando',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [-736, 448],
    })
    NormalizarComando = {
        jsCode: `// =============================================
// 1. CONFIGURACIÓN
// =============================================
const ID_GRUPO_STAFF = "5214429800772-1536679098@g.us"; 

// =============================================
// 2. OBTENER DATOS Y FILTRAR BUCLE 🛑
// =============================================
const body = $input.item.json.body || {};
const payload = body.payload || {};

// 🛑 ANTI-BUCLE: Si el mensaje lo envié yo (fromMe), DETENEMOS TODO.
// Esto evita que el bot se conteste a sí mismo.
if (payload.fromMe === true) {
    return [];
}

// 🛑 ANTI-ESTADO: Si no es un mensaje de texto real (ej. confirmación de lectura), ignorar.
// A veces WAHA manda eventos de 'status' que no tienen cuerpo.
if (!payload.body && !body.content) {
    return [];
}

let mensaje = payload.body || ""; 
// Fallback para versiones viejas de WAHA
if (!mensaje && body.content) mensaje = body.content;

const chatId = payload.from || "";
const session = body.session || "default";

// Normalizar texto
const msgUpper = mensaje.toUpperCase().trim();

// Variables de salida por defecto
let tipo = "desconocido";
let valor = "";
let monto = "";

// =============================================
// 3. LÓGICA DE RUTEO (GRUPO vs DIRECTO)
// =============================================

if (chatId === ID_GRUPO_STAFF) {
    // --- LÓGICA PARA EL GRUPO (Solo comandos) ---
    const regexBorrar   = /BORRAR\\s+(\\S+)\\s+(\\S+)/i;
    const regexElimina  = /ELIMINA\\s+(\\d+)/i;
    const regexActivar  = /ACTIVAR\\s+(.*)/i;
    const regexEliminar = /ELIMINAR\\s+(.*)/i;

    if (regexActivar.test(msgUpper)) {
        tipo = "comando_activar";
        valor = msgUpper.match(regexActivar)[1].trim();
    } 
    else if (regexEliminar.test(msgUpper)) {
        tipo = "comando_eliminar";
        valor = msgUpper.match(regexEliminar)[1].trim();
    }
    else if (regexBorrar.test(msgUpper)) {
        tipo = "comando_borrar_pago";
        const match = msgUpper.match(regexBorrar);
        valor = match[1].trim();
        monto = match[2].trim();
    }
    else if (regexElimina.test(msgUpper)) {
        const NUMERO_AUTORIZADO = "5214425060999";
        // WAHA usa LID como participant, el numero real esta en _data.key.participantAlt
        var altParticipant = (payload._data && payload._data.key && payload._data.key.participantAlt) || "";
        var numRemitente = altParticipant.split("@")[0];
        if (numRemitente !== NUMERO_AUTORIZADO) return [];
        tipo = "comando_elimina_pago";
        valor = msgUpper.match(regexElimina)[1].trim();
    }
    else {
        // Ignorar ruido en el grupo
        return []; 
    }

} else {
    // --- LÓGICA PARA CLIENTES (IA) ---
    // Si no es el grupo de staff, es un cliente.
    
    tipo = "ia_autonoma"; 
    valor = mensaje;      
}

// =============================================
// 4. RETORNO
// =============================================
return [{
    json: {
        tipo: tipo,
        valor: valor,
        monto: monto,
        chatId: chatId,   
        session: session,
        raw_msg: mensaje
    }
}];`,
    };

    @node({
        id: 'af0465ce-6b98-4ccc-a428-5cb332db1e0a',
        name: 'Formatear_Alerta',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [704, 528],
    })
    FormatearAlerta = {
        jsCode: `// =========================================================
// 1. DIRECTORIO DE DESTINOS (Personas y Grupos)
// =========================================================
const directorio = {
    // Grupo de Marketing:
    "VENTA":    "5214425060999", 

    // Personas individuales:
    "COBRANZA": "5214272756818",
    "SOPORTE":  "5214272756818",
    "GARANTIA": "5214272756818",
    "HUMANO":   "5214272756818",
    "GENERAL":  "5214272756818"
};

// =========================================================
// 2. OBTENER DATOS
// =========================================================
let ai = {};
try {
    ai = $('Parsear_JSON_IA').first().json;
} catch (e) {
    ai = $input.item.json;
}

const intencion = ai.intencion || "GENERAL";
const datosExtra = ai.datos_extraidos || {};

// =========================================================
// 3. LIMPIEZA DE DATOS DEL CLIENTE
// =========================================================
let clienteNombre = "Cliente";
let rawPhone = ""; 

try {
    const nodoCliente = $('Router_Canales').first() || $('Webhook_Chatwoot').first();
    if (nodoCliente && nodoCliente.json.body && nodoCliente.json.body.sender) {
        clienteNombre = nodoCliente.json.body.sender.name || "Sin nombre";
        rawPhone = nodoCliente.json.body.sender.phone_number || "";
    }
} catch (e) {}

// Limpieza visual del número
const soloNumeros = rawPhone.toString().replace(/\\D/g, ''); 
const cel10 = soloNumeros.slice(-10); 
const telefonoVisual = cel10.length === 10 ? cel10 : "No disponible";

// =========================================================
// 4. SELECCIONAR Y FORMATEAR DESTINO 🛡️
// =========================================================
let destinoCrudo = directorio[intencion] || directorio["GENERAL"];
let destinoFinal = destinoCrudo;

// Si NO tiene arroba (es solo número), le agregamos "@c.us"
if (!destinoFinal.includes('@')) {
    destinoFinal = destinoFinal + '@c.us';
}

// =========================================================
// 5. CONSTRUIR MENSAJE (SIN LINK)
// =========================================================
const emojis = { "VENTA": "💰", "COBRANZA": "📉", "SOPORTE": "🛠️", "GARANTIA": "⚠️", "HUMANO": "🆘", "GENERAL": "🔔" };
const icono = emojis[intencion] || "🔔";

let mensaje = \`\${icono} *ALERTA DASO: \${intencion}*\\n\`;
mensaje += \`━━━━━━━━━━━━\\n\`;
mensaje += \`👤 *Cliente:* \${clienteNombre}\\n\`;
mensaje += \`📱 *Tel:* \${telefonoVisual}\\n\`; // Solo el dato, sin link
mensaje += \`\\n📝 *Resumen:* \${ai.resumen_interno || ai.respuesta || "Sin resumen"}\\n\`;

if (intencion === 'VENTA') {
    mensaje += \`🛒 *Interés:* \${datosExtra.producto || "General"}\\n\`;
}
if (intencion === 'COBRANZA') {
    mensaje += \`💳 *Monto:* \${datosExtra.monto_mencionado || "Consulta"}\\n\`;
}
if (datosExtra.urgencia) {
    mensaje += \`🔥 *Urgencia:* \${datosExtra.urgencia.toUpperCase()}\\n\`;
}

// NOTA: Aquí borramos el bloque que generaba el "wa.me"

// =========================================================
// 6. SALIDA
// =========================================================
return [{
    json: {
        mensaje_alerta: mensaje,
        telefono_destino: destinoFinal,
        intencion_detectada: intencion
    }
}];`,
    };

    @node({
        id: '423037a5-49d1-4111-80c5-9e717df27cd8',
        name: 'Filtrar_Ruido',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [912, 528],
    })
    FiltrarRuido = {
        conditions: {
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 3,
            },
            conditions: [
                {
                    id: '570349b3-1b56-43d0-9dd5-cd0c7fdffc21',
                    leftValue: "={{ $('Parsear_JSON_IA').item.json.intencion }}",
                    rightValue: 'GENERAL',
                    operator: {
                        type: 'string',
                        operation: 'notEquals',
                    },
                },
            ],
            combinator: 'and',
        },
        options: {},
    };

    @node({
        id: 'f23a1b15-b3cc-4d93-9e4d-ef5ca1b8873c',
        name: '/temp/csvcatclie.php',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [2416, 512],
    })
    TempCsvcatcliePhp = {
        url: 'https://cob.mueblesdaso.com/temp/csvcatclie.php',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '954d445b-be37-4be0-bf7c-f4b0691dfb0e',
        name: '/updatevd.php',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [2608, 512],
    })
    UpdatevdPhp = {
        url: 'https://cob.mueblesdaso.com/updatevd.php',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '6e40628d-e86d-412f-a644-ac1f9b8e6870',
        name: 'SQL_CATCLIENTES',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [2832, 512],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
        alwaysOutputData: false,
    })
    SqlCatclientes = {
        operation: 'executeQuery',
        query: `SELECT
  codigo_gestor AS GESTOR,
  COUNT(cod_cliente) AS VD
FROM cat_clientes
WHERE
  vd = 0
  AND cod_cliente LIKE 'DQ%'
GROUP BY
  codigo_gestor;`,
        options: {},
    };

    @node({
        id: '72dec0a8-7600-4c11-a056-00fb37f404a4',
        name: 'Function',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [3024, 512],
        alwaysOutputData: false,
    })
    Function_ = {
        jsCode: `// ==========================================
// CONFIGURACIÓN
// ==========================================
// 📢 ID del Grupo "Auditores Cobranza DASO":
const GRUPO_DESTINO = "5214422691952-1613513646@g.us"; 

// Fecha y Hora en México
const fechaHora = new Date().toLocaleString("es-MX", { 
    timeZone: "America/Mexico_City",
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit'
});

// ==========================================
// GENERAR TABLA
// ==========================================
let total = 0;
let lines = [];

lines.push("📋**: DASO VD POR REALIZAR**");
lines.push(\`📅 Fecha: \${fechaHora}\`);
lines.push("\`\`\`");
lines.push("GESTOR  | VD");
lines.push("--------|----");

// Iteramos sobre los items que entran al nodo
for (const item of items) {
  // Validamos que existan los datos para no romper el código
  const gestorRaw = item.json.GESTOR || "N/A";
  const vdRaw = item.json.VD || 0;

  const gestor = gestorRaw.toString().padEnd(7, ' ').slice(0, 7); // Cortamos si es muy largo
  const vd = vdRaw.toString().padStart(2, ' ');
  
  total += parseFloat(vdRaw); // Sumamos
  lines.push(\`\${gestor} | \${vd}\`);
}

lines.push("--------|----");
lines.push(\`TOTAL   | \${total.toString().padStart(2, ' ')}\`);
lines.push("\`\`\`");

// ==========================================
// SALIDA
// ==========================================
// Retornamos un solo objeto con el mensaje final y el destino
return [{
  json: {
    mensaje: lines.join("\\n"),
    chatId: GRUPO_DESTINO
  }
}];`,
    };

    @node({
        id: 'd7757daf-5632-4b96-a939-b153c759f5e6',
        name: 'Function1',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2640, 912],
        alwaysOutputData: false,
    })
    Function1 = {
        jsCode: `// ==========================================
// CONFIGURACIÓN
// ==========================================
// 📢 ID del Grupo "Auditores Cobranza DASO":
const GRUPO_DESTINO = "5214422691952-1613513646@g.us"; 

// Fecha y Hora (Versión estándar JS para evitar errores)
const fechaHora = new Date().toLocaleString("es-MX", { 
    timeZone: "America/Mexico_City",
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit'
});

// ==========================================
// GENERAR TABLA
// ==========================================
let lines = [];
lines.push("📋 **EXISTENCIA DASO**");
lines.push(\`📅 Fecha: \${fechaHora}\`);
lines.push("\`\`\`");
lines.push("GESTOR  | SEM  | CAT | QUI | MEN | TOTAL");
lines.push("--------|------|-----|-----|-----|------");

let sum = { SEM: 0, CAT: 0, QUI: 0, MEN: 0, TOTAL: 0 };

for (const item of items) {
  // Validamos datos para evitar errores si vienen vacíos
  const gestor = (item.json.GESTOR || "N/A").toString().padEnd(7, ' ').slice(0, 7);
  const sem = parseInt(item.json.SEM || "0");
  const cat = parseInt(item.json.CAT || "0");
  const qui = parseInt(item.json.QUI || "0");
  const men = parseInt(item.json.MEN || "0");
  const total = parseInt(item.json.TOTAL || "0");

  // Formateamos la línea
  lines.push(\`\${gestor} | \${sem.toString().padStart(4)} | \${cat.toString().padStart(3)} | \${qui.toString().padStart(3)} | \${men.toString().padStart(3)} | \${total.toString().padStart(5)}\`);

  // Sumamos totales
  sum.SEM += sem;
  sum.CAT += cat;
  sum.QUI += qui;
  sum.MEN += men;
  sum.TOTAL += total;
}

lines.push("--------|------|-----|-----|-----|------");
lines.push(\`TOTAL   | \${sum.SEM.toString().padStart(4)} | \${sum.CAT.toString().padStart(3)} | \${sum.QUI.toString().padStart(3)} | \${sum.MEN.toString().padStart(3)} | \${sum.TOTAL.toString().padStart(5)}\`);
lines.push("\`\`\`");

// ==========================================
// SALIDA
// ==========================================
return [{
  json: {
    mensaje: lines.join("\\n"),
    chatId: GRUPO_DESTINO
  }
}];`,
    };

    @node({
        id: 'ef89254b-0d12-470d-b6ad-2085ac359879',
        name: 'SQL_EXISTENCIA',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [2432, 912],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
        alwaysOutputData: false,
    })
    SqlExistencia = {
        operation: 'executeQuery',
        query: `SELECT
  codigo_gestor AS GESTOR,
  SUM(CASE WHEN periodicidad_cliente = 'SEMANAL' THEN 1 ELSE 0 END) AS SEM,
  SUM(CASE WHEN periodicidad_cliente = 'CATORCENAL' THEN 1 ELSE 0 END) AS CAT,
  SUM(CASE WHEN periodicidad_cliente = 'QUINCENAL' THEN 1 ELSE 0 END) AS QUI,
  SUM(CASE WHEN periodicidad_cliente = 'MENSUAL' THEN 1 ELSE 0 END) AS MEN,
  SUM(CASE WHEN periodicidad_cliente IN ('SEMANAL', 'CATORCENAL', 'QUINCENAL', 'MENSUAL') THEN 1 ELSE 0 END) AS TOTAL
FROM cat_clientes
WHERE
  status_cliente = 'COBRANZA NORMAL'
  AND cod_cliente LIKE 'DQ%'
GROUP BY
  codigo_gestor;`,
        options: {},
    };

    @node({
        id: 'b54517fd-a251-4a2f-ab0c-76572ac04b37',
        name: 'Enviar_Alerta_Waha1',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [2816, 912],
    })
    EnviarAlertaWaha1 = {
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
        id: '909c955d-8488-4a40-82e6-25c638c645d5',
        name: 'Enviar_Alerta_Waha2',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [3248, 512],
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
        id: '5173203b-714b-4a9d-aa21-aceff8b58736',
        webhookId: 'af8e4d08-2565-4a43-9a36-d37d35114da5',
        name: 'Webhook WAHA',
        type: 'n8n-nodes-base.webhook',
        version: 2,
        position: [-1056, 448],
    })
    WebhookWaha = {
        httpMethod: 'POST',
        path: 'webhook-waha-gmd',
        options: {},
    };

    @node({
        id: '59974230-15a0-4b3e-8693-57188236caa2',
        name: 'Enviar_Alerta_Waha3',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [448, 0],
    })
    EnviarAlertaWaha3 = {
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
                    value: 'key_hAHxny44J2kUheaf9ylQ1kLdhDeyBsqt',
                },
            ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "session": "{{ $('Extraer_Datos_Activar').first().json.session || 'GMD0772' }}",
  "chatId": "{{ $('Extraer_Datos_Activar').first().json.chatId }}",
  "text": "✅ La cuenta *{{ $('Extraer_Datos_Activar').first().json.cod_cliente }}* ha sido activada correctamente.",
  "linkPreview": false
}`,
        options: {},
    };

    @node({
        id: '82c32638-0312-4970-8f24-5b7d9de271ea',
        name: 'Redis Chat Memory',
        type: '@n8n/n8n-nodes-langchain.memoryRedisChat',
        version: 1.5,
        position: [-272, 736],
        credentials: { redis: { id: '6JPSoBUbrx99SWpj', name: 'Redis account' } },
    })
    RedisChatMemory = {
        sessionIdType: 'customKey',
        sessionKey: '={{ $json.chatId }}',
        sessionTTL: 86400,
        contextWindowLength: 10,
    };

    @node({
        id: '26b731a0-5fc2-4116-bef7-793594ca42c8',
        name: 'AI Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [-368, 544],
    })
    AiAgent = {
        promptType: 'define',
        text: '={{ $json.valor }}',
        options: {
            systemMessage: `Eres "Sofía", la Asistente Virtual experta de **Colchones DASO / Muebles DASO**.

🏢 **LO QUE VENDEMOS (INFORMACIÓN REAL):**
1. **Colchones:** En todas las medidas (Individual, Matrimonial, Queen Size, King Size).
2. **Bases y Box:** Para todas las medidas.
3. **Artículos para el hogar:** Complementos varios.
4. 💰 **CRÉDITO:** Ofrecemos crédito/financiamiento para adquirir cualquiera de nuestros productos.

TU OBJETIVO:
1. Analizar el HISTORIAL para entender el contexto.
2. Si es una duda vaga, conversa para entender qué quieren.
3. SI DETECTAS UNA INTENCIÓN CLARA (Venta, Cobranza, Reporte): Tu trabajo termina. Despídete indicando que un humano los contactará.

---
### 📜 HISTORIAL (Contexto):
"""
{{ $('Formatear_Historial').first().json.historial_conversacion }}
"""
---

### 🚨 REGLAS DE CLASIFICACIÓN (INTENCIONES):

1. "GENERAL":
   - CUÁNDO USAR: Saludos, "Info", "Precio" (sin decir de qué), o dudas vagas.
   - TU RESPUESTA: Preguntar amablemente ¿Qué medida o producto buscas? (Sigue conversando).
   - REGLA ANTI-SPAM: Si el cliente sigue preguntando detalles de un producto que YA se está atendiendo en el historial, mantenlo como GENERAL.

2. "VENTA", "COBRANZA", "GARANTIA", "SOPORTE", "HUMANO":
   - CUÁNDO USAR: En el momento EXACTO en que el cliente define qué quiere (ej: "Quiero el matrimonial", "Busco crédito", "Quiero pagar", "Tengo una queja").
   - TU RESPUESTA: **DEBE SER FINAL.** No hagas más preguntas. Di: "¡Entendido! 📝 He pasado tu solicitud a un asesor. Te contactarán en breve por aquí."

---
### 🛡️ FORMATO JSON (OBLIGATORIO):
Responde SIEMPRE con este JSON exacto:

{
  "intencion": "VENTA" | "COBRANZA" | "SOPORTE" | "GARANTIA" | "GENERAL" | "HUMANO",
  "respuesta": "Texto para el cliente",
  "resumen_interno": "Resumen técnico corto.",
  "datos_extraidos": {
      "producto": "Nombre del producto o null",
      "presupuesto": "Monto o null",
      "urgencia": "ALTA" | "MEDIA" | "BAJA"
  }
}

---
### 💡 EJEMPLOS DE COMPORTAMIENTO:

Caso 1 (Venta Clara - CIERRE INMEDIATO):
Usuario: "Hola, me interesa el colchón matrimonial a crédito"
JSON: {
  "intencion": "VENTA",
  "respuesta": "¡Perfecto! 🛏️ Hemos recibido tu solicitud de crédito para el colchón Matrimonial. Un asesor revisará tus datos y te escribirá en unos momentos. ⏳",
  "resumen_interno": "Interés definido: Colchón Matrimonial con Crédito.",
  "datos_extraidos": { "producto": "Colchón Matrimonial", "urgencia": "ALTA" }
}

Caso 2 (Cobranza - CIERRE INMEDIATO):
Usuario: "Quiero saber cuánto debo"
JSON: {
  "intencion": "COBRANZA",
  "respuesta": "Gracias por escribirnos. 📉 He notificado al departamento de cobranza. En breve te enviarán tu estado de cuenta por este medio.",
  "resumen_interno": "Solicita saldo deudor.",
  "datos_extraidos": { "producto": null, "urgencia": "MEDIA" }
}

Caso 3 (Indefinido - CONVERSAR):
Usuario: "Me das información?"
JSON: {
  "intencion": "GENERAL",
  "respuesta": "¡Hola! 👋 Con gusto. ¿Te interesa un colchón, una base o saber sobre nuestro crédito?",
  "resumen_interno": "Pide info general. Indagando necesidad.",
  "datos_extraidos": { "producto": null, "urgencia": "BAJA" }
}`,
        },
    };

    @node({
        id: '6971895e-23d5-4657-be99-f13325e3759e',
        name: 'OpenAI Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [-400, 736],
        credentials: { openAiApi: { id: 'SC4pBB6DzDMltOnF', name: 'DASO_GPT' } },
    })
    OpenaiChatModel = {
        model: {
            __rl: true,
            value: 'gpt-4.1-mini',
            mode: 'list',
            cachedResultName: 'gpt-4.1-mini',
        },
        builtInTools: {
            codeInterpreter: false,
        },
        options: {},
    };

    @node({
        id: 'cb468432-bde3-4358-96c6-534ac5b9b822',
        name: 'MySQL',
        type: 'n8n-nodes-base.mySql',
        version: 1,
        position: [464, 1232],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
    })
    Mysql = {
        operation: 'executeQuery',
        query: `SELECT 
    id_cliente, 
    contrato_cliente, 
    cod_cliente, 
    nombre_ccliente, 
    codigo_gestor, 
    calle_dom, 
    municipio_dom, 
    estado_dom, 
    tel1_cliente, 
    saldo_actualcli, 
    periodicidad_cliente, 
    dia_cobro, 
    pagos_cliente, 
    semv, 
    semdv 
FROM cat_clientes 
WHERE pagar = '0' 
  AND cod_cliente LIKE 'DQ%' 
ORDER BY codigo_gestor ASC;`,
        options: {},
    };

    @node({
        id: '3ce3fe07-403c-4283-a30e-b158065ee9d5',
        name: 'Agrupar por Gestor',
        type: 'n8n-nodes-base.code',
        version: 1,
        position: [704, 1232],
    })
    AgruparPorGestor = {
        language: 'javascript',
        jsCode: `// 1. Define el orden de los días de la semana como tú lo necesitas.
const diasOrdenados = ['SABADO', 'DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

// 2. Obtiene la fecha actual y la ajusta a la zona horaria correcta (importante para servidores).
// Cambia 'America/Mexico_City' a tu zona horaria si es diferente.
const hoy = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
const nombreDiaHoy = new Date().toLocaleString('es-ES', { weekday: 'long', timeZone: "America/Mexico_City" }).toUpperCase();


// 3. Encuentra el límite del filtro (el índice del día de hoy).
const indiceHoy = diasOrdenados.indexOf(nombreDiaHoy);

// Si por alguna razón el día no se encuentra, devuelve una lista vacía para evitar errores.
if (indiceHoy === -1) {
  return [];
}

// 4. Crea la lista de los días que se deben incluir en el filtro.
// Esto corta el arreglo desde el inicio (SABADO) hasta el día de hoy.
const diasPermitidos = diasOrdenados.slice(0, indiceHoy + 1);

// 5. Filtra los datos de entrada.
const itemsFiltrados = $input.all().filter(item => {
  // Normaliza el campo 'dia_cobro' a mayúsculas para una comparación segura.
  const diaCobro = item.json.dia_cobro ? item.json.dia_cobro.toUpperCase() : '';
  
  // Devuelve 'true' solo si el 'dia_cobro' está en la lista de días permitidos.
  return diasPermitidos.includes(diaCobro);
});

// 6. Retorna la nueva lista ya filtrada.
return itemsFiltrados;`,
    };

    @node({
        id: '9f005a7c-509f-4c30-866b-246630dc1540',
        name: 'Generar Excel',
        type: 'n8n-nodes-base.spreadsheetFile',
        version: 1,
        position: [912, 1232],
    })
    GenerarExcel = {
        operation: 'toFile',
        options: {},
    };

    @node({
        id: '57fc5a86-ad38-4694-949e-7ddb843a7fb4',
        name: 'Enviar Email',
        type: 'n8n-nodes-base.emailSend',
        version: 1,
        position: [1120, 1232],
        credentials: { smtp: { id: 'B21aCgAWCZASHP4M', name: 'servicios@mueblesdaso.com' } },
    })
    EnviarEmail = {
        fromEmail: 'servicios@mueblesdaso.com',
        toEmail: 'jefecobranza@mueblesdaso.com,cqcc05@mueblesdaso.com',
        ccEmail: 'arovira@mueblesdaso.com, ezapote@mueblesdaso.com',
        subject: "=DQ Reporte de Clientes Sin Pagar ({{ new Date().toLocaleDateString('es-MX') }})",
        attachments: 'data',
        options: {},
    };

    @node({
        id: 'b8ea1dd9-d3c1-46a7-8e28-415a92bba1e9',
        name: 'NOPAGO_EMAIL',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [256, 1232],
        disabled: true,
    })
    NopagoEmail = {
        rule: {
            interval: [
                {
                    field: 'weeks',
                    triggerAtDay: [5],
                    triggerAtHour: 5,
                },
            ],
        },
    };

    @node({
        id: 'a36b3577-2528-468f-8884-0ca877995766',
        name: 'VD A REALIZAR DQ',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [2240, 512],
        disabled: true,
    })
    VdARealizarDq = {
        rule: {
            interval: [
                {
                    triggerAtHour: 8,
                    triggerAtMinute: 30,
                },
            ],
        },
    };

    @node({
        id: 'dad44561-fce6-48be-ac22-b290e78f9feb',
        name: 'EXISTENCIA_CARTERA DQ',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [2192, 912],
        disabled: true,
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
        id: '83f7c413-f5f4-4fe8-b0f6-11c5dc20658e',
        name: '/temp/csvcatclie.php1',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [2432, 688],
    })
    TempCsvcatcliePhp1 = {
        url: 'https://cob.mueblesdaso.com/temp/csvcatclie.php',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '811271e4-4400-44fb-84f5-f9beff646908',
        name: '/updatevd.php1',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [2624, 688],
    })
    UpdatevdPhp1 = {
        url: 'https://cob.mueblesdaso.com/updatevd.php',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Content-Type',
                    value: 'application/json',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '3506511b-bdca-48ea-89e7-02e5efaaf549',
        name: 'SQL_CATCLIENTES1',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [2848, 688],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
        alwaysOutputData: false,
    })
    SqlCatclientes1 = {
        operation: 'executeQuery',
        query: `SELECT
  codigo_gestor AS GESTOR,
  COUNT(cod_cliente) AS VD
FROM cat_clientes
WHERE
  vd = 0
  AND cod_cliente LIKE 'DP%'
GROUP BY
  codigo_gestor;`,
        options: {},
    };

    @node({
        id: 'f94bad87-ddb1-4c04-afa4-201c1497cddb',
        name: 'Function2',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [3040, 688],
        alwaysOutputData: false,
    })
    Function2 = {
        jsCode: `// ==========================================
// CONFIGURACIÓN
// ==========================================
// 📢 ID del Grupo "Auditores Cobranza DASO":
const GRUPO_DESTINO = "5214422691952-1613513646@g.us"; 

// Fecha y Hora en México
const fechaHora = new Date().toLocaleString("es-MX", { 
    timeZone: "America/Mexico_City",
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit'
});

// ==========================================
// GENERAR TABLA
// ==========================================
let total = 0;
let lines = [];

lines.push("📋 **REPORTE: DASOPLUS POR REALIZAR**");
lines.push(\`📅 Fecha: \${fechaHora}\`);
lines.push("\`\`\`");
lines.push("GESTOR  | VD");
lines.push("--------|----");

// Iteramos sobre los items que entran al nodo
for (const item of items) {
  // Validamos que existan los datos para no romper el código
  const gestorRaw = item.json.GESTOR || "N/A";
  const vdRaw = item.json.VD || 0;

  const gestor = gestorRaw.toString().padEnd(7, ' ').slice(0, 7); // Cortamos si es muy largo
  const vd = vdRaw.toString().padStart(2, ' ');
  
  total += parseFloat(vdRaw); // Sumamos
  lines.push(\`\${gestor} | \${vd}\`);
}

lines.push("--------|----");
lines.push(\`TOTAL   | \${total.toString().padStart(2, ' ')}\`);
lines.push("\`\`\`");

// ==========================================
// SALIDA
// ==========================================
// Retornamos un solo objeto con el mensaje final y el destino
return [{
  json: {
    mensaje: lines.join("\\n"),
    chatId: GRUPO_DESTINO
  }
}];`,
    };

    @node({
        id: 'dcd2bea0-0afe-486b-a02f-ba4c60299832',
        name: 'Enviar_Alerta_Waha4',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [3264, 688],
    })
    EnviarAlertaWaha4 = {
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
        id: 'e24c52a0-154a-4d8a-b6d4-0b11ed779e62',
        name: 'VD A REALIZAR DP',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [2256, 688],
        disabled: true,
    })
    VdARealizarDp = {
        rule: {
            interval: [
                {
                    triggerAtHour: 8,
                    triggerAtMinute: 32,
                },
            ],
        },
    };

    @node({
        id: '1be47734-d9bf-4e61-a222-a96cfdb6638f',
        name: 'Function3',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2624, 1120],
        alwaysOutputData: false,
    })
    Function3 = {
        jsCode: `// ==========================================
// CONFIGURACIÓN
// ==========================================
// 📢 ID del Grupo "Auditores Cobranza DASO":
const GRUPO_DESTINO = "5214422691952-1613513646@g.us"; 

// Fecha y Hora (Versión estándar JS para evitar errores)
const fechaHora = new Date().toLocaleString("es-MX", { 
    timeZone: "America/Mexico_City",
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit'
});

// ==========================================
// GENERAR TABLA
// ==========================================
let lines = [];
lines.push("📋 **DASO PLUS CARTERA**");
lines.push(\`📅 Fecha: \${fechaHora}\`);
lines.push("\`\`\`");
lines.push("GESTOR  | SEM  | CAT | QUI | MEN | TOTAL");
lines.push("--------|------|-----|-----|-----|------");

let sum = { SEM: 0, CAT: 0, QUI: 0, MEN: 0, TOTAL: 0 };

for (const item of items) {
  // Validamos datos para evitar errores si vienen vacíos
  const gestor = (item.json.GESTOR || "N/A").toString().padEnd(7, ' ').slice(0, 7);
  const sem = parseInt(item.json.SEM || "0");
  const cat = parseInt(item.json.CAT || "0");
  const qui = parseInt(item.json.QUI || "0");
  const men = parseInt(item.json.MEN || "0");
  const total = parseInt(item.json.TOTAL || "0");

  // Formateamos la línea
  lines.push(\`\${gestor} | \${sem.toString().padStart(4)} | \${cat.toString().padStart(3)} | \${qui.toString().padStart(3)} | \${men.toString().padStart(3)} | \${total.toString().padStart(5)}\`);

  // Sumamos totales
  sum.SEM += sem;
  sum.CAT += cat;
  sum.QUI += qui;
  sum.MEN += men;
  sum.TOTAL += total;
}

lines.push("--------|------|-----|-----|-----|------");
lines.push(\`TOTAL   | \${sum.SEM.toString().padStart(4)} | \${sum.CAT.toString().padStart(3)} | \${sum.QUI.toString().padStart(3)} | \${sum.MEN.toString().padStart(3)} | \${sum.TOTAL.toString().padStart(5)}\`);
lines.push("\`\`\`");

// ==========================================
// SALIDA
// ==========================================
return [{
  json: {
    mensaje: lines.join("\\n"),
    chatId: GRUPO_DESTINO
  }
}];`,
    };

    @node({
        id: '3f04a310-173b-4ac6-a372-52c138990737',
        name: 'SQL_EXISTENCIA1',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [2416, 1120],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
        alwaysOutputData: false,
    })
    SqlExistencia1 = {
        operation: 'executeQuery',
        query: `SELECT
  codigo_gestor AS GESTOR,
  SUM(CASE WHEN periodicidad_cliente = 'SEMANAL' THEN 1 ELSE 0 END) AS SEM,
  SUM(CASE WHEN periodicidad_cliente = 'CATORCENAL' THEN 1 ELSE 0 END) AS CAT,
  SUM(CASE WHEN periodicidad_cliente = 'QUINCENAL' THEN 1 ELSE 0 END) AS QUI,
  SUM(CASE WHEN periodicidad_cliente = 'MENSUAL' THEN 1 ELSE 0 END) AS MEN,
  SUM(CASE WHEN periodicidad_cliente IN ('SEMANAL', 'CATORCENAL', 'QUINCENAL', 'MENSUAL') THEN 1 ELSE 0 END) AS TOTAL
FROM cat_clientes
WHERE
  status_cliente = 'COBRANZA NORMAL'
  AND cod_cliente LIKE 'DP%'
GROUP BY
  codigo_gestor;`,
        options: {},
    };

    @node({
        id: '26f629fd-f589-46ca-b777-0143b989fe25',
        name: 'Enviar_Alerta_Waha5',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [2800, 1120],
    })
    EnviarAlertaWaha5 = {
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
        id: '7a5e2260-2e54-417a-81c0-27bd91792df5',
        name: 'EXISTENCIA_CARTERA DP',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [2176, 1120],
        disabled: true,
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
        id: '9e36d540-b4fd-4cda-80a9-ad4e9e924bd3',
        name: 'MySQL1',
        type: 'n8n-nodes-base.mySql',
        version: 1,
        position: [448, 1456],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
    })
    Mysql1 = {
        operation: 'executeQuery',
        query: `SELECT 
    id_cliente, 
    contrato_cliente, 
    cod_cliente, 
    nombre_ccliente, 
    codigo_gestor, 
    calle_dom, 
    municipio_dom, 
    estado_dom, 
    tel1_cliente, 
    saldo_actualcli, 
    periodicidad_cliente, 
    dia_cobro, 
    pagos_cliente, 
    semv, 
    semdv 
FROM cat_clientes 
WHERE pagar = '0' 
  AND cod_cliente LIKE 'DP%' 
ORDER BY codigo_gestor ASC;`,
        options: {},
    };

    @node({
        id: '15b320b0-8acd-482d-951d-c59bfd428ab3',
        name: 'Agrupar por Gestor1',
        type: 'n8n-nodes-base.code',
        version: 1,
        position: [688, 1456],
    })
    AgruparPorGestor1 = {
        language: 'javascript',
        jsCode: `// 1. Define el orden de los días de la semana como tú lo necesitas.
const diasOrdenados = ['SABADO', 'DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

// 2. Obtiene la fecha actual y la ajusta a la zona horaria correcta (importante para servidores).
// Cambia 'America/Mexico_City' a tu zona horaria si es diferente.
const hoy = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
const nombreDiaHoy = new Date().toLocaleString('es-ES', { weekday: 'long', timeZone: "America/Mexico_City" }).toUpperCase();


// 3. Encuentra el límite del filtro (el índice del día de hoy).
const indiceHoy = diasOrdenados.indexOf(nombreDiaHoy);

// Si por alguna razón el día no se encuentra, devuelve una lista vacía para evitar errores.
if (indiceHoy === -1) {
  return [];
}

// 4. Crea la lista de los días que se deben incluir en el filtro.
// Esto corta el arreglo desde el inicio (SABADO) hasta el día de hoy.
const diasPermitidos = diasOrdenados.slice(0, indiceHoy + 1);

// 5. Filtra los datos de entrada.
const itemsFiltrados = $input.all().filter(item => {
  // Normaliza el campo 'dia_cobro' a mayúsculas para una comparación segura.
  const diaCobro = item.json.dia_cobro ? item.json.dia_cobro.toUpperCase() : '';
  
  // Devuelve 'true' solo si el 'dia_cobro' está en la lista de días permitidos.
  return diasPermitidos.includes(diaCobro);
});

// 6. Retorna la nueva lista ya filtrada.
return itemsFiltrados;`,
    };

    @node({
        id: '73ffdef3-caa0-4d4b-9ec0-f7de5119acc2',
        name: 'Generar Excel1',
        type: 'n8n-nodes-base.spreadsheetFile',
        version: 1,
        position: [896, 1456],
    })
    GenerarExcel1 = {
        operation: 'toFile',
        options: {},
    };

    @node({
        id: 'b5c21667-7f07-45a1-aedc-26f89a798a8d',
        name: 'Enviar Email1',
        type: 'n8n-nodes-base.emailSend',
        version: 1,
        position: [1104, 1456],
        credentials: { smtp: { id: 'B21aCgAWCZASHP4M', name: 'servicios@mueblesdaso.com' } },
    })
    EnviarEmail1 = {
        fromEmail: 'servicios@mueblesdaso.com',
        toEmail: 'jefecobranza@mueblesdaso.com,cqcc05@mueblesdaso.com',
        ccEmail: 'arovira@mueblesdaso.com, ezapote@mueblesdaso.com',
        subject: "=DP Reporte de Clientes Sin Pagar ({{ new Date().toLocaleDateString('es-MX') }})",
        attachments: 'data',
        options: {},
    };

    @node({
        id: '3262f1cb-046d-409e-a1b2-1a834ebc486b',
        name: 'NOPAGO_EMAIL1',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [240, 1456],
        disabled: true,
    })
    NopagoEmail1 = {
        rule: {
            interval: [
                {
                    field: 'weeks',
                    triggerAtDay: [5],
                    triggerAtHour: 5,
                },
            ],
        },
    };

    @node({
        id: 'f3a21b45-8c67-4d91-b2e4-1a9c3d5e7f01',
        name: 'Extraer_Datos_Borrar',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [0, -304],
    })
    ExtraerDatosBorrar = {
        jsCode: `var cod_cliente = $json.valor;
var monto = parseFloat($json.monto) || 0;

// Calcular rango sábado a viernes (semana de cobranza)
var mxDate = new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"});
var now = new Date(mxDate);
var diaSemana = now.getDay();

// Retroceder al sábado anterior (o hoy si es sábado)
var diasAlSabado = (diaSemana + 1) % 7;
var sabado = new Date(now);
sabado.setDate(now.getDate() - diasAlSabado);

// Viernes = sábado + 6 días
var viernes = new Date(sabado);
viernes.setDate(sabado.getDate() + 6);

function pad(n) { return n < 10 ? '0' + n : '' + n; }
var fechaInicio = sabado.getFullYear() + '-' + pad(sabado.getMonth() + 1) + '-' + pad(sabado.getDate());
var fechaFin = viernes.getFullYear() + '-' + pad(viernes.getMonth() + 1) + '-' + pad(viernes.getDate());

return [{
    json: {
        cod_cliente: cod_cliente,
        monto: monto,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        chatId: $json.chatId,
        session: $json.session
    }
}];`,
    };

    @node({
        id: 'f3a21b45-8c67-4d91-b2e4-1a9c3d5e7f02',
        name: 'SQL_Consultar_Pagos',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [224, -304],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
    })
    SqlConsultarPagos = {
        operation: 'executeQuery',
        query: `SELECT idpag, fechap, montop, tipocap, codigo_gestor, nombre_ccliente
FROM pagos
WHERE cod_cliente = '{{ $json.cod_cliente }}'
  AND montop = {{ $json.monto }}
  AND fechap BETWEEN '{{ $json.fecha_inicio }}' AND '{{ $json.fecha_fin }}'
ORDER BY fechap DESC`,
        options: {},
    };

    @node({
        id: 'f3a21b45-8c67-4d91-b2e4-1a9c3d5e7f03',
        name: 'Formatear_Pagos',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [448, -304],
    })
    FormatearPagos = {
        jsCode: `var items = $input.all();
var codCliente = $('Extraer_Datos_Borrar').first().json.cod_cliente;
var montoBuscado = $('Extraer_Datos_Borrar').first().json.monto;
var chatId = $('Extraer_Datos_Borrar').first().json.chatId;
var session = $('Extraer_Datos_Borrar').first().json.session;

if (!items || items.length === 0 || !items[0].json.idpag) {
    return [{
        json: {
            mensaje: "⚠️ No se encontraron pagos para *" + codCliente + "* con monto *$" + montoBuscado + "* en esta semana.",
            chatId: chatId,
            session: session
        }
    }];
}

var msg = "🔍 *PAGOS ENCONTRADOS: " + codCliente + "*\\n";
msg += "💰 Monto buscado: $" + montoBuscado + "\\n";
msg += "━━━━━━━━━━━━\\n";

for (var i = 0; i < items.length; i++) {
    var p = items[i].json;
    msg += "📌 ID: *" + p.idpag + "* | " + p.fechap + " | $" + p.montop + " | " + (p.tipocap || "N/A") + " | " + (p.codigo_gestor || "") + "\\n";
}

msg += "━━━━━━━━━━━━\\n";
msg += "Para eliminar responde:\\n*ELIMINA {idpag}*";

return [{
    json: {
        mensaje: msg,
        chatId: chatId,
        session: session
    }
}];`,
    };

    @node({
        id: 'f3a21b45-8c67-4d91-b2e4-1a9c3d5e7f04',
        name: 'Enviar_Pagos_Waha',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [672, -304],
    })
    EnviarPagosWaha = {
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
                    value: 'key_hAHxny44J2kUheaf9ylQ1kLdhDeyBsqt',
                },
            ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "session": "GMD0772",
  "chatId": "{{ $json.chatId }}",
  "text": {{ JSON.stringify($json.mensaje) }},
  "linkPreview": false
}`,
        options: {},
    };

    @node({
        id: 'f3a21b45-8c67-4d91-b2e4-1a9c3d5e7f05',
        name: 'SQL_Obtener_Pago',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [0, -608],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
    })
    SqlObtenerPago = {
        operation: 'executeQuery',
        query: `SELECT idpag, cod_cliente, montop, nombre_ccliente
FROM pagos
WHERE idpag = {{ $json.valor }}`,
        options: {},
    };

    @node({
        id: 'f3a21b45-8c67-4d91-b2e4-1a9c3d5e7f06',
        name: 'SQL_Borrar_Pago',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [224, -608],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
    })
    SqlBorrarPago = {
        operation: 'executeQuery',
        query: 'DELETE FROM pagos WHERE idpag = {{ $json.idpag }} LIMIT 1',
        options: {},
    };

    @node({
        id: 'f3a21b45-8c67-4d91-b2e4-1a9c3d5e7f07',
        name: 'SQL_Restaurar_Saldo',
        type: 'n8n-nodes-base.mySql',
        version: 2.4,
        position: [448, -608],
        credentials: { mySql: { id: 'vULDWYns9EfnTizX', name: 'COB_GMD' } },
    })
    SqlRestaurarSaldo = {
        operation: 'executeQuery',
        query: "UPDATE cat_clientes SET saldo_actualcli = saldo_actualcli + {{ $('SQL_Obtener_Pago').first().json.montop }}, pagar = 0 WHERE cod_cliente = '{{ $('SQL_Obtener_Pago').first().json.cod_cliente }}'",
        options: {},
    };

    @node({
        id: 'f3a21b45-8c67-4d91-b2e4-1a9c3d5e7f09',
        name: 'Preparar_Borrado',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [560, -608],
    })
    PrepararBorrado = {
        jsCode: `var pago = $('SQL_Obtener_Pago').first().json;
var datos = $('Normalizar_Comando').first().json;

var msg = "✅ *PAGO ELIMINADO*\\n";
msg += "━━━━━━━━━━━━\\n";
msg += "🆔 ID: " + pago.idpag + "\\n";
msg += "👤 Cliente: " + pago.cod_cliente + " — " + pago.nombre_ccliente + "\\n";
msg += "💰 Monto devuelto: $" + pago.montop + "\\n";
msg += "📊 Saldo y pagar actualizados";

return [{
    json: {
        mensaje: msg,
        chatId: datos.chatId,
        session: datos.session
    }
}];`,
    };

    @node({
        id: 'f3a21b45-8c67-4d91-b2e4-1a9c3d5e7f08',
        name: 'Confirmar_Borrado_Waha',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        position: [784, -608],
    })
    ConfirmarBorradoWaha = {
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
                    value: 'key_hAHxny44J2kUheaf9ylQ1kLdhDeyBsqt',
                },
            ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: `={
  "session": "GMD0772",
  "chatId": "{{ $json.chatId }}",
  "text": {{ JSON.stringify($json.mensaje) }},
  "linkPreview": false
}`,
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ComandosVsIa.out(0).to(this.ExtraerDatosActivar.in(0));
        this.ComandosVsIa.out(2).to(this.AiAgent.in(0));
        this.ComandosVsIa.out(3).to(this.ExtraerDatosBorrar.in(0));
        this.ComandosVsIa.out(4).to(this.SqlObtenerPago.in(0));
        this.ExtraerDatosActivar.out(0).to(this.SqlActivarCliente.in(0));
        this.SqlActivarCliente.out(0).to(this.EnviarAlertaWaha3.in(0));
        this.ParsearJsonIa.out(0).to(this.ResponderCliente.in(0));
        this.ResponderCliente.out(0).to(this.EsImportante.in(0));
        this.EsImportante.out(0).to(this.FormatearAlerta.in(0));
        this.NormalizarComando.out(0).to(this.ComandosVsIa.in(0));
        this.FormatearAlerta.out(0).to(this.FiltrarRuido.in(0));
        this.FiltrarRuido.out(0).to(this.EnviarAlertaWaha.in(0));
        this.TempCsvcatcliePhp.out(0).to(this.UpdatevdPhp.in(0));
        this.UpdatevdPhp.out(0).to(this.SqlCatclientes.in(0));
        this.SqlCatclientes.out(0).to(this.Function_.in(0));
        this.Function_.out(0).to(this.EnviarAlertaWaha2.in(0));
        this.Function1.out(0).to(this.EnviarAlertaWaha1.in(0));
        this.SqlExistencia.out(0).to(this.Function1.in(0));
        this.WebhookWaha.out(0).to(this.NormalizarComando.in(0));
        this.AiAgent.out(0).to(this.ParsearJsonIa.in(0));
        this.Mysql.out(0).to(this.AgruparPorGestor.in(0));
        this.AgruparPorGestor.out(0).to(this.GenerarExcel.in(0));
        this.GenerarExcel.out(0).to(this.EnviarEmail.in(0));
        this.NopagoEmail.out(0).to(this.Mysql.in(0));
        this.VdARealizarDq.out(0).to(this.TempCsvcatcliePhp.in(0));
        this.ExistenciaCarteraDq.out(0).to(this.SqlExistencia.in(0));
        this.TempCsvcatcliePhp1.out(0).to(this.UpdatevdPhp1.in(0));
        this.UpdatevdPhp1.out(0).to(this.SqlCatclientes1.in(0));
        this.SqlCatclientes1.out(0).to(this.Function2.in(0));
        this.Function2.out(0).to(this.EnviarAlertaWaha4.in(0));
        this.VdARealizarDp.out(0).to(this.TempCsvcatcliePhp1.in(0));
        this.Function3.out(0).to(this.EnviarAlertaWaha5.in(0));
        this.SqlExistencia1.out(0).to(this.Function3.in(0));
        this.ExistenciaCarteraDp.out(0).to(this.SqlExistencia1.in(0));
        this.Mysql1.out(0).to(this.AgruparPorGestor1.in(0));
        this.AgruparPorGestor1.out(0).to(this.GenerarExcel1.in(0));
        this.GenerarExcel1.out(0).to(this.EnviarEmail1.in(0));
        this.NopagoEmail1.out(0).to(this.Mysql1.in(0));
        this.ExtraerDatosBorrar.out(0).to(this.SqlConsultarPagos.in(0));
        this.SqlConsultarPagos.out(0).to(this.FormatearPagos.in(0));
        this.FormatearPagos.out(0).to(this.EnviarPagosWaha.in(0));
        this.SqlObtenerPago.out(0).to(this.SqlBorrarPago.in(0));
        this.SqlBorrarPago.out(0).to(this.SqlRestaurarSaldo.in(0));
        this.SqlRestaurarSaldo.out(0).to(this.PrepararBorrado.in(0));
        this.PrepararBorrado.out(0).to(this.ConfirmarBorradoWaha.in(0));

        this.AiAgent.uses({
            ai_languageModel: this.OpenaiChatModel.output,
            ai_memory: this.RedisChatMemory.output,
        });
    }
}
