'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Wrench,
  AlertTriangle,
  Copy,
  TrendingDown,
  Link2Off,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface ResumenAuditoria {
  totalClientesActivos: number;
  totalAlertas: number;
  indiceSalud: number;
  pagosDuplicados: number;
  saldosNegativos: number;
  desfasesSaldo: number;
  saltosComprobantes: number;
  timestamp: string;
}

interface DuplicadoItem {
  clienteCodigo: string;
  clienteNombre: string;
  cobrador: string;
  monto: number;
  id1: string;
  id2: string;
  fecha: string;
  diffSegundos: number;
}

interface SaldoNegativoItem {
  codigo: string;
  nombre: string;
  cobrador: string;
  saldo: number;
}

interface DesfaseItem {
  codigo: string;
  nombre: string;
  cobrador: string;
  ultimoSaldoPago: number;
  saldoActualDB: number;
  diferencia: number;
  totalPagos: number;
}

interface SaltoCadenaItem {
  codigo: string;
  nombre: string;
  cobrador: string;
  saldoActual: number;
  totalPagos: number;
}

export default function AuditoriaFinancieraPage() {
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [resumen, setResumen] = useState<ResumenAuditoria | null>(null);
  const [duplicados, setDuplicados] = useState<DuplicadoItem[]>([]);
  const [saldosNegativos, setSaldosNegativos] = useState<SaldoNegativoItem[]>([]);
  const [desfases, setDesfases] = useState<DesfaseItem[]>([]);
  const [saltosCadena, setSaltosCadena] = useState<SaltoCadenaItem[]>([]);

  const fetchAuditoria = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tesoreria/auditoria');
      if (res.ok) {
        const data = await res.json();
        setResumen(data.resumen);
        setDuplicados(data.duplicados || []);
        setSaldosNegativos(data.saldosNegativos || []);
        setDesfases(data.desfases || []);
        setSaltosCadena(data.saltosComprobantes || []);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al obtener diagnóstico de auditoría');
      }
    } catch (error) {
      console.error('Error al consultar auditoría:', error);
      toast.error('Error de red al consultar auditoría');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditoria();
  }, []);

  const handleReconciliar = async (codigoCliente?: string) => {
    const confirmMsg = codigoCliente
      ? `¿Reconciliar y reparar saldos para el cliente ${codigoCliente}?`
      : '¿Deseas ejecutar la auto-reconciliación global? Esto limpiará pagos duplicados detectados y recalculará la cadena de saldos de todos los clientes activos.';

    if (!confirm(confirmMsg)) return;

    setReconciling(true);
    try {
      const res = await fetch('/api/tesoreria/auditoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: codigoCliente ? 'reconciliar_cliente' : 'reconciliar_todo',
          codigoCliente,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          data.mensaje ||
            `Reconciliación completada: ${data.clientesProcesados} clientes actualizados, ${data.duplicadosEliminados} duplicados eliminados.`
        );
        fetchAuditoria();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al ejecutar reconciliación');
      }
    } catch (error) {
      console.error('Error al reconciliar:', error);
      toast.error('Error de conexión durante la reconciliación');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Auditoría Financiera y Salud de Cuentas
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Monitoreo continuo de integridad de saldos, pagos duplicados y reconciliación automática de cuentas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAuditoria}
              disabled={loading || reconciling}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Diagnóstico
            </Button>
            <Button
              size="sm"
              onClick={() => handleReconciliar()}
              disabled={loading || reconciling || (resumen?.totalAlertas === 0)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              <Wrench className={`w-4 h-4 ${reconciling ? 'animate-spin' : ''}`} />
              Auto-Reconciliar Todo
            </Button>
          </div>
        </div>

        {/* Tarjetas de Resumen KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-indigo-500 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex justify-between items-center text-xs font-semibold uppercase">
                Índice de Integridad
                {resumen && resumen.indiceSalud >= 98 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold">
                {loading ? '...' : `${resumen?.indiceSalud ?? 100}%`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500">
              {resumen?.totalClientesActivos ?? 0} clientes activos evaluados
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-rose-500 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex justify-between items-center text-xs font-semibold uppercase">
                Pagos Duplicados
                <Copy className="w-4 h-4 text-rose-500" />
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                {loading ? '...' : (resumen?.pagosDuplicados ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500">
              Mismo monto y cliente (&lt; 2 min)
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex justify-between items-center text-xs font-semibold uppercase">
                Desfases de Saldo
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {loading ? '...' : (resumen?.desfasesSaldo ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500">
              Diferencia saldo BD vs último pago
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-violet-500 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="flex justify-between items-center text-xs font-semibold uppercase">
                Saltos de Cadena
                <Link2Off className="w-4 h-4 text-violet-500" />
              </CardDescription>
              <CardTitle className="text-3xl font-extrabold text-violet-600 dark:text-violet-400">
                {loading ? '...' : (resumen?.saltosComprobantes ?? 0)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500">
              Inconsistencia en saldo previo/nuevo
            </CardContent>
          </Card>
        </div>

        {/* Tablas Detalladas */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-base font-semibold">Detalle de Inconsistencias Detectadas</CardTitle>
            <CardDescription className="text-xs">
              Revisa y reconcilia individual o masivamente cualquier discrepancia en el historial de cuentas.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <Tabs defaultValue="desfases" className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4">
                <TabsTrigger value="desfases" className="text-xs">
                  Desfases ({desfases.length})
                </TabsTrigger>
                <TabsTrigger value="duplicados" className="text-xs">
                  Duplicados ({duplicados.length})
                </TabsTrigger>
                <TabsTrigger value="saltos" className="text-xs">
                  Saltos Cadena ({saltosCadena.length})
                </TabsTrigger>
                <TabsTrigger value="negativos" className="text-xs">
                  Saldos Negativos ({saldosNegativos.length})
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Desfases de Saldo */}
              <TabsContent value="desfases" className="space-y-4">
                {desfases.length === 0 ? (
                  <div className="text-center py-10 border rounded-lg bg-slate-50 dark:bg-slate-900/40">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Todos los saldos de cuenta coinciden perfectamente con su historial de pagos
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b">
                        <tr>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Cliente</th>
                          <th className="p-2.5">Gestor</th>
                          <th className="p-2.5 text-right">Saldo en BD</th>
                          <th className="p-2.5 text-right">Último Saldo Pago</th>
                          <th className="p-2.5 text-right">Diferencia</th>
                          <th className="p-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {desfases.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 font-mono font-bold text-indigo-600">{item.codigo}</td>
                            <td className="p-2.5 font-medium">{item.nombre}</td>
                            <td className="p-2.5 text-slate-500">{item.cobrador}</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(item.saldoActualDB)}</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(item.ultimoSaldoPago)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(item.diferencia)}
                            </td>
                            <td className="p-2.5 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={reconciling}
                                onClick={() => handleReconciliar(item.codigo)}
                              >
                                Reconciliar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Duplicados */}
              <TabsContent value="duplicados" className="space-y-4">
                {duplicados.length === 0 ? (
                  <div className="text-center py-10 border rounded-lg bg-slate-50 dark:bg-slate-900/40">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      No se detectaron cobros o pagos duplicados recientes
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b">
                        <tr>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Cliente</th>
                          <th className="p-2.5">Gestor</th>
                          <th className="p-2.5">Fecha</th>
                          <th className="p-2.5 text-right">Monto</th>
                          <th className="p-2.5 text-center">Intervalo</th>
                          <th className="p-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {duplicados.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 font-mono font-bold text-indigo-600">{item.clienteCodigo}</td>
                            <td className="p-2.5 font-medium">{item.clienteNombre}</td>
                            <td className="p-2.5 text-slate-500">{item.cobrador}</td>
                            <td className="p-2.5">{item.fecha}</td>
                            <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(item.monto)}</td>
                            <td className="p-2.5 text-center">
                              <Badge variant="destructive" className="text-[10px]">
                                {item.diffSegundos}s de diferencia
                              </Badge>
                            </td>
                            <td className="p-2.5 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={reconciling}
                                onClick={() => handleReconciliar(item.clienteCodigo)}
                              >
                                Limpiar Duplicado
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: Saltos en Cadena */}
              <TabsContent value="saltos" className="space-y-4">
                {saltosCadena.length === 0 ? (
                  <div className="text-center py-10 border rounded-lg bg-slate-50 dark:bg-slate-900/40">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Toda la cadena histórica de saldos se encuentra continua y sin saltos
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b">
                        <tr>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Cliente</th>
                          <th className="p-2.5">Gestor</th>
                          <th className="p-2.5 text-right">Saldo Actual</th>
                          <th className="p-2.5 text-center">Total Pagos</th>
                          <th className="p-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {saltosCadena.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 font-mono font-bold text-indigo-600">{item.codigo}</td>
                            <td className="p-2.5 font-medium">{item.nombre}</td>
                            <td className="p-2.5 text-slate-500">{item.cobrador}</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(item.saldoActual)}</td>
                            <td className="p-2.5 text-center">{item.totalPagos}</td>
                            <td className="p-2.5 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={reconciling}
                                onClick={() => handleReconciliar(item.codigo)}
                              >
                                Reconstruir Cadena
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Tab 4: Saldos Negativos */}
              <TabsContent value="negativos" className="space-y-4">
                {saldosNegativos.length === 0 ? (
                  <div className="text-center py-10 border rounded-lg bg-slate-50 dark:bg-slate-900/40">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      No hay clientes activos con saldo en números negativos
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b">
                        <tr>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Cliente</th>
                          <th className="p-2.5">Gestor</th>
                          <th className="p-2.5 text-right">Saldo Actual</th>
                          <th className="p-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {saldosNegativos.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 font-mono font-bold text-indigo-600">{item.codigo}</td>
                            <td className="p-2.5 font-medium">{item.nombre}</td>
                            <td className="p-2.5 text-slate-500">{item.cobrador}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                              {formatCurrency(item.saldo)}
                            </td>
                            <td className="p-2.5 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={reconciling}
                                onClick={() => handleReconciliar(item.codigo)}
                              >
                                Reconciliar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
