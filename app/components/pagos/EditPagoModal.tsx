
'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

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
    tipoPago: '',
    cobradorId: '',
    fechaPago: '',
    monto: 0
  });

  useEffect(() => {
    if (pago) {
      setFormData({
        concepto: pago.concepto || '',
        metodoPago: pago.metodoPago || 'gestor',
        tipoPago: pago.tipoPago || 'regular',
        cobradorId: pago.cobradorId || '',
        fechaPago: pago.fechaPago ? new Date(pago.fechaPago).toISOString().split('T')[0] : '',
        monto: pago.monto || 0
      });
    }
  }, [pago, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/pagos/${pago.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Pago actualizado correctamente');
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Concepto</Label>
            <Input 
              value={formData.concepto}
              onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo Anterior (Ref)</Label>
              <Input 
                disabled
                value={pago?.saldoAnterior || 0}
                className="bg-gray-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select 
                value={formData.metodoPago} 
                onValueChange={(v) => setFormData({ ...formData, metodoPago: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GESTOR">GESTOR</SelectItem>
                  <SelectItem value="GESTOR BANCOS">GESTOR BANCOS</SelectItem>
                  <SelectItem value="BANCOS BOT">BANCOS BOT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Pago</Label>
              <Select 
                value={formData.tipoPago} 
                onValueChange={(v) => setFormData({ ...formData, tipoPago: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="moratorio">Moratorio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Gestor / Cobrador</Label>
            <Select 
              value={formData.cobradorId} 
              onValueChange={(v) => setFormData({ ...formData, cobradorId: v })}
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {cobradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha de Pago</Label>
            <Input 
              type="date"
              value={formData.fechaPago}
              onChange={(e) => setFormData({ ...formData, fechaPago: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
