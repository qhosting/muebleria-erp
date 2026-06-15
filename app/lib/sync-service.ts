
// Servicio de sincronización para PWA de cobranza móvil
import { db, OfflineCliente, OfflinePago, OfflineMotarario, SyncQueue, generateLocalId, OfflineVerificacion } from './offline-db';
import { toast } from 'sonner';
import { apiFetch } from './api-config';

export class SyncService {
  private static instance: SyncService;
  private syncInProgress = false;
  private autoSyncInterval?: NodeJS.Timeout;

  private constructor() { }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // Inicializar sincronización automática
  public async initAutoSync(cobradorId: string) {
    let settings = await db.settings.get(cobradorId);
    
    // 🚀 OPTIMIZACIÓN: Si no existen settings, inicializar con preferOffline: true por defecto
    if (!settings) {
        console.log('Inicializando ajustes por defecto para cobrador:', cobradorId);
        settings = {
            cobradorId,
            syncEnabled: true,
            autoSync: true,
            preferOffline: true, // 🚀 MODO OFFLINE PREFERIDO POR DEFECTO
            offlineMode: false,
            printFormat: 'thermal'
        };
        await db.settings.put(settings);
    }

    if (settings?.autoSync && navigator.onLine) {
      this.startAutoSync(cobradorId);
    }
  }

  private startAutoSync(cobradorId: string) {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    // 🚀 OPTIMIZACIÓN MÓVIL: Sincronizar cada 15 minutos en lugar de 5 (menos agresivo)
    // También verificar si realmente hay datos pendientes antes de sincronizar
    this.autoSyncInterval = setInterval(async () => {
      // 🚀 OPTIMIZACIÓN: Solo sincronizar si NO está activado el "Modo Offline Preferido"
      const settings = await db.settings.get(cobradorId);
      
      if (navigator.onLine && !this.syncInProgress && !settings?.preferOffline) {
        try {
          const pendingCount = await db.syncQueue.where('status').equals('pending').count();
          if (pendingCount > 0) {
            await this.syncAll(cobradorId, false);
          }
        } catch (error) {
          console.error('Error en auto-sync:', error);
        }
      }
    }, 15 * 60 * 1000); // 15 minutos
  }

