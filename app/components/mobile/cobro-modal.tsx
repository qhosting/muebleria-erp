
// Modal de cobro optimizado para móvil offline
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { obtenerUbicacionCobrador } from '@/lib/native/location';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  X,
  DollarSign,
  CreditCard,
  Calculator,
  Save,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  Printer,
  Settings
} from 'lucide-react';
import { db, OfflineCliente, OfflinePago, generateLocalId } from '@/lib/offline-db';
import { syncService } from '@/lib/sync-service';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useBluetoothPrinter } from '@/hooks/use-bluetooth-printer';
import { TicketData } from '@/lib/bluetooth-printer';
import { PrinterConfigModal } from './printer-config-modal';
import { Switch } from '@/components/ui/switch';

interface CobroModalProps {
  cliente: OfflineCliente;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isOnline: boolean;
}

export function CobroModal({ cliente, isOpen, onClose, onSuccess, isOnline }: CobroModalProps) {
  const { data: session } = useSession();
  const [montoAbono, setMontoAbono] = useState('');
  const [interesMoratorio, setInteresMoratorio] = useState('');
  const [gastosCobranza, setGastosCobranza] = useState('');
  const [tipoPago, setTipoPago] = useState<'regular' | 'abono' | 'liquidacion' | 'moratorio'>('regular');
  const [metodoPago, setMetodoPago] = useState<string>('GESTOR');
  const [concepto, setConcepto] = useState('');
  const [numeroRecibo, setNumeroRecibo] = useState('');
  const [loading, setLoading] = useState(false);
  const [imprimirTicket, setImprimirTicket] = useState(true);
  const [showPrinterConfig, setShowPrinterConfig] = useState(false);
  const [calculatedValues, setCalculatedValues] = useState({
    saldoAnterior: 0,
    saldoNuevo: 0,
    montoTotal: 0,
    montoAbono: 0,
    interesMoratorio: 0,
    gastosCobranza: 0
  });

  const userId = (session?.user as any)?.id || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_id') : null);
  const { isConnected: isPrinterConnected, printTicket } = useBluetoothPrinter();

  // Reset form cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setMontoAbono('');
      setInteresMoratorio('');
      setGastosCobranza('');
      setTipoPago('regular');
      setMetodoPago('GESTOR');
      setConcepto('');
      setNumeroRecibo('');
      setCalculatedValues({
        saldoAnterior: cliente.saldoPendiente || cliente.saldo || 0,
        saldoNuevo: cliente.saldoPendiente || cliente.saldo || 0,
        montoTotal: 0,
        montoAbono: 0,
        interesMoratorio: 0,
        gastosCobranza: 0
      });
    }
  }, [isOpen, cliente]);

  // Calcular nuevo saldo cuando cambia el monto o moratorio
  useEffect(() => {
    const abonoNum = parseFloat(montoAbono) || 0;
    const moratorioNum = parseFloat(interesMoratorio) || 0;
    const gastosNum = parseFloat(gastosCobranza) || 0;

    const montoTotal = abonoNum + moratorioNum + gastosNum;
    const nuevoSaldo = Math.max(0, (cliente.saldoPendiente || cliente.saldo || 0) - abonoNum);

    setCalculatedValues({
      saldoAnterior: cliente.saldoPendiente || cliente.saldo || 0,
      saldoNuevo: nuevoSaldo,
      montoTotal: montoTotal,
      montoAbono: abonoNum,
      interesMoratorio: moratorioNum,
      gastosCobranza: gastosNum
    });
  }, [montoAbono, interesMoratorio, gastosCobranza, cliente.saldoPendiente, cliente.saldo]);

  const createTicketData = (fechaPago: string, numeroReciboFinal: string): TicketData => {
    return {
      numeroRecibo: numeroReciboFinal,
      cliente: {
        nombreCompleto: cliente.nombreCompleto || cliente.nombre || "",
        codigoCliente: cliente.codigoCliente || cliente.numContrato || "",
        telefono: cliente.telefono,
        direccion: cliente.direccionCompleta || cliente.direccion || "",
        diaPago: cliente.diaPago
      },
      cobrador: {
        nombre: (session?.user as any)?.name || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_name') : '') || 'Cobrador',
        id: userId || ""
      },
      pago: {
        monto: calculatedValues.montoAbono,
        interesMoratorio: calculatedValues.interesMoratorio,
        gastosCobranza: calculatedValues.gastosCobranza,
        tipoPago: tipoPago,
        metodoPago: metodoPago,
        concepto: concepto,
        fechaPago: fechaPago
      },
      saldos: {
        anterior: calculatedValues.saldoAnterior,
        nuevo: calculatedValues.saldoNuevo,
        consolidado: (cliente.saldoConsolidado || cliente.saldoPendiente) - calculatedValues.montoAbono
      },
      empresa: {
        nombre: 'Grupo Mueblero DASO',
        direccion: 'Juarez Ote. 223, Centro, SJR. QRO',
        telefono: 'Tel: 442 980 0772'
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (calculatedValues.montoTotal <= 0) {
      toast.error('Por favor ingrese un monto válido');
      return;
    }

    if (!userId) {
      toast.error('Error de sesión');
      return;
    }

    setLoading(true);

    try {
      // Capturar ubicación forzada
      let location = { lat: null, lng: null };
      try {
        const coords: any = await obtenerUbicacionCobrador();
        location = { lat: coords.lat.toString(), lng: coords.lng.toString() };
      } catch (locError) {
        console.warn('No se pudo obtener la ubicación para el pago:', locError);
        // Podríamos bloquear el pago aquí si fuera estrictamente "forzada", 
        // pero por ahora solo logueamos y enviamos vacío si falla.
      }

      const localId = generateLocalId();
      const pagoData = {
        clienteId: cliente.id,
        cobradorId: userId,
        monto: calculatedValues.montoAbono,
        interesMoratorio: calculatedValues.interesMoratorio,
        gastosCobranza: calculatedValues.gastosCobranza,
        tipoPago: tipoPago || 'regular',
        concepto: concepto || `Abono Regular`,
        fechaPago: new Date().toISOString(),
        metodoPago,
        numeroRecibo: numeroRecibo || undefined,
        localId,
        latitud: location.lat,
        longitud: location.lng
      };

      let onlineSuccess = false;

      if (isOnline) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for poor signal

          const response = await fetch('/api/pagos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pagoData),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            onlineSuccess = true;
            toast.success(`Pago registrado online: ${formatCurrency(calculatedValues.montoTotal)}`);

            // Guardar localmente en Dexie como ya sincronizado
            const localPago: OfflinePago = {
              clienteId: pagoData.clienteId,
              monto: Number(pagoData.monto),
              tipoPago: pagoData.tipoPago as any,
              concepto: pagoData.concepto,
              fechaPago: pagoData.fechaPago,
              cobradorId: pagoData.cobradorId,
              metodoPago: (pagoData.metodoPago?.toLowerCase()?.includes('banco') ? 'bancario' : 'gestor') as any,
              numeroRecibo: pagoData.numeroRecibo,
              interesMoratorio: Number(pagoData.interesMoratorio || 0),
              gastosCobranza: Number(pagoData.gastosCobranza || 0),
              latitud: pagoData.latitud,
              longitud: pagoData.longitud,
              localId: pagoData.localId,
              syncStatus: 'synced',
              createdOffline: false,
              printStatus: (imprimirTicket && isPrinterConnected) ? 'printed' : 'pending',
              lastSync: Date.now()
            };
            await db.pagos.add(localPago);

            // Imprimir ticket si está habilitado
            if (imprimirTicket && isPrinterConnected) {
              try {
                const ticketData = createTicketData(pagoData.fechaPago, numeroRecibo || '');
                await printTicket(ticketData);
              } catch (error) {
                console.error('Error imprimiendo ticket:', error);
                toast.error('Pago registrado, pero error al imprimir ticket');
              }
            }
          } else {
            console.warn('Fallo en respuesta de servidor, guardando pago en local/offline...');
          }
        } catch (netError) {
          console.warn('Fallo de red en registro de pago (baja señal o caída), guardando offline...', netError);
        }
      }

      if (!onlineSuccess) {
        // Guardar offline
        await syncService.addPagoOffline(pagoData as any);

        toast.success(`Pago guardado offline (señal inestable)`, {
          description: 'Se sincronizará automáticamente cuando mejore la señal'
        });

        if (imprimirTicket && isPrinterConnected) {
          try {
            const ticketData = createTicketData(pagoData.fechaPago, numeroRecibo || '');
            await printTicket(ticketData);
          } catch (error) {
            console.error('Error imprimiendo ticket:', error);
          }
        }
      }

      // Actualizar el saldo del cliente en la DB local (Dexie) para que se refleje inmediatamente en el dashboard
      const clienteLocal = await db.clientes.get(cliente.id);
      if (clienteLocal) {
        let nuevoSaldo = Number(clienteLocal.saldoPendiente || clienteLocal.saldo || 0);
        if (tipoPago === 'regular') {
          nuevoSaldo = Math.max(0, nuevoSaldo - calculatedValues.montoAbono);
        }
        await db.clientes.update(cliente.id, {
          saldoPendiente: nuevoSaldo,
          fechaUltimoPago: pagoData.fechaPago,
          syncStatus: onlineSuccess ? 'synced' : 'pending'
        });
      }

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error processing payments:', error);
      toast.error('Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintManual = async () => {
    if (!isPrinterConnected) {
      toast.error('Conecta una impresora primero');
      setShowPrinterConfig(true);
      return;
    }

    try {
      const ticketData = createTicketData(new Date().toISOString(), numeroRecibo || 'PRE-VIEW');
      await printTicket(ticketData);
      toast.success('Ticket impreso correctamente');
    } catch (error) {
      console.error('Error manual printing:', error);
      toast.error('Error al imprimir ticket');
    }
  };

  const handleQuickAmount = (amount: number) => {
    setMontoAbono(amount.toString());
  };

  const getQuickAmounts = () => {
    const acordado = cliente.montoAcordado || 0;
    const pendiente = cliente.saldoPendiente || cliente.saldo || 0;

    const amounts = [
      acordado,
      acordado * 0.5, // Mitad del pago acordado
      pendiente, // Todo el saldo
      Math.min(acordado * 2, pendiente) // Doble pago o todo el saldo
    ];

    return [...new Set(amounts.filter(a => a > 0))].sort((a, b) => a - b);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              Registrar Cobro
            </DialogTitle>

            <div className="flex items-center gap-2">
              <Badge variant={isOnline ? 'default' : 'secondary'} className="text-xs">
                {isOnline ? (
                  <><Wifi className="w-3 h-3 mr-1" />Online</>
                ) : (
                  <><WifiOff className="w-3 h-3 mr-1" />Offline</>
                )}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pb-20">
          {/* Información del cliente */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{cliente.nombreCompleto || cliente.nombre || "Sin Nombre"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Saldo Actual:</span>
                  <div className="font-semibold text-red-600">
                    {formatCurrency(cliente.saldoPendiente || cliente.saldo || 0)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Pago Acordado:</span>
                  <div className="font-semibold">
                    {formatCurrency(cliente.montoAcordado)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botones de monto rápido */}
          <div className="space-y-2">
            <Label className="text-sm">Abono Rápido a Saldo</Label>
            <div className="grid grid-cols-2 gap-2">
              {getQuickAmounts().map((amount, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                  className="text-xs h-8"
                >
                  {formatCurrency(amount)}
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Detalle del Cobro</h3>
            
            {/* Abono a Saldo */}
            <div className="space-y-2">
              <Label htmlFor="montoAbono" className="text-emerald-700 font-bold">Abono a Saldo *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <Input
                  id="montoAbono"
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoAbono}
                  onChange={(e) => setMontoAbono(e.target.value)}
                  placeholder="0.00"
                  className="pl-9 border-emerald-200 focus-visible:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Interés Moratorio */}
              <div className="space-y-2">
                <Label htmlFor="interesMoratorio" className="text-orange-700">Int. Moratorio</Label>
                <div className="relative">
                  <AlertTriangle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />
                  <Input
                    id="interesMoratorio"
                    type="number"
                    step="0.01"
                    min="0"
                    value={interesMoratorio}
                    onChange={(e) => setInteresMoratorio(e.target.value)}
                    placeholder="0.00"
                    className="pl-9 border-orange-200 focus-visible:ring-orange-500"
                  />
                </div>
              </div>

              {/* Gastos de Cobranza */}
              <div className="space-y-2">
                <Label htmlFor="gastosCobranza" className="text-blue-700">Gastos Cobranza</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />
                  <Input
                    id="gastosCobranza"
                    type="number"
                    step="0.01"
                    min="0"
                    value={gastosCobranza}
                    onChange={(e) => setGastosCobranza(e.target.value)}
                    placeholder="0.00"
                    className="pl-9 border-blue-200 focus-visible:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Total Calculado */}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-700 text-sm">TOTAL A RECIBIR:</span>
              <span className="text-xl font-black text-slate-900">{formatCurrency(calculatedValues.montoTotal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tipo de pago */}
            <div className="space-y-2">
              <Label htmlFor="tipoPago" className="text-xs font-bold text-slate-500 uppercase">Tipo de Pago</Label>
              <Select value={tipoPago} onValueChange={(value: any) => setTipoPago(value)}>
                <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="abono">Abono</SelectItem>
                  <SelectItem value="moratorio">Mora</SelectItem>
                  <SelectItem value="liquidacion">Liquidación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <Label htmlFor="metodoPago" className="text-xs font-bold text-slate-500 uppercase">Método</Label>
              <Select value={metodoPago} onValueChange={(value: any) => setMetodoPago(value)}>
                <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GESTOR">GESTOR</SelectItem>
                  <SelectItem value="GESTOR BANCOS">GESTOR BANCOS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Número de recibo y Concepto agrupados */}
          <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="space-y-1.5">
              <Label htmlFor="numeroRecibo" className="text-[10px] font-bold text-slate-400 uppercase">Número de Recibo</Label>
              <Input
                id="numeroRecibo"
                value={numeroRecibo}
                onChange={(e) => setNumeroRecibo(e.target.value)}
                placeholder="Ej: 001234"
                className="h-9 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="concepto" className="text-[10px] font-bold text-slate-400 uppercase">Concepto / Notas</Label>
              <Textarea
                id="concepto"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
                className="bg-white text-sm"
              />
            </div>
          </div>

          {calculatedValues.montoTotal > 0 && (
            <Card className="bg-slate-900 text-white border-none shadow-inner">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-300">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Impacto Contable
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Saldo Anterior:</span>
                  <span className="font-medium text-rose-400">
                    {formatCurrency(calculatedValues.saldoAnterior)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm text-emerald-400">
                  <span>Abono a Saldo:</span>
                  <span className="font-bold">
                    -{formatCurrency(calculatedValues.montoAbono)}
                  </span>
                </div>

                <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
                  <span className="text-slate-300 font-bold">Nuevo Saldo:</span>
                  <span className={`font-black ${calculatedValues.saldoNuevo > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatCurrency(calculatedValues.saldoNuevo)}
                  </span>
                </div>

                <div className="mt-4 p-2 bg-slate-800 rounded text-[10px] space-y-1">
                  <p className="text-slate-400 flex justify-between">
                    <span>• Interés Moratorio:</span>
                    <span className="text-orange-400">{formatCurrency(calculatedValues.interesMoratorio)}</span>
                  </p>
                  <p className="text-slate-400 flex justify-between">
                    <span>• Gastos Cobranza:</span>
                    <span className="text-blue-400">{formatCurrency(calculatedValues.gastosCobranza)}</span>
                  </p>
                  <p className="text-slate-500 italic mt-1">* Estos montos NO reducen el saldo principal</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuración de Impresión */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Impresión de Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Estado de la impresora */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Estado de Impresora
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={isPrinterConnected ? 'default' : 'secondary'} className="text-xs">
                    {isPrinterConnected ? 'Conectada' : 'Desconectada'}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPrinterConfig(true)}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Switch para imprimir automáticamente */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    Imprimir ticket automáticamente
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Se imprimirá después de registrar el pago
                  </div>
                </div>
                <Switch
                  checked={imprimirTicket}
                  onCheckedChange={setImprimirTicket}
                  disabled={!isPrinterConnected}
                />
              </div>

              {!isPrinterConnected && (
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Conecta una impresora para habilitar la impresión automática
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={loading || calculatedValues.montoTotal <= 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  'Procesando...'
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Registrar {formatCurrency(calculatedValues.montoTotal)}
                  </>
                )}
              </Button>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handlePrintManual}
              disabled={loading || calculatedValues.montoTotal <= 0 || !isPrinterConnected}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800"
            >
              <Printer className="w-4 h-4 mr-2" />
              {isPrinterConnected ? 'Imprimir Ticket' : 'Impresora no conectada'}
            </Button>
          </div>

          {/* Advertencia offline */}
          {!isOnline && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border-l-2 border-yellow-400">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                Trabajando offline. El pago se sincronizará automáticamente cuando tengas conexión.
              </div>
            </div>
          )}

          {/* Espacio extra para evitar que el menú inferior tape los botones */}
          <div className="h-20" />
        </form>

        {/* Modal de Configuración de Impresora */}
        <PrinterConfigModal
          isOpen={showPrinterConfig}
          onClose={() => setShowPrinterConfig(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

