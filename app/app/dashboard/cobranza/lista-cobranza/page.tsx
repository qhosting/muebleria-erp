"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Download,
  Filter,
  FileText,
  Users,
  Search,
  Calendar,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Save,
  History,
  Printer,
  CheckCircle2,
  Lock,
  RefreshCw,
  BarChart3,
  CalendarDays
} from "lucide-react";
import { calcularSemanaCobranzaSabadoViernes, formatearFechaCortaMX } from "@/lib/calendario-cobranza-utils";
import { formatCurrency, getDayName } from "@/lib/utils";
import { descargarExcelCEJ, imprimirPDFCEJ } from "@/lib/exportar-plantilla-cej";
import { ResumenCorteCEJ } from "@/lib/corte-cej-utils";

interface User {
  id: string;
  name: string;
  codigoGestor?: string;
  role?: string;
}

interface ClienteCEJ {
  id?: string;
  codigoCliente: string;
  numContrato?: string;
  periodoInicial: string;
  nombreCompleto: string;
  periodicidad: string;
  montoPago: number; // Pago sugerido
  saldoVencido: number;
  pv: number;
  saldoActual: number;
  gestor: string;
  sup: number;
  moratorio: number;
  pvr: number;
  pagoReal: number;
  diaPago: string;
  tipoCobro: string;
  telefono?: string;
  telefonoTrabajo?: string;
  c: number;
  pagoAnalista: string;
  problema: string;
  pagoDoble: number;
  numPagosDobles: number;
  recuperadoPv: number;
  numPagosDobles2: number;
  comisionAnalista: number;
  fechaPago?: string | null;
  serie?: string;
  tipCob?: string;
}

interface CorteGuardadoItem {
  id: string;
  anio: number;
  semana: number;
  fechaInicio: string;
  fechaFin: string;
  cobradorId: string;
  nombreGestor: string;
  estatus: string;
  totalCuentas: number;
  totalSugerido: number;
  totalCobrado: number;
  totalVencido: number;
  porcentajeCobro: number;
  createdAt: string;
}

