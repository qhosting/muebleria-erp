'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Save, Calculator, DollarSign, UserCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface EditPagoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago: any;
  cobradores: { id: string; name: string }[];
  onSuccess: () => void;
}

export function EditPagoModal({
  open,
  onOpenChange,
  pago,
  cobradores,
  onSuccess
}: EditPagoModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    concepto: '',
    metodoPago: '',
    tipoPago: 'regular',
    cobradorId: '',
    fechaPago: '',
    monto: 0,
    interesMoratorio: 0,
    saldoAnterior: 0,
    saldoNuevo: 0,
    actualizarSaldoCliente: true,
  });

  useEffect(() => {
    if (pago) {
      let fPago = '';
      if (pago.fechaPago) {
        if (typeof pago.fechaPago === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pago.fechaPago.trim())) {
          fPago = pago.fechaPago.trim();
        } else {
          try {
            fPago = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date(pago.fechaPago));
          } catch {
            fPago = String(pago.fechaPago).slice(0, 10);
          }
        }
      }

      const sAnt = pago.saldoAnterior !== undefined && pago.saldoAnterior !== null ? parseFloat(pago.saldoAnterior.toString()) : 0;
      const sNvo = pago.saldoNuevo !== undefined && pago.saldoNuevo !== null ? parseFloat(pago.saldoNuevo.toString()) : 0;
      const montoNum = pago.monto !== undefined && pago.monto !== null ? parseFloat(pago.monto.toString()) : 0;

      setFormData({
        concepto: pago.concepto || '',
        metodoPago: (pago.metodoPago || 'GESTOR').toUpperCase(),
        tipoPago: pago.tipoPago || 'regular',
        cobradorId: pago.cobradorId || '',
        fechaPago: fPago,
        monto: montoNum,
        interesMoratorio: pago.interesMoratorio ? parseFloat(pago.interesMoratorio.toString()) : 0,
        saldoAnterior: sAnt,
        saldoNuevo: sNvo,
        actualizarSaldoCliente: true,
      });
    }
  }, [pago, open]);

  const handleCalcularSaldoNuevo = () => {
    const abono = formData.tipoPago === 'regular' ? Number(formData.monto || 0) : 0;
    const nuevoCalculado = Math.max(0, Number((Number(formData.saldoAnterior || 0) - abono).toFixed(2)));
    setFormData((prev) => ({ ...prev, saldoNuevo: nuevoCalculado }));
    toast.info(`Saldo nuevo calculado: ${formatCurrency(nuevoCalculado)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        concepto: formData.concepto,
        metodoPago: formData.metodoPago,
        tipoPago: formData.tipoPago,
        cobradorId: formData.cobradorId,
        fechaPago: formData.fechaPago,
        monto: formData.monto,
        interesMoratorio: formData.interesMoratorio,
        saldoAnterior: formData.saldoAnterior,
        saldoNuevo: formData.saldoNuevo,
        actualizarSaldoCliente: formData.actualizarSaldoCliente,
      };

      const response = await fetch(`/api/pagos/${pago.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Pago y saldos actualizados correctamente');
        onSuccess();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-lg font-bold">Editar Pago y Saldos</DialogTitle>
            {pago && (
              <span 
                className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border select-all"
                title={`ID de Pago: ${pago.id}`}
              >
                {pago.id}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Resumen del Cliente */}
        {pago?.cliente && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex justify-between items-center -mt-1">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
                <UserCheck className="h-4 w-4 text-slate-500" />
                <span>{pago.cliente.nombreCompleto}</span>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Contrato: <span className="font-bold text-slate-700">{pago.cliente.codigoCliente}</span>
              </div>
            </div>
            {pago.cliente.saldoActual !== undefined && (
              <div className="text-right bg-white px-2.5 py-1 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Saldo en Expediente</span>
                <span className="font-bold text-slate-900 text-sm font-mono">
                  {formatCurrency(pago.cliente.saldoActual)}
                </span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Concepto */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Concepto</Label>
            <Input 
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              className="h-9"
            />
          </div>

          {/* Montos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Monto / Abono ($)</Label>
              <Input 
                type="number"
                step="0.01"
                min="0"
                value={formData.monto}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setFormData({ ...formData, monto: val });
                }}
                className="h-9 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Interés Moratorio ($)</Label>
              <Input 
                type="number"
                step="0.01"
                min="0"
                value={formData.interesMoratorio}
                onChange={(e) => setFormData({ ...formData, interesMoratorio: parseFloat(e.target.value) || 0 })}
                className="h-9 font-mono"
              />
            </div>
          </div>

          {/* SECCIÓN DESTACADA: EDICIÓN DE SALDOS */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sky-900 font-semibold text-xs">
                <DollarSign className="h-4 w-4 text-sky-600" />
                <span>Control y Ajuste de Saldos</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCalcularSaldoNuevo}
                className="h-7 text-xs bg-white hover:bg-sky-100 text-sky-800 border-sky-300 gap-1 font-medium"
                title="Calcula automáticamente: Saldo Anterior menos Monto"
              >
                <Calculator className="h-3.5 w-3.5 text-sky-600" />
                Auto-Calcular Nuevo
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Saldo Anterior ($)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.saldoAnterior}
                  onChange={(e) => setFormData({ ...formData, saldoAnterior: parseFloat(e.target.value) || 0 })}
                  className="h-9 bg-white font-mono font-medium border-sky-200 focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 block">Saldo antes de aplicar este pago</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Saldo Nuevo ($)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.saldoNuevo}
                  onChange={(e) => setFormData({ ...formData, saldoNuevo: parseFloat(e.target.value) || 0 })}
                  className="h-9 bg-white font-mono font-bold text-sky-950 border-sky-300 focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 block">Saldo resultante tras este pago</span>
              </div>
            </div>

            {/* Checkbox para sincronizar con la cuenta del cliente */}
            <div className="pt-1 border-t border-sky-200/60">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={formData.actualizarSaldoCliente}
                  onCheckedChange={(checked) => setFormData({ ...formData, actualizarSaldoCliente: Boolean(checked) })}
                  className="mt-0.5 border-sky-400 data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
                />
                <div className="space-y-0.5 text-xs">
                  <span className="font-semibold text-slate-800">
                    Sincronizar saldo actual del cliente ({formatCurrency(formData.saldoNuevo)})
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Actualiza directamente el saldo del expediente del cliente para que refleje este nuevo saldo.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Tipo de Pago y Método de Pago */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Pago</Label>
              <Select 
                value={formData.tipoPago} 
                onValueChange={(v) => setFormData({ ...formData, tipoPago: v })}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="moratorio">Moratorio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Método de Pago</Label>
              <Select 
                value={formData.metodoPago} 
                onValueChange={(v) => setFormData({ ...formData, metodoPago: v })}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANCOS BOT">BANCOS BOT</SelectItem>
                  <SelectItem value="BANCARIO">BANCARIO</SelectItem>
                  <SelectItem value="GESTOR">GESTOR</SelectItem>
                  {!['BANCOS BOT', 'BANCARIO', 'GESTOR'].includes(formData.metodoPago) && formData.metodoPago && (
                    <SelectItem value={formData.metodoPago}>{formData.metodoPago}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gestor y Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Gestor / Cobrador</Label>
              <Select 
                value={formData.cobradorId} 
                onValueChange={(v) => setFormData({ ...formData, cobradorId: v })}
              >
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {cobradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Fecha de Pago</Label>
              <Input 
                type="date"
                value={formData.fechaPago}
                onChange={(e) => setFormData({ ...formData, fechaPago: e.target.value })}
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
