
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Route, Calendar, MapPin, TrendingUp, Users, Clock, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface RutaCobranza {
  id: string;
  fecha: string;
  cobrador: {
    name: string;
  };
  clientesVisitados: {
    total: number;
    exitosos: number;
    fallidos: number;
  };
  totalCobrado: number;
  tiempoTotal: number;
  eficiencia: number;
}

interface EstadisticasRutas {
  promedioClientesPorRuta: number;
  promedioCobroPorRuta: number;
  eficienciaPromedio: number;
  rutasCompletadas: number;
}

export default function RutasPage() {
  const { data: session } = useSession();
  const [rutas, setRutas] = useState<RutaCobranza[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasRutas | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodo, setSelectedPeriodo] = useState('30');
  const [selectedCobrador, setSelectedCobrador] = useState('all');

  useEffect(() => {
    fetchRutas();
  }, [selectedPeriodo, selectedCobrador]);

  const fetchRutas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedPeriodo !== 'all') params.set('periodo', selectedPeriodo);
      if (selectedCobrador !== 'all') params.set('cobrador', selectedCobrador);

      const response = await fetch(`/api/reportes/rutas?${params.toString()}`);
      const data = await response.json();
      setRutas(data.rutas || []);
      setEstadisticas(data.estadisticas || null);
    } catch (error) {
      console.error('Error al cargar rutas:', error);
      toast.error('Error al cargar rutas');
    } finally {
      setLoading(false);
    }
  };

  const getEficienciaBadge = (eficiencia: number) => {
    if (eficiencia >= 80) return { label: 'Excelente', color: 'bg-green-100 text-green-800' };
    if (eficiencia >= 60) return { label: 'Buena', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Mejorar', color: 'bg-red-100 text-red-800' };
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
            <h1 className="text-2xl font-bold text-gray-900">Análisis de Rutas</h1>
            <p className="text-gray-600">Optimización y seguimiento de rutas de cobranza</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="90">Últimos 3 meses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cobrador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {/* Aquí se cargarían dinámicamente los cobradores */}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rutas Completadas</CardTitle>
              <Route className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticas?.rutasCompletadas || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                En el período seleccionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes por Ruta</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estadisticas?.promedioClientesPorRuta?.toFixed(1) || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Promedio de visitas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cobro por Ruta</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(estadisticas?.promedioCobroPorRuta || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Promedio cobrado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {estadisticas?.eficienciaPromedio?.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Promedio general
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Historial de rutas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Historial de Rutas
            </CardTitle>
            <CardDescription>
              Detalle de todas las rutas de cobranza realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : rutas.length === 0 ? (
              <div className="text-center py-8">
                <Route className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay rutas registradas</h3>
                <p className="text-gray-600">No se encontraron rutas en el período seleccionado.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rutas.map((ruta) => {
                  const eficienciaBadge = getEficienciaBadge(ruta.eficiencia);
                  return (
                    <div key={ruta.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <h3 className="font-medium text-gray-900">{formatDate(new Date(ruta.fecha))}</h3>
                            </div>
                            <Badge className={eficienciaBadge.color}>
                              {eficienciaBadge.label}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Cobrador: {ruta.cobrador.name}
                            </div>
                            <div className="flex items-center gap-4">
                              <span>Total visitas: {ruta.clientesVisitados.total}</span>
                              <span className="text-green-600">Exitosas: {ruta.clientesVisitados.exitosos}</span>
                              <span className="text-red-600">Fallidas: {ruta.clientesVisitados.fallidos}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(ruta.totalCobrado)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Eficiencia: {ruta.eficiencia}%
                          </p>
                          {ruta.tiempoTotal && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 justify-end">
                              <Clock className="h-3 w-3" />
                              {Math.round(ruta.tiempoTotal / 60)} horas
                            </div>
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

        {/* Recomendaciones de optimización */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recomendaciones de Optimización
            </CardTitle>
            <CardDescription>
              Sugerencias para mejorar la eficiencia de las rutas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Agrupación por Zona</h4>
                <p className="text-sm text-blue-700">
                  Agrupe clientes por proximidad geográfica para reducir tiempo de traslado y aumentar el número de visitas por día.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Horarios Óptimos</h4>
                <p className="text-sm text-green-700">
                  Programe visitas considerando la disponibilidad de los clientes y evite horarios de baja efectividad.
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2">Seguimiento de Patrones</h4>
                <p className="text-sm text-yellow-700">
                  Analice los datos históricos para identificar días y horarios con mayor tasa de éxito en cobros.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
