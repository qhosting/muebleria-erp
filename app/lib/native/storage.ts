import { Capacitor } from '@capacitor/core';

export async function guardarDatoCobrador(key: string, value: any) {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        const { Preferences } = await import('@capacitor/preferences');

        await Preferences.set({
            key: `cobrador_${key}`,
            value: JSON.stringify(value)
        });
    } else {
        // Web Storage (localStorage)
        window.localStorage.setItem(`cobrador_${key}`, JSON.stringify(value));
    }
}

export async function obtenerDatoCobrador<T>(key: string): Promise<T | null> {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        const { Preferences } = await import('@capacitor/preferences');

        // Obtener valor de Preferences Nativo
        const result = await Preferences.get({ key: `cobrador_${key}` });
        return result.value ? JSON.parse(result.value) : null;
    } else {
        // Obtener de localStorage
        const value = window.localStorage.getItem(`cobrador_${key}`);
        return value ? JSON.parse(value) : null;
    }
}

export async function eliminarDatoCobrador(key: string) {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key: `cobrador_${key}` });
    } else {
        window.localStorage.removeItem(`cobrador_${key}`);
    }
}

export async function limpiarDatosCobrador() {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.clear();
    } else {
        // Limpiar solo datos que comiencen con 'cobrador_'
        Object.keys(window.localStorage)
            .filter(key => key.startsWith('cobrador_'))
            .forEach(key => window.localStorage.removeItem(key));
    }
}
