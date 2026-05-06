'use client';

import { useState } from 'react';
import { X, DollarSign, Calculator, Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

interface ArqueoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sistemaEfectivo: number;
  onPrint: (arqueo: any) => void;
}

export function ArqueoModal({ isOpen, onClose, sistemaEfectivo, onPrint }: ArqueoModalProps) {
  const [efectivoFisico, setEfectivoFisico] = useState('');
  const [paso, setPaso] = useState<'entrada' | 'resultado'>('entrada');

  const montoFisico = parseFloat(efectivoFisico) || 0;
  const diferencia = montoFisico - sistemaEfectivo;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-slate-100 font-bold text-lg">Arqueo de Caja</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800">
              <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>

          {paso === 'entrada' ? (
            <div className="space-y-6">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Efectivo en Sistema</p>
                <p className="text-2xl font-black text-white">{formatCurrency(sistemaEfectivo)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400 px-1">Efectivo Físico (Contado)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={efectivoFisico}
                    onChange={(e) => setEfectivoFisico(e.target.value)}
                    className="pl-12 h-16 text-2xl font-black bg-slate-950 border-slate-800 rounded-2xl focus:ring-emerald-500"
                  />
                </div>
              </div>

              <Button 
                onClick={() => setPaso('resultado')}
                disabled={!efectivoFisico}
                className="w-full py-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-lg font-black"
              >
                CALCULAR DIFERENCIA
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="text-center space-y-2">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${diferencia === 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                  {diferencia === 0 ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                </div>
                <h4 className="text-xl font-black text-white">
                  {diferencia === 0 ? 'Caja Cuadrada' : diferencia > 0 ? 'Sobrante de Caja' : 'Faltante de Caja'}
                </h4>
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-800 divide-y divide-slate-800/50">
                <div className="p-4 flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase">Sistema</span>
                  <span className="text-lg font-bold text-slate-300">{formatCurrency(sistemaEfectivo)}</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold uppercase">Físico</span>
                  <span className="text-lg font-bold text-white">{formatCurrency(montoFisico)}</span>
                </div>
                <div className={`p-4 flex justify-between items-center ${diferencia < 0 ? 'bg-red-500/10' : diferencia > 0 ? 'bg-emerald-500/10' : ''}`}>
                  <span className="text-xs font-black uppercase">Diferencia</span>
                  <span className={`text-xl font-black ${diferencia < 0 ? 'text-red-500' : diferencia > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {diferencia > 0 ? '+' : ''}{formatCurrency(diferencia)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setPaso('entrada')}
                  className="py-6 rounded-xl border-slate-700 text-slate-400"
                >
                  REINTENTAR
                </Button>
                <Button 
                  onClick={() => onPrint({ sistema: sistemaEfectivo, fisico: montoFisico, diferencia })}
                  className="py-6 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  IMPRIMIR
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
