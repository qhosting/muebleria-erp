
/**
 * Utilidad para interactuar con WAHA API (WhatsApp HTTP API)
 */

export interface WahaConfig {
    apiUrl: string;
    session: string;
    apiKey?: string;
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
