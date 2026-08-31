'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Eye,
  Check,
  Building2,
  Receipt,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface ResumenAuditoriaSaldos {
  totalAuditados: number;
  totalCuadrados: number;
  totalConDesfase: number;
  totalConPendientes: number;
  sumaDiscrepanciaTotal: number;
}

interface PagoAuditadoItem {
  id: string | number;
  idpagMysql?: number | null;
  fecha: string;
  monto: number;
  mora: number;
  gcob: number;
  concepto: string;
  referencia: string;
  cobrador: string;
  estaEnContpaqi: boolean;
  docContpaqiId?: number | null;
  docContpaqiFolio?: string | null;
  saldoAnteriorActual: number;
  saldoNuevoActual: number;
  saldoAnteriorReconstruido: number;
  saldoNuevoReconstruido: number;
  requiereAjuste: boolean;
}

interface ClienteAuditado {
  codigo: string;
  nombre: string;
  empresa: 'DP' | 'DQ';
  cobrador: string;
  saldoContpaqiApi: number;
  saldoErpActual: number;
  saldoMysqlActual: number;
  saldoRealCalculado: number;
  diferenciaErp: number;
  diferenciaMysql: number;
  diferenciaContpaqi?: number;
  estadoCuadre: 'CUADRADO' | 'DESFASE_SALDO' | 'PAGOS_PENDIENTES_CONTPAQI';
  totalPagosAuditados: number;
  pagosPendientesContpaqi: number;
  pagosAplicadosContpaqi: number;
  cadenaPagos: PagoAuditadoItem[];
  detallesContpaqi?: {
    totalPagares: number;
    totalAbonosContpaqi: number;
    numPagares: number;
    numAbonos: number;
  };
}

