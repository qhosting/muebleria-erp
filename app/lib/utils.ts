
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Periodicidad } from '@prisma/client';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }
  
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Fecha inválida';
  }
  
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

export function getDayName(dayNumber: string): string {
  const days = {
    '1': 'Lunes',
    '2': 'Martes',
    '3': 'Miércoles',
    '4': 'Jueves',
    '5': 'Viernes',
    '6': 'Sábado',
    '7': 'Domingo',
  };
  return days[dayNumber as keyof typeof days] || dayNumber;
}

export function getPeriodicidadLabel(periodicidad: Periodicidad): string {
  const labels = {
    semanal: 'Semanal',
    quincenal: 'Quincenal',
    mensual: 'Mensual',
  };
  return labels[periodicidad];
}

export function calcularDiasAtraso(fechaUltimoPago: Date | string | null | undefined, periodicidad: Periodicidad): number {
  if (!fechaUltimoPago) return 0;
  
  let fechaObj: Date;
  
  if (typeof fechaUltimoPago === 'string') {
    fechaObj = new Date(fechaUltimoPago);
  } else {
    fechaObj = fechaUltimoPago;
  }
  
  // Check if the date is valid
  if (isNaN(fechaObj.getTime())) {
    return 0;
  }
  
  const hoy = new Date();
  const diasPorPeriodicidad: Record<Periodicidad, number> = {
    semanal: 7,
    quincenal: 15,
    mensual: 30,
  };
  
  const diasTranscurridos = Math.floor(
    (hoy.getTime() - fechaObj.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const diasCiclo = diasPorPeriodicidad[periodicidad];
  return Math.max(0, diasTranscurridos - diasCiclo);
}

export function generarCodigoCliente(): string {
  const fecha = new Date();
  const año = fecha.getFullYear().toString().slice(-2);
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `CLI${año}${mes}${random}`;
}

export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

export function canManageClients(userRole: string): boolean {
  return hasPermission(userRole, ['admin', 'gestor_cobranza']);
}

export function canViewReports(userRole: string): boolean {
  return hasPermission(userRole, ['admin', 'gestor_cobranza', 'reporte_cobranza']);
}

export function canManageUsers(userRole: string): boolean {
  return hasPermission(userRole, ['admin']);
}

export function generateTicketContent(
  cliente: any,
  pago: any,
  plantilla: string
): string {
  return plantilla
    .replace('{{cliente_nombre}}', cliente.nombreCompleto)
    .replace('{{cliente_codigo}}', cliente.codigoCliente)
    .replace('{{monto}}', formatCurrency(pago.monto))
    .replace('{{fecha}}', formatDateTime(pago.fechaPago))
    .replace('{{concepto}}', pago.concepto || 'Pago de cuota')
    .replace('{{saldo_anterior}}', formatCurrency(pago.saldoAnterior))
    .replace('{{saldo_nuevo}}', formatCurrency(pago.saldoNuevo))
    .replace('{{cobrador}}', pago.cobrador?.name || '');
}
