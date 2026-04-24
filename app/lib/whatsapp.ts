
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
 */
export async function getWahaConfig(prisma?: any): Promise<WahaConfig> {
    // 1. Prioridad: Variables de Entorno
    const envConfig: WahaConfig = {
        apiUrl: process.env.WAHA_API_URL || '',
        session: process.env.WAHA_SESSION_NAME || process.env.WAHA_SESSION || 'default',
        apiKey: process.env.WAHA_API_KEY
    };

    if (envConfig.apiUrl && envConfig.session) {
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
                return {
                    apiUrl: notif.wahaApiUrl || envConfig.apiUrl,
                    session: notif.wahaSessionName || notif.wahaSession || envConfig.session,
                    apiKey: notif.wahaApiKey || envConfig.apiKey
                };
            }
        } catch (error) {
            console.error("Error cargando WAHA config desde DB:", error);
        }
    }

    return envConfig;
}

export async function sendWahaMessage(
    config: WahaConfig,
    to: string,
    text: string
) {
    if (!config.apiUrl || !config.session) {
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
            session: config.session
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error de WAHA (${response.status}): ${error}`);
    }

    return await response.json();
}
