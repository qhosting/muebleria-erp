
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  DollarSign, 
  CreditCard, 
  AlertTriangle,
  Calculator,
  Receipt,
  Save
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Cliente, TipoPago } from '@/lib/types';

interface CobranzaModalProps {
  cliente: Cliente;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CobranzaModal({ cliente, isOpen, onClose, onSuccess }: CobranzaModalProps) {
  const { data: session } = useSession();
  const [monto, setMonto] = useState('');
  const [tipoPago, setTipoPago] = useState<TipoPago>('regular');
  const [concepto, setConcepto] = useState('');
  const [loading, setLoading] = useState(false);

  const userId = (session?.user as any)?.id;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!monto || parseFloat(monto) <= 0) {
      toast.error('Por favor ingrese un monto válido');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/pagos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clienteId: cliente.id,
          monto: parseFloat(monto),
          tipoPago,
          concepto: concepto || 'Pago de cuota',
          fechaPago: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Error al registrar pago');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  const calcularNuevoSaldo = () => {
    const montoNumerico = parseFloat(monto) || 0;
    if (tipoPago === 'regular') {
      return Math.max(0, cliente.saldoActual - montoNumerico);
    }
    return cliente.saldoActual; // Los pagos moratorios no afectan el saldo principal
  };

  const montosPredefinidos = [
    cliente.montoPago / 2,
    cliente.montoPago,
    cliente.montoPago * 2,
    cliente.saldoActual
  ].filter(monto => monto > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Registrar Pago</CardTitle>
              <CardDescription>
                Cliente: {cliente.nombreCompleto}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Información del Cliente */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Código:</span>
              <span className="font-mono">{cliente.codigoCliente}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Pago regular:</span>
              <span className="font-semibold">{formatCurrency(cliente.montoPago)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Saldo actual:</span>
              <span className={`font-semibold ${cliente.saldoActual > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(cliente.saldoActual)}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de Pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Pago
              </label>
              <Select value={tipoPago} onValueChange={(value) => setTipoPago(value as TipoPago)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-green-600" />
                      <span>Pago Regular (afecta saldo)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="moratorio">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span>Pago Moratorio (no afecta saldo)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {tipoPago === 'moratorio' && (
                <p className="text-xs text-orange-600 mt-1">
                  Los pagos moratorios son registros independientes y no reducen el saldo principal
                </p>
              )}
            </div>

            {/* Montos Predefinidos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calculator className="inline h-4 w-4 mr-1" />
                Montos Sugeridos
              </label>
              <div className="grid grid-cols-2 gap-2">
                {montosPredefinidos.map((montoSugerido, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMonto(montoSugerido.toString())}
                    className="text-xs"
                  >
                    {formatCurrency(montoSugerido)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto a Cobrar *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Nuevo Saldo */}
            {monto && parseFloat(monto) > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Saldo después del pago:</span>
                  <span className={`font-semibold ${calcularNuevoSaldo() > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(calcularNuevoSaldo())}
                  </span>
                </div>
                {calcularNuevoSaldo() === 0 && (
                  <Badge variant="success" className="mt-2">
                    Cliente quedará al corriente
                  </Badge>
                )}
              </div>
            )}

            {/* Concepto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concepto (opcional)
              </label>
              <Input
                placeholder="Pago de cuota, abono, etc."
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <div className="spinner mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Registrar Pago
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