export default function ListaCobranzaPage() {
  const { data: session } = useSession();
  const [cobradores, setCobradores] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCobradores, setLoadingCobradores] = useState(true);
  const [savingCorte, setSavingCorte] = useState(false);

  // Parámetros de consulta
  const [selectedCobrador, setSelectedCobrador] = useState<string>("TODOS");
  const [anio, setAnio] = useState<string>(() => {
    const semActual = calcularSemanaCobranzaSabadoViernes(new Date());
    return semActual.anio.toString();
  });
  const [semana, setSemana] = useState<string>(() => {
    const semActual = calcularSemanaCobranzaSabadoViernes(new Date());
    return semActual.semana.toString();
  });

  // Filtro de empresa / tipo de cuenta
  const [filtroEmpresa, setFiltroEmpresa] = useState<"TODAS" | "DQ" | "DP">("TODAS");

  // Resultados
  const [clientes, setClientes] = useState<ClienteCEJ[]>([]);
  const [calendario, setCalendario] = useState<any>(null);
  const [resumenCEJ, setResumenCEJ] = useState<ResumenCorteCEJ | null>(null);
  const [busqueda, setBusqueda] = useState<string>("");
  const [searched, setSearched] = useState<boolean>(false);

  // Estado de corte guardado
  const [esCorteGuardado, setEsCorteGuardado] = useState<boolean>(false);
  const [corteIdActivo, setCorteIdActivo] = useState<string | null>(null);
  const [corteGuardadoExistenteId, setCorteGuardadoExistenteId] = useState<string | null>(null);
  const [estatusCorte, setEstatusCorte] = useState<string>("abierto");

  // Modal de Historial de Cortes
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historialCortes, setHistorialCortes] = useState<CorteGuardadoItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Modal de Guardar Corte
  const [guardarCorteModalOpen, setGuardarCorteModalOpen] = useState(false);
  const [observacionesCorte, setObservacionesCorte] = useState("");

  useEffect(() => {
    fetchCobradores();
  }, []);

  const fetchCobradores = async () => {
    try {
      setLoadingCobradores(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const users = await res.json();
        const gestores = users.filter((u: any) => u.role === "cobrador" || u.role === "gestor_cobranza");
        setCobradores(gestores);
      }
    } catch (error) {
      console.error("Error al cargar cobradores:", error);
      toast.error("Error al cargar la lista de cobradores");
    } finally {
      setLoadingCobradores(false);
    }
  };

  const handleBuscar = async (e?: React.FormEvent, forzarEnVivo = false) => {
    if (e) e.preventDefault();
    if (!semana) {
      toast.error("Por favor ingresa una semana");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({
        cobradorId: selectedCobrador,
        semana: semana,
        anio: anio,
        enVivo: forzarEnVivo ? "true" : "false"
      });

      const res = await fetch(`/api/reportes/lista-cobranza?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClientes(data.clientes || []);
        setCalendario(data.calendario || null);
        setEsCorteGuardado(Boolean(data.esCorteGuardado));

        if (data.esCorteGuardado && data.corte) {
          setCorteIdActivo(data.corte.id);
          setCorteGuardadoExistenteId(data.corte.id);
          setEstatusCorte(data.corte.estatus || "abierto");
          setResumenCEJ({
            totalCuentas: data.corte.totalCuentas,
            totalSugerido: data.corte.totalSugerido,
            totalCobrado: data.corte.totalCobrado,
            totalVencido: data.corte.totalVencido,
            totalCartera: data.corte.totalCartera,
            totalPagosDobles: 0,
            totalRecuperadoPv: 0,
            porcentajeCtasSinDobles: data.corte.porcentajeCobro,
            porcentajeCtasConDobles: data.corte.porcentajeCobro,
            pagarConPorcentajeSinDobles: data.corte.porcentajeCobro < 81,
            cobranzaEfectivo: data.corte.resumenCanales?.efectivo || { cuentas: 0, pesos: 0 },
            cobranzaBancos: data.corte.resumenCanales?.bancos || { cuentas: 0, pesos: 0 },
            resumenProblemas: data.corte.resumenProblemas,
            matrizPeriodos: data.corte.resumenPeriodos || [],
            resumenDiario: data.corte.resumenDiario || []
          });
          toast.info(`Mostrando Corte Semanal guardado (${data.corte.estatus.toUpperCase()})`);
        } else {
          setCorteIdActivo(null);
          setCorteGuardadoExistenteId(data.corteGuardadoExistenteId || null);
          setEstatusCorte("abierto");
          setResumenCEJ(data.resumenCEJ || null);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al consultar la lista");
      }
    } catch (error) {
      console.error("Error al buscar lista de cobranza:", error);
      toast.error("Error de red al consultar la lista");
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCobradorName = () => {
    if (selectedCobrador === "TODOS") {
      return "GENERAL - TODOS LOS COBRADORES";
    }
    const cobrador = cobradores.find((c) => c.id === selectedCobrador);
    return cobrador ? cobrador.codigoGestor || cobrador.name : "Gestor";
  };

  const getSelectedCobradorCodigo = () => {
    if (selectedCobrador === "TODOS") return "TODOS";
    const cobrador = cobradores.find((c) => c.id === selectedCobrador);
    return cobrador?.codigoGestor || cobrador?.name || "GESTOR";
  };

  // Guardar Corte Semanal Oficial
  const handleConfirmarGuardarCorte = async () => {
    try {
      setSavingCorte(true);
      const res = await fetch("/api/cobranza/cortes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anio: parseInt(anio),
          semana: parseInt(semana),
          cobradorId: selectedCobrador,
          observaciones: observacionesCorte
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Corte semanal guardado exitosamente");
        setGuardarCorteModalOpen(false);
        setObservacionesCorte("");
        // Recargar para mostrar el corte recién congelado
        handleBuscar(undefined, false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al guardar el corte");
      }
    } catch (e: any) {
      console.error("Error al guardar corte:", e);
      toast.error("Error de conexión al guardar el corte");
    } finally {
      setSavingCorte(false);
    }
  };

  // Abrir Historial de Cortes
  const handleAbrirHistorial = async () => {
    setHistorialOpen(true);
    setLoadingHistorial(true);
    try {
      const res = await fetch(`/api/cobranza/cortes?anio=${anio}`);
      if (res.ok) {
        const data = await res.json();
        setHistorialCortes(data.cortes || []);
      }
    } catch (e) {
      console.error("Error al cargar historial:", e);
      toast.error("Error al cargar historial de cortes");
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleCargarCorteHistorial = (c: CorteGuardadoItem) => {
    setSemana(c.semana.toString());
    setAnio(c.anio.toString());
    setSelectedCobrador(c.cobradorId);
    setHistorialOpen(false);
    setTimeout(() => {
      handleBuscar(undefined, false);
    }, 100);
  };

  // Exportar Excel Oficial CEJ
  const handleExportarExcelCEJ = () => {
    if (clientes.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const fInicio = calendario
      ? new Date(calendario.fechaInicio).toLocaleDateString("es-MX")
      : `Semana ${semana}`;
    const fFin = calendario
      ? new Date(calendario.fechaFin).toLocaleDateString("es-MX")
      : `${anio}`;

    descargarExcelCEJ({
      anio: parseInt(anio),
      semana: parseInt(semana),
      fechaInicioStr: fInicio,
      fechaFinStr: fFin,
      nombreGestor: getSelectedCobradorName(),
      codigoGestor: getSelectedCobradorCodigo(),
      detalles: clientes as any,
      resumen: resumenCEJ || undefined
    });

    toast.success("Descargando archivo Excel oficial idéntico a Plantilla CEJ");
  };

  // Imprimir / Exportar PDF Oficial CEJ
  const handleExportarPDFCEJ = () => {
    if (clientes.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const fInicio = calendario
      ? new Date(calendario.fechaInicio).toLocaleDateString("es-MX")
      : `Semana ${semana}`;
    const fFin = calendario
      ? new Date(calendario.fechaFin).toLocaleDateString("es-MX")
      : `${anio}`;

    imprimirPDFCEJ({
      anio: parseInt(anio),
      semana: parseInt(semana),
      fechaInicioStr: fInicio,
      fechaFinStr: fFin,
      nombreGestor: getSelectedCobradorName(),
      codigoGestor: getSelectedCobradorCodigo(),
      detalles: clientes as any,
      resumen: resumenCEJ || undefined
    });
  };

  // Filtrado en memoria de clientes
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const cod = (c.codigoCliente || "").toUpperCase();
      const cont = (c.numContrato || "").toUpperCase();

      if (filtroEmpresa === "DQ" && !cod.startsWith("DQ") && !cont.startsWith("DQ")) return false;
      if (filtroEmpresa === "DP" && !cod.startsWith("DP") && !cont.startsWith("DP")) return false;

      if (!busqueda) return true;
      const b = busqueda.toLowerCase();
      return (
        c.nombreCompleto.toLowerCase().includes(b) ||
        cod.toLowerCase().includes(b) ||
        cont.toLowerCase().includes(b) ||
        (c.telefono && c.telefono.includes(b)) ||
        c.gestor.toLowerCase().includes(b)
      );
    });
  }, [clientes, filtroEmpresa, busqueda]);

  const totalCuentasDQ = clientes.filter(
    (c) => (c.codigoCliente || "").toUpperCase().startsWith("DQ") || (c.numContrato || "").toUpperCase().startsWith("DQ")
  ).length;
  const totalCuentasDP = clientes.filter(
    (c) => (c.codigoCliente || "").toUpperCase().startsWith("DP") || (c.numContrato || "").toUpperCase().startsWith("DP")
  ).length;

  const totalCobrar = clientesFiltrados.reduce((acc, curr) => acc + (curr.montoPago || 0), 0);
  const totalSaldoVencido = clientesFiltrados.reduce((acc, curr) => acc + (curr.saldoVencido || 0), 0);
  const totalSaldo = clientesFiltrados.reduce((acc, curr) => acc + (curr.saldoActual || 0), 0);
  const totalCobradoReal = clientesFiltrados.reduce((acc, curr) => acc + (curr.pagoReal || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1700px] mx-auto p-4 md:p-6">
        {/* Encabezado Institucional */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-200 dark:shadow-none">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Plantilla Lista Cobranza (Por Cobrador)
                </h1>
                {esCorteGuardado ? (
                  <Badge className="bg-emerald-600 text-white font-bold text-xs uppercase px-2.5 py-0.5 gap-1 shadow-sm">
                    <Lock className="w-3 h-3" /> Corte Guardado Oficial
                  </Badge>
                ) : searched && (
                  <Badge variant="outline" className="text-blue-600 border-blue-300 font-bold text-xs uppercase px-2.5 py-0.5 gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Cálculo En Vivo
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Generación oficial de la <strong>Plantilla Lista Cobranza</strong> para cada cobrador, auditoría de abonos y corte semanal según el Calendario Anual de Cobranza.
              </p>
            </div>
          </div>

          {/* Botones de Acción Global */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={handleAbrirHistorial}
              className="h-9 text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700"
            >
              <History className="h-4 w-4 text-slate-600 dark:text-slate-400" /> Historial de Cortes
            </Button>

            {clientes.length > 0 && (
              <>
                <Button
                  onClick={handleExportarExcelCEJ}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none h-9 text-xs font-bold gap-1.5"
                >
                  <Download className="h-4 w-4" /> Excel (Plantilla Lista Cobranza)
                </Button>

                <Button
                  onClick={handleExportarPDFCEJ}
                  className="bg-slate-800 hover:bg-slate-900 text-white shadow-md h-9 text-xs font-bold gap-1.5"
                >
                  <Printer className="h-4 w-4" /> PDF (Plantilla Lista Cobranza)
                </Button>

                {!esCorteGuardado ? (
                  <Button
                    onClick={() => setGuardarCorteModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 dark:shadow-none h-9 text-xs font-bold gap-1.5"
                  >
                    <Save className="h-4 w-4" /> Guardar Corte del Cobrador
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleBuscar(undefined, true)}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50 h-9 text-xs font-bold gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4" /> Recalcular Pagos En Vivo
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Formulario de Parámetros del Calendario */}
        <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
          <CardHeader className="py-3.5 border-b bg-gray-50/50 dark:bg-slate-800/50">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" /> Parámetros del Calendario Anual de Cobranza
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={(e) => handleBuscar(e, false)} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="gestor" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Cobrador / Gestor
                </Label>
                <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                  <SelectTrigger id="gestor" disabled={loadingCobradores} className="h-9 text-xs">
                    <SelectValue placeholder="Selecciona un cobrador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS" className="font-bold text-blue-600 dark:text-blue-400">
                      🌟 TODOS LOS COBRADORES (GENERAL)
                    </SelectItem>
                    {cobradores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.codigoGestor ? `${c.codigoGestor} - ${c.name}` : c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="anio" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Año de Cobranza
                </Label>
                <Input
                  id="anio"
                  type="number"
                  min="2020"
                  max="2035"
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="semana" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Semana del Calendario (1 - 52)
                </Label>
                <Input
                  id="semana"
                  type="number"
                  min="1"
                  max="52"
                  value={semana}
                  onChange={(e) => setSemana(e.target.value)}
                  placeholder="Ej. 36"
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              <Button type="submit" className="w-full h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? "Consultando ruta..." : "Consultar Corte"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Alerta de Período y Estado de Corte */}
        {calendario && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-300">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-bold">Semana {calendario.semana} ({calendario.anio}):</span>
              <span className="font-medium text-blue-800 dark:text-blue-200">
                {formatearFechaCortaMX(calendario.fechaInicio)} al {formatearFechaCortaMX(calendario.fechaFin)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-bold">Periodicidades Activas:</span>
                {(calendario.periodicidadesActivas as string[]).map((p) => (
                  <Badge key={p} variant="secondary" className="text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-200 border-none">
                    {p}
                  </Badge>
                ))}
              </div>

              {corteGuardadoExistenteId && !esCorteGuardado && (
                <Badge className="bg-amber-500 text-white font-bold text-[10px] cursor-pointer" onClick={() => handleBuscar(undefined, false)}>
                  ⚡ Existe corte guardado para esta semana. Clic para cargarlo
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* KPIs Principales de Cobranza */}
        {searched && clientes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-500">Cuentas en Cartera</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{clientesFiltrados.length}</p>
                </div>
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600">
                  <Users className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-500">Pago Sugerido (Ppto)</p>
                  <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">{formatCurrency(totalCobrar)}</p>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-500">Cobranza Real Recibida</p>
                  <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(totalCobradoReal)}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-500">Saldo Vencido</p>
                  <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(totalSaldoVencido)}</p>
                </div>
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-500">Cartera Total</p>
                  <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">{formatCurrency(totalSaldo)}</p>
                </div>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pestañas Principales: Cartera Oficial vs Tablero Ejecutivo de Corte */}
        {searched && clientes.length > 0 && (
          <Tabs defaultValue="cartera" className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <TabsList className="bg-slate-200/80 dark:bg-slate-800 p-1">
                <TabsTrigger value="cartera" className="text-xs font-bold gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Cartera en Ruta (Plantilla Lista Cobranza)
                </TabsTrigger>
                <TabsTrigger value="tablero" className="text-xs font-bold gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Resumen de Corte (Plantilla Lista Cobranza)
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <div className="inline-flex bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setFiltroEmpresa("TODAS")}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${
                      filtroEmpresa === "TODAS" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Todas ({clientes.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroEmpresa("DQ")}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${
                      filtroEmpresa === "DQ" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    DQ ({totalCuentasDQ})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroEmpresa("DP")}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${
                      filtroEmpresa === "DP" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    DP ({totalCuentasDP})
                  </button>
                </div>

                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Buscar cliente, contrato..."
                    className="pl-8 h-9 text-xs"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* PESTAÑA 1: TABLA OFICIAL CEJ */}
            <TabsContent value="cartera" className="m-0">
              <Card className="border-gray-100 dark:border-slate-800 shadow-md overflow-hidden">
                <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Ruta Detallada de Cobranza ({clientesFiltrados.length} cuentas)
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Formato oficial CEJ con 18 columnas analíticas, días supuestos y cruce de cobranza semanal.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[650px]">
                    <table className="w-full text-xs text-left align-middle border-collapse">
                      <thead className="bg-[#0f172a] text-white text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 text-center border border-slate-700">CODIGO</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">CONTRATO</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">INICIAL</th>
                          <th className="px-3 py-2.5 border border-slate-700">CLIENTE</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">PERIODO</th>
                          <th className="px-3 py-2.5 text-right border border-slate-700">PAGO SUG.</th>
                          <th className="px-3 py-2.5 text-right border border-slate-700">VENCIDO</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">PV</th>
                          <th className="px-3 py-2.5 text-right border border-slate-700">SALDO ACT.</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">GESTOR</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">SUP</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">PROBLEMA</th>
                          <th className="px-3 py-2.5 text-right border border-slate-700 bg-emerald-950/70 text-emerald-300">PAGO REAL</th>
                          <th className="px-3 py-2.5 text-right border border-slate-700">P. DOBLE</th>
                          <th className="px-3 py-2.5 text-right border border-slate-700">RECU PV</th>
                          <th className="px-3 py-2.5 text-right border border-slate-700">COMISIÓN</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">DIA PAGO</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">TELÉFONO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                        {clientesFiltrados.map((c, i) => (
                          <tr key={c.codigoCliente + i} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-3 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800">
                              {c.codigoCliente}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                              {c.numContrato || "-"}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-500 border border-gray-100 dark:border-slate-800">
                              {c.periodoInicial}
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 whitespace-nowrap">
                              {c.nombreCompleto}
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-100 dark:border-slate-800">
                              <Badge variant="outline" className="text-[9px] font-bold uppercase py-0">
                                {c.periodicidad}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-slate-800">
                              {formatCurrency(c.montoPago)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400 border border-gray-100 dark:border-slate-800">
                              {formatCurrency(c.saldoVencido)}
                            </td>
                            <td className="px-3 py-2 text-center font-bold border border-gray-100 dark:border-slate-800">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${c.pv > 0 ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" : "bg-slate-100 text-slate-600"}`}>
                                {c.pv}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800">
                              {formatCurrency(c.saldoActual)}
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-100 dark:border-slate-800 font-mono text-[11px]">
                              {c.gestor}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-slate-600 border border-gray-100 dark:border-slate-800">
                              {c.sup}
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-100 dark:border-slate-800">
                              <Badge
                                variant={c.problema === "RUTA" ? "secondary" : "destructive"}
                                className={`text-[10px] font-black uppercase ${c.problema === "RUTA" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300" : ""}`}
                              >
                                {c.problema}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-black border border-gray-100 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
                              {formatCurrency(c.pagoReal || 0)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600 border border-gray-100 dark:border-slate-800">
                              {c.pagoDoble > 0 ? formatCurrency(c.pagoDoble) : "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600 border border-gray-100 dark:border-slate-800">
                              {c.recuperadoPv > 0 ? formatCurrency(c.recuperadoPv) : "-"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600 border border-gray-100 dark:border-slate-800">
                              {c.comisionAnalista > 0 ? formatCurrency(c.comisionAnalista) : "-"}
                            </td>
                            <td className="px-3 py-2 text-center border border-gray-100 dark:border-slate-800 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {c.diaPago ? getDayName(c.diaPago) : "-"}
                            </td>
                            <td className="px-3 py-2 text-center font-mono border border-gray-100 dark:border-slate-800 text-slate-600">
                              {c.telefono || "-"}
                            </td>
                          </tr>
                        ))}

                        {/* Fila de Totales */}
                        <tr className="bg-slate-100 dark:bg-slate-800/90 font-black text-xs text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                          <td colSpan={5} className="px-4 py-3 text-right uppercase text-[10px] tracking-wider border border-gray-200 dark:border-slate-700">
                            TOTALES ({clientesFiltrados.length} cuentas)
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-slate-700">
                            {formatCurrency(totalCobrar)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-rose-700 dark:text-rose-300 border border-gray-200 dark:border-slate-700">
                            {formatCurrency(totalSaldoVencido)}
                          </td>
                          <td className="px-3 py-3 text-center border border-gray-200 dark:border-slate-700">-</td>
                          <td className="px-3 py-3 text-right font-mono text-slate-950 dark:text-white border border-gray-200 dark:border-slate-700">
                            {formatCurrency(totalSaldo)}
                          </td>
                          <td colSpan={3} className="px-3 py-3 text-center border border-gray-200 dark:border-slate-700">-</td>
                          <td className="px-3 py-3 text-right font-mono text-emerald-700 dark:text-emerald-300 border border-gray-200 dark:border-slate-700">
                            {formatCurrency(totalCobradoReal)}
                          </td>
                          <td colSpan={5} className="px-3 py-3 text-center border border-gray-200 dark:border-slate-700">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PESTAÑA 2: TABLERO EJECUTIVO DE CORTE (PÁGINA 2 CEJ) */}
            <TabsContent value="tablero" className="m-0 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Clasificación por Problema */}
                <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Clasificación de Cartera y Problemas</span>
                      <Badge variant="outline" className="text-[10px] font-bold">Página 2 CEJ</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1.5 px-2 bg-slate-100 dark:bg-slate-800 rounded font-bold">
                      <span>Cuentas Asignadas</span>
                      <span>
                        {resumenCEJ?.resumenProblemas.totalAsignadas.cuentas ?? clientes.length} ctas •{" "}
                        {formatCurrency(resumenCEJ?.resumenProblemas.totalAsignadas.pesos ?? totalCobrar)}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">CANCELADO (K)</span>
                        <span className="font-mono">{resumenCEJ?.resumenProblemas.canceladoK.cuentas ?? 0} ({formatCurrency(resumenCEJ?.resumenProblemas.canceladoK.pesos ?? 0)})</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">INTERVENCION (IT)</span>
                        <span className="font-mono">{resumenCEJ?.resumenProblemas.intervencionIT.cuentas ?? 0} ({formatCurrency(resumenCEJ?.resumenProblemas.intervencionIT.pesos ?? 0)})</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">ADELANTADO (AD)</span>
                        <span className="font-mono">{resumenCEJ?.resumenProblemas.adelantadoAD.cuentas ?? 0} ({formatCurrency(resumenCEJ?.resumenProblemas.adelantadoAD.pesos ?? 0)})</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">PERIODO (PE)</span>
                        <span className="font-mono font-bold text-amber-600">{resumenCEJ?.resumenProblemas.periodoPE.cuentas ?? 0} ({formatCurrency(resumenCEJ?.resumenProblemas.periodoPE.pesos ?? 0)})</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">PAGO SEM (PS)</span>
                        <span className="font-mono">{resumenCEJ?.resumenProblemas.pagoSemPS.cuentas ?? 0} ({formatCurrency(resumenCEJ?.resumenProblemas.pagoSemPS.pesos ?? 0)})</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">DICT LEGAL (DL)</span>
                        <span className="font-mono">{resumenCEJ?.resumenProblemas.dictLegalDL.cuentas ?? 0} ({formatCurrency(resumenCEJ?.resumenProblemas.dictLegalDL.pesos ?? 0)})</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-1.5 px-2 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 rounded font-bold">
                      <span>TOTAL PROBLEMAS</span>
                      <span>
                        {resumenCEJ?.resumenProblemas.totalProblemas.cuentas ?? 0} ctas •{" "}
                        {formatCurrency(resumenCEJ?.resumenProblemas.totalProblemas.pesos ?? 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 rounded font-bold mt-2">
                      <span>Cuentas en RUTA</span>
                      <span>
                        {resumenCEJ?.resumenProblemas.cuentasRuta.cuentas ?? 0} ctas •{" "}
                        {formatCurrency(resumenCEJ?.resumenProblemas.cuentasRuta.pesos ?? 0)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                      <span className="text-slate-600 dark:text-slate-400">Vencidos en RUTA</span>
                      <span className="font-mono font-bold text-rose-600">
                        {resumenCEJ?.resumenProblemas.vencidosRuta.cuentas ?? 0} ctas •{" "}
                        {formatCurrency(resumenCEJ?.resumenProblemas.vencidosRuta.pesos ?? 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Canales de Recaudación y Cumplimiento */}
                <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Canales de Cobro y Cumplimiento de Metas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900">
                        <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">EFECTIVO (Cobrador)</p>
                        <p className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                          {formatCurrency(resumenCEJ?.cobranzaEfectivo.pesos ?? 0)}
                        </p>
                        <p className="text-[10px] text-emerald-600 mt-0.5">{resumenCEJ?.cobranzaEfectivo.cuentas ?? 0} cuentas</p>
                      </div>

                      <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
                        <p className="text-[10px] font-bold uppercase text-blue-800 dark:text-blue-300">BANCOS (Depósito/Bot)</p>
                        <p className="text-lg font-black font-mono text-blue-700 dark:text-blue-400 mt-1">
                          {formatCurrency(resumenCEJ?.cobranzaBancos.pesos ?? 0)}
                        </p>
                        <p className="text-[10px] text-blue-600 mt-0.5">{resumenCEJ?.cobranzaBancos.cuentas ?? 0} cuentas</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl space-y-1.5">
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>% Cumplimiento Cuentas (Sin Dobles)</span>
                        <span className="font-mono">{resumenCEJ?.porcentajeCtasSinDobles ?? 0}%</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>% Cumplimiento Cuentas (Con Dobles)</span>
                        <span className="font-mono">{resumenCEJ?.porcentajeCtasConDobles ?? 0}%</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="font-bold text-xs">Regla de Pago de Comisiones:</span>
                        <Badge variant={resumenCEJ?.pagarConPorcentajeSinDobles ? "destructive" : "default"} className="font-bold">
                          {resumenCEJ?.pagarConPorcentajeSinDobles ? "PAGAR CON % SIN DOBLES (<81%)" : "OBJETIVO CUMPLIDO (>=81%)"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1 text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Pagos Dobles Registrados:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(resumenCEJ?.totalPagosDobles ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recuperado Periodos Vencidos (PV):</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(resumenCEJ?.totalRecuperadoPv ?? 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 3. Matriz Presupuesto vs Cobranza por Periodicidad */}
              {resumenCEJ?.matrizPeriodos && resumenCEJ.matrizPeriodos.length > 0 && (
                <Card className="border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Presupuesto vs Cobranza por Periodicidad
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left align-middle border-collapse">
                        <thead className="bg-[#0f172a] text-white text-[10px] font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-2 border border-slate-700">PERIODICIDAD</th>
                            <th className="px-4 py-2 text-center border border-slate-700">PPTO CTAS</th>
                            <th className="px-4 py-2 text-right border border-slate-700">PPTO PESOS</th>
                            <th className="px-4 py-2 text-center border border-slate-700 bg-emerald-950/80 text-emerald-300">COB CTAS</th>
                            <th className="px-4 py-2 text-right border border-slate-700 bg-emerald-950/80 text-emerald-300">COB PESOS</th>
                            <th className="px-4 py-2 text-center border border-slate-700">% CTAS</th>
                            <th className="px-4 py-2 text-center border border-slate-700">% PESOS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                          {resumenCEJ.matrizPeriodos.map((m) => (
                            <tr key={m.periodo} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-2 font-bold uppercase border border-gray-100 dark:border-slate-800">{m.periodo}</td>
                              <td className="px-4 py-2 text-center font-mono border border-gray-100 dark:border-slate-800">{m.pptoCtas}</td>
                              <td className="px-4 py-2 text-right font-mono border border-gray-100 dark:border-slate-800">{formatCurrency(m.pptoPesos)}</td>
                              <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600 border border-gray-100 dark:border-slate-800">{m.cobCtas}</td>
                              <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600 border border-gray-100 dark:border-slate-800">{formatCurrency(m.cobPesos)}</td>
                              <td className="px-4 py-2 text-center font-bold border border-gray-100 dark:border-slate-800">{m.porcCtas}%</td>
                              <td className="px-4 py-2 text-center font-bold border border-gray-100 dark:border-slate-800">{m.porcPesos}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 4. Presupuesto Diario Semanal */}
              {resumenCEJ?.resumenDiario && resumenCEJ.resumenDiario.length > 0 && (
                <Card className="border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Presupuesto y Avance Diario Semanal (Cuentas RUTA)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left align-middle border-collapse">
                        <thead className="bg-[#0f172a] text-white text-[10px] font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-2 border border-slate-700">DÍA</th>
                            <th className="px-4 py-2 text-center border border-slate-700">PPTO CTAS</th>
                            <th className="px-4 py-2 text-center border border-slate-700 bg-emerald-950/80 text-emerald-300">AVANCE CTAS</th>
                            <th className="px-4 py-2 text-right border border-slate-700">PPTO DINERO</th>
                            <th className="px-4 py-2 text-right border border-slate-700 bg-emerald-950/80 text-emerald-300">AVANCE DINERO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                          {resumenCEJ.resumenDiario.map((d) => (
                            <tr key={d.dia} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-2 font-bold uppercase border border-gray-100 dark:border-slate-800">{d.dia}</td>
                              <td className="px-4 py-2 text-center font-mono border border-gray-100 dark:border-slate-800">{d.pptoCuentas}</td>
                              <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600 border border-gray-100 dark:border-slate-800">{d.avanceCuentas}</td>
                              <td className="px-4 py-2 text-right font-mono border border-gray-100 dark:border-slate-800">{formatCurrency(d.pptoDinero)}</td>
                              <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600 border border-gray-100 dark:border-slate-800">{formatCurrency(d.avanceDinero)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* MODAL: Guardar Corte Semanal Oficial */}
        <Dialog open={guardarCorteModalOpen} onOpenChange={setGuardarCorteModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Save className="w-5 h-5 text-blue-600" /> Confirmar Guardado de Plantilla Lista Cobranza
              </DialogTitle>
              <DialogDescription className="text-xs">
                Se congelará la <strong>Plantilla Lista Cobranza</strong> de la <strong>Semana {semana} ({anio})</strong> para el cobrador{" "}
                <strong>{getSelectedCobradorName()}</strong> con <strong>{clientes.length}</strong> cuentas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl space-y-1 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between"><span>Total Sugerido:</span><span className="font-mono font-bold">{formatCurrency(totalCobrar)}</span></div>
                <div className="flex justify-between"><span>Cobrado Registrado:</span><span className="font-mono font-bold text-emerald-600">{formatCurrency(totalCobradoReal)}</span></div>
                <div className="flex justify-between"><span>Saldo Vencido:</span><span className="font-mono font-bold text-rose-600">{formatCurrency(totalSaldoVencido)}</span></div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="obs" className="text-xs font-bold text-slate-600">Observaciones del Corte (opcional)</Label>
                <Input
                  id="obs"
                  placeholder="Ej. Corte regular cerrado el sábado por la tarde..."
                  value={observacionesCorte}
                  onChange={(e) => setObservacionesCorte(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setGuardarCorteModalOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleConfirmarGuardarCorte} disabled={savingCorte} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {savingCorte ? "Guardando corte..." : "Confirmar y Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: Historial de Cortes Guardados */}
        <Dialog open={historialOpen} onOpenChange={setHistorialOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <History className="w-5 h-5 text-indigo-600" /> Historial de Cortes Semanales Guardados ({anio})
              </DialogTitle>
              <DialogDescription className="text-xs">
                Consulta y audita los snapshots oficiales cerrados en semanas anteriores.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-2">
              {loadingHistorial ? (
                <div className="py-12 text-center text-xs text-slate-400">Cargando historial de cortes...</div>
              ) : historialCortes.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No hay cortes guardados registrados para el año {anio}.</div>
              ) : (
                <div className="space-y-2">
                  {historialCortes.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleCargarCorteHistorial(c)}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-500 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">Semana {c.semana} ({c.anio})</span>
                          <Badge variant="outline" className="text-[10px] font-mono">{c.nombreGestor}</Badge>
                          <Badge className={c.estatus === "cerrado" ? "bg-slate-700" : "bg-emerald-600"}>
                            {c.estatus.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {c.totalCuentas} cuentas • Ppto: {formatCurrency(c.totalSugerido)} • Cobrado: {formatCurrency(c.totalCobrado)} ({c.porcentajeCobro}%)
                        </p>
                      </div>

                      <Button size="sm" variant="ghost" className="text-xs text-blue-600 font-bold">
                        Cargar →
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setHistorialOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
