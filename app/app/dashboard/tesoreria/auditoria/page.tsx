'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Calendar,
  Search,
  Filter,
  Database,
  ArrowRightLeft,
  Check,
  X,
  Layers,
  Download,
  DollarSign,
  Receipt,
  FileCheck2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

// Interfaces Auditoría Interna
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

// Interfaces Cruce MySQL vs ERP
interface ResumenCruce {
  fechaInicio: string;
  fechaFin: string;
  cobradorFiltro: string;
  totalPagosMysql: number;
  totalPagosErp: number;
  montoTotalMysql: number;
  montoTotalErp: number;
  diferenciaGlobal: number;
  totalClientesAuditados: number;
  totalCuadrados: number;
  totalDesfaseMonto: number;
  totalFaltantesErp: number;
  totalFaltantesMysql: number;
  porcentajeCuadre: number;
}

interface ClienteCruceItem {
  codigo: string;
  nombre: string;
  cobrador: string;
  saldoErp: number;
  saldoMysql: number;
  mysqlPagos: { id: number; fecha: string; monto: number; referencia: string; cobrador: string }[];
  mysqlTotal: number;
  erpPagos: { id: string; fecha: string; monto: number; referencia: string; cobrador: string }[];
  erpTotal: number;
  diferencia: number;
  estado: 'CUADRADO' | 'DESFASE_MONTO' | 'FALTANTE_ERP' | 'FALTANTE_MYSQL';
}