export default function AuditoriaSaldosPage() {
  const [loading, setLoading] = useState(true);
  const [updatingIndividual, setUpdatingIndividual] = useState<string | null>(null);
  const [updatingMassive, setUpdatingMassive] = useState(false);
  const [insertingContpaqiIndividual, setInsertingContpaqiIndividual] = useState<string | null>(null);
  const [insertingContpaqiMassive, setInsertingContpaqiMassive] = useState(false);
  const [insertingPagoSingleId, setInsertingPagoSingleId] = useState<string | null>(null);

  // Filtros
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('all');
  const [cobradorFiltro, setCobradorFiltro] = useState<string>('all');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('all');
  const [statusCuentaFiltro, setStatusCuentaFiltro] = useState<string>('activo'); // activo por defecto
  const [busqueda, setBusqueda] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');

  // Paginación
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [paginationInfo, setPaginationInfo] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1,
  });

  // Datos
  const [resumen, setResumen] = useState<ResumenAuditoriaSaldos | null>(null);
  const [cobradoresList, setCobradoresList] = useState<string[]>([]);
  const [clientes, setClientes] = useState<ClienteAuditado[]>([]);
  const [selectedCodigos, setSelectedCodigos] = useState<Set<string>>(new Set());

  // Modal Detalle
  const [modalCliente, setModalCliente] = useState<ClienteAuditado | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Cargar datos
  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        empresa: empresaFiltro,
        cobrador: cobradorFiltro,
        estado: estadoFiltro,
        statusCuenta: statusCuentaFiltro,
        search: activeSearch,
        page: page.toString(),
        limit: pageSize.toString(),
      });
      const res = await fetch(`/api/tesoreria/auditoria-saldos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResumen(data.resumen || null);
        setClientes(data.clientes || []);
        if (data.pagination) {
          setPaginationInfo(data.pagination);
        }
        if (data.cobradores && Array.isArray(data.cobradores)) {
          setCobradoresList(data.cobradores);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al obtener auditoría de saldos');
      }
    } catch (error) {
      console.error('Error al cargar auditoría:', error);
      toast.error('Error de red al consultar auditoría de saldos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [empresaFiltro, cobradorFiltro, estadoFiltro, statusCuentaFiltro, activeSearch, page, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(busqueda.trim());
  };

  const handleClearSearch = () => {
    setBusqueda('');
    setActiveSearch('');
    setPage(1);
  };

  // Selección individual / masiva
  const handleToggleSelect = (codigo: string) => {
    const next = new Set(selectedCodigos);
    if (next.has(codigo)) {
      next.delete(codigo);
    } else {
      next.add(codigo);
    }
    setSelectedCodigos(next);
  };

  const handleToggleSelectAll = () => {
    if (selectedCodigos.size === clientes.length) {
      setSelectedCodigos(new Set());
    } else {
      setSelectedCodigos(new Set(clientes.map((c) => c.codigo)));
    }
  };

  // Actualizar saldo individual en ERP
  const handleActualizarIndividual = async (codigo: string) => {
    setUpdatingIndividual(codigo);
    try {
      const res = await fetch(`/api/tesoreria/auditoria-saldos/${codigo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'actualizar_saldo' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.mensaje || `Saldo de ${codigo} actualizado a ${formatCurrency(data.saldoReal)}`);
        fetchAuditData();
        if (modalCliente && modalCliente.codigo === codigo) {
          setModalCliente(data.diagnostico || modalCliente);
        }
      } else {
        toast.error(data.error || 'Error al actualizar saldo');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de red al actualizar saldo');
    } finally {
      setUpdatingIndividual(null);
    }
  };

  // Insertar pagos de un cliente a ContPAQi API
  const handleInsertarPagoContpaqi = async (codigo: string, pagoId?: string) => {
    if (pagoId) {
      setInsertingPagoSingleId(pagoId);
    } else {
      setInsertingContpaqiIndividual(codigo);
    }

    try {
      const res = await fetch(`/api/tesoreria/auditoria-saldos/${codigo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'insertar_pagos_contpaqi',
          pagoId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.mensaje || `Pago(s) insertado(s) exitosamente en ContPAQi para ${codigo}`);
        fetchAuditData();
        if (data.diagnostico) {
          setModalCliente(data.diagnostico);
        } else if (modalCliente && modalCliente.codigo === codigo) {
          handleVerDetalle({ ...modalCliente });
        }
      } else {
        toast.error(data.error || 'Error al insertar pago en ContPAQi');
      }
    } catch (error) {
      console.error('Error al insertar pago en ContPAQi:', error);
      toast.error('Error de red al conectar con ContPAQi');
    } finally {
      setInsertingContpaqiIndividual(null);
      setInsertingPagoSingleId(null);
    }
  };

  // Insertar pagos masivos a ContPAQi API
  const handleInsertarPagosMasivoContpaqi = async (codigos?: string[]) => {
    const targetCodigos = codigos || Array.from(selectedCodigos);
    if (targetCodigos.length === 0) {
      toast.error('Seleccione al menos un cliente para insertar pagos a ContPAQi');
      return;
    }

    if (
      !confirm(
        `¿Desea enviar e insertar todos los pagos pendientes de ${targetCodigos.length} cliente(s) a ContPAQi Comercial API?\nLos documentos se crearán y afectarán automáticamente.`
      )
    ) {
      return;
    }

    setInsertingContpaqiMassive(true);
    try {
      const res = await fetch('/api/tesoreria/auditoria-saldos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'insertar_pagos_contpaqi',
          codigosClientes: targetCodigos,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.mensaje || 'Pagos insertados exitosamente en ContPAQi');
        setSelectedCodigos(new Set());
        fetchAuditData();
      } else {
        toast.error(data.error || 'Error en inserción masiva a ContPAQi');
      }
    } catch (error) {
      console.error('Error masivo ContPAQi:', error);
      toast.error('Error de red al insertar pagos en ContPAQi');
    } finally {
      setInsertingContpaqiMassive(false);
    }
  };

  // Actualizar masivo en ERP
  const handleActualizarMasivo = async (codigos?: string[]) => {
    const targetCodigos = codigos || Array.from(selectedCodigos);
    if (targetCodigos.length === 0) {
      toast.error('Seleccione al menos un cliente para actualizar');
      return;
    }

    if (
      !confirm(
        `¿Desea actualizar y reconstruir la cadena de saldos para ${targetCodigos.length} cliente(s)?\nSe alineará el saldo actual y los saldos anterior/nuevo de todos sus tickets.`
      )
    ) {
      return;
    }

    setUpdatingMassive(true);
    try {
      const res = await fetch('/api/tesoreria/auditoria-saldos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'actualizar_saldos',
          codigosClientes: targetCodigos,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.mensaje || 'Actualización masiva completada');
        setSelectedCodigos(new Set());
        fetchAuditData();
      } else {
        toast.error(data.error || 'Error en actualización masiva');
      }
    } catch (error) {
      console.error('Error masivo:', error);
      toast.error('Error de red al ejecutar actualización masiva');
    } finally {
      setUpdatingMassive(false);
    }
  };

  // Abrir modal de diagnóstico detallado
  const handleVerDetalle = async (cliente: ClienteAuditado) => {
    setModalCliente(cliente);
    setModalOpen(true);
    try {
      const res = await fetch(`/api/tesoreria/auditoria-saldos/${cliente.codigo}`);
      if (res.ok) {
        const data = await res.json();
        if (data.diagnostico) {
          setModalCliente(data.diagnostico);
        }
      }
    } catch (error) {
      console.error('Error cargando detalle profundo:', error);
    }
  };

  const clientesConPendientes = clientes.filter((c) => c.pagosPendientesContpaqi > 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Auditoría Reconstructiva de Saldos
                </h1>
                <p className="text-sm text-gray-500">
                  Comparativa y cruce en vivo Mueblería-ERP vs ContPAQi API con inserción directa de pagos
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAuditData}
              disabled={loading}
              className="gap-2 border-gray-300 hover:bg-gray-100"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>

            {/* Inserción masiva de seleccionados */}
            {selectedCodigos.size > 0 && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleInsertarPagosMasivoContpaqi()}
                  disabled={insertingContpaqiMassive}
                  className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20"
                >
                  <UploadCloud className="h-4 w-4" />
                  Insertar Pagos Seleccionados ({selectedCodigos.size})
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleActualizarMasivo()}
                  disabled={updatingMassive}
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                >
                  <Sparkles className="h-4 w-4" />
                  Actualizar Saldos ({selectedCodigos.size})
                </Button>
              </>
            )}

            {/* Inserción de todos los pendientes */}
            <Button
              size="sm"
              onClick={() => {
                const conPendientes = clientesConPendientes.map((c) => c.codigo);
                if (conPendientes.length === 0) {
                  toast.info('No hay clientes con pagos pendientes por insertar en ContPAQi en la vista actual');
                  return;
                }
                handleInsertarPagosMasivoContpaqi(conPendientes);
              }}
              disabled={insertingContpaqiMassive}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
              title="Inserta en ContPAQi API todos los pagos que están registrados en ERP pero faltan en ContPAQi"
            >
              {insertingContpaqiMassive ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Insertar Pagos ContPAQi ({clientesConPendientes.length} clientes)
            </Button>

            {/* Corregir saldos con desfase */}
            <Button
              size="sm"
              onClick={() => {
                const desfasados = clientes.filter((c) => c.estadoCuadre === 'DESFASE_SALDO').map((c) => c.codigo);
                if (desfasados.length === 0) {
                  toast.info('No hay clientes con desfase de saldo en este momento');
                  return;
                }
                handleActualizarMasivo(desfasados);
              }}
              disabled={updatingMassive}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              Corregir Todos con Desfase
            </Button>
          </div>
        </div>

        {/* Tarjetas KPI Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Clientes Auditados</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{resumen?.totalAuditados ?? 0}</h3>
                <p className="text-xs text-gray-500 mt-1">Total en corte activo</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Saldos Cuadrados</p>
                <h3 className="text-2xl font-bold text-emerald-800 mt-1">{resumen?.totalCuadrados ?? 0}</h3>
                <p className="text-xs text-emerald-600 mt-1">Mueblería-ERP y ContPAQi sincronizados</p>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/40 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pagos Pendientes ContPAQi</p>
                <h3 className="text-2xl font-bold text-amber-800 mt-1">{resumen?.totalConPendientes ?? 0}</h3>
                <p className="text-xs text-amber-600 mt-1">Abonos en ERP pendientes de insertar</p>
              </div>
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-rose-200 bg-rose-50/40 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Con Desfase de Saldo</p>
                <h3 className="text-2xl font-bold text-rose-800 mt-1">{resumen?.totalConDesfase ?? 0}</h3>
                <p className="text-xs text-rose-600 mt-1">
                  Discrepancia: {formatCurrency(resumen?.sumaDiscrepanciaTotal ?? 0)}
                </p>
              </div>
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
                <ShieldAlert className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Buscador */}
              <form onSubmit={handleSearchSubmit} className="lg:col-span-2 relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por código (ej: DP2606119) o nombre..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-9 bg-white"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Buscar
                </Button>
                {activeSearch && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleClearSearch}>
                    Limpiar
                  </Button>
                )}
              </form>

              {/* Filtro Empresa */}
              <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Empresas</SelectItem>
                  <SelectItem value="DP">DP - Crédito</SelectItem>
                  <SelectItem value="DQ">DQ - Querétaro</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Estatus de Cuenta */}
              <Select value={statusCuentaFiltro} onValueChange={setStatusCuentaFiltro}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Estatus de Cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Solo Cuentas Activas</SelectItem>
                  <SelectItem value="inactivo">Solo Cuentas Inactivas</SelectItem>
                  <SelectItem value="all">Todos los Estatus</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Cobrador */}
              <Select value={cobradorFiltro} onValueChange={setCobradorFiltro}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Cobrador" />
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

              {/* Filtro Estado */}
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Estado de Cuadre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Estados</SelectItem>
                  <SelectItem value="DESFASE">Con Desfase de Saldo</SelectItem>
                  <SelectItem value="PENDIENTES">Pagos Pendientes ContPAQi</SelectItem>
                  <SelectItem value="CUADRADO">Cuadrados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Clientes Auditados */}
        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardHeader className="p-4 bg-gray-50 border-b border-gray-200 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">
                Detalle Comparativo de Saldos y Auditoría
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Comparativa directa Mueblería-ERP vs ContPAQi API con acciones de inserción y alineación
              </CardDescription>
            </div>
            {selectedCodigos.size > 0 && (
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                {selectedCodigos.size} seleccionados
              </span>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="font-medium text-sm">Consultando y recalculando saldos en vivo...</p>
              </div>
            ) : clientes.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Receipt className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="font-medium">No se encontraron clientes con los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100/75 text-gray-700 font-semibold text-xs border-b border-gray-200">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCodigos.size === clientes.length && clientes.length > 0}
                          onChange={handleToggleSelectAll}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                      </th>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Gestor</th>
                      <th className="p-3.5 text-right">Saldo Mueblería-ERP</th>
                      <th className="p-3.5 text-right">Saldo ContPAQi API</th>
                      <th className="p-3.5 text-center">Comparación / Dif</th>
                      <th className="p-3.5 text-right">Saldo Real Sugerido</th>
                      <th className="p-3.5 text-center">Estado</th>
                      <th className="p-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {clientes.map((c) => {
                      const isSelected = selectedCodigos.has(c.codigo);
                      const isDesfase = c.estadoCuadre === 'DESFASE_SALDO';
                      const isPendiente = c.estadoCuadre === 'PAGOS_PENDIENTES_CONTPAQI';
                      const diffContpaqi = c.diferenciaContpaqi !== undefined
                        ? c.diferenciaContpaqi
                        : parseFloat((c.saldoErpActual - c.saldoContpaqiApi).toFixed(2));

                      return (
                        <tr
                          key={c.codigo}
                          className={`hover:bg-gray-50/80 transition-colors ${
                            isSelected ? 'bg-indigo-50/30' : isDesfase ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(c.codigo)}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                              <span>{c.codigo}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  c.empresa === 'DP'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {c.empresa}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[220px]">
                              {c.nombre}
                            </div>
                          </td>
                          <td className="p-3.5 text-xs text-gray-600 font-medium">
                            {c.cobrador}
                          </td>
                          {/* Saldo muebleria-erp */}
                          <td className="p-3.5 text-right font-semibold text-gray-900 font-mono">
                            {formatCurrency(c.saldoErpActual)}
                          </td>
                          {/* Saldo ContPAQi API */}
                          <td className="p-3.5 text-right font-semibold text-blue-900 font-mono">
                            {formatCurrency(c.saldoContpaqiApi)}
                          </td>
                          {/* Comparación / Diferencia directa */}
                          <td className="p-3.5 text-center">
                            {Math.abs(diffContpaqi) < 0.01 ? (
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200 text-[11px] font-mono">
                                $0.00 (Igual)
                              </Badge>
                            ) : diffContpaqi > 0 ? (
                              <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200 text-[11px] font-mono font-semibold">
                                +{formatCurrency(diffContpaqi)}
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200 text-[11px] font-mono font-semibold">
                                {formatCurrency(diffContpaqi)}
                              </Badge>
                            )}
                          </td>
                          {/* Saldo Real Sugerido */}
                          <td className="p-3.5 text-right">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
                              {formatCurrency(c.saldoRealCalculado)}
                            </span>
                            {c.pagosPendientesContpaqi > 0 && (
                              <div className="text-[10px] text-amber-600 mt-0.5 font-medium">
                                -{c.pagosPendientesContpaqi} pago(s) no en ContPAQi
                              </div>
                            )}
                          </td>
                          {/* Estado */}
                          <td className="p-3.5 text-center">
                            {isDesfase ? (
                              <Badge variant="destructive" className="gap-1 text-[11px] font-semibold py-0.5">
                                <AlertCircle className="h-3 w-3" />
                                Desfase ({formatCurrency(c.diferenciaErp)})
                              </Badge>
                            ) : isPendiente ? (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1 text-[11px] font-semibold py-0.5 border border-amber-200">
                                <Clock className="h-3 w-3" />
                                Abonos Pendientes
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1 text-[11px] font-semibold py-0.5 border border-emerald-200">
                                <Check className="h-3 w-3" />
                                Cuadrado
                              </Badge>
                            )}
                          </td>
                          {/* Acciones */}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Botón Ver Desglose */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVerDetalle(c)}
                                className="h-8 px-2 text-xs gap-1 border-gray-300 hover:bg-gray-100"
                                title="Ver desglose paso a paso de tickets"
                              >
                                <Eye className="h-3.5 w-3.5 text-gray-500" />
                                Detalle
                              </Button>

                              {/* Botón Insertar Pago(s) a ContPAQi */}
                              <Button
                                size="sm"
                                variant={c.pagosPendientesContpaqi > 0 ? "default" : "outline"}
                                onClick={() => handleInsertarPagoContpaqi(c.codigo)}
                                disabled={insertingContpaqiIndividual === c.codigo}
                                className={`h-8 px-2.5 text-xs gap-1 ${
                                  c.pagosPendientesContpaqi > 0
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                                    : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                                }`}
                                title={
                                  c.pagosPendientesContpaqi > 0
                                    ? `Insertar ${c.pagosPendientesContpaqi} pago(s) no reflejados en ContPAQi API`
                                    : 'Insertar pagos del cliente en ContPAQi API'
                                }
                              >
                                {insertingContpaqiIndividual === c.codigo ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UploadCloud className="h-3.5 w-3.5" />
                                )}
                                {c.pagosPendientesContpaqi > 0 ? `Insertar (${c.pagosPendientesContpaqi})` : 'Insertar'}
                              </Button>

                              {/* Botón Corregir Saldo en ERP */}
                              <Button
                                size="sm"
                                onClick={() => handleActualizarIndividual(c.codigo)}
                                disabled={updatingIndividual === c.codigo}
                                className="h-8 px-2.5 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                title="Alinear saldo y cadena histórica de tickets en ERP"
                              >
                                {updatingIndividual === c.codigo ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="h-3.5 w-3.5" />
                                )}
                                Corregir
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Barra de Paginación */}
            {paginationInfo.total > 0 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span>Mostrar</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(val) => {
                      setPageSize(parseInt(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-24 bg-white text-xs">
                      <SelectValue placeholder="50" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="250">250</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>por página</span>
                  <span className="text-gray-400 mx-1">|</span>
                  <span>
                    Mostrando{' '}
                    <strong>
                      {Math.min((page - 1) * pageSize + 1, paginationInfo.total)} -{' '}
                      {Math.min(page * pageSize, paginationInfo.total)}
                    </strong>{' '}
                    de <strong>{paginationInfo.total}</strong> clientes activos
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 bg-white"
                    onClick={() => setPage(1)}
                    disabled={page <= 1 || loading}
                    title="Primera página"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 bg-white"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    title="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="px-3 py-1 font-medium bg-white border border-gray-200 rounded text-gray-800">
                    Página {page} de {Math.max(1, paginationInfo.totalPages)}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 bg-white"
                    onClick={() => setPage((p) => Math.min(paginationInfo.totalPages, p + 1))}
                    disabled={page >= paginationInfo.totalPages || loading}
                    title="Página siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 bg-white"
                    onClick={() => setPage(paginationInfo.totalPages)}
                    disabled={page >= paginationInfo.totalPages || loading}
                    title="Última página"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Diagnóstico Detallado y Desglose Paso a Paso */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {modalCliente && (
              <div className="space-y-5">
                <DialogHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
                    <div>
                      <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <span>{modalCliente.nombre}</span>
                        <Badge className="text-xs bg-indigo-100 text-indigo-800">
                          {modalCliente.codigo} ({modalCliente.empresa})
                        </Badge>
                      </DialogTitle>
                      <DialogDescription className="text-xs text-gray-500 mt-1">
                        Desglose cronológico, comparativa de saldos e inserción de pagos a ContPAQi
                      </DialogDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botón Insertar Pagos del cliente a ContPAQi */}
                      {modalCliente.pagosPendientesContpaqi > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleInsertarPagoContpaqi(modalCliente.codigo)}
                          disabled={insertingContpaqiIndividual === modalCliente.codigo}
                          className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs shadow-sm"
                        >
                          {insertingContpaqiIndividual === modalCliente.codigo ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UploadCloud className="h-3.5 w-3.5" />
                          )}
                          Insertar Pagos en ContPAQi ({modalCliente.pagosPendientesContpaqi})
                        </Button>
                      )}

                      {/* Botón Corregir Saldo en ERP */}
                      <Button
                        size="sm"
                        onClick={() => handleActualizarIndividual(modalCliente.codigo)}
                        disabled={updatingIndividual === modalCliente.codigo}
                        className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                      >
                        {updatingIndividual === modalCliente.codigo ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Alinear Saldo ERP
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                {/* Tarjetas resumen del cliente: ERP vs ContPAQi vs Dif vs Real */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Saldo Mueblería-ERP</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">
                      {formatCurrency(modalCliente.saldoErpActual)}
                    </p>
                    <p className="text-[10px] text-gray-500">En base de cobranza</p>
                  </div>
                  <div className="sm:border-l border-gray-200">
                    <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Saldo ContPAQi API</p>
                    <p className="text-lg font-bold text-blue-900 mt-0.5">
                      {formatCurrency(modalCliente.saldoContpaqiApi)}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {modalCliente.detallesContpaqi?.numAbonos || 0} abonos registrados
                    </p>
                  </div>
                  <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Diferencia Directa</p>
                    <p className={`text-lg font-bold mt-0.5 ${
                      Math.abs(modalCliente.saldoErpActual - modalCliente.saldoContpaqiApi) < 0.01
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}>
                      {formatCurrency(modalCliente.saldoErpActual - modalCliente.saldoContpaqiApi)}
                    </p>
                    <p className="text-[10px] text-gray-500">ERP - ContPAQi</p>
                  </div>
                  <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0">
                    <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Saldo Real Calculado</p>
                    <p className="text-lg font-bold text-indigo-700 mt-0.5">
                      {formatCurrency(modalCliente.saldoRealCalculado)}
                    </p>
                    <p className="text-[10px] text-indigo-600 font-medium">
                      Deduciendo pagos pendientes
                    </p>
                  </div>
                </div>

                {/* Explicación del Algoritmo para este cliente */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                  <strong>💡 Regla de reconciliación:</strong> El saldo base de ContPAQi API es{' '}
                  <strong>{formatCurrency(modalCliente.saldoContpaqiApi)}</strong>. Si hay pagos cobrados en ERP que aún no se han insertado en ContPAQi, se descuentan para calcular el saldo real sugerido (<strong>{formatCurrency(modalCliente.saldoRealCalculado)}</strong>). Al pulsar <em>Insertar Pagos en ContPAQi</em>, los documentos se envían y aplican automáticamente en ContPAQi Comercial.
                </div>

                {/* Tabla de pagos reconstruida */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                      Cadena de Pagos Histórica ({modalCliente.cadenaPagos?.length || 0} pagos)
                    </h4>
                    {modalCliente.pagosPendientesContpaqi > 0 && (
                      <Badge className="bg-amber-100 text-amber-800 text-[10px] border border-amber-200">
                        {modalCliente.pagosPendientesContpaqi} pago(s) pendientes de insertar a ContPAQi
                      </Badge>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[340px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0 border-b border-gray-200">
                        <tr>
                          <th className="p-2.5">Fecha</th>
                          <th className="p-2.5">ID / Ref</th>
                          <th className="p-2.5 text-right">Monto</th>
                          <th className="p-2.5 text-center">Estado ContPAQi</th>
                          <th className="p-2.5 text-right">Saldo Anterior</th>
                          <th className="p-2.5 text-right">Saldo Nuevo</th>
                          <th className="p-2.5 text-center">Ajuste</th>
                          <th className="p-2.5 text-center">Acción ContPAQi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {modalCliente.cadenaPagos?.map((p, idx) => (
                          <tr
                            key={`${p.id}-${idx}`}
                            className={!p.estaEnContpaqi ? 'bg-amber-50/40' : p.requiereAjuste ? 'bg-rose-50/20' : ''}
                          >
                            <td className="p-2.5 font-medium text-gray-900 whitespace-nowrap">{p.fecha}</td>
                            <td className="p-2.5 text-gray-600">
                              <span className="font-mono">{p.id}</span>
                              {p.referencia && <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{p.referencia}</div>}
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-700">{formatCurrency(p.monto)}</td>
                            <td className="p-2.5 text-center">
                              {p.estaEnContpaqi ? (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] py-0 px-1.5 border border-emerald-200">
                                  ✅ Aplicado {p.docContpaqiFolio ? `(${p.docContpaqiFolio})` : ''}
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 text-[10px] py-0 px-1.5 border border-amber-200">
                                  ⏳ Pendiente ContPAQi
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-mono text-gray-700">
                              {formatCurrency(p.saldoAnteriorReconstruido)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-indigo-700">
                              {formatCurrency(p.saldoNuevoReconstruido)}
                            </td>
                            <td className="p-2.5 text-center">
                              {p.requiereAjuste ? (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                  Reajustar
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-emerald-600">Correcto</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              {!p.estaEnContpaqi && p.id && typeof p.id === 'string' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleInsertarPagoContpaqi(modalCliente.codigo, String(p.id))}
                                  disabled={insertingPagoSingleId === String(p.id)}
                                  className="h-6 px-2 text-[11px] gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                                  title="Insertar este pago individual en ContPAQi"
                                >
                                  {insertingPagoSingleId === String(p.id) ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <UploadCloud className="h-3 w-3 text-amber-700" />
                                  )}
                                  Subir Pago
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
