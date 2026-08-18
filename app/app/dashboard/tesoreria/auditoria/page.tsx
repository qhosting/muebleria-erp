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
  Send,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
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

// Interfaces Cruce MySQL vs ERP con Moratorios y Contpaqi
interface ResumenCruce {
  fechaInicio: string;
  fechaFin: string;
  cobradorFiltro: string;
  totalPagosMysql: number;
  totalPagosErp: number;
  
  // MySQL
  montoAbonoMysql: number;
  montoMoraMysql: number;
  montoGcobMysql: number;
  montoTotalMysql: number;
  
  // ERP
  montoAbonoErp: number;
  montoMoraErp: number;
  montoGcobErp: number;
  montoTotalErp: number;
  
  // Diferencias
  diferenciaGlobal: number;
  diferenciaAbonoGlobal: number;
  diferenciaMoraGlobal: number;

  totalClientesAuditados: number;
  totalCuadrados: number;
  totalDesfaseMonto: number;
  totalDesfaseSaldo?: number;
  totalFaltantesErp: number;
  totalFaltantesMysql: number;
  porcentajeCuadre: number;

  // Contpaqi
  totalContpaqiAplicados: number;
  totalContpaqiPendientes: number;
}

interface ClienteCruceItem {
  codigo: string;
  nombre: string;
  cobrador: string;
  empresaContpaqi: string;
  saldoErp: number;
  saldoMysql: number;
  diferenciaSaldo: number;
  mysqlPagos: { id: number; fecha: string; montoAbono: number; mora: number; gcob: number; montoTotal: number; referencia: string; cobrador: string }[];
  mysqlAbono: number;
  mysqlMora: number;
  mysqlGcob: number;
  mysqlTotal: number;
  erpPagos: { id: string; fecha: string; montoAbono: number; mora: number; gcob: number; montoTotal: number; referencia: string; cobrador: string; sincronizadoContpaqi: boolean }[];
  erpAbono: number;
  erpMora: number;
  erpGcob: number;
  erpTotal: number;
  diferencia: number;
  diferenciaAbono: number;
  diferenciaMora: number;
  estado: 'CUADRADO' | 'DESFASE_MONTO' | 'FALTANTE_ERP' | 'FALTANTE_MYSQL';
  estadoContpaqi: 'APLICADO' | 'PENDIENTE' | 'NO_APLICA';
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
  const [filtroContpaqi, setFiltroContpaqi] = useState<string>('TODOS');
  const [busquedaCliente, setBusquedaCliente] = useState<string>('');

