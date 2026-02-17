import { Capacitor } from '@capacitor/core';
import { guardarDatoCobrador, obtenerDatoCobrador } from './storage';
import { obtenerEstadoRed } from './network';

export interface TareaSincronizacion {
    id: string;
    tipo: 'pago' | 'motarario' | 'cierre_caja';
    payload: any;
    fecha: number;
    intentos: number;
}

const COLA_SYNC_KEY = 'cola_sincronizacion';

export async function agregarColaSincronizacion(tipo: 'pago' | 'motarario' | 'cierre_caja', payload: any) {
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
    // Aquí iría la llamada real al API
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

    let endpoint = '';
    switch (tarea.tipo) {
        case 'pago': endpoint = '/api/pagos'; break;
        case 'motarario': endpoint = '/api/motararios'; break;
        case 'cierre_caja': endpoint = '/api/caja/cierre'; break;
    }

    try {
        // Si es modo desarrollo o demo, simulamos éxito
        console.log(`Enviando ${tarea.tipo} al servidor:`, tarea.payload);

        // Simulación de latencia de red
        await new Promise(resolve => setTimeout(resolve, 800));

        // TODO: Descomentar llamada real cuando el API esté lista
        /*
        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tarea.payload)
        });
        return response.ok;
        */

        return true; // Simulación exitosa

    } catch (error) {
        console.error('Error de red al enviar tarea:', error);
        return false;
    }
}

export async function obtenerTamañoCola(): Promise<number> {
    const cola = (await obtenerDatoCobrador<TareaSincronizacion[]>(COLA_SYNC_KEY)) || [];
    return cola.length;
}
