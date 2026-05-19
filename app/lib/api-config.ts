
import { Capacitor } from '@capacitor/core';

/**
 * Utility to manage the API Base URL for Native and Web environments.
 */

// URL de producción fija solicitada por el usuario
const PRODUCTION_URL = 'https://app.mueblerialaeconomica.com';

export function getBaseUrl() {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        // Try to get from localStorage (custom override if needed)
        if (typeof window !== 'undefined') {
            const savedUrl = localStorage.getItem('custom_server_url');
            if (savedUrl) return savedUrl.endsWith('/') ? savedUrl.slice(0, -1) : savedUrl;
        }

        // Default to the fixed production URL
        return PRODUCTION_URL;
    }

    return ''; // Relative path for web
}

export function getFullPath(path: string) {
    if (path.startsWith('http')) return path;

    const baseUrl = getBaseUrl();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Si es web (baseUrl vacío), retornamos el path relativo
    if (!baseUrl) return normalizedPath;

    return `${baseUrl}${normalizedPath}`;
}

/**
 * Wrapper sobre fetch que maneja automáticamente URLs absolutas para nativo
 * y asegura que las credenciales (cookies) se envíen en peticiones cross-origin.
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
    const url = getFullPath(path);
    const isNative = Capacitor.isNativePlatform();

    // En nativo, forzamos incluir credenciales para que las cookies de sesión se envíen al servidor remoto
    if (isNative && !options.credentials) {
        options.credentials = 'include';
    }

    // 🚀 MEJORA PARA MALA SEÑAL / OFFLINE:
    // Si hay mala señal, una llamada fetch puede tardar minutos en fallar.
    // Añadimos un AbortController con un timeout por defecto de 5 segundos
    // para abortar rápido y permitir que el sistema use el modo offline.
    const controller = new AbortController();
    const timeoutVal = (options as any).timeout || 5000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutVal);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('La conexión al servidor tardó demasiado. Fallback a modo offline.');
        }
        throw error;
    }
}
