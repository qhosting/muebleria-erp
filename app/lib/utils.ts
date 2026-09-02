
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Periodicidad } from '@prisma/client';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined, decimals: number = 0): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (value === null || value === undefined || isNaN(value as number)) {
    return decimals === 0 ? '$0' : `$0.${'0'.repeat(decimals)}`;
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value as number);
}

const TIMEZONE_CDMX = 'America/Mexico_City';

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';

  // Si es un string simple con formato YYYY-MM-DD o ISO con medianoche UTC
  if (typeof date === 'string') {
    const trimmed = date.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](00:00(?::00(?:\.000)?)?(?:Z|[+-]00:00)?))?$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return `${day}/${month}/${year}`;
    }
  }

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

  // Si el objeto Date tiene medianoche exacta UTC (00:00:00.000Z), representa una fecha pura sin hora registrada
  if (dateObj.getUTCHours() === 0 && dateObj.getUTCMinutes() === 0 && dateObj.getUTCSeconds() === 0 && dateObj.getUTCMilliseconds() === 0) {
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const year = dateObj.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIMEZONE_CDMX,
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
    timeZone: TIMEZONE_CDMX,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dateObj);
}

/**
 * Parsea una fecha de ticket de forma segura en zona horaria CDMX (UTC-6).
 * Si la fecha proporcionada es nula, vacía, "null", "N/A" o inválida,
 * toma la fecha y hora del momento en que se procesa/envía (new Date()).
 */
export function parseValidDate(dateInput?: Date | string | null, hrInput?: string | null): Date {
  if (!dateInput || dateInput === 'null' || dateInput === 'undefined' || dateInput === 'N/A' || dateInput === 'none') {
    return new Date();
  }

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return new Date();
    return dateInput;
  }

  const str = String(dateInput).trim();
  
  let y = 0, m = 0, d = 0;
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const mxMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  let hr = 12, min = 0, sec = 0;
  let hasExplicitTime = false;

  if (hrInput && typeof hrInput === 'string' && hrInput !== 'null' && hrInput !== 'undefined') {
    const parts = hrInput.trim().split(':');
    if (parts.length >= 2) {
      hr = parseInt(parts[0], 10) || 0;
      min = parseInt(parts[1], 10) || 0;
      sec = parseInt(parts[2], 10) || 0;
      hasExplicitTime = true;
    }
  }

  if (isoMatch) {
    y = parseInt(isoMatch[1], 10);
    m = parseInt(isoMatch[2], 10);
    d = parseInt(isoMatch[3], 10);
    const timeMatch = str.match(/[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (timeMatch && !hasExplicitTime) {
      hr = parseInt(timeMatch[1], 10) || 0;
      min = parseInt(timeMatch[2], 10) || 0;
      sec = parseInt(timeMatch[3], 10) || 0;
    }
  } else if (mxMatch) {
    d = parseInt(mxMatch[1], 10);
    m = parseInt(mxMatch[2], 10);
    y = parseInt(mxMatch[3], 10);
  } else {
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  }

  const yStr = String(y).padStart(4, '0');
  const mStr = String(m).padStart(2, '0');
  const dStr = String(d).padStart(2, '0');
  const hrStr = String(hr).padStart(2, '0');
  const minStr = String(min).padStart(2, '0');
  const secStr = String(sec).padStart(2, '0');

  const cdmxIso = `${yStr}-${mStr}-${dStr}T${hrStr}:${minStr}:${secStr}-06:00`;
  const result = new Date(cdmxIso);
  return isNaN(result.getTime()) ? new Date() : result;
}

/**
 * Convierte strings de fecha (ej. "2026-09-01", "2026-09-01T00:00:00.000Z")
 * en un rango con límites de inicio (00:00:00.000) y fin (23:59:59.999)
 * en la zona horaria de la Ciudad de México (America/Mexico_City / UTC-6).
 */
export function getCdmxDateRange(fechaDesdeStr?: string | null, fechaHastaStr?: string | null): { gte: Date; lte: Date } {
  const dStr = fechaDesdeStr ? fechaDesdeStr.split('T')[0].trim() : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
  const hStr = fechaHastaStr ? fechaHastaStr.split('T')[0].trim() : dStr;

  const gte = new Date(`${dStr}T00:00:00.000-06:00`);
  const lte = new Date(`${hStr}T23:59:59.999-06:00`);

  return {
    gte: isNaN(gte.getTime()) ? new Date() : gte,
    lte: isNaN(lte.getTime()) ? new Date() : lte
  };
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
  const labels: Record<Periodicidad, string> = {
    diario: 'Diario',
    semanal: 'Semanal',
    catorcenal: 'Catorcenal',
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
    diario: 1,
    semanal: 7,
    catorcenal: 14,
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
  return hasPermission(userRole, ['admin', 'gestor_cobranza', 'direccion']);
}

export function canViewReports(userRole: string): boolean {
  return hasPermission(userRole, ['admin', 'gestor_cobranza', 'reporte_cobranza', 'direccion']);
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

export function formatWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Limpiar caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Si tiene 10 dígitos, asumir México (+52)
  if (cleaned.length === 10) {
    return `52${cleaned}`;
  }
  
  // Si ya tiene código de país (ej. 521442...) o formato internacional
  return cleaned;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  
  // Intentar la API moderna de navigator.clipboard primero si está disponible
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard falló, usando método fallback:', err);
  }

  // Fallback usando document.execCommand para WebView móvil / HTTP
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Error al copiar al portapapeles con fallback:', err);
    return false;
  }
}

