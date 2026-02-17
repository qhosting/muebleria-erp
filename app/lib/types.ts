
import { UserRole, StatusCuenta, Periodicidad, TipoPago, MotivoMotarario } from '@prisma/client';

export { UserRole, StatusCuenta, Periodicidad, TipoPago, MotivoMotarario };

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cliente {
  id: string;
  codigoCliente: string;
  fechaVenta: Date;
  nombreCompleto: string;
  telefono?: string;
  vendedor?: string;
  cobradorAsignadoId?: string;
  productoId?: string;
  sucursalId?: string;
  statusCuenta: StatusCuenta;
  direccionCompleta: string;
  descripcionProducto: string;
  diaPago: string;
  montoPago: number;
  periodicidad: Periodicidad;
  saldoActual: number;
  importe1?: number;
  importe2?: number;
  importe3?: number;
  importe4?: number;
  cobradorAsignado?: User;
  createdAt: Date;
  updatedAt: Date;
  // Campos de compatibilidad para offline
  montoAcordado?: number;
  saldoPendiente?: number;
  direccion?: string;
  notas?: string;
}

// Alias para compatibilidad
export interface ClienteOffline {
  id: string;
  nombreCompleto: string;
  telefono?: string;
  direccion: string;
  diaPago: string;
  montoAcordado: number;
  saldoPendiente: number;
  fechaUltimoPago?: string;
  statusCuenta: 'activo' | 'suspendido' | 'cancelado';
  cobradorAsignadoId: string;
  notas?: string;
}

export interface Pago {
  id: string;
  clienteId: string;
  cobradorId: string;
  monto: number;
  concepto?: string;
  tipoPago: TipoPago;
  fechaPago: Date;
  saldoAnterior: number;
  saldoNuevo: number;
  metodoPago: string;
  numeroRecibo?: string;
  localId?: string;
  ticketImpreso: boolean;
  sincronizado: boolean;
  cliente?: Cliente;
  cobrador?: User;
  createdAt: Date;
}

export interface Motarario {
  id: string;
  clienteId: string;
  cobradorId: string;
  motivo: MotivoMotarario;
  descripcion: string;
  fecha: Date;
  proximaVisita?: Date;
  localId?: string;
  sincronizado: boolean;
  cliente?: Cliente;
  cobrador?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlantillaTicket {
  id: string;
  nombre: string;
  contenido: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RutaCobranza {
  id: string;
  cobradorId: string;
  fecha: Date;
  clientesVisitados: any;
  totalCobrado: number;
  cobrador?: User;
  createdAt: Date;
}

export interface DashboardStats {
  totalClientes: number;
  clientesActivos: number;
  totalCobradores: number;
  cobranzaHoy: number;
  cobranzaMes: number;
  clientesMorosos: number;
  saldosTotales: number;
}

export interface ReporteCobranza {
  fecha: string;
  cobrador: string;
  totalCobrado: number;
  clientesVisitados: number;
  pagosRegulares: number;
  pagosMoratorios: number;
}

export interface ClienteMoroso {
  id: string;
  codigoCliente: string;
  nombreCompleto: string;
  diasAtraso: number;
  montoVencido: number;
  telefono?: string;
  cobrador?: string;
}
