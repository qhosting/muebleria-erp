'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  RefreshCw, 
  Search, 
  Download, 
  Filter, 
  Clock, 
  Layers, 
  ArrowUpRight, 
  ShieldAlert, 
  Send
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HistorialPeriodo {
  periodoNum: number;
  label: string;
  estado: 'PAGADO' | 'NO_PAGO' | 'SIN_REGISTRO';
  detalle?: string;
}

interface ClienteProyeccion {
  id: string;
  codigoCliente: string;
  nombreCompleto: string;
  telefono: string;
  diaPago: string;
  diaPagoNorm: string;
  periodicidad: string;
  saldoActual: number;
  saldoVencido: number;
  diasVencidos: number;
  gestor: string;
  gestorId?: string | null;
  historialPeriodos: HistorialPeriodo[];
  noPagosCount: number;
  pagosCount: number;
  tasaNoPago: number;
  smsPreventivos: number;
  smsCorrectivos: number;
  costoProyectadoSemana: number;
}

interface DesgloseDia {
  dia: string;
  clientesTotal: number;
  smsPreventivos: number;
  smsCorrectivos: number;
  smsTotal: number;
  costoPreventivo: number;
  costoCorrectivo: number;
  costoTotal: number;
}

interface ResumenProyeccion {
  semana: number;
  anio: number;
  fechaInicioStr: string;
  fechaFinStr: string;
  costoUnitario: number;
  totalClientesRuta: number;
  totalSmsPreventivosSemana: number;
  totalSmsCorrectivosSemana: number;
  totalSmsSemana: number;
  gastoPreventivoSemana: number;
  gastoCorrectivoSemana: number;
  gastoTotalSemana: number;
  gastoMensualEstimado: number;
  smsMensualEstimado: number;
}

interface SmsProyeccionTabProps {
  cobradores: { id: string; name: string }[];
  saldoDisponibleMxn?: number;
  smsDisponibles?: number;
}

