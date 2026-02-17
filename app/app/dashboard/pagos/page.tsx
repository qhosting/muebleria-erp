
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
  FileText
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface Pago {
  id: string;
  monto: number;
  concepto: string;
  tipoPago: 'regular' | 'moratorio';
  fechaPago: string;
  saldoAnterior: number;
  saldoNuevo: number;
  ticketImpreso: boolean;
  sincronizado: boolean;
  cliente: {
    nombreCompleto: string;
    codigoCliente: string;
  };
  cobrador: {
    name: string;
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
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cobradores, setCobradores] = useState<{ id: string; name: string }[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPagos | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('all');
  const [selectedCobrador, setSelectedCobrador] = useState('all');
  const [selectedFecha, setSelectedFecha] = useState('');

  useEffect(() => {
    fetchCobradores();
  }, []);

  useEffect(() => {
    fetchPagos();
  }, [selectedTipo, selectedCobrador, selectedFecha]);

  const fetchPagos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTipo !== 'all') params.set('tipoPago', selectedTipo);
      if (selectedCobrador !== 'all') params.set('cobradorId', selectedCobrador);
      if (selectedFecha) {
        params.set('fechaDesde', selectedFecha);
        params.set('fechaHasta', selectedFecha);
      }

      const response = await fetch(`/api/pagos?${params.toString()}`);
      const data = await response.json();
      setPagos(data.pagos || []);
      setEstadisticas(data.estadisticas || null);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      toast.error('Error al cargar pagos');
    } finally {
      setLoading(false);
    }
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

  const reimprimir = async (pagoId: string) => {
    try {
      const response = await fetch(`/api/pagos/${pagoId}/reimprimir`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Ticket reimpreso exitosamente');
      } else {
        throw new Error('Error al reimprimir');
      }
    } catch (error) {
      toast.error('Error al reimprimir ticket');
    }
  };

  const exportarPagos = () => {
    // Implementar exportación de pagos
    toast.success('Exportando pagos...');
  };

  const filteredPagos = pagos.filter(pago =>
    pago.cliente.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pago.cliente.codigoCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pago.concepto.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar pagos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
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
                              onClick={() => reimprimir(pago.id)}
                              className="text-xs"
                            >
                              Reimprimir
                            </Button>
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
    </DashboardLayout>
  );
}
