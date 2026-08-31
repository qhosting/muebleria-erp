'use client';

import React from 'react';
import { X, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

export interface TicketData {
  numeroRecibo?: string;
  cliente: {
    nombreCompleto: string;
    codigoCliente?: string;
    telefono?: string;
    direccion?: string;
    diaPago?: string | number;
  };
  cobrador: {
    nombre: string;
    id: string;
  };
  pago: {
    monto: number;
    interesMoratorio?: number;
    gastosCobranza?: number;
    tipoPago: string;
    metodoPago: string;
    concepto?: string;
    fechaPago: string;
  };
  saldos: {
    anterior: number;
    nuevo: number;
    consolidado?: number;
  };
  empresa: {
    nombre: string;
    direccion?: string;
    telefono?: string;
  };
}

interface VisualizarTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketData: TicketData | null;
  onPrint?: () => void;
  isPrinting?: boolean;
}

export function VisualizarTicketModal({
  isOpen,
  onClose,
  ticketData,
  onPrint,
  isPrinting = false,
}: VisualizarTicketModalProps) {
  if (!isOpen || !ticketData) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getDayName = (dayNumber: string | number) => {
    const days: { [key: string]: string } = {
      '1': 'LUNES',
      '2': 'MARTES',
      '3': 'MIÉRCOLES',
      '4': 'JUEVES',
      '5': 'VIERNES',
      '6': 'SÁBADO',
      '7': 'DOMINGO',
    };
    return days[String(dayNumber)] || String(dayNumber);
  };

  const formatDate = (dateString: string) => {
    return formatDateTime(dateString);
  };

  const totalRecibido =
    Number(ticketData.pago.monto || 0) +
    Number(ticketData.pago.interesMoratorio || 0) +
    Number(ticketData.pago.gastosCobranza || 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-850 flex justify-between items-center bg-slate-850/50">
          <span className="text-slate-100 font-bold text-sm">Vista Previa del Ticket</span>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Ticket view */}
        <div className="p-4 bg-slate-950 flex justify-center overflow-x-auto">
          {/* Simulated Thermal Ticket */}
          <div className="w-full max-w-[290px] bg-[#faf8f5] text-slate-800 font-mono text-[11px] p-5 shadow-inner rounded-sm border border-slate-200/80 relative">
            {/* Top jagged/torn effect */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-repeat-x bg-[linear-gradient(45deg,transparent_33.333%,#faf8f5_33.333%,#faf8f5_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#faf8f5_33.333%,#faf8f5_66.667%,transparent_66.667%)] bg-[size:6px_4px] -mt-1"></div>

            {/* Header info */}
            <div className="text-center space-y-1 mb-3">
              <p className="font-extrabold text-xs uppercase tracking-tight">
                {ticketData.empresa.nombre}
              </p>
              {ticketData.empresa.direccion && (
                <p className="text-[10px] leading-tight text-slate-600">
                  {ticketData.empresa.direccion}
                </p>
              )}
              {ticketData.empresa.telefono && (
                <p className="text-[10px] text-slate-600">
                  {ticketData.empresa.telefono}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-350 my-2"></div>

            {/* Title / Folio */}
            <div className="text-center space-y-0.5 mb-2">
              <p className="font-extrabold uppercase">Comprobante de Pago</p>
              {ticketData.numeroRecibo && (
                <p className="font-extrabold text-[10px]">No. {ticketData.numeroRecibo}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-350 my-2"></div>

            {/* Client info */}
            <div className="space-y-1 text-left">
              <p className="font-extrabold">CLIENTE:</p>
              <p className="leading-tight">{ticketData.cliente.nombreCompleto}</p>
              {ticketData.cliente.codigoCliente && (
                <p className="text-slate-500 text-xs font-semibold">Contrato: {ticketData.cliente.codigoCliente}</p>
              )}
              {ticketData.cliente.telefono && <p>Tel: {ticketData.cliente.telefono}</p>}
              {ticketData.cliente.direccion && (
                <p className="leading-tight text-slate-600">Dir: {ticketData.cliente.direccion}</p>
              )}
              {ticketData.cliente.diaPago && (
                <p>Dia Pago: {getDayName(ticketData.cliente.diaPago)}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-350 my-2"></div>

            {/* Payment Details */}
            <div className="space-y-1 text-left">
              <p className="font-extrabold">DETALLE DEL PAGO:</p>
              <p>Fecha: {formatDate(ticketData.pago.fechaPago)}</p>
              <p>Tipo: {ticketData.pago.tipoPago.toUpperCase()}</p>
              <p>Metodo: {ticketData.pago.metodoPago.toUpperCase()}</p>
              {ticketData.pago.concepto && (
                <p className="leading-tight text-slate-600">Concepto: {ticketData.pago.concepto}</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-350 my-2"></div>

            {/* Financials / Importes */}
            <div className="space-y-1.5">
              <p className="font-extrabold">IMPORTES:</p>
              
              <div className="flex justify-between">
                <span>Saldo Anterior:</span>
                <span>{formatCurrency(ticketData.saldos.anterior)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Pago:</span>
                <span>{formatCurrency(ticketData.pago.monto)}</span>
              </div>

              {Number(ticketData.pago.interesMoratorio || 0) > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Moratorio:</span>
                  <span>{formatCurrency(ticketData.pago.interesMoratorio || 0)}</span>
                </div>
              )}

              {Number(ticketData.pago.gastosCobranza || 0) > 0 && (
                <div className="flex justify-between text-blue-700">
                  <span>Gastos de Cobranza:</span>
                  <span>{formatCurrency(ticketData.pago.gastosCobranza || 0)}</span>
                </div>
              )}

              <div className="flex justify-between font-extrabold pt-1 border-t border-dotted border-slate-300">
                <span>TOTAL RECIBIDO:</span>
                <span>{formatCurrency(totalRecibido)}</span>
              </div>

              <div className="border-t border-dashed border-slate-350 my-1"></div>

              <div className="flex justify-between font-extrabold">
                <span>Saldo Actual:</span>
                <span>{formatCurrency(ticketData.saldos.nuevo)}</span>
              </div>

              {ticketData.saldos.consolidado && ticketData.saldos.consolidado > ticketData.saldos.nuevo && (
                <div className="mt-1 pt-1 border-t border-dotted border-slate-300 text-center space-y-0.5">
                  <div className="flex justify-between font-extrabold">
                    <span>DEUDA TOTAL:</span>
                    <span>{formatCurrency(ticketData.saldos.consolidado)}</span>
                  </div>
                  <p className="text-[8px] text-slate-500 leading-tight">(Suma de todas sus cuentas)</p>
                </div>
              )}

              {Number(ticketData.saldos.nuevo) <= 0 && (
                <p className="text-center font-extrabold text-emerald-800 tracking-wider pt-2">
                  *** CLIENTE AL DIA ***
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-350 my-2"></div>

            {/* Collector info */}
            <div className="space-y-0.5 text-left text-[10px] text-slate-600">
              <p>Cobrador: {ticketData.cobrador.nombre}</p>
              <p>ID: {ticketData.cobrador.id}</p>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-350 my-2"></div>

            {/* Footer message */}
            <div className="text-center space-y-1">
              <p className="font-extrabold tracking-wide uppercase text-[10px]">¡Gracias por su pago!</p>
              <p className="text-[9px] text-slate-500">
                Impreso: {formatDate(new Date().toISOString())}
              </p>
            </div>

            {/* Bottom jagged/torn effect */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-repeat-x bg-[linear-gradient(45deg,transparent_33.333%,#faf8f5_33.333%,#faf8f5_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#faf8f5_33.333%,#faf8f5_66.667%,transparent_66.667%)] bg-[size:6px_4px] -mb-1 rotate-180"></div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-850 flex gap-3 bg-slate-900">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 h-11 text-xs"
          >
            Cerrar
          </Button>

          {onPrint && (
            <Button
              onClick={onPrint}
              disabled={isPrinting}
              className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold h-11 text-xs"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Imprimiendo...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  <span>Imprimir</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