  const [loadingCruce, setLoadingCruce] = useState(true);
  const [aligning, setAligning] = useState(false);
  const [applyingContpaqi, setApplyingContpaqi] = useState(false);
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
  const handleAlinearPagos = async (codigoCliente?: string, aplicarContpaqi: boolean = false) => {
    const msg = codigoCliente
      ? `¿Importar pagos de MySQL hacia el ERP para el cliente ${codigoCliente}${aplicarContpaqi ? ' y aplicar abonos a Contpaqi' : ''}?`
      : `¿Auto-alinear pagos del corte (${fechaInicio} al ${fechaFin}) importando faltantes de MySQL a ERP${aplicarContpaqi ? ' y aplicando abonos a Contpaqi' : ''}?`;

    if (!confirm(msg)) return;

    setAligning(true);
    try {
      const res = await fetch('/api/tesoreria/auditoria/cruce-mysql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'auto_alinear',
          fechaInicio,
          fechaFin,
          cobradorFiltro: selectedCobrador,
          codigoCliente,
          aplicarContpaqi,
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

  // Función para aplicar pagos en Contpaqi Comercial API
  const handleAplicarContpaqi = async (codigoCliente?: string) => {
    const targetEmpresa = codigoCliente ? (codigoCliente.toUpperCase().startsWith('DQ') ? 'DQ' : 'DP') : 'DQ/DP';
    const msg = codigoCliente
      ? `¿Aplicar abono(s) en Contpaqi Comercial (${targetEmpresa}) para el cliente ${codigoCliente}?\n(Nota: Solo se aplica el capital, no moratorios).`
      : `¿Aplicar TODOS los abonos registrados del corte (${fechaInicio} al ${fechaFin}) en Contpaqi Comercial API (DQ y DP)?\n(Nota: Solo se aplica el capital, no moratorios).`;

    if (!confirm(msg)) return;

    setApplyingContpaqi(true);
    try {
      const res = await fetch('/api/tesoreria/auditoria/cruce-mysql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'aplicar_contpaqi',
          fechaInicio,
          fechaFin,
          codigoCliente,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.mensaje || 'Abonos enviados a Contpaqi.');
        fetchCruce();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al conectar con Contpaqi API');
      }
    } catch (error) {
      console.error('Error al aplicar Contpaqi:', error);
      toast.error('Error de conexión con Contpaqi API');
    } finally {
      setApplyingContpaqi(false);
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

  // Función para exportar auditoría a archivo Excel (.xlsx / .xls)
  const handleExportarXLS = () => {
    try {
      if (mainTab === 'cruce') {
        if (clientesFiltrados.length === 0) {
          toast.error('No hay datos disponibles para exportar con los filtros actuales');
          return;
        }

        const dataRows = clientesFiltrados.map((item) => ({
          'Código': item.codigo,
          'Empresa': item.empresaContpaqi,
          'Cliente': item.nombre,
          'Cobrador / Gestor': item.cobrador,
          'Saldo Actual ERP': item.saldoErp,
          'Saldo Actual MySQL': item.saldoMysql,
          'Diferencia Saldo': item.diferenciaSaldo,
          'Hay Dif Saldo': Math.abs(item.diferenciaSaldo) > 0.01 ? 'SI' : 'NO',
          'Abono MySQL': item.mysqlAbono,
          'Mora MySQL': item.mysqlMora,
          'Gcob MySQL': item.mysqlGcob,
          'Total Pagos MySQL': item.mysqlTotal,
          'Abono ERP': item.erpAbono,
          'Mora ERP': item.erpMora,
          'Gcob ERP': item.erpGcob,
          'Total Pagos ERP': item.erpTotal,
          'Diferencia Pagos Periodo': item.diferencia,
          'Estado Auditoría ERP': item.estado === 'CUADRADO' ? 'CUADRADO' :
            item.estado === 'FALTANTE_ERP' ? 'FALTA EN ERP' :
            item.estado === 'FALTANTE_MYSQL' ? 'SOLO EN ERP' : 'DESFASE EN MONTO',
          'Estado Contpaqi': item.estadoContpaqi,
          'Cant. Recibos MySQL': item.mysqlPagos.length,
          'Cant. Recibos ERP': item.erpPagos.length,
        }));

        const ws = XLSX.utils.json_to_sheet(dataRows);

        // Ajuste de ancho de columnas
        ws['!cols'] = [
          { wch: 12 }, // Código
          { wch: 10 }, // Empresa
          { wch: 36 }, // Cliente
          { wch: 22 }, // Cobrador
          { wch: 18 }, // Saldo ERP
          { wch: 18 }, // Saldo MySQL
          { wch: 18 }, // Dif Saldo
          { wch: 15 }, // Hay Dif Saldo
          { wch: 15 }, // Abono MySQL
          { wch: 14 }, // Mora MySQL
          { wch: 14 }, // Gcob MySQL
          { wch: 18 }, // Total MySQL
          { wch: 15 }, // Abono ERP
          { wch: 14 }, // Mora ERP
          { wch: 14 }, // Gcob ERP
          { wch: 18 }, // Total ERP
          { wch: 22 }, // Dif Pagos
          { wch: 20 }, // Estado ERP
          { wch: 16 }, // Estado Contpaqi
          { wch: 18 }, // Cant Recibos MySQL
          { wch: 18 }, // Cant Recibos ERP
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Auditoría Cruzada');

        const fileName = `Auditoria_Cruce_${fechaInicio}_al_${fechaFin}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Reporte exportado exitosamente: ${fileName}`);
      } else {
        // Pestaña Integridad Interna ERP
        const wb = XLSX.utils.book_new();

        if (desfases.length > 0) {
          const wsDesfases = XLSX.utils.json_to_sheet(
            desfases.map((d) => ({
              'Código': d.codigo,
              'Cliente': d.nombre,
              'Cobrador': d.cobrador,
              'Saldo Base de Datos': d.saldoActualDB,
              'Último Saldo en Pagos': d.ultimoSaldoPago,
              'Diferencia': d.diferencia,
              'Total Pagos': d.totalPagos,
            }))
          );
          XLSX.utils.book_append_sheet(wb, wsDesfases, 'Desfases de Saldo');
        }

        if (duplicados.length > 0) {
          const wsDuplicados = XLSX.utils.json_to_sheet(
            duplicados.map((dp) => ({
              'Código': dp.clienteCodigo,
              'Cliente': dp.clienteNombre,
              'Cobrador': dp.cobrador,
              'Monto': dp.monto,
              'Fecha': dp.fecha,
              'Diferencia Segundos': dp.diffSegundos,
              'ID Pago 1': dp.id1,
              'ID Pago 2': dp.id2,
            }))
          );
          XLSX.utils.book_append_sheet(wb, wsDuplicados, 'Pagos Duplicados');
        }

        if (saltosCadena.length > 0) {
          const wsSaltos = XLSX.utils.json_to_sheet(
            saltosCadena.map((s) => ({
              'Código': s.codigo,
              'Cliente': s.nombre,
              'Cobrador': s.cobrador,
              'Saldo Actual': s.saldoActual,
              'Total Pagos': s.totalPagos,
            }))
          );
          XLSX.utils.book_append_sheet(wb, wsSaltos, 'Saltos Cadena');
        }

        if (saldosNegativos.length > 0) {
          const wsNegativos = XLSX.utils.json_to_sheet(
            saldosNegativos.map((sn) => ({
              'Código': sn.codigo,
              'Cliente': sn.nombre,
              'Cobrador': sn.cobrador,
              'Saldo Negativo': sn.saldo,
            }))
          );
          XLSX.utils.book_append_sheet(wb, wsNegativos, 'Saldos Negativos');
        }

        if (wb.SheetNames.length === 0) {
          const wsVacio = XLSX.utils.json_to_sheet([{ 'Estado': 'Sin alertas de integridad' }]);
          XLSX.utils.book_append_sheet(wb, wsVacio, 'Integridad');
        }

        const fileName = `Auditoria_Integridad_ERP_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Reporte exportado exitosamente: ${fileName}`);
      }
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      toast.error('Error al generar el archivo Excel');
    }
  };

  // Filtrado de clientes para la tabla de cruce
  const clientesFiltrados = clientesCruce.filter((c) => {
    if (filtroEstado === 'CON_PAGO_MYSQL' && c.mysqlPagos.length === 0) return false;
    if (filtroEstado === 'DIFERENCIAS' && c.estado === 'CUADRADO') return false;
    if (filtroEstado === 'DIFERENCIAS_SALDO' && Math.abs(c.diferenciaSaldo || 0) <= 0.01) return false;
    if (filtroEstado === 'DIFERENCIAS_CUALQUIERA' && c.estado === 'CUADRADO' && Math.abs(c.diferenciaSaldo || 0) <= 0.01) return false;
    if (filtroEstado === 'CUADRADO' && c.estado !== 'CUADRADO') return false;
    if (filtroEstado === 'FALTANTE_ERP' && c.estado !== 'FALTANTE_ERP') return false;
    if (filtroEstado === 'FALTANTE_MYSQL' && c.estado !== 'FALTANTE_MYSQL') return false;
    if (filtroEstado === 'DESFASE_MONTO' && c.estado !== 'DESFASE_MONTO') return false;

    // Filtro Contpaqi
    if (filtroContpaqi === 'PENDIENTE' && c.estadoContpaqi !== 'PENDIENTE') return false;
    if (filtroContpaqi === 'APLICADO' && c.estadoContpaqi !== 'APLICADO') return false;

    if (busquedaCliente.trim()) {
      const q = busquedaCliente.trim().toLowerCase();
      return (
        c.codigo.toLowerCase().includes(q) ||
        c.nombre.toLowerCase().includes(q) ||
        c.cobrador.toLowerCase().includes(q) ||
        c.empresaContpaqi.toLowerCase().includes(q)
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
              Cruce de cortes semanales (Sábado a Viernes), Intereses Moratorios y Aplicación en Contpaqi Comercial API (DQ / DP).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={mainTab} onValueChange={setMainTab} className="w-auto">
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
                <TabsTrigger value="cruce" className="text-xs font-semibold">
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                  Cruce MySQL vs ERP & Contpaqi
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
        {/* PESTAÑA 1: CRUCE DE PAGOS MYSQL VS ERP & CONTPAQI       */}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t">
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
                  <div className="flex items-end gap-2 col-span-1 lg:col-span-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchCruce}
                      disabled={loadingCruce}
                      className="h-8 text-xs flex-1 flex items-center justify-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingCruce ? 'animate-spin' : ''}`} />
                      Auditar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAlinearPagos()}
                      disabled={loadingCruce || aligning || (resumenCruce?.totalFaltantesErp === 0)}
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex-1 flex items-center justify-center gap-1"
                      title="Importar pagos faltantes de MySQL al ERP"
                    >
                      <Download className={`w-3.5 h-3.5 ${aligning ? 'animate-spin' : ''}`} />
                      Auto-Alinear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAplicarContpaqi()}
                      disabled={loadingCruce || applyingContpaqi || (resumenCruce?.totalContpaqiPendientes === 0)}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex-1 flex items-center justify-center gap-1"
                      title="Aplicar abonos de capital a Contpaqi Comercial API (DQ y DP)"
                    >
                      <Send className={`w-3.5 h-3.5 ${applyingContpaqi ? 'animate-spin' : ''}`} />
                      Contpaqi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportarXLS}
                      disabled={loadingCruce || clientesFiltrados.length === 0}
                      className="h-8 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 flex-1 flex items-center justify-center gap-1 shadow-sm"
                      title="Exportar auditoría a archivo Excel (.xlsx / .xls)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Exportar XLS
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tarjetas KPI de Comparación con Desglose de Moratorio y Contpaqi */}
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
                <CardContent className="p-4 pt-0 space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Abono a Saldo:</span>
                    <span className="font-mono font-medium">{formatCurrency(resumenCruce?.montoAbonoMysql ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>Interés Moratorio:</span>
                    <span className="font-mono font-bold">+{formatCurrency(resumenCruce?.montoMoraMysql ?? 0)}</span>
                  </div>
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
                <CardContent className="p-4 pt-0 space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Abono a Saldo:</span>
                    <span className="font-mono font-medium">{formatCurrency(resumenCruce?.montoAbonoErp ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>Interés Moratorio:</span>
                    <span className="font-mono font-bold">+{formatCurrency(resumenCruce?.montoMoraErp ?? 0)}</span>
                  </div>
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
                <CardContent className="p-4 pt-0 space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Dif. Abonos:</span>
                    <span className="font-mono">{formatCurrency(resumenCruce?.diferenciaAbonoGlobal ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dif. Moratorios:</span>
                    <span className="font-mono">{formatCurrency(resumenCruce?.diferenciaMoraGlobal ?? 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="flex justify-between items-center text-xs font-semibold uppercase">
                    Estado Contpaqi API
                    <Building2 className="w-4 h-4 text-emerald-500" />
                  </CardDescription>
                  <CardTitle className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {loadingCruce ? '...' : `${resumenCruce?.totalContpaqiAplicados ?? 0} Aplicados`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Pendientes de envío:</span>
                    <span className="font-mono font-bold text-amber-600">
                      {resumenCruce?.totalContpaqiPendientes ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cuadre Clientes:</span>
                    <span className="font-mono">{resumenCruce?.porcentajeCuadre ?? 100}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabla Detallada por Cliente con Columna Contpaqi */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="p-4 border-b">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">Auditoría Cruzada y Aplicación en Sistema</CardTitle>
                    <CardDescription className="text-xs">
                      Comparativa de movimientos por cliente, empresa asignada (DQ / DP) y estatus en Contpaqi Comercial.
                    </CardDescription>
                  </div>

                  {/* Filtros de la Tabla */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <Input
                        placeholder="Buscar cliente, código..."
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                        className="h-8 text-xs pl-8"
                      />
                    </div>

                    <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                      <SelectTrigger className="h-8 text-xs w-44">
                        <SelectValue placeholder="Estado ERP" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos ({clientesCruce.length})</SelectItem>
                        <SelectItem value="CON_PAGO_MYSQL">
                          Con Pago en MySQL ({clientesCruce.filter((c) => c.mysqlPagos.length > 0).length})
                        </SelectItem>
                        <SelectItem value="DIFERENCIAS_CUALQUIERA">
                          Cualquier Discrepancia ({clientesCruce.filter((c) => c.estado !== 'CUADRADO' || Math.abs(c.diferenciaSaldo || 0) > 0.01).length})
                        </SelectItem>
                        <SelectItem value="DIFERENCIAS">
                          Dif. en Pagos Periodo ({clientesCruce.filter((c) => c.estado !== 'CUADRADO').length})
                        </SelectItem>
                        <SelectItem value="DIFERENCIAS_SALDO">
                          Dif. en Saldo Actual ({clientesCruce.filter((c) => Math.abs(c.diferenciaSaldo || 0) > 0.01).length})
                        </SelectItem>
                        <SelectItem value="FALTANTE_ERP">
                          Falta en ERP ({resumenCruce?.totalFaltantesErp ?? 0})
                        </SelectItem>
                        <SelectItem value="DESFASE_MONTO">
                          Desfase Monto ({resumenCruce?.totalDesfaseMonto ?? 0})
                        </SelectItem>
                        <SelectItem value="FALTANTE_MYSQL">
                          Solo en ERP ({resumenCruce?.totalFaltantesMysql ?? 0})
                        </SelectItem>
                        <SelectItem value="CUADRADO">
                          100% Cuadrados ({resumenCruce?.totalCuadrados ?? 0})
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filtroContpaqi} onValueChange={setFiltroContpaqi}>
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue placeholder="Contpaqi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos Contpaqi</SelectItem>
                        <SelectItem value="PENDIENTE">
                          Pendientes ({resumenCruce?.totalContpaqiPendientes ?? 0})
                        </SelectItem>
                        <SelectItem value="APLICADO">
                          Aplicados ({resumenCruce?.totalContpaqiAplicados ?? 0})
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportarXLS}
                      disabled={loadingCruce || clientesFiltrados.length === 0}
                      className="h-8 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 flex items-center gap-1 shadow-sm"
                      title="Descargar archivo Excel con los datos actuales"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Exportar XLS
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loadingCruce ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Cruzando pagos y validando estatus Contpaqi...
                  </div>
                ) : clientesFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    No se encontraron clientes con los filtros seleccionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b">
                        <tr>
                          <th className="p-2.5">Código / Emp.</th>
                          <th className="p-2.5">Cliente</th>
                          <th className="p-2.5">Cobrador</th>
                          <th className="p-2.5 text-right font-bold">Saldo Actual</th>
                          <th className="p-2.5 text-right font-bold">Total MySQL</th>
                          <th className="p-2.5 text-right font-bold">Total ERP</th>
                          <th className="p-2.5 text-right">Dif. Pagos</th>
                          <th className="p-2.5 text-center">Estado ERP</th>
                          <th className="p-2.5 text-center">Estado Contpaqi</th>
                          <th className="p-2.5 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {clientesFiltrados.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-indigo-600">{item.codigo}</span>
                                <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                                  item.empresaContpaqi === 'DQ' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                  item.empresaContpaqi === 'DP' ? 'bg-purple-50 text-purple-700 border-purple-300' : ''
                                }`}>
                                  {item.empresaContpaqi}
                                </Badge>
                              </div>
                            </td>
                            <td className="p-2.5 font-medium">{item.nombre}</td>
                            <td className="p-2.5 text-slate-500">{item.cobrador}</td>
                            
                            {/* Columna: Saldo Actual del Cliente (ERP vs MySQL con indicador de diferencia) */}
                            <td className="p-2.5 text-right font-mono">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {formatCurrency(item.saldoErp)}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                                <span>MySQL: {formatCurrency(item.saldoMysql)}</span>
                                {Math.abs(item.diferenciaSaldo) > 0.01 ? (
                                  <Badge
                                    variant="destructive"
                                    className="text-[9px] px-1 py-0 h-4 font-mono font-bold"
                                    title={`Diferencia en saldo: ${formatCurrency(item.diferenciaSaldo)} (ERP - MySQL)`}
                                  >
                                    Dif: {formatCurrency(item.diferenciaSaldo)}
                                  </Badge>
                                ) : (
                                  <span className="text-emerald-600 font-semibold text-[10px]" title="Saldo Actual sincronizado entre ERP y MySQL">
                                    ✓
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-blue-600">
                              {formatCurrency(item.mysqlTotal)}
                              {item.mysqlMora > 0 && (
                                <span className="text-[10px] text-amber-600 font-normal block">
                                  (+{formatCurrency(item.mysqlMora)} mora)
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-indigo-600">
                              {formatCurrency(item.erpTotal)}
                              {item.erpMora > 0 && (
                                <span className="text-[10px] text-amber-600 font-normal block">
                                  (+{formatCurrency(item.erpMora)} mora)
                                </span>
                              )}
                            </td>
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
                              {item.estadoContpaqi === 'APLICADO' && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] flex items-center gap-1 mx-auto w-fit">
                                  <Check className="w-3 h-3" /> Contpaqi OK
                                </Badge>
                              )}
                              {item.estadoContpaqi === 'PENDIENTE' && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] mx-auto w-fit">
                                  Pendiente
                                </Badge>
                              )}
                              {item.estadoContpaqi === 'NO_APLICA' && (
                                <span className="text-[10px] text-slate-400">Sin ERP</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
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
                                  <>
                                    {item.estadoContpaqi === 'PENDIENTE' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={applyingContpaqi}
                                        onClick={() => handleAplicarContpaqi(item.codigo)}
                                        className="h-7 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300"
                                        title={`Aplicar en Contpaqi ${item.empresaContpaqi}`}
                                      >
                                        Aplicar Contpaqi
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setSelectedClienteModal(item)}
                                      className="h-7 text-xs text-slate-500"
                                    >
                                      Ver Recibos
                                    </Button>
                                  </>
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

            {/* Modal de Detalle de Recibos de un Cliente con Desglose de Moratorio */}
            {selectedClienteModal && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border shadow-xl p-5 space-y-4">
                  <div className="flex justify-between items-start border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          Recibos del Cliente: {selectedClienteModal.nombre}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          Empresa Contpaqi: {selectedClienteModal.empresaContpaqi}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
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

                  {/* Resumen de Saldos Actuales del Cliente */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Saldo Actual ERP</span>
                      <span className="font-bold font-mono text-sm text-slate-800 dark:text-slate-200">
                        {formatCurrency(selectedClienteModal.saldoErp)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Saldo Actual MySQL</span>
                      <span className="font-bold font-mono text-sm text-slate-800 dark:text-slate-200">
                        {formatCurrency(selectedClienteModal.saldoMysql)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Diferencia de Saldo</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`font-bold font-mono text-sm ${
                          Math.abs(selectedClienteModal.diferenciaSaldo) > 0.01 ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {formatCurrency(selectedClienteModal.diferenciaSaldo)}
                        </span>
                        {Math.abs(selectedClienteModal.diferenciaSaldo) > 0.01 ? (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 font-mono font-bold">
                            Desfase
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] px-1 py-0 h-4">
                            Cuadrado
                          </Badge>
                        )}
                      </div>
                    </div>
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
                        <div className="space-y-1.5 max-h-56 overflow-y-auto">
                          {selectedClienteModal.mysqlPagos.map((p, i) => (
                            <div key={i} className="text-[11px] p-2 bg-white dark:bg-slate-800 rounded border space-y-0.5">
                              <div className="flex justify-between font-medium">
                                <span>{p.fecha} ({p.referencia || `#${p.id}`})</span>
                                <span className="font-bold font-mono text-blue-600">{formatCurrency(p.montoTotal)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Abono: {formatCurrency(p.montoAbono)}</span>
                                {p.mora > 0 && <span className="text-amber-600 font-semibold">Mora: +{formatCurrency(p.mora)}</span>}
                              </div>
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
                        <div className="space-y-1.5 max-h-56 overflow-y-auto">
                          {selectedClienteModal.erpPagos.map((p, i) => (
                            <div key={i} className="text-[11px] p-2 bg-white dark:bg-slate-800 rounded border space-y-0.5">
                              <div className="flex justify-between font-medium">
                                <span>{p.fecha} ({p.referencia || 'Recibo'})</span>
                                <span className="font-bold font-mono text-indigo-600">{formatCurrency(p.montoTotal)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Abono: {formatCurrency(p.montoAbono)}</span>
                                <div className="flex items-center gap-1">
                                  {p.mora > 0 && <span className="text-amber-600 font-semibold">Mora: +{formatCurrency(p.mora)}</span>}
                                  {p.sincronizadoContpaqi ? (
                                    <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300 py-0">Contpaqi ✓</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300 py-0">Pendiente</Badge>
                                  )}
                                </div>
                              </div>
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
                    {selectedClienteModal.estadoContpaqi === 'PENDIENTE' && (
                      <Button
                        size="sm"
                        disabled={applyingContpaqi}
                        onClick={() => {
                          handleAplicarContpaqi(selectedClienteModal.codigo);
                          setSelectedClienteModal(null);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Aplicar en Contpaqi ({selectedClienteModal.empresaContpaqi})
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportarXLS}
                  disabled={loadingInterna}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 flex items-center gap-2 shadow-sm"
                  title="Exportar alertas de integridad interna a Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Exportar XLS
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
