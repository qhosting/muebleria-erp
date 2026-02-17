

// Modal para mostrar historial de pagos del cliente con opción de reimpresión
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Receipt, 
  Calendar,
  DollarSign,
  User,
  MapPin,
  Download,
  Printer,
  RefreshCw,
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { OfflineCliente } from '@/lib/offline-db';
import { Pago } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useBluetoothPrinter } from '@/hooks/use-bluetooth-printer';
import { TicketData } from '@/lib/bluetooth-printer';
import { PrinterConfigModal } from './printer-config-modal';
import { Settings } from 'lucide-react';

interface PagosModalProps {
  cliente: OfflineCliente;
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
}

export function PagosModal({ cliente, isOpen, onClose, isOnline }: PagosModalProps) {
  const { data: session } = useSession();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [filteredPagos, setFilteredPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null);
  const [printingRecibo, setPrintingRecibo] = useState<string | null>(null);
  const [showPrinterConfig, setShowPrinterConfig] = useState(false);
  
  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;
  const { isConnected: isPrinterConnected, printTicket } = useBluetoothPrinter();

  useEffect(() => {
    if (isOpen && cliente.id) {
      loadPagosCliente();
    }
  }, [isOpen, cliente.id, isOnline]);

  useEffect(() => {
    filterPagos();
  }, [pagos, searchTerm, fechaDesde, fechaHasta]);

  const loadPagosCliente = async () => {
    if (!cliente.id || !isOnline) {
      toast.error('Se requiere conexión para ver el historial de pagos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/pagos/cliente/${cliente.id}?limit=50`);
      
      if (!response.ok) {
        throw new Error('Error al obtener historial de pagos');
      }

      const pagosData: Pago[] = await response.json();
      
      // Serializar los datos de Decimal a number si es necesario
      const pagosSerializados = pagosData.map(pago => ({
        ...pago,
        monto: typeof pago.monto === 'string' ? parseFloat(pago.monto) : pago.monto,
        saldoAnterior: typeof pago.saldoAnterior === 'string' ? parseFloat(pago.saldoAnterior) : pago.saldoAnterior,
        saldoNuevo: typeof pago.saldoNuevo === 'string' ? parseFloat(pago.saldoNuevo) : pago.saldoNuevo,
      }));
      
      setPagos(pagosSerializados);
      
    } catch (error) {
      console.error('Error loading pagos:', error);
      toast.error('Error al cargar historial de pagos');
    } finally {
      setLoading(false);
    }
  };

  const filterPagos = () => {
    let filtered = [...pagos];

    // Filtro por búsqueda (concepto, cobrador)
    if (searchTerm) {
      filtered = filtered.filter(pago => 
        pago.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pago.cobrador?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pago.numeroRecibo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por rango de fechas
    if (fechaDesde) {
      const fechaDesdeDate = new Date(fechaDesde);
      filtered = filtered.filter(pago => new Date(pago.fechaPago) >= fechaDesdeDate);
    }

    if (fechaHasta) {
      const fechaHastaDate = new Date(fechaHasta);
      fechaHastaDate.setHours(23, 59, 59, 999); // Final del día
      filtered = filtered.filter(pago => new Date(pago.fechaPago) <= fechaHastaDate);
    }

    setFilteredPagos(filtered);
  };

  const createReimpresionTicketData = (pago: Pago): TicketData => {
    return {
      numeroRecibo: pago.numeroRecibo || `REC-${pago.id.slice(-8)}`,
      cliente: {
        nombreCompleto: cliente.nombreCompleto,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        diaPago: cliente.diaPago
      },
      cobrador: {
        nombre: pago.cobrador?.name || 'N/A',
        id: pago.cobradorId
      },
      pago: {
        monto: pago.monto,
        tipoPago: pago.tipoPago,
        metodoPago: pago.metodoPago || 'efectivo',
        concepto: pago.concepto || 'Pago de cuota',
        fechaPago: typeof pago.fechaPago === 'string' ? pago.fechaPago : pago.fechaPago.toISOString()
      },
      saldos: {
        anterior: pago.saldoAnterior,
        nuevo: pago.saldoNuevo
      },
      empresa: {
        nombre: 'MUEBLERIA LA ECONOMICA',
        direccion: 'Dirección de la empresa',
        telefono: 'Tel: (555) 123-4567'
      }
    };
  };

  const handleReimprimirRecibo = async (pago: Pago) => {
    if (!isPrinterConnected) {
      toast.error('Impresora no conectada');
      setShowPrinterConfig(true);
      return;
    }

    setPrintingRecibo(pago.id);
    
    try {
      // Crear datos del ticket para reimpresión
      const ticketData = createReimpresionTicketData(pago);

      // Imprimir usando la impresora Bluetooth
      const success = await printTicket(ticketData);

      if (success) {
        // Marcar como reimpreso si no estaba marcado
        if (!pago.ticketImpreso) {
          // Aquí se podría actualizar el estado en el servidor
          // pero para reimpresiones no es crítico
        }
        
        toast.success('Ticket reimpreso exitosamente', {
          description: `Recibo #${ticketData.numeroRecibo} - ${formatCurrency(pago.monto)}`
        });
      }

    } catch (error) {
      console.error('Error reimprimiendo ticket:', error);
      toast.error('Error al reimprimir el ticket');
    } finally {
      setPrintingRecibo(null);
    }
  };

  const getTipoPagoBadge = (tipoPago: string) => {
    const variants: { [key: string]: any } = {
      regular: { variant: 'default', label: 'Regular' },
      moratorio: { variant: 'secondary', label: 'Moratorio' },
      adelanto: { variant: 'outline', label: 'Adelanto' },
    };
    
    const config = variants[tipoPago] || { variant: 'secondary', label: tipoPago };
    
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const getDateLimits = () => {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return {
      max: format(now, 'yyyy-MM-dd'),
      min: format(sixMonthsAgo, 'yyyy-MM-dd')
    };
  };

  const dateLimits = getDateLimits();

  // Estadísticas rápidas
  const totalPagos = filteredPagos.reduce((sum, p) => sum + p.monto, 0);
  const pagosMes = filteredPagos.filter(p => {
    const fechaPago = new Date(p.fechaPago);
    const hoy = new Date();
    return fechaPago.getMonth() === hoy.getMonth() && fechaPago.getFullYear() === hoy.getFullYear();
  });
  const totalPagosMes = pagosMes.reduce((sum, p) => sum + p.monto, 0);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 border-b bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-500" />
                Historial de Pagos
              </DialogTitle>
              
              <div className="flex items-center gap-2">
                <Badge variant={isOnline ? 'default' : 'secondary'} className="text-xs">
                  {isOnline ? (
                    <><Wifi className="w-3 h-3 mr-1" />Online</>
                  ) : (
                    <><WifiOff className="w-3 h-3 mr-1" />Offline</>
                  )}
                </Badge>
                
                <Badge variant={isPrinterConnected ? 'default' : 'secondary'} className="text-xs">
                  <Printer className="w-3 h-3 mr-1" />
                  {isPrinterConnected ? 'Imp. OK' : 'Sin Imp.'}
                </Badge>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPrinterConfig(true)}
                  className="h-6 w-6 p-0"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="p-6 pb-0 space-y-4">
              {/* Información del cliente */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {cliente.nombreCompleto}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {cliente.direccion}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Saldo Actual: </span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(cliente.saldoPendiente)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Pagos: </span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(totalPagos)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estadísticas rápidas */}
              <div className="grid grid-cols-2 gap-2">
                <Card className="text-center">
                  <CardContent className="p-3">
                    <div className="text-sm font-semibold text-green-600">
                      {formatCurrency(totalPagosMes)}
                    </div>
                    <div className="text-xs text-muted-foreground">Este mes ({pagosMes.length})</div>
                  </CardContent>
                </Card>
                
                <Card className="text-center">
                  <CardContent className="p-3">
                    <div className="text-sm font-semibold text-blue-600">
                      {filteredPagos.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Total pagos</div>
                  </CardContent>
                </Card>
              </div>

              {/* Filtros */}
              <div className="space-y-3">
                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por concepto, recibo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                {/* Toggle filtros avanzados */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full h-8 text-xs"
                >
                  <Filter className="w-3 h-3 mr-2" />
                  Filtros por fecha
                  {showFilters ? <ChevronUp className="w-3 h-3 ml-2" /> : <ChevronDown className="w-3 h-3 ml-2" />}
                </Button>

                {/* Filtros de fecha */}
                {showFilters && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="fechaDesde" className="text-xs">Desde</Label>
                      <Input
                        id="fechaDesde"
                        type="date"
                        value={fechaDesde}
                        onChange={(e) => setFechaDesde(e.target.value)}
                        min={dateLimits.min}
                        max={dateLimits.max}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fechaHasta" className="text-xs">Hasta</Label>
                      <Input
                        id="fechaHasta"
                        type="date"
                        value={fechaHasta}
                        onChange={(e) => setFechaHasta(e.target.value)}
                        min={dateLimits.min}
                        max={dateLimits.max}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de pagos con scroll */}
            <div className="px-6 pt-4 flex-1 min-h-0">
              <div className="h-full overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                    <span className="text-muted-foreground">Cargando pagos...</span>
                  </div>
                ) : !isOnline ? (
                  <div className="flex items-center justify-center h-32 text-center">
                    <div>
                      <WifiOff className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground text-sm">
                        Se requiere conexión para ver el historial
                      </p>
                    </div>
                  </div>
                ) : filteredPagos.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-center">
                    <div>
                      <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground text-sm">
                        {pagos.length === 0 ? 'No hay pagos registrados' : 'No se encontraron pagos con los filtros aplicados'}
                      </p>
                      {searchTerm || fechaDesde || fechaHasta ? (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => {
                            setSearchTerm('');
                            setFechaDesde('');
                            setFechaHasta('');
                          }}
                          className="text-xs mt-2"
                        >
                          Limpiar filtros
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pb-6">
                    {filteredPagos.map((pago, index) => (
                      <Card key={pago.id} className="border-l-2 border-l-green-400">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(pago.monto)}
                                </span>
                                {getTipoPagoBadge(pago.tipoPago)}
                                {pago.ticketImpreso && (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                )}
                              </div>
                              
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {pago.concepto || 'Pago de cuota'}
                              </p>
                              
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(pago.fechaPago), 'dd/MM/yyyy', { locale: es })}
                                </span>
                                
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {pago.cobrador?.name || 'N/A'}
                                </span>
                              </div>

                              {pago.numeroRecibo && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Recibo: #{pago.numeroRecibo}
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Saldo anterior: </span>
                                  <span className="font-medium">{formatCurrency(pago.saldoAnterior)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Saldo nuevo: </span>
                                  <span className="font-medium">{formatCurrency(pago.saldoNuevo)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Botón de reimpresión */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReimprimirRecibo(pago)}
                              disabled={printingRecibo === pago.id || !isPrinterConnected}
                              className="flex-1 h-7 text-xs"
                            >
                              {printingRecibo === pago.id ? (
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Printer className="w-3 h-3 mr-1" />
                              )}
                              {printingRecibo === pago.id ? 'Imprimiendo...' : 'Reimprimir'}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedPago(selectedPago === pago ? null : pago)}
                              className="h-7 w-7 p-0"
                            >
                              {selectedPago === pago ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                          </div>

                          {/* Detalles expandidos */}
                          {selectedPago === pago && (
                            <div className="mt-3 pt-3 border-t space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-muted-foreground block">Método de pago:</span>
                                  <span className="font-medium">{pago.metodoPago || 'Efectivo'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Hora:</span>
                                  <span className="font-medium">
                                    {format(new Date(pago.fechaPago), 'HH:mm', { locale: es })}
                                  </span>
                                </div>
                              </div>
                              
                              <div>
                                <span className="text-muted-foreground block">ID de transacción:</span>
                                <span className="font-mono text-xs">{pago.id}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Estado de sincronización:</span>
                                {pago.sincronizado ? (
                                  <><CheckCircle className="w-3 h-3 text-green-500" /><span className="text-green-600">Sincronizado</span></>
                                ) : (
                                  <><Clock className="w-3 h-3 text-orange-500" /><span className="text-orange-600">Pendiente</span></>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer con acciones - Sticky bottom */}
          <div className="px-6 py-4 border-t bg-white sticky bottom-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cerrar
              </Button>
              
              {isOnline && (
                <Button
                  variant="outline"
                  onClick={loadPagosCliente}
                  disabled={loading}
                  className="px-3"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Advertencia offline */}
            {!isOnline && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border-l-2 border-yellow-400 mt-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  Funcionalidad offline limitada. Conecta a internet para ver el historial completo.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Configuración de Impresora */}
        <PrinterConfigModal
          isOpen={showPrinterConfig}
          onClose={() => setShowPrinterConfig(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
