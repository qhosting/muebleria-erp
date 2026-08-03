'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Copy, X, Camera, ShieldCheck, DollarSign, Calendar, User, Receipt, Phone } from 'lucide-react';
import { formatCurrency, copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';

export interface ComprobanteData {
  numeroRecibo?: string;
  clienteNombre: string;
  clienteCodigo: string;
  clienteTelefono?: string;
  fechaPago: string;
  montoAbono: number;
  interesMoratorio?: number;
  gastosCobranza?: number;
  montoTotal: number;
  saldoAnterior: number;
  saldoNuevo: number;
  metodoPago?: string;
  concepto?: string;
  cobradorNombre?: string;
}

interface ComprobanteCapturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ComprobanteData | null;
}

export function ComprobanteCapturaModal({
  isOpen,
  onClose,
  data
}: ComprobanteCapturaModalProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const moratorio = Number(data.interesMoratorio || 0);
  const gastos = Number(data.gastosCobranza || 0);
  const abono = Number(data.montoAbono || 0);
  const total = Number(data.montoTotal || (abono + moratorio + gastos));

  const fechaFormateada = (() => {
    try {
      const d = new Date(data.fechaPago);
      if (isNaN(d.getTime())) return data.fechaPago;
      return d.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return data.fechaPago;
    }
  })();

  const handleCopySummary = () => {
    const text = `*GRUPO MUEBLERO DASO*\n*COMPROBANTE DE PAGO DIGITAL*\n\n` +
      `📌 *Folio/Recibo:* ${data.numeroRecibo || 'REGISTRADO'}\n` +
      `📅 *Fecha:* ${fechaFormateada}\n` +
      `👤 *Cliente:* ${data.clienteNombre} (${data.clienteCodigo})\n` +
      `👨‍💼 *Cobrador:* ${data.cobradorNombre || 'GESTOR'}\n\n` +
      `💵 *Monto Abono:* ${formatCurrency(abono)}\n` +
      (moratorio > 0 ? `⚠️ *Moratorio:* ${formatCurrency(moratorio)}\n` : '') +
      (gastos > 0 ? `📋 *Gastos Cobranza:* ${formatCurrency(gastos)}\n` : '') +
      `💰 *TOTAL COBRADO:* ${formatCurrency(total)}\n\n` +
      `📊 *Saldo Anterior:* ${formatCurrency(data.saldoAnterior)}\n` +
      `✅ *NUEVO SALDO:* ${formatCurrency(data.saldoNuevo)}\n\n` +
      `¡Gracias por su pago!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Resumen de pago copiado al portapapeles');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden bg-slate-950 text-white border border-slate-800 rounded-3xl shadow-2xl">
        {/* Banner de instrucción para captura */}
        <div className="bg-amber-500 text-slate-950 text-xs font-black py-2 px-4 text-center flex items-center justify-center gap-1.5 uppercase tracking-wider">
          <Camera className="w-4 h-4 animate-bounce" />
          Muestra en pantalla para Captura de Pantalla
        </div>

        {/* Tarjeta de Comprobante Lista para Captura */}
        <div className="p-6 space-y-5 select-text bg-gradient-to-b from-slate-900 to-slate-950">
          {/* Encabezado oficial */}
          <div className="text-center space-y-1 pb-3 border-b border-slate-800">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-black tracking-tight text-white uppercase">Grupo Mueblero DASO</h2>
            </div>
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
              Comprobante Digital de Pago
            </p>
            <div className="pt-2 flex justify-center items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] px-3 py-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400 inline" />
                PAGO REGISTRADO
              </Badge>
            </div>
          </div>

          {/* Información principal del cliente y recibo */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800/80 space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-400 font-mono text-[11px]">
              <span>Recibo / Folio:</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded select-all">
                {data.numeroRecibo || 'REGISTRADO'}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Fecha y Hora:</span>
              <span className="font-semibold text-slate-200">{fechaFormateada}</span>
            </div>

            <div className="border-t border-slate-800/80 pt-2 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Cliente</span>
              <div className="text-sm font-bold text-white flex items-center justify-between">
                <span className="truncate select-text">{data.clienteNombre}</span>
                <span 
                  className="font-mono bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded text-[11px] select-all flex items-center gap-1 cursor-copy border border-blue-700/60 active:bg-blue-800"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const success = await copyToClipboard(data.clienteCodigo);
                    if (success) toast.success(`Código copiado: ${data.clienteCodigo}`);
                  }}
                  onTouchEnd={async (e) => {
                    e.stopPropagation();
                    const success = await copyToClipboard(data.clienteCodigo);
                    if (success) toast.success(`Código copiado: ${data.clienteCodigo}`);
                  }}
                  title="Tocar para copiar código"
                >
                  {data.clienteCodigo}
                  <Copy className="w-3 h-3 text-blue-300 inline flex-shrink-0" />
                </span>
              </div>
            </div>

            {data.cobradorNombre && (
              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="text-slate-400">Cobrador / Gestor:</span>
                <span className="font-semibold text-slate-300">{data.cobradorNombre}</span>
              </div>
            )}
          </div>

          {/* Desglose del Pago */}
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-1">
              Desglose de Cobro
            </h4>
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2.5">
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span>Abono Principal:</span>
                <span className="font-bold">{formatCurrency(abono)}</span>
              </div>

              {moratorio > 0 && (
                <div className="flex justify-between items-center text-xs text-red-400 font-medium">
                  <span>Interés Moratorio:</span>
                  <span className="font-bold">{formatCurrency(moratorio)}</span>
                </div>
              )}

              {gastos > 0 && (
                <div className="flex justify-between items-center text-xs text-amber-400 font-medium">
                  <span>Gastos de Cobranza:</span>
                  <span className="font-bold">{formatCurrency(gastos)}</span>
                </div>
              )}

              <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                <span className="text-sm font-black uppercase text-emerald-400">Total Cobrado:</span>
                <span className="text-2xl font-black text-emerald-400">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Estado de Cuenta */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 rounded-2xl p-4 border border-slate-800/90 grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Saldo Anterior</p>
              <p className="text-sm font-bold text-slate-300">{formatCurrency(data.saldoAnterior)}</p>
            </div>
            <div className="border-l border-slate-800 pl-3">
              <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider mb-1">Nuevo Saldo</p>
              <p className="text-lg font-black text-emerald-400">{formatCurrency(data.saldoNuevo)}</p>
            </div>
          </div>

          {/* Pie de comprobante */}
          <p className="text-[10px] text-center text-slate-500 font-mono">
            Comprobante oficial digital — Grupo Mueblero DASO
          </p>
        </div>

        {/* Acciones del Modal */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 grid grid-cols-2 gap-3">
          <Button
            onClick={handleCopySummary}
            variant="outline"
            className="w-full border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-bold h-11"
          >
            <Copy className="w-4 h-4 mr-1.5" />
            {copied ? '¡Copiado!' : 'Copiar Resumen'}
          </Button>

          <Button
            onClick={onClose}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black h-11"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