export function SmsProyeccionTab({
  cobradores,
  saldoDisponibleMxn = 0,
  smsDisponibles = 0
}: SmsProyeccionTabProps) {
  // Filtros
  const [semanaOffset, setSemanaOffset] = useState<string>('0'); // '0' = actual, '-1' = anterior, '+1' = siguiente
  const [selectedGestorId, setSelectedGestorId] = useState<string>('TODOS');
  const [selectedPeriodicidad, setSelectedPeriodicidad] = useState<string>('TODOS');
  const [costoUnitario, setCostoUnitario] = useState<number>(0.45);
  const [filtroDia, setFiltroDia] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');

  // Estados de datos
  const [loading, setLoading] = useState<boolean>(true);
  const [resumen, setResumen] = useState<ResumenProyeccion | null>(null);
  const [desgloseDiario, setDesgloseDiario] = useState<DesgloseDia[]>([]);
  const [clientes, setClientes] = useState<ClienteProyeccion[]>([]);

  // Paginación simple
  const [page, setPage] = useState<number>(1);
  const pageSize = 50;

  // Cargar datos
  const fetchProyeccion = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedGestorId && selectedGestorId !== 'TODOS') {
        params.set('gestorId', selectedGestorId);
      }
      if (selectedPeriodicidad && selectedPeriodicidad !== 'TODOS') {
        params.set('periodicidad', selectedPeriodicidad);
      }
      params.set('costoUnitario', String(costoUnitario));

      // Offset de semana
      if (resumen && semanaOffset !== '0') {
        const targetSem = resumen.semana + parseInt(semanaOffset, 10);
        params.set('semana', String(targetSem));
      }

      const res = await fetch(`/api/sms/proyeccion?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Error al consultar la proyección');
      }

      const data = await res.json();
      setResumen(data.resumen);
      setDesgloseDiario(data.desgloseDiario || []);
      setClientes(data.clientes || []);
      setPage(1);
    } catch (err: any) {
      toast.error(err.message || 'No se pudo obtener la proyección de SMS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProyeccion();
  }, [semanaOffset, selectedGestorId, selectedPeriodicidad]);

  // Clientes filtrados por búsqueda y día seleccionado
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      const matchDia = filtroDia === 'TODOS' || c.diaPagoNorm === filtroDia;
      if (!matchDia) return false;

      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase().trim();
      return (
        c.nombreCompleto.toLowerCase().includes(q) ||
        c.codigoCliente.toLowerCase().includes(q) ||
        c.telefono.includes(q) ||
        c.gestor.toLowerCase().includes(q)
      );
    });
  }, [clientes, filtroDia, busqueda]);

  const totalPages = Math.ceil(clientesFiltrados.length / pageSize) || 1;
  const clientesPaginados = useMemo(() => {
    const start = (page - 1) * pageSize;
    return clientesFiltrados.slice(start, start + pageSize);
  }, [clientesFiltrados, page]);

  // Cálculo de suficiencia de saldo
  const gastoSemanal = resumen?.gastoTotalSemana || 0;
  const saldoFaltanteSemana = Math.max(0, gastoSemanal - saldoDisponibleMxn);
  const saldoSuficienteSemana = saldoFaltanteSemana === 0;

  // Exportar a CSV
  const exportarCSV = () => {
    if (clientesFiltrados.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = [
      'Codigo',
      'Cliente',
      'Telefono',
      'Cobrador',
      'DiaPago',
      'Periodicidad',
      'SaldoActual',
      'SaldoVencido',
      'P-1',
      'P-2',
      'P-3',
      'P-4',
      'TasaNoPago',
      'SMS_Preventivos',
      'SMS_Correctivos',
      'CostoProyectado_MXN'
    ];

    const rows = clientesFiltrados.map(c => [
      `"${c.codigoCliente}"`,
      `"${c.nombreCompleto.replace(/"/g, '""')}"`,
      `"${c.telefono}"`,
      `"${c.gestor}"`,
      `"${c.diaPagoNorm}"`,
      `"${c.periodicidad}"`,
      c.saldoActual,
      c.saldoVencido,
      c.historialPeriodos[0]?.estado || 'N/A',
      c.historialPeriodos[1]?.estado || 'N/A',
      c.historialPeriodos[2]?.estado || 'N/A',
      c.historialPeriodos[3]?.estado || 'N/A',
      `${(c.tasaNoPago * 100).toFixed(0)}%`,
      c.smsPreventivos,
      c.smsCorrectivos,
      c.costoProyectadoSemana
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `proyeccion_sms_semana_${resumen?.semana || 'actual'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Archivo CSV exportado exitosamente');
  };

  return (
    <div className="space-y-6">
      {/* 1. Barra Superior de Control y Filtros */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Proyección Presupuestal de SMS
              </CardTitle>
              <CardDescription className="text-xs">
                Estimación de gasto basada en el histórico de no pago según periodicidad (últimos 4 pagos) y desglose día a día de la semana de cobranza.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProyeccion}
                disabled={loading}
                className="h-9 gap-1.5 text-xs font-medium"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Recalcular
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportarCSV}
                disabled={clientesFiltrados.length === 0}
                className="h-9 gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            {/* Semana de Cobranza */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3 text-primary" />
                Semana de Cobranza
              </label>
              <Select value={semanaOffset} onValueChange={setSemanaOffset}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Seleccionar semana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-1">Semana Anterior ({resumen ? resumen.semana - 1 : '-'})</SelectItem>
                  <SelectItem value="0">Semana Activa Oficial ({resumen ? `Sem ${resumen.semana}` : 'Cargando...'})</SelectItem>
                  <SelectItem value="1">Semana Siguiente ({resumen ? resumen.semana + 1 : '-'})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cobrador / Gestor */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3 text-primary" />
                Cobrador / Gestor
              </label>
              <Select value={selectedGestorId} onValueChange={setSelectedGestorId}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Todos los gestores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los Cobradores</SelectItem>
                  {cobradores.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Periodicidad */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Layers className="h-3 w-3 text-primary" />
                Periodicidad
              </label>
              <Select value={selectedPeriodicidad} onValueChange={setSelectedPeriodicidad}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Todas las periodicidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas las Periodicidades</SelectItem>
                  <SelectItem value="semanal">Semanal (4 periodos / mes)</SelectItem>
                  <SelectItem value="catorcenal">Catorcenal (2 periodos / mes)</SelectItem>
                  <SelectItem value="quincenal">Quincenal (2 periodos / mes)</SelectItem>
                  <SelectItem value="mensual">Mensual (1 periodo / mes)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Costo por SMS */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Coins className="h-3 w-3 text-primary" />
                Costo por SMS ($ MXN)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={costoUnitario}
                  onChange={e => setCostoUnitario(parseFloat(e.target.value) || 0.45)}
                  onBlur={fetchProyeccion}
                  className="h-9 text-xs pl-6 bg-white dark:bg-slate-900"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">$</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. KPIs Resumen Ejecutivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Presupuesto Semanal */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Gasto Semana {resumen?.semana}
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <Coins className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                ${(resumen?.gastoTotalSemana || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-muted-foreground">MXN</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  Prev: ${(resumen?.gastoPreventivoSemana || 0).toFixed(2)}
                </span>
                <span>•</span>
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  No Pago: ${(resumen?.gastoCorrectivoSemana || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proyección Mensual */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Proyección Mensual (4 Sem)
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                ${(resumen?.gastoMensualEstimado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-bold text-muted-foreground">MXN</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Estimado ponderado de <strong>{(resumen?.smsMensualEstimado || 0).toLocaleString('es-MX')}</strong> SMS al mes
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Volumen de SMS Estimados */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Volumen Total SMS Semana
              </span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                <Send className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {(resumen?.totalSmsSemana || 0).toLocaleString('es-MX')} <span className="text-xs font-bold text-muted-foreground">mensajes</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] bg-blue-50/80 text-blue-700 border-blue-200">
                  {resumen?.totalSmsPreventivosSemana || 0} Preventivos
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-amber-50/80 text-amber-700 border-amber-200">
                  {resumen?.totalSmsCorrectivosSemana || 0} No Pagos
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Semáforo de Saldo en Cuenta */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className={cn(
            "absolute top-0 left-0 right-0 h-1",
            saldoSuficienteSemana ? "bg-emerald-500" : "bg-rose-500"
          )} />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Disponibilidad de Saldo
              </span>
              <div className={cn(
                "p-2 rounded-xl",
                saldoSuficienteSemana 
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600" 
                  : "bg-rose-50 dark:bg-rose-950/50 text-rose-600"
              )}>
                {saldoSuficienteSemana ? <CheckCircle2 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                ${saldoDisponibleMxn.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
              </div>
              <div className="mt-1">
                {saldoSuficienteSemana ? (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950 px-2 py-0.5 rounded">
                    ✓ Saldo suficiente para la semana
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-950 px-2 py-0.5 rounded">
                    ⚠️ Recargar al menos ${saldoFaltanteSemana.toFixed(2)} MXN
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Desglose Día por Día (Ciclo Sábado a Viernes) */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Presupuesto Diario de Cobranza (Sábado a Viernes)
              </CardTitle>
              <CardDescription className="text-xs">
                Haz clic en cualquier día para filtrar la lista de clientes inferior y visualizar su detalle correspondiente.
              </CardDescription>
            </div>
            {filtroDia !== 'TODOS' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltroDia('TODOS')}
                className="text-xs h-7 text-primary hover:bg-primary/10"
              >
                Ver todos los días
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {desgloseDiario.map((d) => {
              const isSelected = filtroDia === d.dia;
              return (
                <button
                  key={d.dia}
                  type="button"
                  onClick={() => setFiltroDia(isSelected ? 'TODOS' : d.dia)}
                  className={cn(
                    "flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                    isSelected
                      ? "bg-primary/5 border-primary shadow-sm ring-2 ring-primary/20 dark:bg-primary/10"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-extrabold tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                      {d.dia.slice(0, 3)}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-slate-200">
                      {d.clientesTotal} ctas
                    </Badge>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      ${d.costoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {d.smsTotal} SMS proyectados
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500">
                    <span title="SMS Preventivos">Prev: {d.smsPreventivos}</span>
                    <span title="SMS No Pagos">NoPag: {d.smsCorrectivos}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 4. Tabla Detallada por Cliente */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Detalle de Clientes y Comportamiento Histórico
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {clientesFiltrados.length} cuentas
              </Badge>
              {filtroDia !== 'TODOS' && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                  Día: {filtroDia}
                </Badge>
              )}
            </div>

            {/* Buscador */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, código, teléfono..."
                value={busqueda}
                onChange={e => {
                  setBusqueda(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Cobrador</th>
                  <th className="py-2.5 px-3">Día</th>
                  <th className="py-2.5 px-3">Periodicidad</th>
                  <th className="py-2.5 px-3 text-center">Últimos 4 Pagos (Histórico)</th>
                  <th className="py-2.5 px-3 text-center">Tasa No Pago</th>
                  <th className="py-2.5 px-3 text-center">SMS Proyectados</th>
                  <th className="py-2.5 px-3 text-right">Costo Est. ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Calculando proyección e historial de pagos...
                    </td>
                  </tr>
                ) : clientesPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      No se encontraron clientes con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  clientesPaginados.map(c => {
                    const pctNoPago = Math.round(c.tasaNoPago * 100);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {c.nombreCompleto}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className="font-mono">{c.codigoCliente}</span>
                            <span>•</span>
                            <span>{c.telefono || 'Sin teléfono'}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          {c.gestor}
                        </td>

                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                            {c.diaPagoNorm}
                          </Badge>
                        </td>

                        <td className="py-2.5 px-3">
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {c.periodicidad}
                          </Badge>
                        </td>

                        {/* Visualizador de los últimos 4 periodos */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {c.historialPeriodos.map((p, idx) => (
                              <div
                                key={idx}
                                title={`${p.label}: ${p.estado === 'PAGADO' ? 'Pagó' : p.estado === 'NO_PAGO' ? 'No pagó' : 'Sin registro'} (${p.detalle})`}
                                className={cn(
                                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border",
                                  p.estado === 'PAGADO' && "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
                                  p.estado === 'NO_PAGO' && "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
                                  p.estado === 'SIN_REGISTRO' && "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                )}
                              >
                                {p.estado === 'PAGADO' && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                                {p.estado === 'NO_PAGO' && <XCircle className="h-3 w-3 text-rose-600" />}
                                {p.estado === 'SIN_REGISTRO' && <MinusCircle className="h-3 w-3 text-slate-400" />}
                                <span>{p.label}</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Tasa de No Pago */}
                        <td className="py-2.5 px-3 text-center">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold",
                              pctNoPago >= 75 && "bg-rose-50 text-rose-700 border-rose-200",
                              pctNoPago >= 25 && pctNoPago < 75 && "bg-amber-50 text-amber-700 border-amber-200",
                              pctNoPago < 25 && "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}
                          >
                            {pctNoPago}% No Pago
                          </Badge>
                        </td>

                        {/* SMS Proyectados */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {(c.smsPreventivos + c.smsCorrectivos).toFixed(1)} SMS
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            1 Prev + {c.smsCorrectivos.toFixed(1)} Corr
                          </div>
                        </td>

                        {/* Costo Estimado */}
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                          ${c.costoProyectadoSemana.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, clientesFiltrados.length)} de {clientesFiltrados.length} clientes
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 text-xs px-2"
                >
                  Anterior
                </Button>
                <span className="px-2 font-medium">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-7 text-xs px-2"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
