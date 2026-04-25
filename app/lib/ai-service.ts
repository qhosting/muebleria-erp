
/**
 * AI Service for intent detection and automated responses using Sofia persona.
 * Supports Google Gemini, OpenAI, and OpenRouter.
 */

export interface AIResponse {
    intencion: "VENTA" | "COBRANZA" | "SOPORTE" | "GARANTIA" | "GENERAL" | "HUMANO";
    respuesta: string;
    resumen_interno: string;
    datos_extraidos: {
        producto: string | null;
        presupuesto: string | null;
        urgencia: "ALTA" | "MEDIA" | "BAJA";
    };
}

const SOFIA_PROMPT = `
Eres "Sofía", la Asistente Virtual experta de **Colchones DASO / Muebles DASO**.

🏢 **LO QUE VENDEMOS (INFORMACIÓN REAL):**
1. **Colchones:** En todas las medidas (Individual, Matrimonial, Queen Size, King Size).
2. **Bases y Box:** Para todas las medidas.
3. **Artículos para el hogar:** Complementos varios.
4. 💰 **CRÉDITO:** Ofrecemos crédito/financiamiento para adquirir cualquiera de nuestros productos.

TU OBJETIVO:
1. Analizar el HISTORIAL para entender el contexto.
2. Si es una duda vaga, conversa para entender qué quieren.
3. SI DETECTAS UNA INTENCIÓN CLARA (Venta, Cobranza, Reporte): Tu trabajo termina. Despídete indicando que un humano los contactará.

### 🚨 REGLAS DE CLASIFICACIÓN (INTENCIONES):

1. "GENERAL":
   - CUÁNDO USAR: Saludos, "Info", "Precio" (sin decir de qué), o dudas vagas.
   - TU RESPUESTA: Preguntar amablemente ¿Qué medida o producto buscas? (Sigue conversando).
   - REGLA ANTI-SPAM: Si el cliente sigue preguntando detalles de un producto que YA se está atendiendo en el historial, mantenlo como GENERAL.

2. "VENTA", "COBRANZA", "GARANTIA", "SOPORTE", "HUMANO":
   - CUÁNDO USAR: En el momento EXACTO en que el cliente define qué quiere (ej: "Quiero el matrimonial", "Busco crédito", "Quiero pagar", "Tengo una queja").
   - TU RESPUESTA: **DEBE SER FINAL.** No hagas más preguntas. Di: "¡Entendido! 📝 He pasado tu solicitud a un asesor. Te contactarán en breve por aquí."

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
`;

export async function detectIntent(history: string, message: string): Promise<AIResponse> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;

    const fullPrompt = `${SOFIA_PROMPT}
    
---
### 📜 HISTORIAL (Contexto):
"""
${history}
"""
---

### 📩 MENSAJE ACTUAL:
"${message}"
`;

    try {
        if (geminiKey) {
            return await callGemini(geminiKey, fullPrompt);
        } else if (openRouterKey) {
            return await callOpenRouter(openRouterKey, fullPrompt);
        } else if (openAIKey) {
            return await callOpenAI(openAIKey, fullPrompt);
        } else {
            throw new Error("No AI API Key configured");
        }
    } catch (error: any) {
        console.error("AI Service Error:", error.message);
        // Fallback response in case of AI failure
        return {
            intencion: "GENERAL",
            respuesta: "¡Hola! 👋 Gracias por escribirnos. ¿En qué podemos ayudarte hoy?",
            resumen_interno: "Fallo en servicio de IA. Respuesta genérica enviada.",
            datos_extraidos: { producto: null, presupuesto: null, urgencia: "BAJA" }
        };
    }
}

async function callGemini(key: string, prompt: string): Promise<AIResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                response_mime_type: "application/json",
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API Error: ${err}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text) as AIResponse;
}

async function callOpenRouter(key: string, prompt: string): Promise<AIResponse> {
    const url = "https://openrouter.ai/api/v1/chat/completions";
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
            "HTTP-Referer": "https://mueblerialaeconomica.com",
            "X-Title": "Muebleria ERP"
        },
        body: JSON.stringify({
            model: "google/gemini-flash-1.5",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenRouter API Error: ${err}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    return JSON.parse(text) as AIResponse;
}

async function callOpenAI(key: string, prompt: string): Promise<AIResponse> {
    const url = "https://api.openai.com/v1/chat/completions";
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI Error: ${err}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    return JSON.parse(text) as AIResponse;
}

export async function extractProductsFromImage(base64Image: string): Promise<any[]> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("GEMINI_API_KEY no configurada");

    const prompt = `
    Analiza esta imagen de una lista de precios de muebles/colchones.
    Extrae CADA producto en formato JSON siguiendo esta estructura:
    {
      "marca": "Nombre de la marca",
      "nombre": "Modelo del producto",
      "medida": "IND, MAT, QS, KS, etc.",
      "categoria": "COLCHONES, LINEA BLANCA, ELECTRONICA, etc.",
      "precioContado": numero,
      "precio6Meses": numero o null,
      "precio9Meses": numero o null,
      "precio12Meses": numero o null,
      "numSemanas": numero,
      "enganche": numero,
      "abonoSemanal": numero,
      "garantia": "texto de garantía"
    }

    REGLAS:
    - Responde EXCLUSIVAMENTE con un array de objetos JSON: [ {...}, {...} ]
    - Si un valor no existe, usa null o 0 según corresponda.
    - Asegúrate de capturar todas las medidas si es un cuadro de precios.
    `;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey;
    
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image.split(',')[1] || base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                response_mime_type: "application/json",
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error("Gemini Vision Error: " + err);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    try {
        return JSON.parse(text);
    } catch (e) {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
        throw e;
    }
}

export async function extractTicketFromImage(base64Image: string): Promise<any> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("GEMINI_API_KEY no configurada");

    const prompt = `
    Tu única función es actuar como un API de extracción de datos de recibos de pago y comprobantes digitales. 
    Analiza la imagen y devuelve EXCLUSIVAMENTE un objeto JSON válido. 
    Si un campo no se encuentra, su valor debe ser null. No inventes datos ni incluyas texto adicional.

    INSTRUCCIONES POR CAMPO:
    - "contrato": Deja este campo como null (se proporcionará externamente).
    - "monto": El importe principal de la transacción, ignorando siempre comisiones, IVA o el "PAGO TOTAL".
    - "referencia": Busca el número de "REFERENCIA". Si está oculto con asteriscos (ej: **********1858), extrae solo la parte numérica.
    - "folio": 
        1. Prioridad 1: Busca "# DE AFILIACION" o "AFILIACION".
        2. Prioridad 2: Busca "AUTORIZACION".
        3. Prioridad 3: Busca "FOLIO DE VENTA".
    - "fecha": La fecha de la operación, formateada como AAAA-MM-DD.
    - "hr": La hora de la operación, formateada como HH:MM:SS (completa con :00 si es necesario).
    - "claverastreo": Busca el campo "CLAVE DE RASTREO". Si aparece en dos líneas, júntalas sin espacios ni guiones.

    EJEMPLO DE RESPUESTA:
    {"contrato":null,"monto":500.00,"referencia":"1858","folio":"4090400","fecha":"2025-08-11","hr":"11:25:00","claverastreo":null}
    `;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey;
    
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image.split(',')[1] || base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                response_mime_type: "application/json",
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error("Gemini Ticket Extraction Error: " + err);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    try {
        return JSON.parse(text);
    } catch (e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw e;
    }
}
