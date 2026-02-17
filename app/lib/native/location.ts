import { Capacitor } from '@capacitor/core';
// En una build deNext.js para Capacitor, a veces el plugin necesita ser importado dinámicamente

export async function obtenerUbicacionCobrador() {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        try {
            const { Geolocation } = await import('@capacitor/geolocation');

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });

            return {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
            };
        } catch (error) {
            console.error('Error GPS Nativo:', error);
            throw error;
        }
    } else {
        // Fallback a Geolocation Web API
        if (!navigator.geolocation) {
            throw new Error('Geolocalización no soportada en este navegador');
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    });
                },
                (error) => reject(error),
                { enableHighAccuracy: true }
            );
        });
    }
}

export async function navegarACliente(lat: number, lng: number) {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        // Intentar abrir Google Maps directamente
        // Usamos window.open con _system para abrir app nativa de mapas en Android
        const url = `geo:${lat},${lng}?q=${lat},${lng}`;
        window.open(url, '_system');
    } else {
        // En web, abrir Google Maps en nueva pestaña
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    }
}