export default function AuditoriaFinancieraPage() {
  // Pestaña activa principal
  const [mainTab, setMainTab] = useState<string>('cruce');

  // Estados Cruce MySQL vs ERP
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const d = new Date();
    const sab = new Date(d);
    sab.setDate(d.getDate() - ((d.getDay() + 1) % 7));
    return sab.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState<string>(() => {
    const d = new Date();
    const sab = new Date(d);
    sab.setDate(d.getDate() - ((d.getDay() + 1) % 7));
    const vie = new Date(sab);
    vie.setDate(sab.getDate() + 6);
    return vie.toISOString().split('T')[0];
  });
  const [selectedCobrador, setSelectedCobrador] = useState<string>('all');
  const [cobradoresList, setCobradoresList] = useState<string[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [busquedaCliente, setBusquedaCliente] = useState<string>('');

  const [loadingCruce, setLoadingCruce] = useState(true);
  const [aligning, setAligning] = useState(false);
  const [resumenCruce, setResumenCruce] = useState<ResumenCruce | null>(null);
  const [clientesCruce, setClientesCruce] = useState<ClienteCruceItem[]>([]);
  const [selectedClienteModal, setSelectedClienteModal] = useState<ClienteCruceItem | null>(null);

  // Estados Auditoría Interna
  const [loadingInterna, setLoadingInterna] = useState(false);
  const [reconcilingInterna, setReconcilingInterna] = useState(false);
  const [resumenInterna, setResumenInterna] = useState<ResumenAuditoria | null>(null);
  const [duplicados, setDuplicados] = useState<DuplicadoItem[]>([]);
  const [saldosNegativos, setSaldosNegativos] = useState<SaldoNegativoItem[]>([]);
  const [desfases, setDesfases] = useState<DesfaseItem[]>([]);
  const [saltosCadena, setSaltosCadena] = useState<SaltoCadenaItem[]>([]);

  // Función para cargar cruce MySQL vs ERP
  const fetchCruce = async () => {
    setLoadingCruce(true);
    try {
      const params = new URLSearchParams({
        fechaInicio,
        fechaFin,
        cobrador: selectedCobrador,
      });
      const res = await fetch(`/api/tesoreria/auditoria/cruce-mysql?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResumenCruce(data.resumen);
        setClientesCruce(data.clientes || []);
        if (data.cobradores && Array.isArray(data.cobradores)) {
          setCobradoresList(data.cobradores);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al ejecutar auditoría cruzada MySQL vs ERP');
      }
    } catch (error) {
      console.error('Error al consultar cruce MySQL:', error);
      toast.error('Error de red al consultar auditoría cruzada');
    } finally {
      setLoadingCruce(false);
    }
  };

  // Función para cargar auditoría interna
  const fetchAuditoriaInterna = async () => {
    setLoadingInterna(true);
    try {
      const res = await fetch('/api/tesoreria/auditoria');
      if (res.ok) {
        const data = await res.json();
        setResumenInterna(data.resumen);
        setDuplicados(data.duplicados || []);
        setSaldosNegativos(data.saldosNegativos || []);
        setDesfases(data.desfases || []);
        setSaltosCadena(data.saltosComprobantes || []);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al obtener diagnóstico de auditoría interna');
      }
    } catch (error) {
      console.error('Error al consultar auditoría interna:', error);
      toast.error('Error de red al consultar auditoría interna');
    } finally {
      setLoadingInterna(false);
    }
  };

  useEffect(() => {
    fetchCruce();
  }, [fechaInicio, fechaFin, selectedCobrador]);

  useEffect(() => {
    if (mainTab === 'interna' && !resumenInterna) {
      fetchAuditoriaInterna();
    }
  }, [mainTab]);

  // Accesos rápidos de fechas
  const setSemanaActual = () => {
    const d = new Date();
    const sab = new Date(d);
    sab.setDate(d.getDate() - ((d.getDay() + 1) % 7));
    const vie = new Date(sab);
    vie.setDate(sab.getDate() + 6);
    setFechaInicio(sab.toISOString().split('T')[0]);
    setFechaFin(vie.toISOString().split('T')[0]);
  };

  const setSemanaAnterior = () => {
    const d = new Date();
    const sab = new Date(d);
    sab.setDate(d.getDate() - ((d.getDay() + 1) % 7) - 7);
    const vie = new Date(sab);
    vie.setDate(sab.getDate() + 6);
    setFechaInicio(sab.toISOString().split('T')[0]);
    setFechaFin(vie.toISOString().split('T')[0]);
  };

  const setMesActual = () => {
    const d = new Date();
    const primerDia = new Date(d.getFullYear(), d.getMonth(), 1);
    const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    setFechaInicio(primerDia.toISOString().split('T')[0]);
    setFechaFin(ultimoDia.toISOString().split('T')[0]);
  };

  // Función para auto-alinear / importar pagos faltantes de MySQL al ERP
  const handleAlinearPagos = async (codigoCliente?: string) => {
    const msg = codigoCliente
      ? `¿Importar pagos faltantes de MySQL hacia el ERP para el cliente ${codigoCliente}?`
      : `¿Auto-alinear pagos del corte seleccionado (${fechaInicio} al ${fechaFin}) importando los pagos faltantes de MySQL hacia el ERP?`;

    if (!confirm(msg)) return;

    setAligning(true);
    try {
      const res = await fetch('/api/tesoreria/auditoria/cruce-mysql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaInicio,
          fechaFin,
          cobradorFiltro: selectedCobrador,
          codigoCliente,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.mensaje || 'Alineación completada exitosamente.');
        fetchCruce();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al alinear pagos');
      }
    } catch (error) {
      console.error('Error al alinear:', error);
      toast.error('Error de red al ejecutar alineación');
    } finally {
      setAligning(false);
    }
  };

  // Función para auto-reconciliar interno ERP
  const handleReconciliarInterno = async (codigoCliente?: string) => {
    const confirmMsg = codigoCliente
      ? `¿Reconciliar saldos para el cliente ${codigoCliente}?`
      : '¿Deseas ejecutar la auto-reconciliación global de saldos en el ERP?';

    if (!confirm(confirmMsg)) return;

    setReconcilingInterna(true);
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
        toast.success(data.mensaje || 'Reconciliación completada.');
        fetchAuditoriaInterna();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al reconciliar');
      }
    } catch (error) {
      console.error('Error al reconciliar:', error);
      toast.error('Error de conexión');
    } finally {
      setReconcilingInterna(false);
    }
  };

  // Filtrado de clientes para la tabla de cruce
  const clientesFiltrados = clientesCruce.filter((c) => {
    // Filtro por Estado
    if (filtroEstado === 'DIFERENCIAS' && c.estado === 'CUADRADO') return false;
    if (filtroEstado === 'CUADRADO' && c.estado !== 'CUADRADO') return false;
    if (filtroEstado === 'FALTANTE_ERP' && c.estado !== 'FALTANTE_ERP') return false;
    if (filtroEstado === 'FALTANTE_MYSQL' && c.estado !== 'FALTANTE_MYSQL') return false;
    if (filtroEstado === 'DESFASE_MONTO' && c.estado !== 'DESFASE_MONTO') return false;

    // Filtro por búsqueda
    if (busquedaCliente.trim()) {
      const q = busquedaCliente.trim().toLowerCase();
      return (
        c.codigo.toLowerCase().includes(q) ||
        c.nombre.toLowerCase().includes(q) ||
        c.cobrador.toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Encabezado General */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Centro de Auditoría y Conciliación de Pagos
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Cruce de cortes semanales (Sábado a Viernes) entre MySQL y ERP, y diagnóstico de integridad de cuentas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-auto">
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
                <TabsTrigger value="cruce" className="text-xs font-semibold">
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                  Cruce MySQL vs ERP
                </TabsTrigger>
                <TabsTrigger value="interna" className="text-xs font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                  Integridad ERP
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PESTAÑA 1: CRUCE DE PAGOS MYSQL VS ERP                   */}
        {/* ======================================================== */}
        {mainTab === 'cruce' && (
          <div className="space-y-6">
            {/* Barra de Filtros: Fechas, Cobrador y Accesos Rápidos */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Corte Semanal y Filtros
                    </span>
                  </div>

                  {/* Accesos rápidos de semana */}
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={setSemanaActual}>
                      Semana Actual (Sáb-Vie)
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={setSemanaAnterior}>
                      Semana Anterior
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={setMesActual}>
                      Mes Completo
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t">
                  {/* Fecha Inicio */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">Fecha Inicio (Sábado)</label>
                    <Input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Fecha Fin */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">Fecha Fin (Viernes)</label>
                    <Input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Filtro por Cobrador */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">Cobrador / Gestor</label>
                    <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todos los cobradores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los Cobradores</SelectItem>
                        {cobradoresList.map((cob) => (
                          <SelectItem key={cob} value={cob}>
                            {cob}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex items-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchCruce}
                      disabled={loadingCruce}
                      className="h-8 text-xs flex-1 flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingCruce ? 'animate-spin' : ''}`} />
                      Auditar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAlinearPagos()}
                      disabled={loadingCruce || aligning || (resumenCruce?.totalFaltantesErp === 0)}
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex-1 flex items-center justify-center gap-1.5"
                    >
                      <Download className={`w-3.5 h-3.5 ${aligning ? 'animate-spin' : ''}`} />
                      Auto-Alinear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarjetas KPI de Comparación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="flex justify-between items-center text-xs font-semibold uppercase">
                    Recaudación MySQL
                    <Database className="w-4 h-4 text-blue-500" />
                  </CardDescription>
                  <CardTitle className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                    {loadingCruce ? '...' : formatCurrency(resumenCruce?.montoTotalMysql ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-slate-500">
                  {resumenCruce?.totalPagosMysql ?? 0} pagos en base MySQL
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="flex justify-between items-center text-xs font-semibold uppercase">
                    Recaudación ERP
                    <Receipt className="w-4 h-4 text-indigo-500" />
                  </CardDescription>
                  <CardTitle className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    {loadingCruce ? '...' : formatCurrency(resumenCruce?.montoTotalErp ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-slate-500">
                  {resumenCruce?.totalPagosErp ?? 0} pagos en base ERP
                </CardContent>
              </Card>

              <Card
                className={`border-l-4 shadow-sm ${
                  (resumenCruce?.diferenciaGlobal ?? 0) === 0
                    ? 'border-l-emerald-500'
                    : 'border-l-rose-500'
                }`}
              >
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="flex justify-between items-center text-xs font-semibold uppercase">
                    Diferencia Global
                    <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                  </CardDescription>
                  <CardTitle
                    className={`text-2xl font-extrabold ${
                      (resumenCruce?.diferenciaGlobal ?? 0) === 0
                        ? 'text-emerald-600'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {loadingCruce ? '...' : formatCurrency(resumenCruce?.diferenciaGlobal ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-slate-500">
                  Diferencia: {(resumenCruce?.totalPagosErp ?? 0) - (resumenCruce?.totalPagosMysql ?? 0)} pagos
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="flex justify-between items-center text-xs font-semibold uppercase">
                    Cuadre por Cliente
                    <FileCheck2 className="w-4 h-4 text-emerald-500" />
                  </CardDescription>
                  <CardTitle className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {loadingCruce ? '...' : `${resumenCruce?.porcentajeCuadre ?? 100}%`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-slate-500">
                  {resumenCruce?.totalCuadrados ?? 0} de {resumenCruce?.totalClientesAuditados ?? 0} clientes cuadrados
                </CardContent>
              </Card>
            </div>

            {/* Tabla Detallada por Cliente */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="p-4 border-b">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">Auditoría Cruzada por Cliente</CardTitle>
                    <CardDescription className="text-xs">
                      Comparativa 1 a 1 de movimientos y totales por cliente en el corte seleccionado.
                    </CardDescription>
                  </div>

                  {/* Filtros de la Tabla */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-52">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <Input
                        placeholder="Buscar cliente o código..."
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                        className="h-8 text-xs pl-8"
                      />
                    </div>

                    <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                      <SelectTrigger className="h-8 text-xs w-44">
                        <SelectValue placeholder="Filtrar por estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos ({clientesCruce.length})</SelectItem>
                        <SelectItem value="DIFERENCIAS">
                          Solo Discrepancias (
                          {clientesCruce.filter((c) => c.estado !== 'CUADRADO').length})
                        </SelectItem>
                        <SelectItem value="FALTANTE_ERP">
                          Faltantes en ERP ({resumenCruce?.totalFaltantesErp ?? 0})
                        </SelectItem>
                        <SelectItem value="DESFASE_MONTO">
                          Desfase de Monto ({resumenCruce?.totalDesfaseMonto ?? 0})
                        </SelectItem>
                        <SelectItem value="FALTANTE_MYSQL">
                          Faltantes en MySQL ({resumenCruce?.totalFaltantesMysql ?? 0})
                        </SelectItem>
                        <SelectItem value="CUADRADO">
                          100% Cuadrados ({resumenCruce?.totalCuadrados ?? 0})
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loadingCruce ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Cruzando pagos entre bases de datos...
                  </div>
                ) : clientesFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    No se encontraron discrepancias con los filtros seleccionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b">
                        <tr>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Cliente</th>
                          <th className="p-2.5">Cobrador</th>
                          <th className="p-2.5 text-center">Pagos MySQL</th>
                          <th className="p-2.5 text-center">Pagos ERP</th>
                          <th className="p-2.5 text-right">Total MySQL</th>
                          <th className="p-2.5 text-right">Total ERP</th>
                          <th className="p-2.5 text-right">Diferencia</th>
                          <th className="p-2.5 text-center">Estado</th>
                          <th className="p-2.5 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {clientesFiltrados.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 font-mono font-bold text-indigo-600">{item.codigo}</td>
                            <td className="p-2.5 font-medium">{item.nombre}</td>
                            <td className="p-2.5 text-slate-500">{item.cobrador}</td>
                            <td className="p-2.5 text-center">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {item.mysqlPagos.length}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-center">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {item.erpPagos.length}
                              </Badge>
                            </td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(item.mysqlTotal)}</td>
                            <td className="p-2.5 text-right font-mono">{formatCurrency(item.erpTotal)}</td>
                            <td
                              className={`p-2.5 text-right font-mono font-bold ${
                                Math.abs(item.diferencia) > 0.01 ? 'text-rose-600' : 'text-slate-400'
                              }`}
                            >
                              {formatCurrency(item.diferencia)}
                            </td>
                            <td className="p-2.5 text-center">
                              {item.estado === 'CUADRADO' && (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                                  Cuadrado
                                </Badge>
                              )}
                              {item.estado === 'FALTANTE_ERP' && (
                                <Badge variant="destructive" className="text-[10px]">
                                  Falta en ERP
                                </Badge>
                              )}
                              {item.estado === 'FALTANTE_MYSQL' && (
                                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">
                                  Solo en ERP
                                </Badge>
                              )}
                              {item.estado === 'DESFASE_MONTO' && (
                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
                                  Desfase Monto
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              {item.estado === 'FALTANTE_ERP' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={aligning}
                                  onClick={() => handleAlinearPagos(item.codigo)}
                                  className="h-7 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                                >
                                  Importar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedClienteModal(item)}
                                  className="h-7 text-xs text-slate-500"
                                >
                                  Ver Recibos
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modal de Detalle de Recibos de un Cliente */}
            {selectedClienteModal && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border shadow-xl p-5 space-y-4">
                  <div className="flex justify-between items-start border-b pb-3">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        Recibos del Cliente: {selectedClienteModal.nombre}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        Código: {selectedClienteModal.codigo} • Cobrador: {selectedClienteModal.cobrador}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedClienteModal(null)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Lista MySQL */}
                    <div className="border rounded-lg p-3 space-y-2 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex justify-between items-center text-xs font-bold text-blue-600">
                        <span>Recibos en MySQL</span>
                        <span>Total: {formatCurrency(selectedClienteModal.mysqlTotal)}</span>
                      </div>
                      {selectedClienteModal.mysqlPagos.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Sin pagos en MySQL</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {selectedClienteModal.mysqlPagos.map((p, i) => (
                            <div key={i} className="text-[11px] p-1.5 bg-white dark:bg-slate-800 rounded border flex justify-between">
                              <span>{p.fecha} ({p.referencia || `#${p.id}`})</span>
                              <span className="font-bold font-mono">{formatCurrency(p.monto)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Lista ERP */}
                    <div className="border rounded-lg p-3 space-y-2 bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex justify-between items-center text-xs font-bold text-indigo-600">
                        <span>Recibos en ERP</span>
                        <span>Total: {formatCurrency(selectedClienteModal.erpTotal)}</span>
                      </div>
                      {selectedClienteModal.erpPagos.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Sin pagos en ERP</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {selectedClienteModal.erpPagos.map((p, i) => (
                            <div key={i} className="text-[11px] p-1.5 bg-white dark:bg-slate-800 rounded border flex justify-between">
                              <span>{p.fecha} ({p.referencia || 'Pago'})</span>
                              <span className="font-bold font-mono">{formatCurrency(p.monto)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    {selectedClienteModal.estado === 'FALTANTE_ERP' && (
                      <Button
                        size="sm"
                        disabled={aligning}
                        onClick={() => {
                          handleAlinearPagos(selectedClienteModal.codigo);
                          setSelectedClienteModal(null);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                      >
                        Importar Pagos al ERP
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setSelectedClienteModal(null)} className="text-xs">
                      Cerrar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA 2: INTEGRIDAD INTERNA ERP                        */}
        {/* ======================================================== */}
        {mainTab === 'interna' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Diagnóstico de Integridad Interna en Base ERP
                </h2>
                <p className="text-xs text-slate-500">
                  Detección de pagos multi-tap duplicados (&lt; 2 min), inconsistencias de cadena y saldos negativos.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAuditoriaInterna}
                  disabled={loadingInterna || reconcilingInterna}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingInterna ? 'animate-spin' : ''}`} />
                  Diagnóstico
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleReconciliarInterno()}
                  disabled={loadingInterna || reconcilingInterna || (resumenInterna?.totalAlertas === 0)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                >
                  <Wrench className={`w-4 h-4 ${reconcilingInterna ? 'animate-spin' : ''}`} />
                  Auto-Reconciliar Todo
                </Button>
              </div>
            </div>

            {/* Tarjetas KPI Internas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="flex justify-between items-center text-xs font-semibold uppercase">
                    Índice de Salud Interno
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </CardDescription>
                  <CardTitle className="text-3xl font-extrabold">
                    {loadingInterna ? '...' : `${resumenInterna?.indiceSalud ?? 100}%`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-slate-500">
                  {resumenInterna?.totalClientesActivos ?? 0} clientes evaluados
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-rose-500 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="flex justify-between items-center text-xs font-semibold uppercase">
                    Pagos Duplicados
                    <Copy className="w-4 h-4 text-rose-500" />
                  </CardDescription>
                  <CardTitle className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                    {loadingInterna ? '...' : (resumenInterna?.pagosDuplicados ?? 0)}
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
                    {loadingInterna ? '...' : (resumenInterna?.desfasesSaldo ?? 0)}
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
                    {loadingInterna ? '...' : (resumenInterna?.saltosComprobantes ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-xs text-slate-500">
                  Inconsistencia en saldo previo/nuevo
                </CardContent>
              </Card>
            </div>

            {/* Tablas de Detalle Interno */}
            <Card className="shadow-sm">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-base font-semibold">Inconsistencias Internas en ERP</CardTitle>
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

                  <TabsContent value="desfases" className="space-y-4">
                    {desfases.length === 0 ? (
                      <div className="text-center py-8 border rounded-lg bg-slate-50 dark:bg-slate-900/40">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold">Todos los saldos coinciden con su historial de pagos</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
                            <tr>
                              <th className="p-2">Código</th>
                              <th className="p-2">Cliente</th>
                              <th className="p-2">Gestor</th>
                              <th className="p-2 text-right">Saldo BD</th>
                              <th className="p-2 text-right">Último Pago</th>
                              <th className="p-2 text-right">Diferencia</th>
                              <th className="p-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {desfases.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-2 font-mono font-bold text-indigo-600">{item.codigo}</td>
                                <td className="p-2">{item.nombre}</td>
                                <td className="p-2 text-slate-500">{item.cobrador}</td>
                                <td className="p-2 text-right font-mono">{formatCurrency(item.saldoActualDB)}</td>
                                <td className="p-2 text-right font-mono">{formatCurrency(item.ultimoSaldoPago)}</td>
                                <td className="p-2 text-right font-mono font-bold text-rose-600">
                                  {formatCurrency(item.diferencia)}
                                </td>
                                <td className="p-2 text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => handleReconciliarInterno(item.codigo)}
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

                  <TabsContent value="duplicados" className="space-y-4">
                    {duplicados.length === 0 ? (
                      <div className="text-center py-8 border rounded-lg bg-slate-50 dark:bg-slate-900/40">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold">No se detectaron cobros o pagos duplicados</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
                            <tr>
                              <th className="p-2">Código</th>
                              <th className="p-2">Cliente</th>
                              <th className="p-2">Fecha</th>
                              <th className="p-2 text-right">Monto</th>
                              <th className="p-2 text-center">Intervalo</th>
                              <th className="p-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {duplicados.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-2 font-mono font-bold text-indigo-600">{item.clienteCodigo}</td>
                                <td className="p-2">{item.clienteNombre}</td>
                                <td className="p-2">{item.fecha}</td>
                                <td className="p-2 text-right font-mono font-bold">{formatCurrency(item.monto)}</td>
                                <td className="p-2 text-center">
                                  <Badge variant="destructive" className="text-[10px]">
                                    {item.diffSegundos}s
                                  </Badge>
                                </td>
                                <td className="p-2 text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => handleReconciliarInterno(item.clienteCodigo)}
                                  >
                                    Limpiar
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="saltos" className="space-y-4">
                    {saltosCadena.length === 0 ? (
                      <div className="text-center py-8 border rounded-lg bg-slate-50 dark:bg-slate-900/40">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold">Toda la cadena de saldos se encuentra continua</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
                            <tr>
                              <th className="p-2">Código</th>
                              <th className="p-2">Cliente</th>
                              <th className="p-2 text-right">Saldo Actual</th>
                              <th className="p-2 text-center">Total Pagos</th>
                              <th className="p-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {saltosCadena.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-2 font-mono font-bold text-indigo-600">{item.codigo}</td>
                                <td className="p-2">{item.nombre}</td>
                                <td className="p-2 text-right font-mono">{formatCurrency(item.saldoActual)}</td>
                                <td className="p-2 text-center">{item.totalPagos}</td>
                                <td className="p-2 text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => handleReconciliarInterno(item.codigo)}
                                  >
                                    Reconstruir
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="negativos" className="space-y-4">
                    {saldosNegativos.length === 0 ? (
                      <div className="text-center py-8 border rounded-lg bg-slate-50 dark:bg-slate-900/40">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold">No hay clientes con saldo negativo</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800 font-semibold border-b">
                            <tr>
                              <th className="p-2">Código</th>
                              <th className="p-2">Cliente</th>
                              <th className="p-2 text-right">Saldo Actual</th>
                              <th className="p-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {saldosNegativos.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="p-2 font-mono font-bold text-indigo-600">{item.codigo}</td>
                                <td className="p-2">{item.nombre}</td>
                                <td className="p-2 text-right font-mono font-bold text-rose-600">
                                  {formatCurrency(item.saldo)}
                                </td>
                                <td className="p-2 text-center">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => handleReconciliarInterno(item.codigo)}
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
        )}
      </div>
    </DashboardLayout>
  );
}
