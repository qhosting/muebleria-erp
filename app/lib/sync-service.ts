
// Servicio de sincronización para PWA de cobranza móvil
import { db, OfflineCliente, OfflinePago, OfflineMotarorio, SyncQueue, generateLocalId } from './offline-db';
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
    const settings = await db.settings.get(cobradorId);
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
      if (navigator.onLine && !this.syncInProgress) {
        try {
          // Solo sincronizar si hay datos pendientes
          const pendingCount = await db.syncQueue.where('status').equals('pending').count();
          if (pendingCount > 0) {
            await this.syncAll(cobradorId, false); // silent sync
          }
        } catch (error) {
          console.error('Error en auto-sync:', error);
        }
      }
    }, 15 * 60 * 1000); // 15 minutos en lugar de 5
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

      // Limpiar clientes locales y agregar los del servidor
      await db.transaction('rw', db.clientes, async () => {
        await db.clientes.where('cobradorAsignadoId').equals(cobradorId).delete();

        for (const cliente of clientesServidor) {
          await db.clientes.add({
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

        // Marcar como sincronizando
        await db.pagos.update(pago.localId, { syncStatus: 'syncing' });

        const payloadPago = {
          clienteId: pago.clienteId,
          monto: pago.monto,
          tipoPago: pago.tipoPago,
          concepto: pago.concepto,
          fechaPago: pago.fechaPago,
          metodoPago: pago.metodoPago,
          numeroRecibo: pago.numeroRecibo,
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

          // Actualizar con ID del servidor
          await db.pagos.update(pago.localId, {
            id: pagoServidor.id,
            syncStatus: 'synced',
            lastSync: Date.now()
          });
        } else {
          const errorText = await response.text();
          console.error(`Error en respuesta del servidor para pago ${pago.localId}:`, response.status, errorText);

          // Marcar como fallido
          await db.pagos.update(pago.localId, { syncStatus: 'failed' });
        }

      } catch (error) {
        console.error(`Error subiendo pago ${pago.localId}:`, error);
        await db.pagos.update(pago.localId, { syncStatus: 'failed' });
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

    // Si no hay endpoint de motararios, simplemente marcar como omitidos por ahora
    if (motarariosPendientes.length === 0) {
      return;
    }

    // Por ahora, comentamos la sincronización de motararios hasta que el endpoint esté disponible
    console.log('Sincronización de motararios pendiente - endpoint no disponible');
    // TODO: Implementar endpoint /api/motararios si se necesita

    /*
    for (const motarario of motarariosPendientes) {
      try {
        const response = await fetch('/api/motararios', {
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
          await db.motararios.update(motarario.localId, {
            id: motararioServidor.id,
            syncStatus: 'synced',
            lastSync: Date.now()
          });
        } else {
          await db.motararios.update(motarario.localId, { syncStatus: 'failed' });
        }

      } catch (error) {
        console.error('Error subiendo motarario:', error);
        await db.motararios.update(motarario.localId, { syncStatus: 'failed' });
      }
    }
    */
  }

  // Actualizar timestamp de última sincronización
  private async updateLastSync(cobradorId: string) {
    await db.settings.put({
      cobradorId,
      lastFullSync: Date.now(),
      syncEnabled: true,
      autoSync: true,
      printFormat: 'thermal',
      offlineMode: false
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
  public async addMotararioOffline(motararioData: Omit<OfflineMotarorio, 'localId' | 'syncStatus' | 'createdOffline'>) {
    const localId = generateLocalId();

    const motarario: OfflineMotarorio = {
      ...motararioData,
      localId,
      syncStatus: 'pending',
      createdOffline: true
    };

    await db.motararios.add(motarario);

    // Agregar a cola de sincronización
    await db.syncQueue.add({
      type: 'motarorio',
      data: motarario,
      localId,
      attempts: 0,
      status: 'pending'
    });

    return localId;
  }

  // Obtener estado de sincronización
  public async getSyncStatus(cobradorId: string) {
    const [settings, pendingPagos, pendingMotararios, failedItems] = await Promise.all([
      db.settings.get(cobradorId),
      db.pagos.where('syncStatus').equals('pending').and(p => p.cobradorId === cobradorId).count(),
      db.motararios.where('syncStatus').equals('pending').and(m => m.cobradorId === cobradorId).count(),
      db.syncQueue.where('status').equals('failed').count()
    ]);

    return {
      lastSync: settings?.lastFullSync,
      pendingPagos,
      pendingMotararios,
      failedItems,
      isOnline: navigator.onLine,
      syncInProgress: this.syncInProgress
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
    console.log('Conexión restaurada - intentando sincronizar');
    toast.success('Conexión restaurada');
  });

  window.addEventListener('offline', () => {
    console.log('Conexión perdida - modo offline');
    toast.info('Sin conexión - trabajando offline');
  });
}
