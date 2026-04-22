
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
