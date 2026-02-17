
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users, DollarSign, Calendar, Phone, MapPin } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface ClienteMoroso {
  id: string;
  nombreCompleto: string;
  telefono: string;
  direccionCompleta: string;
  saldoActual: number;
  diasAtraso: number;
  ultimoPago: string | null;
  cobrador: {
    name: string;
  };
  montoPago: number;
}

interface ReporteMorosidad {
  totalMorosos: number;
  totalDeudaMorosa: number;
  promedioAtraso: number;
  clientesMorosos: ClienteMoroso[];
  morosidadPorCobrador: Array<{
    cobrador: string;
    clientesMorosos: number;
    totalDeuda: number;
  }>;
}

export default function MorosidadPage() {
  const { data: session } = useSession();
  const [reporte, setReporte] = useState<ReporteMorosidad | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCobrador, setSelectedCobrador] = useState('all');

  useEffect(() => {
    fetchReporteMorosidad();
  }, [selectedCobrador]);

  const fetchReporteMorosidad = async () => {
    try {
      setLoading(true);
      const params = selectedCobrador !== 'all' ? `?cobrador=${selectedCobrador}` : '';
      const response = await fetch(`/api/reportes/morosidad${params}`);
      const data = await response.json();
      setReporte(data);
    } catch (error) {
      console.error('Error al cargar reporte de morosidad:', error);
      toast.error('Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const getNivelRiesgo = (diasAtraso: number) => {
    if (diasAtraso <= 7) return { label: 'Bajo', color: 'bg-yellow-100 text-yellow-800' };
    if (diasAtraso <= 15) return { label: 'Medio', color: 'bg-orange-100 text-orange-800' };
    return { label: 'Alto', color: 'bg-red-100 text-red-800' };
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
            <h1 className="text-2xl font-bold text-gray-900">Análisis de Morosidad</h1>
            <p className="text-gray-600">Seguimiento de clientes con pagos vencidos</p>
          </div>
          <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por cobrador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los cobradores</SelectItem>
              {/* Aquí se cargarían dinámicamente los cobradores */}
            </SelectContent>
          </Select>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Morosos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {reporte?.totalMorosos || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Clientes con pagos vencidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
              <DollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(reporte?.totalDeudaMorosa || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total en mora
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio Atraso</CardTitle>
              <Calendar className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {reporte?.promedioAtraso || 0} días
              </div>
              <p className="text-xs text-muted-foreground">
                Atraso promedio
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Morosidad por cobrador */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Morosidad por Cobrador
            </CardTitle>
            <CardDescription>
              Distribución de clientes morosos por cobrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : (
              <div className="space-y-4">
                {reporte?.morosidadPorCobrador?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="font-medium text-gray-900">{item.cobrador}</p>
                      <p className="text-sm text-gray-600">{item.clientesMorosos} clientes morosos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{formatCurrency(item.totalDeuda)}</p>
                      <p className="text-sm text-gray-600">Total deuda</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista detallada de clientes morosos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Clientes Morosos
            </CardTitle>
            <CardDescription>
              Detalle de clientes con pagos vencidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : reporte?.clientesMorosos?.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes morosos</h3>
                <p className="text-gray-600">¡Excelente! Todos los clientes están al día con sus pagos.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reporte?.clientesMorosos?.map((cliente) => {
                  const riesgo = getNivelRiesgo(cliente.diasAtraso);
                  return (
                    <div key={cliente.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">{cliente.nombreCompleto}</h3>
                            <Badge className={riesgo.color}>
                              Riesgo {riesgo.label}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {cliente.telefono}
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {cliente.direccionCompleta}
                            </div>
                            <p>Cobrador: {cliente.cobrador.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(cliente.saldoActual)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {cliente.diasAtraso} días de atraso
                          </p>
                          <p className="text-xs text-gray-500">
                            Cuota: {formatCurrency(cliente.montoPago)}
                          </p>
                          {cliente.ultimoPago && (
                            <p className="text-xs text-gray-500">
                              Último pago: {formatDate(new Date(cliente.ultimoPago))}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
