import crypto from 'crypto';

const SECRET_KEY = process.env.NEXTAUTH_SECRET || 'fallback-secret-key-12345';

// Generar una clave de encriptación consistente a partir del SECRET_KEY
function getEncryptionKey() {
    return crypto.scryptSync(SECRET_KEY, 'muebleria-salt-99', 32);
}

// Vector de inicialización estático para simplificar la cadena hexadecimal
const IV = Buffer.alloc(16, 0);

/**
 * Genera un token encriptado que expira en 15 minutos para acceder temporalmente al recibo.
 */
export function generateTemporaryReceiptToken(pagoId: string): string {
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos en ms
    const payload = JSON.stringify({ pagoId, expiresAt });
    
    const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), IV);
    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
}

/**
 * Desencripta el token y valida que no haya expirado.
 * Retorna el objeto { pagoId, expiresAt } si es válido, o null si es inválido o expiró.
 */
export function decryptTemporaryReceiptToken(token: string): { pagoId: string, expiresAt: number } | null {
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), IV);
        let decrypted = decipher.update(token, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        const data = JSON.parse(decrypted);
        if (!data.expiresAt || data.expiresAt < Date.now()) {
            return null; // Expirado
        }
        return data;
    } catch (e) {
        return null; // Token corrupto o inválido
    }
}
