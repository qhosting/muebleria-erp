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
    const { getBaseUrl } = await import('@/lib/api-config');
    const baseUrl = getBaseUrl();

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
            const localId = tarea.payload.localId;
            
            console.log(`📡 Reconstruyendo solicitud offline ${localId || 'desconocida'} para sincronización...`);
            
            // Cargar datos completos de la base de datos local (IndexedDB)
            let dataToUse = tarea.payload.data;
            let filesToUse = tarea.payload.files;

            if (localId) {
                try {
                    const { db } = await import('@/lib/offline-db');
                    const localSol = await db.solicitudes.get(localId);
                    if (localSol) {
                        console.log('✅ Solicitud encontrada en IndexedDB para reconstrucción.');
                        if (localSol.data) dataToUse = localSol.data;
                        if (localSol.files) filesToUse = localSol.files;
                    } else {
                        console.warn(`⚠️ No se encontró la solicitud ${localId} en IndexedDB. Usando datos de payload.`);
                    }
                } catch (dbErr) {
                    console.error('Error al consultar IndexedDB para reconstruir solicitud:', dbErr);
                }
            }

            Object.entries(dataToUse).forEach(([key, value]: [string, any]) => {
                if (value !== null && value !== undefined) formData.append(key, value.toString());
            });

            // Convertir Base64 de vuelta a Blobs de forma segura
            if (filesToUse) {
                for (const [key, base64] of Object.entries(filesToUse as {[key: string]: string})) {
                    if (base64) {
                        try {
                            const blob = await fetch(base64).then(r => r.blob());
                            formData.append(key, blob, `${key}.jpg`);
                        } catch (blobError) {
                            console.error(`Error al convertir base64 a Blob para la imagen ${key}:`, blobError);
                        }
                    }
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
                        syncStatus: 'synced',
                        files: {} // 🚀 OPTIMIZACIÓN: Limpiar archivos Base64 pesados para liberar espacio local
                    });
                    console.log(`✅ Estado de solicitud ${tarea.payload.localId} actualizado en IndexedDB a 'synced' y archivos base64 limpiados.`);
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
