import { Capacitor } from '@capacitor/core';
import { guardarDatoCobrador, obtenerDatoCobrador } from './storage';
export { guardarDatoCobrador, obtenerDatoCobrador };
import { obtenerEstadoRed } from './network';

export interface TareaSincronizacion {
    id: string;
    tipo: 'pago' | 'motarario' | 'cierre_caja' | 'solicitud';
    payload: any;
    fecha: number;
    intentos: number;
}

const COLA_SYNC_KEY = 'cola_sincronizacion';

export async function agregarColaSincronizacion(tipo: 'pago' | 'motarario' | 'cierre_caja' | 'solicitud', payload: any) {
    const colaActual = (await obtenerDatoCobrador<TareaSincronizacion[]>(COLA_SYNC_KEY)) || [];

    const nuevaTarea: TareaSincronizacion = {
        id: crypto.randomUUID(),
        tipo,
        payload,
        fecha: Date.now(),
        intentos: 0
    };

    colaActual.push(nuevaTarea);
    await guardarDatoCobrador(COLA_SYNC_KEY, colaActual);

    // Intentar sincronizar inmediatamente si hay red
    const estadoRed = await obtenerEstadoRed();
    if (estadoRed.connected) {
        sincronizarCola();
    }

    return nuevaTarea;
}

export async function sincronizarCola() {
    const colaActual = (await obtenerDatoCobrador<TareaSincronizacion[]>(COLA_SYNC_KEY)) || [];
    if (colaActual.length === 0) return { procesados: 0, errores: 0 };

    const estadoRed = await obtenerEstadoRed();
    if (!estadoRed.connected) return { procesados: 0, errores: 0, offline: true };

    console.log(`📡 Iniciando sincronización de ${colaActual.length} elementos...`);

    let procesados = 0;
    let errores = 0;
    const colaRestante: TareaSincronizacion[] = [];

    for (const tarea of colaActual) {
        try {
            const exito = await enviarTareaAlServidor(tarea);
            if (exito) {
                procesados++;
            } else {
                tarea.intentos++;
                colaRestante.push(tarea);
                errores++;
            }
        } catch (e) {
            console.error(`Error sincronizando tarea ${tarea.id}:`, e);
            tarea.intentos++;
            colaRestante.push(tarea);
            errores++;
        }
    }

    await guardarDatoCobrador(COLA_SYNC_KEY, colaRestante);
    console.log(`✅ Sincronización finalizada. Procesados: ${procesados}, Pendientes: ${colaRestante.length}`);

    return { procesados, errores };
}

async function enviarTareaAlServidor(tarea: TareaSincronizacion): Promise<boolean> {
    const isNative = Capacitor.isNativePlatform();
    let baseUrl = '';

    if (isNative && typeof window !== 'undefined') {
        const savedUrl = localStorage.getItem('custom_server_url');
        if (savedUrl) {
            baseUrl = savedUrl.endsWith('/') ? savedUrl.slice(0, -1) : savedUrl;
        }
    }

    let endpoint = '';
    switch (tarea.tipo) {
        case 'pago': endpoint = '/api/pagos'; break;
        case 'motarario': endpoint = '/api/motararios'; break;
        case 'cierre_caja': endpoint = '/api/caja/cierre'; break;
        case 'solicitud': endpoint = '/api/ventas/solicitudes/crear'; break;
    }

    try {
        console.log(`📡 Sincronizando ${tarea.tipo} al servidor:`, tarea.payload);

        const isSolicitud = tarea.tipo === 'solicitud';
        const headers: any = {};
        let body: any;

        if (isSolicitud) {
            // Reconstruir FormData para la solicitud con imágenes
            const formData = new FormData();
            // Payload de solicitud tiene { data, files }
            Object.entries(tarea.payload.data).forEach(([key, value]: [string, any]) => {
                if (value !== null && value !== undefined) formData.append(key, value.toString());
            });

            // Convertir Base64 de vuelta a Blobs
            for (const [key, base64] of Object.entries(tarea.payload.files as {[key: string]: string})) {
                if (base64) {
                    const blob = await fetch(base64).then(r => r.blob());
                    formData.append(key, blob, `${key}.jpg`);
                }
            }
            body = formData;
            // No setear Content-Type para que el navegador ponga el boundary
        } else {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(tarea.payload);
        }

        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers,
            body
        });

        if (response.ok) {
            console.log(`✅ ${tarea.tipo} sincronizado con éxito`);
            if (tarea.tipo === 'solicitud' && tarea.payload.localId) {
                try {
                    const { db } = await import('@/lib/offline-db');
                    await db.solicitudes.where('localId').equals(tarea.payload.localId).modify({
                        syncStatus: 'synced'
                    });
                    console.log(`✅ Estado de solicitud ${tarea.payload.localId} actualizado en IndexedDB a 'synced'`);
                } catch (dbError) {
                    console.error('Error al actualizar IndexedDB para solicitud:', dbError);
                }
            }
            return true;
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error(`❌ Error al sincronizar ${tarea.tipo}:`, errorData);
            return false;
        }

    } catch (error) {
        console.error('⚠️ Error de red al enviar tarea:', error);
        return false;
    }
}

export async function obtenerTamañoCola(): Promise<number> {
    const cola = (await obtenerDatoCobrador<TareaSincronizacion[]>(COLA_SYNC_KEY)) || [];
    return cola.length;
}
