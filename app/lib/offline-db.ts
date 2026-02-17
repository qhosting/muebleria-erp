
// Base de datos offline con Dexie (IndexedDB) para PWA de cobranza móvil
import Dexie, { Table } from 'dexie';

// Interfaces para datos offline
export interface OfflineCliente {
  id: string;
  nombreCompleto: string;
  telefono: string;
  direccion: string;
  diaPago: string;
  montoAcordado: number;
  saldoPendiente: number;
  fechaUltimoPago?: string;
  statusCuenta: 'activo' | 'suspendido' | 'cancelado';
  cobradorAsignadoId: string;
  notas?: string;
  // Metadatos offline
  lastSync: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

export interface OfflinePago {
  id: string;
  clienteId: string;
  monto: number;
  tipoPago: 'regular' | 'abono' | 'liquidacion' | 'mora';
  concepto: string;
  fechaPago: string;
  cobradorId: string;
  metodoPago: 'efectivo' | 'transferencia' | 'cheque';
  numeroRecibo?: string;
  // Metadatos offline
  localId: string; // ID temporal local hasta sincronizar
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  createdOffline: boolean;
  printStatus: 'pending' | 'printed' | 'reprinted';
  lastSync?: number;
}

export interface OfflineMotarorio {
  id: string;
  clienteId: string;
  cobradorId: string;
  motivo: 'no_estaba' | 'sin_dinero' | 'viajo' | 'enfermo' | 'otro';
  descripcion: string;
  fecha: string;
  proximaVisita?: string;
  // Metadatos offline
  localId: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  createdOffline: boolean;
  lastSync?: number;
}

export interface SyncQueue {
  id?: number;
  type: 'pago' | 'motarorio' | 'cliente_update';
  data: any;
  localId: string;
  attempts: number;
  lastAttempt?: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
}

export interface AppSettings {
  cobradorId: string;
  lastFullSync?: number;
  syncEnabled: boolean;
  autoSync: boolean;
  bluetoothPrinter?: string;
  printFormat: 'thermal' | 'standard';
  offlineMode: boolean;
}

// Base de datos Dexie
export class OfflineDatabase extends Dexie {
  clientes!: Table<OfflineCliente>;
  pagos!: Table<OfflinePago>;
  motararios!: Table<OfflineMotarorio>;
  syncQueue!: Table<SyncQueue>;
  settings!: Table<AppSettings>;

  constructor() {
    super('MuebleriaCobranzaDB');
    
    this.version(1).stores({
      clientes: 'id, nombreCompleto, cobradorAsignadoId, diaPago, statusCuenta, lastSync, syncStatus',
      pagos: '++id, localId, clienteId, cobradorId, fechaPago, syncStatus, createdOffline, printStatus',
      motararios: '++id, localId, clienteId, cobradorId, fecha, syncStatus, createdOffline',
      syncQueue: '++id, type, localId, status, attempts, lastAttempt',
      settings: 'cobradorId'
    });
  }
}

export const db = new OfflineDatabase();

// Utilidades para generar IDs únicos
export const generateLocalId = () => {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Funciones de utilidad para sync status
export const getSyncStats = async (cobradorId: string) => {
  const [clientesCount, pagosCount, motarariosCount, pendingSyncCount] = await Promise.all([
    db.clientes.where('cobradorAsignadoId').equals(cobradorId).count(),
    db.pagos.where('cobradorId').equals(cobradorId).count(),
    db.motararios.where('cobradorId').equals(cobradorId).count(),
    db.syncQueue.where('status').equals('pending').count()
  ]);

  return {
    clientesOffline: clientesCount,
    pagosTotal: pagosCount,
    motarariosTotal: motarariosCount,
    pendingSync: pendingSyncCount
  };
};
