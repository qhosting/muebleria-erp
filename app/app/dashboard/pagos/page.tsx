
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Receipt,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  DollarSign,
  FileText,
  Trash2,
  Edit,
  Printer
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { EditPagoModal } from '@/components/pagos/EditPagoModal';
import { VisualizarTicketModal, TicketData } from '@/components/mobile/visualizar-ticket-modal';

interface Pago {
  id: string;
  monto: number;
  interesMoratorio?: number;
  gastosCobranza?: number;
  concepto: string;
  tipoPago: 'regular' | 'moratorio';
  metodoPago?: string;
  numeroRecibo?: string;
  fechaPago: string;
  saldoAnterior: number;
  saldoNuevo: number;
  ticketImpreso: boolean;
  sincronizado: boolean;
  cliente: {
    nombreCompleto: string;
    codigoCliente: string;
    telefono?: string;
    direccion?: string;
    diaPago?: string | number;
  };
  cobrador: {
    name: string;
    username?: string;
  };
}

interface EstadisticasPagos {
  totalPagos: number;
  montoTotal: number;
  pagosRegulares: number;
  pagosMoratorios: number;
  ticketsImpresos: number;
}

export default function PagosPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cobradores, setCobradores] = useState<{ id: string; name: string }[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPagos | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('all');
  const [selectedCobrador, setSelectedCobrador] = useState('all');
  const [selectedFecha, setSelectedFecha] = useState('');
  const [activeDbSearch, setActiveDbSearch] = useState('');
  const [isDbSearching, setIsDbSearching] = useState(false);
  
  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pagoParaEditar, setPagoParaEditar] = useState<Pago | null>(null);

  // Ticket Preview modal states
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicketData, setSelectedTicketData] = useState<TicketData | null>(null);
  const [isPrintingTicket, setIsPrintingTicket] = useState(false);

  useEffect(() => {
    fetchCobradores();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const search = urlParams.get('search');
      if (search) {
        setSearchTerm(search);
        setActiveDbSearch(search);
        setIsDbSearching(true);
      }
    }
  }, []);

  useEffect(() => {
    fetchPagos();
  }, [selectedTipo, selectedCobrador, selectedFecha, activeDbSearch]);

  const fetchPagos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedTipo !== 'all') params.append('tipoPago', selectedTipo);
      if (selectedCobrador !== 'all') params.append('cobradorId', selectedCobrador);
      if (selectedFecha) {
        params.append('fechaDesde', selectedFecha);
        params.append('fechaHasta', selectedFecha);
      }
      if (activeDbSearch) params.append('search', activeDbSearch);

      const response = await fetch(`/api/pagos?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPagos(data.pagos);
        setEstadisticas(data.estadisticas);
      } else {
        toast.error('Error al cargar pagos');
      }
    } catch (error) {
      console.error('Error al obtener pagos:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
      setIsDbSearching(false);
    }
  };

  const handleSearchDb = () => {
    if (!searchTerm.trim()) {
      toast.error('Ingresa un término de búsqueda');
      return;
    }
    setActiveDbSearch(searchTerm.trim());
    setIsDbSearching(true);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveDbSearch('');
    setIsDbSearching(false);
  };

  const fetchCobradores = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        const filteredCobradores = users
          .filter((u: any) => u.role === 'cobrador' && u.isActive)
          .map((u: any) => ({ id: u.id, name: u.name }));
        setCobradores(filteredCobradores);
      }
    } catch (error) {
      console.error('Error al obtener cobradores:', error);
    }
  };

  const reimprimir = async (pago: Pago) => {
    try {
      // 1. Configurar datos del ticket para visualización inmediata en modal
      const abono = Number(pago.monto || 0);
      const mora = Number(pago.interesMoratorio || 0);
      const gcob = Number(pago.gastosCobranza || 0);
      const sAnt = Number(pago.saldoAnterior || 0);
      const sNvo = Number(pago.saldoNuevo || 0);
      const codCli = (pago.cliente?.codigoCliente || '').toUpperCase();
      const esDQ = codCli.startsWith('DQ');

      const tData: TicketData = {
        numeroRecibo: pago.numeroRecibo || `REC-${pago.id.slice(-6)}`,
        cliente: {
          nombreCompleto: pago.cliente.nombreCompleto,
          codigoCliente: pago.cliente.codigoCliente,
          telefono: (pago.cliente as any).telefono || '',
          direccion: (pago.cliente as any).direccion || '',
          diaPago: (pago.cliente as any).diaPago || '',
        },
        cobrador: {
          nombre: pago.cobrador?.name || 'Cobrador',
          id: (pago.cobrador as any)?.username || (pago as any).cobradorId || '',
        },
        pago: {
          monto: abono,
          interesMoratorio: mora,
          gastosCobranza: gcob,
          tipoPago: pago.tipoPago || 'regular',
          metodoPago: (pago as any).metodoPago || 'efectivo',
          concepto: pago.concepto || 'Pago de cuenta',
          fechaPago: pago.fechaPago,
        },
        saldos: {
          anterior: sAnt > 0 ? sAnt : sNvo + abono,
          nuevo: sNvo,
        },
        empresa: {
          nombre: 'Grupo Mueblero DASO',
          direccion: 'Juarez Ote. 223, Centro, SJR. QRO',
          telefono: 'Tel: 442 980 0772',
        },
      };

      setSelectedTicketData(tData);
      setTicketModalOpen(true);

      // 2. Notificar al backend para registrar la reimpresión y obtener datos completos
      const response = await fetch(`/api/pagos/${pago.id}/reimprimir`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ticketData) {
          setSelectedTicketData(data.ticketData);
        }
        setPagos((prev) =>
          prev.map((p) => (p.id === pago.id ? { ...p, ticketImpreso: true } : p))
        );
      }
    } catch (error) {
      console.error('Error al preparar reimpresión de ticket:', error);
    }
  };

  const handleImprimirTicket = () => {
    if (!selectedTicketData) return;
    setIsPrintingTicket(true);

    try {
      const printWindow = window.open('', '_blank', 'width=380,height=650');
      if (!printWindow) {
        window.print();
        setIsPrintingTicket(false);
        return;
      }

      const t = selectedTicketData;
      const totalRecibido =
        Number(t.pago.monto || 0) +
        Number(t.pago.interesMoratorio || 0) +
        Number(t.pago.gastosCobranza || 0);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket ${t.numeroRecibo || ''}</title>
            <meta charset="utf-8" />
            <style>
              @page { size: 80mm auto; margin: 0; }
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                padding: 8px;
                width: 72mm;
                margin: 0 auto;
                color: #000;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 6px 0; }
              .row { display: flex; justify-content: space-between; margin: 2px 0; }
            </style>
          </head>
          <body>
            <div class="center bold" style="font-size: 13px;">${t.empresa.nombre}</div>
            ${t.empresa.direccion ? `<div class="center" style="font-size: 9px;">${t.empresa.direccion}</div>` : ''}
            ${t.empresa.telefono ? `<div class="center" style="font-size: 9px;">${t.empresa.telefono}</div>` : ''}
            <div class="divider"></div>
            <div class="center bold">COMPROBANTE DE PAGO</div>
            ${t.numeroRecibo ? `<div class="center bold" style="font-size: 10px;">No. ${t.numeroRecibo}</div>` : ''}
            <div class="divider"></div>
            <div><span class="bold">CLIENTE:</span> ${t.cliente.nombreCompleto}</div>
            ${t.cliente.codigoCliente ? `<div><span class="bold">CONTRATO:</span> ${t.cliente.codigoCliente}</div>` : ''}
            ${t.cliente.telefono ? `<div><span class="bold">TEL:</span> ${t.cliente.telefono}</div>` : ''}
            ${t.cliente.direccion ? `<div><span class="bold">DIR:</span> ${t.cliente.direccion}</div>` : ''}
            <div class="divider"></div>
            <div><span class="bold">FECHA:</span> ${new Date(t.pago.fechaPago).toLocaleString('es-MX')}</div>
            <div><span class="bold">TIPO:</span> ${t.pago.tipoPago.toUpperCase()}</div>
            <div><span class="bold">METODO:</span> ${t.pago.metodoPago.toUpperCase()}</div>
            ${t.pago.concepto ? `<div><span class="bold">CONCEPTO:</span> ${t.pago.concepto}</div>` : ''}
            <div class="divider"></div>
            <div class="bold">IMPORTES:</div>
            <div class="row"><span>Saldo Anterior:</span><span>$${t.saldos.anterior.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            <div class="row"><span>Pago / Abono:</span><span>$${t.pago.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            ${Number(t.pago.interesMoratorio || 0) > 0 ? `<div class="row"><span>Moratorio:</span><span>$${t.pago.interesMoratorio?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>` : ''}
            ${Number(t.pago.gastosCobranza || 0) > 0 ? `<div class="row"><span>Gastos Cobranza:</span><span>$${t.pago.gastosCobranza?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>` : ''}
            <div class="divider"></div>
            <div class="row bold"><span>TOTAL RECIBIDO:</span><span>$${totalRecibido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            <div class="divider"></div>
            <div class="row bold"><span>SALDO ACTUAL:</span><span>$${t.saldos.nuevo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
            ${t.saldos.nuevo <= 0 ? `<div class="center bold" style="margin-top: 6px;">*** CLIENTE AL DIA ***</div>` : ''}
            <div class="divider"></div>
            <div><span class="bold">Cobrador:</span> ${t.cobrador.nombre}</div>
            <div class="center" style="margin-top: 10px;">¡Gracias por su pago!</div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 800);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Error al imprimir ventana:', err);
      window.print();
    } finally {
      setIsPrintingTicket(false);
    }
  };

  const exportarPagos = () => {
    // Implementar exportación de pagos
    toast.success('Exportando pagos...');
  };

  const eliminarPago = async (pagoId: string) => {
    if (!confirm('¿Está seguro de que desea CANCELAR este pago? El saldo del cliente será restaurado automáticamente.')) {
      return;
    }

    try {
      const response = await fetch(`/api/pagos/${pagoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Pago cancelado exitosamente');
        fetchPagos();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar pago');
    }
  };

  const handleEditPago = (pago: Pago) => {
    setPagoParaEditar(pago);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    fetchPagos();
    setEditModalOpen(false);
    setPagoParaEditar(null);
  };

  const filteredPagos = pagos.filter(pago => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (pago.cliente?.nombreCompleto || '').toLowerCase().includes(term) ||
      (pago.cliente?.codigoCliente || '').toLowerCase().includes(term) ||
      (pago.concepto || '').toLowerCase().includes(term) ||
      ((pago as any).localId || '').toLowerCase().includes(term) ||
      (pago.id || '').toLowerCase().includes(term)
    );
  });

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registro de Pagos</h1>
            <p className="text-gray-600">Historial completo de pagos recibidos</p>
          </div>
          <Button onClick={exportarPagos} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pagos</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticas?.totalPagos || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(estadisticas?.montoTotal || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">P. Regulares</CardTitle>
              <Receipt className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {estadisticas?.pagosRegulares || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">P. Moratorios</CardTitle>
              <Receipt className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {estadisticas?.pagosMoratorios || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {estadisticas?.ticketsImpresos || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex gap-1.5 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar pagos..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (e.target.value === '') {
                        setActiveDbSearch('');
                        setIsDbSearching(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchDb();
                      }
                    }}
                    className="pl-10 h-10"
                  />
                </div>
                <Button 
                  onClick={handleSearchDb} 
                  variant={isDbSearching ? "secondary" : "default"}
                  size="sm"
                  className="whitespace-nowrap h-10 px-3 flex items-center gap-1 font-semibold"
                  disabled={loading}
                >
                  Buscar DB
                </Button>
                {isDbSearching && (
                  <Button 
                    onClick={handleClearSearch} 
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap border-red-200 text-red-600 hover:bg-red-50 h-10 px-2.5"
                    title="Restaurar lista general"
                  >
                    X
                  </Button>
                )}
              </div>
              <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="regular">Pagos regulares</SelectItem>
                  <SelectItem value="moratorio">Pagos moratorios</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                <SelectTrigger>
                  <SelectValue placeholder="Cobrador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cobradores</SelectItem>
                  {cobradores.map((cobrador) => (
                    <SelectItem key={cobrador.id} value={cobrador.id}>
                      {cobrador.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={selectedFecha}
                onChange={(e) => setSelectedFecha(e.target.value)}
                placeholder="Filtrar por fecha"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Historial de Pagos
            </CardTitle>
            <CardDescription>
              Registro completo de todos los pagos recibidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : filteredPagos.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pagos registrados</h3>
                <p className="text-gray-600">No se encontraron pagos con los filtros aplicados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-900">Fecha</th>
                      <th className="text-left p-3 font-medium text-gray-900">Cliente</th>
                      <th className="text-left p-3 font-medium text-gray-900">Concepto</th>
                      <th className="text-left p-3 font-medium text-gray-900">Tipo</th>
                      <th className="text-right p-3 font-medium text-gray-900">Monto</th>
                      <th className="text-left p-3 font-medium text-gray-900">Cobrador</th>
                      <th className="text-center p-3 font-medium text-gray-900">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPagos.map((pago) => (
                      <tr key={pago.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{formatDate(new Date(pago.fechaPago))}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-gray-900">{pago.cliente.nombreCompleto}</p>
                            <p className="text-sm text-gray-600">{pago.cliente.codigoCliente}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-900">{pago.concepto}</span>
                        </td>
                        <td className="p-3">
                          <Badge
                            className={
                              pago.tipoPago === 'regular'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {pago.tipoPago === 'regular' ? 'Regular' : 'Moratorio'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-medium text-green-600">
                            {formatCurrency(pago.monto)}
                          </span>
                          {pago.interesMoratorio && pago.interesMoratorio > 0 ? (
                            <div className="text-xs text-orange-600 font-medium">
                              + {formatCurrency(pago.interesMoratorio)} moratorio
                            </div>
                          ) : null}
                          {pago.tipoPago === 'regular' && (
                            <div className="text-xs text-gray-500">
                              Saldo: {formatCurrency(pago.saldoAnterior)} → {formatCurrency(pago.saldoNuevo)}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{pago.cobrador.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {pago.ticketImpreso && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <FileText className="h-3 w-3 mr-1" />
                                Impreso
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPago(pago)}
                              className="text-xs"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reimprimir(pago)}
                              className="text-xs flex items-center gap-1.5 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300"
                              title="Ver y reimprimir ticket de pago"
                            >
                              <Printer className="h-3.5 w-3.5 text-sky-600" />
                              Reimprimir
                            </Button>
                            {userRole === 'admin' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => eliminarPago(pago.id)}
                                className="text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EditPagoModal 
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        pago={pagoParaEditar}
        cobradores={cobradores}
        onSuccess={handleEditSuccess}
      />

      {/* Modal de Vista Previa e Impresión del Ticket */}
      <VisualizarTicketModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        ticketData={selectedTicketData}
        onPrint={handleImprimirTicket}
        isPrinting={isPrintingTicket}
      />
    </DashboardLayout>
  );
}
