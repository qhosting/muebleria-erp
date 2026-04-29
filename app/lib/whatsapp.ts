
/**
 * Utilidad para interactuar con WAHA API (WhatsApp HTTP API)
 */

export interface WahaConfig {
    apiUrl: string;
    session: string;
    apiKey?: string;
}

/**
 * Obtiene la configuración de WAHA priorizando variables de entorno
 * y cayendo opcionalmente a la base de datos si se provee el cliente de prisma.
 * 
 * @param botType Opcional: 'tesoreria' o 'leads' para buscar configuración específica
 */
export async function getWahaConfig(prisma?: any, botType?: 'tesoreria' | 'leads'): Promise<WahaConfig> {
    // 1. Prioridad: Variables de Entorno
    let session = process.env.WAHA_SESSION_NAME || process.env.WAHA_SESSION || 'default';
    
    // Si se especifica un tipo de bot, intentamos buscar su variable de entorno específica
    if (botType === 'tesoreria' && process.env.WAHA_SESSION_TESORERIA) {
        session = process.env.WAHA_SESSION_TESORERIA;
    } else if (botType === 'leads' && process.env.WAHA_SESSION_LEADS) {
        session = process.env.WAHA_SESSION_LEADS;
    }

    const envConfig: WahaConfig = {
        apiUrl: process.env.WAHA_API_URL || '',
        session: session,
        apiKey: process.env.WAHA_API_KEY
    };

    if (envConfig.apiUrl && envConfig.session !== 'default') {
        return envConfig;
    }

    // 2. Fallback: Base de Datos
    if (prisma) {
        try {
            const config = await prisma.configuracionSistema.findUnique({
                where: { clave: 'sistema' }
            });

            if (config?.notificaciones) {
                const notif = config.notificaciones as any;
                
                // Buscar sesión específica por botType en el JSON de configuración
                let botSession = notif.wahaSessionName || notif.wahaSession || envConfig.session;
                let botApiUrl = notif.wahaApiUrl || envConfig.apiUrl;

                if (botType === 'tesoreria') {
                    if (notif.tesoreriaWahaSession) botSession = notif.tesoreriaWahaSession;
                    if (notif.tesoreriaWahaApiUrl) botApiUrl = notif.tesoreriaWahaApiUrl;
                }
                
                if (botType === 'leads') {
                    if (notif.leadsWahaSession) botSession = notif.leadsWahaSession;
                    if (notif.leadsWahaApiUrl) botApiUrl = notif.leadsWahaApiUrl;
                }

                return {
                    apiUrl: botApiUrl,
                    session: botSession,
                    apiKey: notif.wahaApiKey || envConfig.apiKey
                };
            }
        } catch (error) {
            console.error("Error cargando WAHA config desde DB:", error);
        }
    }

    return envConfig;
}

/**
 * Obtiene la API Key de OpenAI desde la configuración
 */
export async function getOpenAIConfig(prisma: any): Promise<string | null> {
    try {
        // Prioridad: Variable de entorno
        if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;

        // Fallback: Base de datos
        const config = await prisma.configuracionSistema.findUnique({
            where: { clave: 'sistema' }
        });

        if (config?.notificaciones) {
            const notif = config.notificaciones as any;
            return notif.openaiApiKey || null;
        }
    } catch (error) {
        console.error("Error cargando OpenAI config:", error);
    }
    return null;
}

export async function sendWahaMessage(
    config: WahaConfig,
    to: string,
    text: string,
    sessionOverride?: string
) {
    const session = sessionOverride || config.session;
    if (!config.apiUrl || !session) {
        throw new Error("WAHA API URL o Sesión no configurada");
    }

    // Limpiar número de teléfono (solo dígitos, asegurar formato internacional)
    let cleanNumber = to.replace(/\D/g, "");

    // Si no tiene prefijo de país (asumiendo México si tiene 10 dígitos)
    if (cleanNumber.length === 10) {
        cleanNumber = "521" + cleanNumber;
    }

    const url = `${config.apiUrl}/api/sendText`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { 'X-Api-Key': config.apiKey } : {})
        },
        body: JSON.stringify({
            chatId: `${cleanNumber}@c.us`,
            text: text,
            session: session
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error de WAHA (${response.status}): ${error}`);
    }

    return await response.json();
}