  public stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = undefined;
    }
  }

  // Sincronización completa
  public async syncAll(cobradorId: string, showToast = true): Promise<boolean> {
    if (this.syncInProgress) {
      if (showToast) toast.info('Sincronización ya en progreso...');
      return false;
    }

    if (!navigator.onLine) {
      if (showToast) toast.error('Sin conexión a internet');
      return false;
    }

    this.syncInProgress = true;

    try {
      if (showToast) toast.info('Sincronizando datos...');

      // 1. Descargar clientes actualizados del servidor
      await this.downloadClientes(cobradorId);

      // 2. Subir pagos pendientes
      await this.uploadPagos(cobradorId);

      // 3. Subir motararios pendientes (si existen)
      await this.uploadMotararios(cobradorId);

      // 3.5 Subir verificaciones pendientes (si existen)
      await this.uploadVerificaciones(cobradorId);

      // 4. Actualizar timestamp de sincronización
      await this.updateLastSync(cobradorId);

      if (showToast) toast.success('Sincronización completada');
      return true;

    } catch (error) {
      console.error('Error en sincronización:', error);
      if (showToast) toast.error('Error en sincronización');
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Descargar clientes asignados al cobrador
  private async downloadClientes(cobradorId: string) {
    try {
      const response = await apiFetch(`/api/sync/clientes/${cobradorId}?full=true`);
      if (!response.ok) throw new Error('Error al descargar clientes');

      const clientesServidor = await response.json();

      // Limpiar clientes locales y agregar/actualizar los del servidor
      await db.transaction('rw', db.clientes, async () => {
        await db.clientes.where('cobradorAsignadoId').equals(cobradorId).delete();

        for (const cliente of clientesServidor) {
          await db.clientes.put({
            ...cliente,
            lastSync: Date.now(),
            syncStatus: 'synced' as const
          });
        }
      });

      console.log(`${clientesServidor.length} clientes sincronizados`);
    } catch (error) {
      console.error('Error descargando clientes:', error);
      throw error;
    }
  }

  // Subir pagos pendientes al servidor
  private async uploadPagos(cobradorId: string) {
    const pagosPendientes = await db.pagos
      .where('syncStatus').equals('pending')
      .and(pago => pago.cobradorId === cobradorId)
      .toArray();
 
    console.log(`Pagos pendientes para sincronizar: ${pagosPendientes.length}`);
    pagosPendientes.forEach(pago => {
      console.log(`Pago: ${pago.localId}, tipo: ${pago.tipoPago}, monto: ${pago.monto}`);
    });
 
    for (const pago of pagosPendientes) {
      try {
        console.log(`Sincronizando pago ${pago.localId} (${pago.tipoPago})`);
 
        // Marcar como sincronizando de forma segura por localId
        await db.pagos.where('localId').equals(pago.localId).modify({ syncStatus: 'syncing' });
 
        const payloadPago = {
          clienteId: pago.clienteId,
          monto: pago.monto,
          tipoPago: pago.tipoPago,
          concepto: pago.concepto,
          fechaPago: pago.fechaPago,
          metodoPago: pago.metodoPago,
          numeroRecibo: pago.numeroRecibo,
          interesMoratorio: pago.interesMoratorio || 0,
          gastosCobranza: pago.gastosCobranza || 0,
          latitud: pago.latitud,
          longitud: pago.longitud,
          localId: pago.localId
        };
 
        console.log('Enviando pago al servidor:', payloadPago);
 
        const response = await apiFetch('/api/pagos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadPago)
        });
 
        if (response.ok) {
          const pagoServidor = await response.json();
          console.log(`Pago ${pago.localId} sincronizado exitosamente con ID: ${pagoServidor.id}`);
 
          // Actualizar con ID del servidor de forma segura por localId
          await db.pagos.where('localId').equals(pago.localId).modify({
            id: pagoServidor.id,
            syncStatus: 'synced',
            lastSync: Date.now()
          });
        } else {
          const errorText = await response.text();
          console.error(`Error en respuesta del servidor para pago ${pago.localId}:`, response.status, errorText);
 
          // Marcar como fallido de forma segura por localId
          await db.pagos.where('localId').equals(pago.localId).modify({ syncStatus: 'failed' });
        }
 
      } catch (error) {
        console.error(`Error subiendo pago ${pago.localId}:`, error);
        await db.pagos.where('localId').equals(pago.localId).modify({ syncStatus: 'failed' });
      }
    }
  }
 
  // Subir motararios pendientes al servidor
  private async uploadMotararios(cobradorId: string) {
    // Verificar si hay motararios pendientes
    const motarariosPendientes = await db.motararios
      .where('syncStatus').equals('pending')
      .and(motarario => motarario.cobradorId === cobradorId)
      .toArray();
 
    console.log(`Motararios pendientes para sincronizar: ${motarariosPendientes.length}`);
 
    if (motarariosPendientes.length === 0) {
      return;
    }
 
    for (const motarario of motarariosPendientes) {
      try {
        console.log(`Sincronizando motarario ${motarario.localId}`);
        
        // Marcar como sincronizando de forma segura por localId
        await db.motararios.where('localId').equals(motarario.localId).modify({ syncStatus: 'syncing' });
 
        const response = await apiFetch('/api/motararios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: motarario.clienteId,
            motivo: motarario.motivo,
            descripcion: motarario.descripcion,
            fecha: motarario.fecha,
            proximaVisita: motarario.proximaVisita,
            localId: motarario.localId
          })
        });
 
        if (response.ok) {
          const motararioServidor = await response.json();
          console.log(`Motarario ${motarario.localId} sincronizado exitosamente con ID: ${motararioServidor.id}`);
 
          await db.motararios.where('localId').equals(motarario.localId).modify({
            id: motararioServidor.id,
            syncStatus: 'synced',
            lastSync: Date.now()
          });
 
          // Actualizar estado en la cola de sincronización
          await db.syncQueue.where('localId').equals(motarario.localId).modify({ status: 'completed' });
        } else {
          console.error(`Error al sincronizar motarario ${motarario.localId}: ${response.status}`);
          await db.motararios.where('localId').equals(motarario.localId).modify({ syncStatus: 'failed' });
        }
 
      } catch (error) {
        console.error('Error subiendo motarario:', error);
        await db.motararios.where('localId').equals(motarario.localId).modify({ syncStatus: 'failed' });
      }
    }
  }

  // Subir verificaciones domiciliarias pendientes al servidor
  private async uploadVerificaciones(cobradorId: string) {
    const verificacionesPendientes = await db.verificaciones
      .where('syncStatus').equals('pending')
      .and((v) => v.gestorId === cobradorId)
      .toArray();

    console.log(`Verificaciones pendientes para sincronizar: ${verificacionesPendientes.length}`);

    if (verificacionesPendientes.length === 0) return;

    for (const v of verificacionesPendientes) {
      try {
        console.log(`Sincronizando verificación ${v.localId}`);
        await db.verificaciones.where('localId').equals(v.localId).modify({ syncStatus: 'syncing' });

        const response = await apiFetch('/api/clientes/verificaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: v.clienteId,
            fecha: v.fecha,
            detallesExtra: v.detallesExtra,
            localId: v.localId
          })
        });

        if (response.ok) {
          const vServidor = await response.json();
          console.log(`Verificación ${v.localId} sincronizada exitosamente con ID: ${vServidor.id}`);

          // Limpiar las fotos de evidencia del local (ahorrar espacio en IndexedDB)
          const updatedDetalles = { ...v.detallesExtra, evidencia: [] };
          await db.verificaciones.where('localId').equals(v.localId).modify({
            id: vServidor.id,
            syncStatus: 'synced',
            lastSync: Date.now(),
            detallesExtra: updatedDetalles
          });

          await db.syncQueue.where('localId').equals(v.localId).modify({ status: 'completed' });
        } else {
          const errText = await response.text();
          console.error(`Error al sincronizar verificación ${v.localId}: ${response.status}`, errText);
          await db.verificaciones.where('localId').equals(v.localId).modify({ syncStatus: 'failed' });
        }
      } catch (error) {
        console.error('Error subiendo verificación:', error);
        await db.verificaciones.where('localId').equals(v.localId).modify({ syncStatus: 'failed' });
      }
    }
  }

  // Actualizar timestamp de última sincronización
  private async updateLastSync(cobradorId: string) {
    const existing = await db.settings.get(cobradorId);
    
    await db.settings.put({
      ...existing,
      cobradorId,
      lastFullSync: Date.now(),
      syncEnabled: true,
      autoSync: true,
      printFormat: 'thermal',
      offlineMode: false,
      preferOffline: existing ? existing.preferOffline : true
    });
  }

  // Agregar pago offline
  public async addPagoOffline(pagoData: Omit<OfflinePago, 'localId' | 'syncStatus' | 'createdOffline' | 'printStatus'>) {
    const localId = generateLocalId();

    const pago: OfflinePago = {
      ...pagoData,
      localId,
      syncStatus: 'pending',
      createdOffline: true,
      printStatus: 'pending'
    };

    console.log('Agregando pago offline:', pago);
    await db.pagos.add(pago);

    // Agregar a cola de sincronización
    await db.syncQueue.add({
      type: 'pago',
      data: pago,
      localId,
      attempts: 0,
      status: 'pending'
    });

    console.log(`Pago offline agregado con localId: ${localId}, tipo: ${pago.tipoPago}`);
    return localId;
  }

  // Agregar motarario offline
  public async addMotararioOffline(motararioData: Omit<OfflineMotarario, 'localId' | 'syncStatus' | 'createdOffline'>) {
    const localId = generateLocalId();

    const motarario: OfflineMotarario = {
      ...motararioData,
      localId,
      syncStatus: 'pending',
      createdOffline: true
    };

    await db.motararios.add(motarario);

    // Agregar a cola de sincronización
    await db.syncQueue.add({
      type: 'motarario',
      data: motarario,
      localId,
      attempts: 0,
      status: 'pending'
    });

    return localId;
  }

  // Agregar verificación domiciliaria offline
  public async addVerificacionOffline(vData: Omit<OfflineVerificacion, 'localId' | 'syncStatus' | 'createdOffline'>) {
    const localId = generateLocalId();

    const verificacion: OfflineVerificacion = {
      ...vData,
      localId,
      syncStatus: 'pending',
      createdOffline: true
    };

    // Guardar en la tabla IndexedDB de verificaciones
    await db.verificaciones.add(verificacion);

    // Agregar a la cola de sincronización
    await db.syncQueue.add({
      type: 'verificacion',
      data: verificacion,
      localId,
      attempts: 0,
      status: 'pending'
    });

    // Actualizar de inmediato el estatus del cliente localmente
    await db.clientes.where('id').equals(vData.clienteId).modify({
      vdStatus: 'REALIZADA'
    });

    return localId;
  }

  // Obtener estado de sincronización
  public async getSyncStatus(cobradorId: string) {
    const [settings, pendingPagos, pendingMotararios, pendingVerificaciones, failedItems] = await Promise.all([
      db.settings.get(cobradorId),
      db.pagos.where('syncStatus').equals('pending').and(p => p.cobradorId === cobradorId).count(),
      db.motararios.where('syncStatus').equals('pending').and(m => m.cobradorId === cobradorId).count(),
      db.verificaciones.where('syncStatus').equals('pending').and((v) => v.gestorId === cobradorId).count(),
      db.syncQueue.where('status').equals('failed').count()
    ]);

    return {
      lastSync: settings?.lastFullSync,
      pendingPagos,
      pendingMotararios,
      pendingVerificaciones,
      failedItems,
      isOnline: navigator.onLine,
      syncInProgress: this.syncInProgress,
      preferOffline: settings?.preferOffline || false
    };
  }

  // Función para debuggear pagos offline
  public async getPagosOffline(cobradorId: string) {
    const pagosOffline = await db.pagos
      .where('cobradorId').equals(cobradorId)
      .toArray();

    console.log(`Pagos offline encontrados: ${pagosOffline.length}`);
    pagosOffline.forEach(pago => {
      console.log(`${pago.localId}: ${pago.tipoPago} - ${pago.monto} - Status: ${pago.syncStatus}`);
    });

    return pagosOffline;
  }
}

// Instancia singleton
export const syncService = SyncService.getInstance();

// Event listeners para manejo de conectividad (solo en el cliente)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Conexión restaurada - intentando sincronizar automáticamente');
    toast.success('Conexión restaurada');
    
    // Disparar sincronización inmediata si hay un cobrador en sesión
    // Nota: El cobradorId se obtiene del contexto de la app o se espera al siguiente heartbeat
    // Pero podemos forzar una revisión de la cola
    const lastCobradorId = localStorage.getItem('last_cobrador_id');
    if (lastCobradorId) {
        db.settings.get(lastCobradorId).then(settings => {
            if (!settings?.preferOffline) {
                syncService.syncAll(lastCobradorId, false);
            } else {
                console.log('Online detectado, pero se respeta el Modo Offline Preferido');
            }
        });
    }
  });
}
