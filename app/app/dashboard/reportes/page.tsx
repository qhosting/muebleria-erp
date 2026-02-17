
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Download, Search, Filter } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  role: string;
}

interface ReporteCobranza {
  totales: {
    totalCobrado: number;
    pagosRegulares: number;
    pagosMoratorios: number;
    totalPagos: number;
  };
  reportePorCobrador: Array<{
    cobrador: string;
    cobradorId: string;
    totalCobrado: number;
    pagosRegulares: number;
    pagosMoratorios: number;
    cantidadPagos: number;
  }>;
  reportePorDia: Array<{
    fecha: string;
    pagos_regulares: number;
    pagos_moratorios: number;
    total_pagos: number;
  }>;
  periodo: {
    desde: string;
    hasta: string;
  };
}

export default function ReportesPage() {
  const { data: session } = useSession();
  const [reporte, setReporte] = useState<ReporteCobranza | null>(null);
  const [cobradores, setCobradores] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [selectedCobrador, setSelectedCobrador] = useState<string>('all');
  const [fechaDesde, setFechaDesde] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 30); // Últimos 30 días por defecto
    return fecha.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    const fecha = new Date();
    return fecha.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchCobradores();
  }, []);

  useEffect(() => {
    fetchReporte();
  }, [selectedCobrador, fechaDesde, fechaHasta]);

  const fetchCobradores = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        const cobradoresData = users.filter((user: User) => user.role === 'cobrador');
        setCobradores(cobradoresData);
      }
    } catch (error) {
      console.error('Error al cargar cobradores:', error);
    }
  };

  const fetchReporte = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        fechaDesde: fechaDesde + 'T00:00:00.000Z',
        fechaHasta: fechaHasta + 'T23:59:59.999Z',
      });
      
      if (selectedCobrador !== 'all') {
        params.append('cobradorId', selectedCobrador);
      }

      const response = await fetch(`/api/reportes/cobranza?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al obtener el reporte');
      }
      
      const data = await response.json();
      setReporte(data);
    } catch (error) {
      console.error('Error al cargar reporte:', error);
      toast.error('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const exportarReporte = () => {
    if (!reporte) return;
    
    const csvContent = [
      ['Reporte de Cobranza'],
      ['Período:', `${formatDate(new Date(fechaDesde))} - ${formatDate(new Date(fechaHasta))}`],
      ['Cobrador:', selectedCobrador === 'all' ? 'Todos' : cobradores.find(c => c.id === selectedCobrador)?.name || 'N/A'],
      [''],
      ['RESUMEN GENERAL'],
      ['Total Cobrado:', formatCurrency(reporte.totales.totalCobrado)],
      ['Pagos Regulares:', formatCurrency(reporte.totales.pagosRegulares)],
      ['Pagos Moratorios:', formatCurrency(reporte.totales.pagosMoratorios)],
      ['Total de Pagos:', reporte.totales.totalPagos.toString()],
      [''],
      ['DETALLE POR COBRADOR'],
      ['Cobrador', 'Total Cobrado', 'Pagos Regulares', 'Pagos Moratorios', 'Cantidad Pagos'],
      ...reporte.reportePorCobrador.map(c => [
        c.cobrador,
        formatCurrency(c.totalCobrado),
        formatCurrency(c.pagosRegulares),
        formatCurrency(c.pagosMoratorios),
        c.cantidadPagos.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-cobranza-${fechaDesde}-${fechaHasta}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Reporte exportado exitosamente');
  };

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes de Cobranza</h1>
            <p className="text-gray-600">Análisis detallado por cobrador y período</p>
          </div>
          <Button 
            onClick={exportarReporte} 
            className="flex items-center gap-2"
            disabled={!reporte || loading}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Reporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cobrador">Cobrador</Label>
                <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cobrador" />
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fechaDesde">Fecha Desde</Label>
                <Input
                  id="fechaDesde"
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fechaHasta">Fecha Hasta</Label>
                <Input
                  id="fechaHasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Histórico Cobrado</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {reporte ? formatCurrency(reporte.totales.totalCobrado) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedCobrador === 'all' ? 'Todos los cobradores' : cobradores.find(c => c.id === selectedCobrador)?.name}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cuentas Cobradas</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {reporte ? reporte.totales.totalPagos : 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total de pagos realizados
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagos Regulares</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {reporte ? formatCurrency(reporte.totales.pagosRegulares) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pagos en tiempo
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagos Moratorios</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {reporte ? formatCurrency(reporte.totales.pagosMoratorios) : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pagos atrasados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detalle por Cobrador */}
        {selectedCobrador === 'all' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Rendimiento por Cobrador
              </CardTitle>
              <CardDescription>
                Comparativo de productividad en el período seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : reporte?.reportePorCobrador && reporte.reportePorCobrador.length > 0 ? (
                <div className="space-y-4">
                  {reporte.reportePorCobrador
                    .sort((a, b) => b.totalCobrado - a.totalCobrado)
                    .map((cobrador, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{cobrador.cobrador}</p>
                            <p className="text-sm text-gray-600">
                              {cobrador.cantidadPagos} cobros realizados
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-lg text-green-600">
                          {formatCurrency(cobrador.totalCobrado)}
                        </p>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <div>Regular: {formatCurrency(cobrador.pagosRegulares)}</div>
                          <div>Moratorio: {formatCurrency(cobrador.pagosMoratorios)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay datos de cobranza para el período seleccionado
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cobranza por Día */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Evolución Diaria
            </CardTitle>
            <CardDescription>
              Cobranza día a día en el período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : reporte?.reportePorDia && reporte.reportePorDia.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reporte.reportePorDia
                  .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                  .map((dia, index) => {
                    const totalDia = dia.pagos_regulares + dia.pagos_moratorios;
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                          <p className="font-medium">{formatDate(new Date(dia.fecha))}</p>
                          <p className="text-sm text-gray-600">{dia.total_pagos} pagos</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(totalDia)}</p>
                          <div className="text-xs text-gray-600">
                            <span>Reg: {formatCurrency(dia.pagos_regulares)}</span>
                            {dia.pagos_moratorios > 0 && (
                              <span className="ml-2">Mor: {formatCurrency(dia.pagos_moratorios)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay datos para el período seleccionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
