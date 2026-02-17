import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export interface NetworkStatusResult {
    connected: boolean;
    connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
}

export async function obtenerEstadoRed(): Promise<NetworkStatusResult> {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        const status = await Network.getStatus();
        return {
            connected: status.connected,
            connectionType: status.connectionType
        };
    } else {
        // Web API Navigator.onLine
        return {
            connected: navigator.onLine,
            connectionType: 'unknown'
        };
    }
}

export function escucharCambiosRed(callback: (status: NetworkStatusResult) => void) {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        const handlePromise = Network.addListener('networkStatusChange', (status: any) => {
            callback({
                connected: status.connected,
                connectionType: status.connectionType
            });
        });

        // Retornamos función para limpiar el listener
        return () => {
            handlePromise.then((h: any) => h.remove());
        };
    } else {
        // Eventos Web 'online' y 'offline'
        const onlineHandler = () => callback({ connected: true, connectionType: 'unknown' });
        const offlineHandler = () => callback({ connected: false, connectionType: 'none' });

        window.addEventListener('online', onlineHandler);
        window.addEventListener('offline', offlineHandler);

        return () => {
            window.removeEventListener('online', onlineHandler);
            window.removeEventListener('offline', offlineHandler);
        };
    }
}
