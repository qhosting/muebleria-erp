"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  Unlock,
  RefreshCw,
  BarChart3,
  CalendarDays,
  ExternalLink,
  Globe,
  Building2,
  Layers,
  CreditCard,
  AlertTriangle
} from "lucide-react";
import { calcularSemanaCobranzaSabadoViernes, calcularRangoSemanaSabadoViernes, formatearFechaCortaMX } from "@/lib/calendario-cobranza-utils";
import { formatCurrency, getDayName } from "@/lib/utils";
import { descargarExcelCEJ, imprimirPDFCEJ, imprimirPDFClientesSinPago } from "@/lib/exportar-plantilla-cej";
import { ResumenCorteCEJ, separarYCalcularResumenesCEJ } from "@/lib/corte-cej-utils";

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
  tipCob: string;
  canalCobro?: string;
  montoBot?: number;
  montoBancosGestor?: number;
  montoGestor?: number;
  domicilio?: string;
}

const OPCIONES_PROBLEMA = [
  { value: "RUTA", label: "RUTA (En Ruta)", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300" },
  { value: "VD", label: "VD (Verificación Domiciliaria)", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300" },
  { value: "NC", label: "NC (Nuevo Cliente / No Contacto)", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300" },
  { value: "FD", label: "FD (Fuera de Domicilio)", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300" },
  { value: "PA", label: "PA (Promesa de Abono)", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300" },
  { value: "PE", label: "PE (Problema Especial / Periodo)", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300" },
  { value: "AD", label: "AD (Adelantado)", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" },
  { value: "FU", label: "FU (Fuga)", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300" },
  { value: "IT", label: "IT (Intervención)", color: "bg-pink-100 text-pink-800 dark:bg-pink-900/60 dark:text-pink-300" },
  { value: "DL", label: "DL (Dictamen Legal)", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300" },
  { value: "K", label: "K (Cancelado)", color: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300" }
];

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
  const [updatingProblemaId, setUpdatingProblemaId] = useState<string | null>(null);
  const [cerrarCorteModalOpen, setCerrarCorteModalOpen] = useState(false);
  const [reabrirCorteModalOpen, setReabrirCorteModalOpen] = useState(false);
  const [closingCorte, setClosingCorte] = useState(false);
  const [observacionesCierre, setObservacionesCierre] = useState("");

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
  const [resumenDQ, setResumenDQ] = useState<ResumenCorteCEJ | null>(null);
  const [resumenDP, setResumenDP] = useState<ResumenCorteCEJ | null>(null);
  const [tabResumenEmpresa, setTabResumenEmpresa] = useState<"GLOBAL" | "DQ" | "DP">("GLOBAL");
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

  // Modal y Visor de PDF Oficial
  const [modalPDFOpen, setModalPDFOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>("");
  const iframePDFRef = useRef<HTMLIFrameElement>(null);

  // Semanas del Calendario Anual de Cobranza (Ciclo Sábado a Viernes)
  const semanasDelAnio = useMemo(() => {
    const anioNum = parseInt(anio) || 2026;
    return Array.from({ length: 52 }, (_, i) => {
      const semNum = i + 1;
      const rango = calcularRangoSemanaSabadoViernes(semNum, anioNum);
      return {
        semana: semNum,
        inicioStr: formatearFechaCortaMX(rango.inicio),
        finStr: formatearFechaCortaMX(rango.fin)
      };
    });
  }, [anio]);

  const semanaActualInfo = useMemo(() => {
    const semActual = calcularSemanaCobranzaSabadoViernes(new Date());
    const rango = calcularRangoSemanaSabadoViernes(semActual.semana, semActual.anio);
    return {
      semana: semActual.semana,
      anio: semActual.anio,
      inicioStr: formatearFechaCortaMX(rango.inicio),
      finStr: formatearFechaCortaMX(rango.fin)
    };
  }, []);

  const semanaSeleccionadaInfo = useMemo(() => {
    const semNum = parseInt(semana) || semanaActualInfo.semana;
    const anioNum = parseInt(anio) || semanaActualInfo.anio;
    const rango = calcularRangoSemanaSabadoViernes(semNum, anioNum);
    return {
      semana: semNum,
      anio: anioNum,
      inicioStr: formatearFechaCortaMX(rango.inicio),
      finStr: formatearFechaCortaMX(rango.fin)
    };
  }, [semana, anio, semanaActualInfo]);

  useEffect(() => {
    fetchCobradores();
    // Carga inicial automática de la semana en curso (Semana 36)
    const semActual = calcularSemanaCobranzaSabadoViernes(new Date());
    ejecutarBusqueda("TODOS", semActual.semana.toString(), semActual.anio.toString(), false);
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

  const ejecutarBusqueda = async (cobrador: string, sem: string, an: string, forzarEnVivo = false) => {
    if (!sem) {
      toast.error("Por favor ingresa una semana");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({
        cobradorId: cobrador,
        semana: sem,
        anio: an,
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
          setResumenCEJ(
            data.resumenCEJ || {
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
              cobranzaBancosBot: data.corte.resumenCanales?.bancosBot || { cuentas: 0, pesos: 0 },
              cobranzaBancosGestor: data.corte.resumenCanales?.bancosGestor || { cuentas: 0, pesos: 0 },
              cobranzaGestor: data.corte.resumenCanales?.gestor || data.corte.resumenCanales?.efectivo || { cuentas: 0, pesos: 0 },
              resumenProblemas: data.corte.resumenProblemas,
              matrizPeriodos: data.corte.resumenPeriodos || [],
              resumenDiario: data.corte.resumenDiario || []
            }
          );
          setResumenDQ(data.resumenDQ || null);
          setResumenDP(data.resumenDP || null);
          if (forzarEnVivo) {
            const totalRecalculado = data.resumenCEJ?.totalCobrado ?? data.corte.totalCobrado ?? 0;
            toast.success(`Pagos recalculados en vivo: $${Number(totalRecalculado).toLocaleString("es-MX", { minimumFractionDigits: 2 })} cobrados`);
          } else {
            toast.info(`Mostrando Corte Semanal guardado (${data.corte.estatus.toUpperCase()})`);
          }
        } else {
          setCorteIdActivo(null);
          setCorteGuardadoExistenteId(data.corteGuardadoExistenteId || null);
          setEstatusCorte("abierto");
          setResumenCEJ(data.resumenCEJ || null);
          setResumenDQ(data.resumenDQ || null);
          setResumenDP(data.resumenDP || null);
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

  const handleBuscar = async (e?: React.FormEvent, forzarEnVivo = false) => {
    if (e) e.preventDefault();
    await ejecutarBusqueda(selectedCobrador, semana, anio, forzarEnVivo);
  };

  const handleCambiarSemana = (nuevaSemana: string) => {
    setSemana(nuevaSemana);
    ejecutarBusqueda(selectedCobrador, nuevaSemana, anio, false);
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

  // Cerrar Corte Semanal Oficial (Congelar snapshot definitivo para auditoría)
  const handleConfirmarCerrarCorte = async () => {
    if (!corteIdActivo) return;
    try {
      setClosingCorte(true);
      const res = await fetch(`/api/cobranza/cortes/${corteIdActivo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estatus: "cerrado",
          observaciones: observacionesCierre || undefined
        })
      });

      if (res.ok) {
        toast.success(`Corte de Semana ${semana} cerrado y congelado exitosamente`);
        setEstatusCorte("cerrado");
        setCerrarCorteModalOpen(false);
        setObservacionesCierre("");
        handleBuscar(undefined, false);
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al cerrar el corte");
      }
    } catch (e) {
      console.error("Error al cerrar corte:", e);
      toast.error("Error de conexión al cerrar el corte");
    } finally {
      setClosingCorte(false);
    }
  };

  // Reabrir Corte Semanal (reactivar edición y recálculo en vivo)
  const handleConfirmarReabrirCorte = async () => {
    if (!corteIdActivo) return;
    try {
      setClosingCorte(true);
      const res = await fetch(`/api/cobranza/cortes/${corteIdActivo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estatus: "abierto"
        })
      });

      if (res.ok) {
        toast.success(`Corte de Semana ${semana} reabierto exitosamente`);
        setEstatusCorte("abierto");
        setReabrirCorteModalOpen(false);
        handleBuscar(undefined, true);
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al reabrir el corte");
      }
    } catch (e) {
      console.error("Error al reabrir corte:", e);
      toast.error("Error de conexión al reabrir el corte");
    } finally {
      setClosingCorte(false);
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

  // Actualizar la columna PROBLEMA (en corte guardado oficial y/o en memoria)
  const handleCambiarProblema = async (detalleIdOrCodigo: string, nuevoProblema: string, nombreCliente?: string) => {
    // Actualización reactiva inmediata en la tabla
    setClientes((prev) =>
      prev.map((cli) =>
        cli.id === detalleIdOrCodigo || cli.codigoCliente === detalleIdOrCodigo
          ? { ...cli, problema: nuevoProblema }
          : cli
      )
    );

    if (!corteIdActivo) {
      toast.success(`Problema de ${nombreCliente ? nombreCliente.split(' ')[0] : 'cuenta'} asignado a ${nuevoProblema}`);
      return;
    }

    setUpdatingProblemaId(detalleIdOrCodigo);
    try {
      const res = await fetch(`/api/cobranza/cortes/${corteIdActivo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "actualizarProblema",
          detalleId: detalleIdOrCodigo,
          nuevoProblema
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Actualizar las métricas de resumen si el servidor devolvió el nuevo cálculo
        if (data.resumenCEJ) {
          setResumenCEJ(data.resumenCEJ);
        }
        toast.success(`Problema de ${nombreCliente ? nombreCliente.split(' ')[0] : 'cuenta'} actualizado a ${nuevoProblema}`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al actualizar problema");
      }
    } catch (error) {
      console.error("Error al actualizar problema en corte:", error);
      toast.error("Error de conexión al actualizar");
    } finally {
      setUpdatingProblemaId(null);
    }
  };

  // Resúmenes calculados dinámicamente en memoria (GLOBAL, DQ, DP)
  const resumenesCalculados = useMemo(() => {
    if (clientes.length === 0) return null;
    return separarYCalcularResumenesCEJ(clientes);
  }, [clientes]);

  const resGlobalActivo = resumenesCalculados?.global || resumenCEJ;
  const resDQActivo = resumenesCalculados?.dq || resumenDQ;
  const resDPActivo = resumenesCalculados?.dp || resumenDP;

  const resumenActivo = useMemo(() => {
    if (tabResumenEmpresa === "DQ") return resDQActivo;
    if (tabResumenEmpresa === "DP") return resDPActivo;
    return resGlobalActivo;
  }, [tabResumenEmpresa, resGlobalActivo, resDQActivo, resDPActivo]);

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
      resumen: resGlobalActivo || undefined,
      resumenDQ: resDQActivo || undefined,
      resumenDP: resDPActivo || undefined
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

    const { blobUrl } = imprimirPDFCEJ({
      anio: parseInt(anio),
      semana: parseInt(semana),
      fechaInicioStr: fInicio,
      fechaFinStr: fFin,
      nombreGestor: getSelectedCobradorName(),
      codigoGestor: getSelectedCobradorCodigo(),
      detalles: clientes as any,
      resumen: resGlobalActivo || undefined,
      resumenDQ: resDQActivo || undefined,
      resumenDP: resDPActivo || undefined
    });

    if (blobUrl) {
      setPdfBlobUrl(blobUrl);
      setModalPDFOpen(true);
    }
  };

  // Exportar / Imprimir PDF de Clientes Sin Pago
  const handleExportarPDFSinPago = () => {
    if (clientesSinPago.length === 0) {
      toast.info("No hay clientes sin pago en este filtro");
      return;
    }

    const fInicio = calendario
      ? new Date(calendario.fechaInicio).toLocaleDateString("es-MX")
      : `Semana ${semana}`;
    const fFin = calendario
      ? new Date(calendario.fechaFin).toLocaleDateString("es-MX")
      : `${anio}`;

    const { blobUrl } = imprimirPDFClientesSinPago({
      anio: parseInt(anio),
      semana: parseInt(semana),
      fechaInicioStr: fInicio,
      fechaFinStr: fFin,
      nombreGestor: getSelectedCobradorName(),
      codigoGestor: getSelectedCobradorCodigo(),
      clientes: clientesSinPago.map((c) => ({
        codigoCliente: c.codigoCliente,
        numContrato: c.numContrato,
        nombreCompleto: c.nombreCompleto,
        domicilio: c.domicilio || "-",
        gestor: c.gestor || "-",
        saldoVencido: c.saldoVencido || 0,
        pv: c.pv || 0,
        problema: c.problema || "RUTA",
        pagoReal: c.pagoReal || 0,
        telefono: c.telefono || "-",
        periodicidad: c.periodicidad,
        montoPago: c.montoPago || 0,
        diaPago: c.diaPago
      }))
    });

    if (blobUrl) {
      setPdfBlobUrl(blobUrl);
      setModalPDFOpen(true);
    }
  };

  // Filtrado y ordenamiento en memoria de clientes (por Código de Cliente A-Z)
  const clientesFiltrados = useMemo(() => {
    return clientes
      .filter((c) => {
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
          (c.domicilio && c.domicilio.toLowerCase().includes(b)) ||
          c.gestor.toLowerCase().includes(b)
        );
      })
      .sort((a, b) =>
        (a.codigoCliente || "").localeCompare(b.codigoCliente || "", undefined, {
          numeric: true,
          sensitivity: "base"
        })
      );
  }, [clientes, filtroEmpresa, busqueda]);

  // Clientes que no dieron pago en la semana (pagoReal === 0), ordenados por Código de Cliente A-Z
  const clientesSinPago = useMemo(() => {
    return clientesFiltrados
      .filter((c) => Number(c.pagoReal || 0) === 0)
      .sort((a, b) =>
        (a.codigoCliente || "").localeCompare(b.codigoCliente || "", undefined, {
          numeric: true,
          sensitivity: "base"
        })
      );
  }, [clientesFiltrados]);

  const totalVencidoSinPago = useMemo(() => {
    return clientesSinPago.reduce((acc, curr) => acc + (curr.saldoVencido || 0), 0);
  }, [clientesSinPago]);

  const totalSugeridoSinPago = useMemo(() => {
    return clientesSinPago.reduce((acc, curr) => acc + (curr.montoPago || 0), 0);
  }, [clientesSinPago]);

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
  const totalMoratorioReal = clientesFiltrados.reduce((acc, curr) => acc + (curr.moratorio || 0), 0);
  const totalCobradoConMoratorioReal = totalCobradoReal + totalMoratorioReal;

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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {estatusCorte === "cerrado" ? (
                      <Badge className="bg-slate-800 text-amber-400 border border-amber-500/40 font-bold text-xs uppercase px-2.5 py-0.5 gap-1.5 shadow-sm">
                        <Lock className="w-3 h-3 text-amber-400" /> Corte Cerrado Oficial (Inmutable)
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-600 text-white font-bold text-xs uppercase px-2.5 py-0.5 gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" /> Corte Abierto (En Curso)
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-xs font-bold px-2 py-0.5">
                      {estatusCorte === "cerrado" ? "🔒 Columna PROBLEMA archivada" : "✎ Columna PROBLEMA editable"}
                    </Badge>
                  </div>
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
                ) : estatusCorte === "abierto" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleBuscar(undefined, true)}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50 h-9 text-xs font-bold gap-1.5"
                    >
                      <RefreshCw className="h-4 w-4" /> Recalcular Pagos En Vivo
                    </Button>
                    <Button
                      onClick={() => setCerrarCorteModalOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-200 dark:shadow-none h-9 text-xs font-bold gap-1.5"
                    >
                      <Lock className="h-4 w-4" /> Cerrar Corte Semanal
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setReabrirCorteModalOpen(true)}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50 h-9 text-xs font-bold gap-1.5"
                  >
                    <Unlock className="h-4 w-4" /> Reabrir Corte (Auditoría)
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Banner Informativo de Corte Cerrado */}
        {esCorteGuardado && estatusCorte === "cerrado" && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-700 dark:text-amber-300 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-amber-950 dark:text-amber-100">
                  Corte Semanal Cerrado y Congelado Oficialmente
                </p>
                <p className="text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                  Este corte oficial se encuentra cerrado para efectos contables y de auditoría. Los cobros y clientes están congelados. Cualquier nuevo abono o cliente se considera automáticamente para la siguiente semana de cobranza.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReabrirCorteModalOpen(true)}
              className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 font-bold shrink-0 text-xs gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" /> Reabrir Corte
            </Button>
          </div>
        )}

        {/* Formulario de Parámetros del Calendario */}
        <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
          <CardHeader className="py-3.5 border-b bg-gray-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" /> Parámetros del Calendario Anual de Cobranza
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Ciclo Oficial: Sábado a Viernes</span>
              <Badge variant="outline" className="text-[11px] font-bold text-blue-700 border-blue-200 bg-blue-50/50 dark:bg-blue-950/40">
                Semana Actual: Sem {semanaActualInfo.semana} ({semanaActualInfo.inicioStr} al {semanaActualInfo.finStr})
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <form onSubmit={(e) => handleBuscar(e, false)} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
              <div className="space-y-1.5 md:col-span-4">
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

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="anio" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Año
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

              <div className="space-y-1.5 md:col-span-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="semana" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Semana del Calendario (Rango de Fechas)
                  </Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCambiarSemana(semanaActualInfo.semana.toString())}
                      className="text-[10px] font-bold text-blue-600 hover:underline px-1 py-0.5 rounded"
                    >
                      Esta Sem ({semanaActualInfo.semana})
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleCambiarSemana(Math.max(1, semanaActualInfo.semana - 1).toString())}
                      className="text-[10px] font-bold text-slate-500 hover:underline px-1 py-0.5 rounded"
                    >
                      Sem {Math.max(1, semanaActualInfo.semana - 1)}
                    </button>
                  </div>
                </div>
                <Select value={semana} onValueChange={(val) => handleCambiarSemana(val)}>
                  <SelectTrigger id="semana" className="h-9 text-xs font-mono">
                    <SelectValue placeholder="Seleccionar semana..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {semanasDelAnio.map((s) => (
                      <SelectItem key={s.semana} value={s.semana.toString()}>
                        <span className="font-bold">Semana {s.semana}</span>
                        <span className="text-slate-500 font-sans ml-2">({s.inicioStr} al {s.finStr})</span>
                        {s.semana === semanaActualInfo.semana && (
                          <span className="ml-2 font-black text-blue-600 dark:text-blue-400">★ ACTUAL</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Button type="submit" className="w-full h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                  {loading ? "Consultando ruta..." : "Consultar Corte"}
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-between text-xs pt-1 px-1 text-slate-500 border-t border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                <span>Rango seleccionado:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {semanaSeleccionadaInfo.inicioStr} al {semanaSeleccionadaInfo.finStr} (Semana {semana}, {anio})
                </strong>
              </div>
              <span className="text-[11px] text-slate-400">
                Abarca de Sábado 00:00:00 a Viernes 23:59:59
              </span>
            </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Cuentas Cartera</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{clientesFiltrados.length}</p>
                </div>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600">
                  <Users className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Pago Sugerido (Ppto)</p>
                  <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">{formatCurrency(totalCobrar)}</p>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Cobranza Abonos</p>
                  <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(totalCobradoReal)}</p>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Int. Moratorio</p>
                  <p className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(totalMoratorioReal)}</p>
                </div>
                <div className="p-2 bg-amber-100 dark:bg-amber-950/60 rounded-lg text-amber-700 dark:text-amber-300">
                  <DollarSign className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Total Recaudado</p>
                  <p className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">{formatCurrency(totalCobradoConMoratorioReal)}</p>
                </div>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 rounded-lg text-emerald-700 dark:text-emerald-300">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Saldo Vencido</p>
                  <p className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(totalSaldoVencido)}</p>
                </div>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/50 rounded-lg text-rose-600">
                  <AlertCircle className="w-4 h-4" />
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
                <TabsTrigger value="sinpago" className="text-xs font-bold gap-1.5 text-rose-700 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Clientes Sin Pago ({clientesSinPago.length})
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
                          <th className="px-3 py-2.5 text-right border border-slate-700 bg-amber-950/70 text-amber-300">MORATORIO</th>
                          <th className={`px-3 py-2.5 text-center border border-slate-700 ${esCorteGuardado ? "bg-indigo-950/90 text-indigo-200" : ""}`}>
                            <div className="flex items-center justify-center gap-1">
                              PROBLEMA {esCorteGuardado && <span className="text-[8px] bg-indigo-500/40 text-indigo-100 px-1 py-0.5 rounded font-bold tracking-tight">EDITABLE</span>}
                            </div>
                          </th>
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
                            <td className="px-3 py-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400 border border-gray-100 dark:border-slate-800">
                              {c.moratorio > 0 ? formatCurrency(c.moratorio) : "-"}
                            </td>
                            <td className="px-2 py-1 text-center border border-gray-100 dark:border-slate-800">
                              {esCorteGuardado && corteIdActivo && c.id ? (
                                <div className="inline-flex items-center justify-center">
                                  <Select
                                    value={c.problema || "RUTA"}
                                    onValueChange={(val) => handleCambiarProblema(c.id!, val, c.nombreCompleto)}
                                    disabled={updatingProblemaId === c.id}
                                  >
                                    <SelectTrigger 
                                      className={`h-7 text-[10px] font-black uppercase px-2 py-0 border border-slate-300 dark:border-slate-700 rounded shadow-none focus:ring-1 focus:ring-indigo-500 cursor-pointer min-w-[84px] justify-between ${
                                        OPCIONES_PROBLEMA.find((o) => o.value === (c.problema || "").toUpperCase().trim())?.color || "bg-slate-100 text-slate-800"
                                      }`}
                                    >
                                      {updatingProblemaId === c.id ? (
                                        <RefreshCw className="w-3 h-3 animate-spin mx-auto text-indigo-600" />
                                      ) : (
                                        <SelectValue>{c.problema || "RUTA"}</SelectValue>
                                      )}
                                    </SelectTrigger>
                                    <SelectContent className="text-xs font-bold bg-white dark:bg-slate-900 z-50">
                                      {OPCIONES_PROBLEMA.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-[11px] font-bold cursor-pointer">
                                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] mr-1.5 font-black ${opt.color}`}>
                                            {opt.value}
                                          </span>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-black uppercase ${
                                    OPCIONES_PROBLEMA.find((o) => o.value === (c.problema || "").toUpperCase().trim())?.color ||
                                    (c.problema === "RUTA" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300" : "bg-red-100 text-red-800")
                                  }`}
                                >
                                  {c.problema}
                                </Badge>
                              )}
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
                          <td colSpan={2} className="px-3 py-3 text-center border border-gray-200 dark:border-slate-700">-</td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-amber-700 dark:text-amber-300 border border-gray-200 dark:border-slate-700">
                            {formatCurrency(totalMoratorioReal)}
                          </td>
                          <td className="px-3 py-3 text-center border border-gray-200 dark:border-slate-700">-</td>
                          <td className="px-3 py-3 text-right font-mono text-emerald-700 dark:text-emerald-300 border border-gray-200 dark:border-slate-700">
                            <div>{formatCurrency(totalCobradoReal)}</div>
                            {totalMoratorioReal > 0 && (
                              <div className="text-[10px] font-normal text-slate-500">Rec: {formatCurrency(totalCobradoConMoratorioReal)}</div>
                            )}
                          </td>
                          <td colSpan={5} className="px-3 py-3 text-center border border-gray-200 dark:border-slate-700">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PESTAÑA: LISTA DE CLIENTES SIN PAGO */}
            <TabsContent value="sinpago" className="m-0 space-y-4">
              <Card className="border-gray-100 dark:border-slate-800 shadow-md overflow-hidden">
                <CardHeader className="py-3 px-4 border-b bg-gradient-to-r from-rose-50 via-white to-rose-50 dark:from-rose-950/30 dark:via-slate-900 dark:to-rose-950/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <CardTitle className="text-sm font-black uppercase tracking-wider text-rose-900 dark:text-rose-200">
                        Lista de Clientes Sin Pago ({clientesSinPago.length} cuentas)
                      </CardTitle>
                    </div>
                    <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                      Cuentas asignadas que no han realizado abono en la Semana {semana} ({anio}). Asigna o clasifica el motivo en la columna de PROBLEMA.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      onClick={handleExportarPDFSinPago}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-sm h-8"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Descargar PDF Sin Pago</span>
                    </Button>
                  </div>
                </CardHeader>

                {/* Banner de Métricas Rápidas Sin Pago */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-gray-100 dark:border-slate-800 text-xs">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Cuentas Sin Abono</span>
                    <strong className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">{clientesSinPago.length} ctas</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Saldo Vencido Total</span>
                    <strong className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(totalVencidoSinPago)}</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Pago Sugerido No Cobrado</span>
                    <strong className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">{formatCurrency(totalSugeridoSinPago)}</strong>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Distribución Cartera</span>
                    <strong className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono block mt-1">
                      DQ: {clientesSinPago.filter(c => (c.codigoCliente || "").startsWith("DQ")).length} • DP: {clientesSinPago.filter(c => (c.codigoCliente || "").startsWith("DP")).length}
                    </strong>
                  </div>
                </div>

                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[650px]">
                    <table className="w-full text-xs text-left align-middle border-collapse">
                      <thead className="bg-[#0f172a] text-white text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 text-center border border-slate-700">#</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">CODIGO</th>
                          <th className="px-3 py-2.5 border border-slate-700">NOMBRE</th>
                          <th className="px-3 py-2.5 border border-slate-700">DOMICILIO</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">GESTOR</th>
                          <th className="px-3 py-2.5 text-right border border-slate-700 text-rose-300">SALDO VENCIDO</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">PV</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700 bg-rose-950/80 text-rose-200">
                            <div className="flex items-center justify-center gap-1">
                              PROBLEMA <span className="text-[8px] bg-rose-500/40 text-rose-100 px-1 py-0.5 rounded font-bold">SELECCIÓN</span>
                            </div>
                          </th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">TELÉFONO</th>
                          <th className="px-3 py-2.5 text-center border border-slate-700">DÍA PAGO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                        {clientesSinPago.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-12 text-slate-500">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">
                                  No hay clientes sin pago con los filtros actuales
                                </p>
                                <p className="text-xs text-slate-400">
                                  Todas las cuentas filtradas registran pagos en este período.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          clientesSinPago.map((c, i) => (
                            <tr key={c.codigoCliente + i} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors">
                              <td className="px-3 py-2 text-center font-mono text-slate-400 border border-gray-100 dark:border-slate-800">
                                {i + 1}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 whitespace-nowrap">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] mr-1 font-black ${
                                  c.codigoCliente.startsWith("DQ") ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300" : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300"
                                }`}>
                                  {c.codigoCliente.startsWith("DQ") ? "DQ" : "DP"}
                                </span>
                                {c.codigoCliente}
                              </td>
                              <td className="px-3 py-2 font-bold text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 whitespace-nowrap">
                                {c.nombreCompleto}
                              </td>
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800 text-[11px] max-w-xs">
                                {c.domicilio || "-"}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800 text-[11px] whitespace-nowrap">
                                {c.gestor || "-"}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400 border border-gray-100 dark:border-slate-800 whitespace-nowrap">
                                {formatCurrency(c.saldoVencido)}
                              </td>
                              <td className="px-3 py-2 text-center font-bold border border-gray-100 dark:border-slate-800">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                                  c.pv > 0 ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" : "bg-slate-100 text-slate-600"
                                }`}>
                                  {c.pv}
                                </span>
                              </td>
                              <td className="px-2 py-1 text-center border border-gray-100 dark:border-slate-800">
                                <div className="inline-flex items-center justify-center">
                                  <Select
                                    value={c.problema || "RUTA"}
                                    onValueChange={(val) => handleCambiarProblema(c.id || c.codigoCliente, val, c.nombreCompleto)}
                                    disabled={updatingProblemaId === (c.id || c.codigoCliente)}
                                  >
                                    <SelectTrigger 
                                      className={`h-7 text-[10px] font-black uppercase px-2 py-0 border border-slate-300 dark:border-slate-700 rounded shadow-none focus:ring-1 focus:ring-rose-500 cursor-pointer min-w-[84px] justify-between ${
                                        OPCIONES_PROBLEMA.find((o) => o.value === (c.problema || "").toUpperCase().trim())?.color || "bg-slate-100 text-slate-800"
                                      }`}
                                    >
                                      {updatingProblemaId === (c.id || c.codigoCliente) ? (
                                        <RefreshCw className="w-3 h-3 animate-spin mx-auto text-rose-600" />
                                      ) : (
                                        <SelectValue>{c.problema || "RUTA"}</SelectValue>
                                      )}
                                    </SelectTrigger>
                                    <SelectContent className="text-xs font-bold bg-white dark:bg-slate-900 z-50">
                                      {OPCIONES_PROBLEMA.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-[11px] font-bold cursor-pointer">
                                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] mr-1.5 font-black ${opt.color}`}>
                                            {opt.value}
                                          </span>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center font-mono border border-gray-100 dark:border-slate-800 text-slate-600 whitespace-nowrap">
                                {c.telefono || "-"}
                              </td>
                              <td className="px-3 py-2 text-center border border-gray-100 dark:border-slate-800 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                {c.diaPago ? getDayName(c.diaPago) : "-"}
                              </td>
                            </tr>
                          ))
                        )}

                        {/* Fila de Totales Sin Pago */}
                        {clientesSinPago.length > 0 && (
                          <tr className="bg-slate-100 dark:bg-slate-800/90 font-black text-xs text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                            <td colSpan={5} className="px-4 py-3 text-right uppercase text-[10px] tracking-wider border border-gray-200 dark:border-slate-700">
                              TOTAL CARTERA SIN PAGO ({clientesSinPago.length} cuentas)
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-rose-700 dark:text-rose-300 border border-gray-200 dark:border-slate-700">
                              {formatCurrency(totalVencidoSinPago)}
                            </td>
                            <td colSpan={4} className="px-3 py-3 text-center border border-gray-200 dark:border-slate-700">-</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PESTAÑA 2: TABLERO EJECUTIVO DE CORTE (PÁGINA 2 CEJ) */}
            <TabsContent value="tablero" className="m-0 space-y-5">
              {/* 1. Tarjeta Ejecutiva Comparativa: GLOBAL vs DQ vs DP */}
              <Card className="border-gray-200 dark:border-slate-800 shadow-md overflow-hidden">
                <CardHeader className="py-3.5 px-4 border-b bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      <CardTitle className="text-sm font-black tracking-wide text-white uppercase">
                        Resumen Comparativo de Corte: GLOBAL vs DQ vs DP
                      </CardTitle>
                    </div>
                    <CardDescription className="text-[11px] text-slate-300 mt-0.5">
                      Separación ejecutiva de cuentas para la Semana {semana} ({anio}) • Cobrador: {getSelectedCobradorName()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold text-slate-200 border-slate-700 bg-slate-800/80">
                      {esCorteGuardado ? "🔒 Corte Congelado" : "⚡ En Vivo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left align-middle border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5 border border-slate-200 dark:border-slate-700">INDICADOR CLAVE</th>
                          <th className="px-4 py-2.5 text-right border border-slate-200 dark:border-slate-700 bg-slate-200/70 dark:bg-slate-700/60 text-slate-900 dark:text-white font-black">
                            🌐 GLOBAL (TOTAL)
                          </th>
                          <th className="px-4 py-2.5 text-right border border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-black">
                            🏢 DQ (QUERÉTARO)
                          </th>
                          <th className="px-4 py-2.5 text-right border border-slate-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-black">
                            🏬 DP (DASOPLUS)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 font-bold text-slate-800 dark:text-slate-200 border border-gray-100 dark:border-slate-800">
                            Cuentas Asignadas (Cartera)
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800">
                            {resGlobalActivo?.totalCuentas ?? 0} <span className="text-[11px] font-normal text-slate-500">({formatCurrency(resGlobalActivo?.totalSugerido ?? 0)})</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-blue-700 dark:text-blue-300 border border-gray-100 dark:border-slate-800">
                            {resDQActivo?.totalCuentas ?? 0} <span className="text-[11px] font-normal text-slate-500">({formatCurrency(resDQActivo?.totalSugerido ?? 0)})</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300 border border-gray-100 dark:border-slate-800">
                            {resDPActivo?.totalCuentas ?? 0} <span className="text-[11px] font-normal text-slate-500">({formatCurrency(resDPActivo?.totalSugerido ?? 0)})</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 font-bold text-slate-800 dark:text-slate-200 border border-gray-100 dark:border-slate-800">
                            Cobranza Abonos ($)
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resGlobalActivo?.totalCobrado ?? 0)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDQActivo?.totalCobrado ?? 0)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDPActivo?.totalCobrado ?? 0)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-amber-50/40 dark:bg-amber-950/20">
                          <td className="px-4 py-2 font-bold text-amber-900 dark:text-amber-300 border border-gray-100 dark:border-slate-800">
                            ⚡ Interés Moratorio Cobrado ($)
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resGlobalActivo?.totalMoratorio ?? 0)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDQActivo?.totalMoratorio ?? 0)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDPActivo?.totalMoratorio ?? 0)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-emerald-50/50 dark:bg-emerald-950/30">
                          <td className="px-4 py-2 font-black text-emerald-950 dark:text-emerald-200 border border-gray-100 dark:border-slate-800">
                            💰 Total Recaudado (Abonos + Mora)
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-black text-emerald-700 dark:text-emerald-300 border border-gray-100 dark:border-slate-800 text-sm">
                            {formatCurrency(resGlobalActivo?.totalCobradoConMoratorio ?? ((resGlobalActivo?.totalCobrado ?? 0) + (resGlobalActivo?.totalMoratorio ?? 0)))}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-black text-emerald-700 dark:text-emerald-300 border border-gray-100 dark:border-slate-800 text-sm">
                            {formatCurrency(resDQActivo?.totalCobradoConMoratorio ?? ((resDQActivo?.totalCobrado ?? 0) + (resDQActivo?.totalMoratorio ?? 0)))}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-black text-emerald-700 dark:text-emerald-300 border border-gray-100 dark:border-slate-800 text-sm">
                            {formatCurrency(resDPActivo?.totalCobradoConMoratorio ?? ((resDPActivo?.totalCobrado ?? 0) + (resDPActivo?.totalMoratorio ?? 0)))}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800">
                            % Cumplimiento Metas (Sin Dobles)
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800">
                            {resGlobalActivo?.porcentajeCtasSinDobles ?? 0}%
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-blue-700 dark:text-blue-300 border border-gray-100 dark:border-slate-800">
                            {resDQActivo?.porcentajeCtasSinDobles ?? 0}%
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300 border border-gray-100 dark:border-slate-800">
                            {resDPActivo?.porcentajeCtasSinDobles ?? 0}%
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                            % Cumplimiento Metas (Con Dobles)
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-slate-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800">
                            {resGlobalActivo?.porcentajeCtasConDobles ?? 0}%
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-slate-800">
                            {resDQActivo?.porcentajeCtasConDobles ?? 0}%
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-indigo-600 dark:text-indigo-400 border border-gray-100 dark:border-slate-800">
                            {resDPActivo?.porcentajeCtasConDobles ?? 0}%
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                            💵 Cobranza Gestor (Efectivo)
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-slate-800 dark:text-slate-200 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resGlobalActivo?.cobranzaGestor?.pesos ?? resGlobalActivo?.cobranzaEfectivo?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resGlobalActivo?.cobranzaGestor?.cuentas ?? resGlobalActivo?.cobranzaEfectivo?.cuentas ?? 0} ctas)</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-blue-700 dark:text-blue-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDQActivo?.cobranzaGestor?.pesos ?? resDQActivo?.cobranzaEfectivo?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resDQActivo?.cobranzaGestor?.cuentas ?? resDQActivo?.cobranzaEfectivo?.cuentas ?? 0} ctas)</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-indigo-700 dark:text-indigo-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDPActivo?.cobranzaGestor?.pesos ?? resDPActivo?.cobranzaEfectivo?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resDPActivo?.cobranzaGestor?.cuentas ?? resDPActivo?.cobranzaEfectivo?.cuentas ?? 0} ctas)</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                            🤖 Bancos BOT (Automático)
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-slate-800 dark:text-slate-200 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resGlobalActivo?.cobranzaBancosBot?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resGlobalActivo?.cobranzaBancosBot?.cuentas ?? 0} ctas)</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-blue-700 dark:text-blue-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDQActivo?.cobranzaBancosBot?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resDQActivo?.cobranzaBancosBot?.cuentas ?? 0} ctas)</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-indigo-700 dark:text-indigo-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDPActivo?.cobranzaBancosBot?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resDPActivo?.cobranzaBancosBot?.cuentas ?? 0} ctas)</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                            📱 Bancos Gestor (Manual)
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-slate-800 dark:text-slate-200 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resGlobalActivo?.cobranzaBancosGestor?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resGlobalActivo?.cobranzaBancosGestor?.cuentas ?? 0} ctas)</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-blue-700 dark:text-blue-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDQActivo?.cobranzaBancosGestor?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resDQActivo?.cobranzaBancosGestor?.cuentas ?? 0} ctas)</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-indigo-700 dark:text-indigo-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDPActivo?.cobranzaBancosGestor?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resDPActivo?.cobranzaBancosGestor?.cuentas ?? 0} ctas)</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-blue-50/20 dark:bg-blue-950/10">
                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800">
                            🏦 Total Bancos (BOT + Gestor)
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resGlobalActivo?.cobranzaBancos?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resGlobalActivo?.cobranzaBancos?.cuentas ?? 0} ctas)</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-blue-700 dark:text-blue-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDQActivo?.cobranzaBancos?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resDQActivo?.cobranzaBancos?.cuentas ?? 0} ctas)</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDPActivo?.cobranzaBancos?.pesos ?? 0)} <span className="text-[10px] text-slate-400">({resDPActivo?.cobranzaBancos?.cuentas ?? 0} ctas)</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 text-rose-700 dark:text-rose-400 font-medium border border-gray-100 dark:border-slate-800">
                            Saldo Vencido ($)
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-rose-600 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resGlobalActivo?.totalVencido ?? 0)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-rose-600 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDQActivo?.totalVencido ?? 0)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-rose-600 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDPActivo?.totalVencido ?? 0)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800">
                            Cartera Total ($)
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resGlobalActivo?.totalCartera ?? 0)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-blue-700 dark:text-blue-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDQActivo?.totalCartera ?? 0)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300 border border-gray-100 dark:border-slate-800">
                            {formatCurrency(resDPActivo?.totalCartera ?? 0)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 font-bold text-blue-700 dark:text-blue-400 border border-gray-100 dark:border-slate-800">
                            Cuentas en RUTA
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-blue-700 dark:text-blue-400 border border-gray-100 dark:border-slate-800">
                            {resGlobalActivo?.resumenProblemas.cuentasRuta.cuentas ?? 0} ctas <span className="text-[11px] font-normal text-slate-500">({formatCurrency(resGlobalActivo?.resumenProblemas.cuentasRuta.pesos ?? 0)})</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-blue-700 dark:text-blue-400 border border-gray-100 dark:border-slate-800">
                            {resDQActivo?.resumenProblemas.cuentasRuta.cuentas ?? 0} ctas <span className="text-[11px] font-normal text-slate-500">({formatCurrency(resDQActivo?.resumenProblemas.cuentasRuta.pesos ?? 0)})</span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-indigo-700 dark:text-indigo-400 border border-gray-100 dark:border-slate-800">
                            {resDPActivo?.resumenProblemas.cuentasRuta.cuentas ?? 0} ctas <span className="text-[11px] font-normal text-slate-500">({formatCurrency(resDPActivo?.resumenProblemas.cuentasRuta.pesos ?? 0)})</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                            Total Cuentas Problema (K, IT, PE, PS, DL...)
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-slate-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800">
                            {resGlobalActivo?.resumenProblemas.totalProblemas.cuentas ?? 0} ctas
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-slate-800">
                            {resDQActivo?.resumenProblemas.totalProblemas.cuentas ?? 0} ctas
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-indigo-600 dark:text-indigo-400 border border-gray-100 dark:border-slate-800">
                            {resDPActivo?.resumenProblemas.totalProblemas.cuentas ?? 0} ctas
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Selector de Empresa para Desglose Analítico */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                    Desglose Analítico en Detalle
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Selecciona qué empresa visualizar en las 4 secciones inferiores (Problemas, Canales, Periodicidad y Diario):
                  </p>
                </div>

                <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs gap-1">
                  <button
                    type="button"
                    onClick={() => setTabResumenEmpresa("GLOBAL")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                      tabResumenEmpresa === "GLOBAL"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>GLOBAL ({resGlobalActivo?.totalCuentas ?? 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTabResumenEmpresa("DQ")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                      tabResumenEmpresa === "DQ"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-blue-600"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>DQ ({resDQActivo?.totalCuentas ?? 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTabResumenEmpresa("DP")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                      tabResumenEmpresa === "DP"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-indigo-600"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>DP ({resDPActivo?.totalCuentas ?? 0})</span>
                  </button>
                </div>
              </div>

              {/* 3. Cuadrícula de Tarjetas de Detalle */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Clasificación por Problema (Desglose Completo GLOBAL vs DQ vs DP) */}
                <Card className="border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-blue-500" />
                      <span>Clasificación de Cartera y Problemas</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-bold">Página 2 CEJ</Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left align-middle border-collapse">
                        <thead className="bg-[#0f172a] text-white text-[10px] font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2 border border-slate-700">CONCEPTO / PROBLEMA</th>
                            <th className="px-2.5 py-2 text-right border border-slate-700 bg-slate-800 text-slate-100 font-bold">🌐 GLOBAL</th>
                            <th className="px-2.5 py-2 text-right border border-slate-700 bg-blue-950/80 text-blue-300 font-bold">🏢 DQ</th>
                            <th className="px-2.5 py-2 text-right border border-slate-700 bg-indigo-950/80 text-indigo-300 font-bold">🏬 DP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-slate-50/70 dark:bg-slate-800/50 font-bold">
                            <td className="px-3 py-1.5 border border-gray-100 dark:border-slate-800">Cuentas Asignadas (Cartera)</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{resGlobalActivo?.resumenProblemas.totalAsignadas.cuentas ?? 0} ({formatCurrency(resGlobalActivo?.resumenProblemas.totalAsignadas.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-slate-800">{resDQActivo?.resumenProblemas.totalAsignadas.cuentas ?? 0} ({formatCurrency(resDQActivo?.resumenProblemas.totalAsignadas.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-indigo-600 dark:text-indigo-400 border border-gray-100 dark:border-slate-800">{resDPActivo?.resumenProblemas.totalAsignadas.cuentas ?? 0} ({formatCurrency(resDPActivo?.resumenProblemas.totalAsignadas.pesos ?? 0)})</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">CANCELADO (K)</td>
                            <td className="px-2.5 py-1 text-right font-mono border border-gray-100 dark:border-slate-800">{resGlobalActivo?.resumenProblemas.canceladoK.cuentas ?? 0} ({formatCurrency(resGlobalActivo?.resumenProblemas.canceladoK.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-blue-600 border border-gray-100 dark:border-slate-800">{resDQActivo?.resumenProblemas.canceladoK.cuentas ?? 0} ({formatCurrency(resDQActivo?.resumenProblemas.canceladoK.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-indigo-600 border border-gray-100 dark:border-slate-800">{resDPActivo?.resumenProblemas.canceladoK.cuentas ?? 0} ({formatCurrency(resDPActivo?.resumenProblemas.canceladoK.pesos ?? 0)})</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">INTERVENCION (IT)</td>
                            <td className="px-2.5 py-1 text-right font-mono border border-gray-100 dark:border-slate-800">{resGlobalActivo?.resumenProblemas.intervencionIT.cuentas ?? 0} ({formatCurrency(resGlobalActivo?.resumenProblemas.intervencionIT.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-blue-600 border border-gray-100 dark:border-slate-800">{resDQActivo?.resumenProblemas.intervencionIT.cuentas ?? 0} ({formatCurrency(resDQActivo?.resumenProblemas.intervencionIT.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-indigo-600 border border-gray-100 dark:border-slate-800">{resDPActivo?.resumenProblemas.intervencionIT.cuentas ?? 0} ({formatCurrency(resDPActivo?.resumenProblemas.intervencionIT.pesos ?? 0)})</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">ADELANTADO (AD)</td>
                            <td className="px-2.5 py-1 text-right font-mono border border-gray-100 dark:border-slate-800">{resGlobalActivo?.resumenProblemas.adelantadoAD.cuentas ?? 0} ({formatCurrency(resGlobalActivo?.resumenProblemas.adelantadoAD.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-blue-600 border border-gray-100 dark:border-slate-800">{resDQActivo?.resumenProblemas.adelantadoAD.cuentas ?? 0} ({formatCurrency(resDQActivo?.resumenProblemas.adelantadoAD.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-indigo-600 border border-gray-100 dark:border-slate-800">{resDPActivo?.resumenProblemas.adelantadoAD.cuentas ?? 0} ({formatCurrency(resDPActivo?.resumenProblemas.adelantadoAD.pesos ?? 0)})</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800 font-medium">PERIODO (PE)</td>
                            <td className="px-2.5 py-1 text-right font-mono text-amber-600 font-bold border border-gray-100 dark:border-slate-800">{resGlobalActivo?.resumenProblemas.periodoPE.cuentas ?? 0} ({formatCurrency(resGlobalActivo?.resumenProblemas.periodoPE.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-amber-600 font-bold border border-gray-100 dark:border-slate-800">{resDQActivo?.resumenProblemas.periodoPE.cuentas ?? 0} ({formatCurrency(resDQActivo?.resumenProblemas.periodoPE.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-amber-600 font-bold border border-gray-100 dark:border-slate-800">{resDPActivo?.resumenProblemas.periodoPE.cuentas ?? 0} ({formatCurrency(resDPActivo?.resumenProblemas.periodoPE.pesos ?? 0)})</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-rose-50/20 dark:bg-rose-950/10">
                            <td className="px-3 py-1 text-slate-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800 font-bold">FUGA (FU)</td>
                            <td className="px-2.5 py-1 text-right font-mono border border-gray-100 dark:border-slate-800 font-bold text-rose-600">{(resGlobalActivo?.resumenProblemas.fugaFU?.cuentas ?? resGlobalActivo?.resumenProblemas.pagoSemPS?.cuentas) ?? 0} ({formatCurrency((resGlobalActivo?.resumenProblemas.fugaFU?.pesos ?? resGlobalActivo?.resumenProblemas.pagoSemPS?.pesos) ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-rose-600 border border-gray-100 dark:border-slate-800 font-bold">{(resDQActivo?.resumenProblemas.fugaFU?.cuentas ?? resDQActivo?.resumenProblemas.pagoSemPS?.cuentas) ?? 0} ({formatCurrency((resDQActivo?.resumenProblemas.fugaFU?.pesos ?? resDQActivo?.resumenProblemas.pagoSemPS?.pesos) ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-rose-600 border border-gray-100 dark:border-slate-800 font-bold">{(resDPActivo?.resumenProblemas.fugaFU?.cuentas ?? resDPActivo?.resumenProblemas.pagoSemPS?.cuentas) ?? 0} ({formatCurrency((resDPActivo?.resumenProblemas.fugaFU?.pesos ?? resDPActivo?.resumenProblemas.pagoSemPS?.pesos) ?? 0)})</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">DICT LEGAL (DL)</td>
                            <td className="px-2.5 py-1 text-right font-mono border border-gray-100 dark:border-slate-800">{resGlobalActivo?.resumenProblemas.dictLegalDL.cuentas ?? 0} ({formatCurrency(resGlobalActivo?.resumenProblemas.dictLegalDL.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-blue-600 border border-gray-100 dark:border-slate-800">{resDQActivo?.resumenProblemas.dictLegalDL.cuentas ?? 0} ({formatCurrency(resDQActivo?.resumenProblemas.dictLegalDL.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1 text-right font-mono text-indigo-600 border border-gray-100 dark:border-slate-800">{resDPActivo?.resumenProblemas.dictLegalDL.cuentas ?? 0} ({formatCurrency(resDPActivo?.resumenProblemas.dictLegalDL.pesos ?? 0)})</td>
                          </tr>
                          <tr className="hover:bg-rose-50/60 dark:hover:bg-rose-950/30 bg-rose-50/40 dark:bg-rose-950/20 font-bold text-rose-900 dark:text-rose-300">
                            <td className="px-3 py-1.5 border border-rose-200 dark:border-rose-900/50">TOTAL PROBLEMAS</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-rose-200 dark:border-rose-900/50">{resGlobalActivo?.resumenProblemas.totalProblemas.cuentas ?? 0} ctas ({formatCurrency(resGlobalActivo?.resumenProblemas.totalProblemas.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-rose-200 dark:border-rose-900/50">{resDQActivo?.resumenProblemas.totalProblemas.cuentas ?? 0} ctas ({formatCurrency(resDQActivo?.resumenProblemas.totalProblemas.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-rose-200 dark:border-rose-900/50">{resDPActivo?.resumenProblemas.totalProblemas.cuentas ?? 0} ctas ({formatCurrency(resDPActivo?.resumenProblemas.totalProblemas.pesos ?? 0)})</td>
                          </tr>
                          <tr className="hover:bg-blue-50/60 dark:hover:bg-blue-950/30 bg-blue-50/40 dark:bg-blue-950/20 font-bold text-blue-900 dark:text-blue-300">
                            <td className="px-3 py-1.5 border border-blue-200 dark:border-blue-900/50">Cuentas en RUTA</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-blue-200 dark:border-blue-900/50">{resGlobalActivo?.resumenProblemas.cuentasRuta.cuentas ?? 0} ctas ({formatCurrency(resGlobalActivo?.resumenProblemas.cuentasRuta.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-blue-200 dark:border-blue-900/50">{resDQActivo?.resumenProblemas.cuentasRuta.cuentas ?? 0} ctas ({formatCurrency(resDQActivo?.resumenProblemas.cuentasRuta.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-blue-200 dark:border-blue-900/50">{resDPActivo?.resumenProblemas.cuentasRuta.cuentas ?? 0} ctas ({formatCurrency(resDPActivo?.resumenProblemas.cuentasRuta.pesos ?? 0)})</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 font-bold text-rose-600 dark:text-rose-400">
                            <td className="px-3 py-1.5 border border-gray-100 dark:border-slate-800">Vencidos en RUTA</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{resGlobalActivo?.resumenProblemas.vencidosRuta.cuentas ?? 0} ctas ({formatCurrency(resGlobalActivo?.resumenProblemas.vencidosRuta.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{resDQActivo?.resumenProblemas.vencidosRuta.cuentas ?? 0} ctas ({formatCurrency(resDQActivo?.resumenProblemas.vencidosRuta.pesos ?? 0)})</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{resDPActivo?.resumenProblemas.vencidosRuta.cuentas ?? 0} ctas ({formatCurrency(resDPActivo?.resumenProblemas.vencidosRuta.pesos ?? 0)})</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Canales de Recaudación y Cumplimiento (Desglose Completo GLOBAL vs DQ vs DP) */}
                <Card className="border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Canales de Recaudación y Cumplimiento</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-bold">Página 2 CEJ</Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left align-middle border-collapse">
                        <thead className="bg-[#0f172a] text-white text-[10px] font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2 border border-slate-700">CANAL / INDICADOR</th>
                            <th className="px-2.5 py-2 text-right border border-slate-700 bg-slate-800 text-slate-100 font-bold">🌐 GLOBAL</th>
                            <th className="px-2.5 py-2 text-right border border-slate-700 bg-blue-950/80 text-blue-300 font-bold">🏢 DQ</th>
                            <th className="px-2.5 py-2 text-right border border-slate-700 bg-indigo-950/80 text-indigo-300 font-bold">🏬 DP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs">
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-emerald-50/30 dark:bg-emerald-950/20">
                            <td className="px-3 py-1.5 font-bold text-emerald-800 dark:text-emerald-300 border border-gray-100 dark:border-slate-800">💵 GESTOR (Efectivo Ruta)</td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 border border-gray-100 dark:border-slate-800">{formatCurrency(resGlobalActivo?.cobranzaGestor?.pesos ?? resGlobalActivo?.cobranzaEfectivo?.pesos ?? 0)} <span className="text-[10px] font-normal text-slate-500">({resGlobalActivo?.cobranzaGestor?.cuentas ?? resGlobalActivo?.cobranzaEfectivo?.cuentas ?? 0} ctas)</span></td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 border border-gray-100 dark:border-slate-800">{formatCurrency(resDQActivo?.cobranzaGestor?.pesos ?? resDQActivo?.cobranzaEfectivo?.pesos ?? 0)} <span className="text-[10px] font-normal text-slate-500">({resDQActivo?.cobranzaGestor?.cuentas ?? resDQActivo?.cobranzaEfectivo?.cuentas ?? 0} ctas)</span></td>
                            <td className="px-2.5 py-1.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 border border-gray-100 dark:border-slate-800">{formatCurrency(resDPActivo?.cobranzaGestor?.pesos ?? resDPActivo?.cobranzaEfectivo?.pesos ?? 0)} <span className="text-[10px] font-normal text-slate-500">({resDPActivo?.cobranzaGestor?.cuentas ?? resDPActivo?.cobranzaEfectivo?.cuentas ?? 0} ctas)</span></td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1.5 text-indigo-700 dark:text-indigo-300 border border-gray-100 dark:border-slate-800 font-medium">🤖 BANCOS BOT (Auto / SPEI)</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{formatCurrency(resGlobalActivo?.cobranzaBancosBot?.pesos ?? 0)} <span className="text-[10px] text-slate-500">({resGlobalActivo?.cobranzaBancosBot?.cuentas ?? 0} ctas)</span></td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-blue-600 border border-gray-100 dark:border-slate-800">{formatCurrency(resDQActivo?.cobranzaBancosBot?.pesos ?? 0)} <span className="text-[10px] text-slate-500">({resDQActivo?.cobranzaBancosBot?.cuentas ?? 0} ctas)</span></td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-indigo-600 border border-gray-100 dark:border-slate-800">{formatCurrency(resDPActivo?.cobranzaBancosBot?.pesos ?? 0)} <span className="text-[10px] text-slate-500">({resDPActivo?.cobranzaBancosBot?.cuentas ?? 0} ctas)</span></td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1.5 text-purple-700 dark:text-purple-300 border border-gray-100 dark:border-slate-800 font-medium">📱 BANCOS GESTOR (Depósito)</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{formatCurrency(resGlobalActivo?.cobranzaBancosGestor?.pesos ?? 0)} <span className="text-[10px] text-slate-500">({resGlobalActivo?.cobranzaBancosGestor?.cuentas ?? 0} ctas)</span></td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-blue-600 border border-gray-100 dark:border-slate-800">{formatCurrency(resDQActivo?.cobranzaBancosGestor?.pesos ?? 0)} <span className="text-[10px] text-slate-500">({resDQActivo?.cobranzaBancosGestor?.cuentas ?? 0} ctas)</span></td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-indigo-600 border border-gray-100 dark:border-slate-800">{formatCurrency(resDPActivo?.cobranzaBancosGestor?.pesos ?? 0)} <span className="text-[10px] text-slate-500">({resDPActivo?.cobranzaBancosGestor?.cuentas ?? 0} ctas)</span></td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-blue-50/30 dark:bg-blue-950/20 font-bold">
                            <td className="px-3 py-1.5 text-blue-800 dark:text-blue-300 border border-gray-100 dark:border-slate-800">🏦 TOTAL BANCOS (BOT+Gestor)</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-blue-700 dark:text-blue-300 border border-gray-100 dark:border-slate-800">{formatCurrency(resGlobalActivo?.cobranzaBancos?.pesos ?? 0)} <span className="text-[10px] font-normal text-slate-500">({resGlobalActivo?.cobranzaBancos?.cuentas ?? 0} ctas)</span></td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-blue-700 dark:text-blue-300 border border-gray-100 dark:border-slate-800">{formatCurrency(resDQActivo?.cobranzaBancos?.pesos ?? 0)} <span className="text-[10px] font-normal text-slate-500">({resDQActivo?.cobranzaBancos?.cuentas ?? 0} ctas)</span></td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-indigo-700 dark:text-indigo-300 border border-gray-100 dark:border-slate-800">{formatCurrency(resDPActivo?.cobranzaBancos?.pesos ?? 0)} <span className="text-[10px] font-normal text-slate-500">({resDPActivo?.cobranzaBancos?.cuentas ?? 0} ctas)</span></td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-amber-50/30 dark:bg-amber-950/20 font-bold text-amber-700 dark:text-amber-400">
                            <td className="px-3 py-1.5 border border-gray-100 dark:border-slate-800">⚡ MORATORIOS</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{formatCurrency(resGlobalActivo?.totalMoratorio ?? 0)}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{formatCurrency(resDQActivo?.totalMoratorio ?? 0)}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{formatCurrency(resDPActivo?.totalMoratorio ?? 0)}</td>
                          </tr>
                          <tr className="hover:bg-emerald-50 dark:hover:bg-emerald-950/40 bg-emerald-50/70 dark:bg-emerald-950/30 font-black text-emerald-900 dark:text-emerald-200">
                            <td className="px-3 py-2 border border-emerald-200 dark:border-emerald-900 text-xs">🌐 TOTAL RECAUDADO (Abono+Mora)</td>
                            <td className="px-2.5 py-2 text-right font-mono border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-black">{formatCurrency(resGlobalActivo?.totalCobradoConMoratorio ?? ((resGlobalActivo?.totalCobrado ?? 0) + (resGlobalActivo?.totalMoratorio ?? 0)))}</td>
                            <td className="px-2.5 py-2 text-right font-mono border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-black">{formatCurrency(resDQActivo?.totalCobradoConMoratorio ?? ((resDQActivo?.totalCobrado ?? 0) + (resDQActivo?.totalMoratorio ?? 0)))}</td>
                            <td className="px-2.5 py-2 text-right font-mono border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-black">{formatCurrency(resDPActivo?.totalCobradoConMoratorio ?? ((resDPActivo?.totalCobrado ?? 0) + (resDPActivo?.totalMoratorio ?? 0)))}</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 font-bold">
                            <td className="px-3 py-1.5 border border-gray-100 dark:border-slate-800">% Cumplimiento (Sin Dobles)</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{resGlobalActivo?.porcentajeCtasSinDobles ?? 0}%</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-blue-600 border border-gray-100 dark:border-slate-800">{resDQActivo?.porcentajeCtasSinDobles ?? 0}%</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-indigo-600 border border-gray-100 dark:border-slate-800">{resDPActivo?.porcentajeCtasSinDobles ?? 0}%</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">% Cumplimiento (Con Dobles)</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{resGlobalActivo?.porcentajeCtasConDobles ?? 0}%</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-blue-600 border border-gray-100 dark:border-slate-800">{resDQActivo?.porcentajeCtasConDobles ?? 0}%</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-indigo-600 border border-gray-100 dark:border-slate-800">{resDPActivo?.porcentajeCtasConDobles ?? 0}%</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">Pagos Dobles Registrados</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{formatCurrency(resGlobalActivo?.totalPagosDobles ?? 0)}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-blue-600 border border-gray-100 dark:border-slate-800">{formatCurrency(resDQActivo?.totalPagosDobles ?? 0)}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-indigo-600 border border-gray-100 dark:border-slate-800">{formatCurrency(resDPActivo?.totalPagosDobles ?? 0)}</td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">Recuperado Periodos Vencidos (PV)</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-100 dark:border-slate-800">{formatCurrency(resGlobalActivo?.totalRecuperadoPv ?? 0)}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-blue-600 border border-gray-100 dark:border-slate-800">{formatCurrency(resDQActivo?.totalRecuperadoPv ?? 0)}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono text-indigo-600 border border-gray-100 dark:border-slate-800">{formatCurrency(resDPActivo?.totalRecuperadoPv ?? 0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 3. Matriz Presupuesto vs Cobranza por Periodicidad */}
              {resumenActivo?.matrizPeriodos && resumenActivo.matrizPeriodos.length > 0 && (
                <Card className="border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Presupuesto vs Cobranza por Periodicidad
                    </CardTitle>
                    <Badge className={`text-[10px] font-bold ${
                      tabResumenEmpresa === "GLOBAL" ? "bg-slate-800 text-white" :
                      tabResumenEmpresa === "DQ" ? "bg-blue-600 text-white" : "bg-indigo-600 text-white"
                    }`}>
                      {tabResumenEmpresa === "GLOBAL" ? "GLOBAL" : tabResumenEmpresa === "DQ" ? "DQ QUERÉTARO" : "DP DASOPLUS"}
                    </Badge>
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
                          {resumenActivo.matrizPeriodos.map((m) => (
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
                        {(() => {
                          const totPptoCtas = resumenActivo.matrizPeriodos.reduce((acc, m) => acc + m.pptoCtas, 0);
                          const totPptoPesos = resumenActivo.matrizPeriodos.reduce((acc, m) => acc + m.pptoPesos, 0);
                          const totCobCtas = resumenActivo.matrizPeriodos.reduce((acc, m) => acc + m.cobCtas, 0);
                          const totCobPesos = resumenActivo.matrizPeriodos.reduce((acc, m) => acc + m.cobPesos, 0);
                          const totPorcCtas = totPptoCtas > 0 ? Math.round((totCobCtas / totPptoCtas) * 1000) / 10 : 0;
                          const totPorcPesos = totPptoPesos > 0 ? Math.round((totCobPesos / totPptoPesos) * 1000) / 10 : 0;
                          return (
                            <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                              <tr>
                                <td className="px-4 py-2 font-black uppercase border border-slate-200 dark:border-slate-700">TOTALES</td>
                                <td className="px-4 py-2 text-center font-mono font-bold border border-slate-200 dark:border-slate-700">{totPptoCtas}</td>
                                <td className="px-4 py-2 text-right font-mono font-bold border border-slate-200 dark:border-slate-700">{formatCurrency(totPptoPesos)}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">{totCobCtas}</td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">{formatCurrency(totCobPesos)}</td>
                                <td className="px-4 py-2 text-center font-bold border border-slate-200 dark:border-slate-700">{totPorcCtas}%</td>
                                <td className="px-4 py-2 text-center font-bold border border-slate-200 dark:border-slate-700">{totPorcPesos}%</td>
                              </tr>
                            </tfoot>
                          );
                        })()}
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 4. Presupuesto Diario Semanal con 3 líneas añadidas */}
              {resumenActivo?.resumenDiario && resumenActivo.resumenDiario.length > 0 && (
                <Card className="border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-slate-50 dark:bg-slate-800/60 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Presupuesto y Avance Diario Semanal (Cuentas RUTA)
                    </CardTitle>
                    <Badge className={`text-[10px] font-bold ${
                      tabResumenEmpresa === "GLOBAL" ? "bg-slate-800 text-white" :
                      tabResumenEmpresa === "DQ" ? "bg-blue-600 text-white" : "bg-indigo-600 text-white"
                    }`}>
                      {tabResumenEmpresa === "GLOBAL" ? "GLOBAL" : tabResumenEmpresa === "DQ" ? "DQ QUERÉTARO" : "DP DASOPLUS"}
                    </Badge>
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
                          {resumenActivo.resumenDiario.map((d) => (
                            <tr key={d.dia} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-2 font-bold uppercase border border-gray-100 dark:border-slate-800">{d.dia}</td>
                              <td className="px-4 py-2 text-center font-mono border border-gray-100 dark:border-slate-800">{d.pptoCuentas}</td>
                              <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600 border border-gray-100 dark:border-slate-800">{d.avanceCuentas}</td>
                              <td className="px-4 py-2 text-right font-mono border border-gray-100 dark:border-slate-800">{formatCurrency(d.pptoDinero)}</td>
                              <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600 border border-gray-100 dark:border-slate-800">{formatCurrency(d.avanceDinero)}</td>
                            </tr>
                          ))}
                        </tbody>
                        {(() => {
                          const totPptoCtas = resumenActivo.resumenDiario.reduce((acc, d) => acc + d.pptoCuentas, 0);
                          const totAvanceCtas = resumenActivo.resumenDiario.reduce((acc, d) => acc + d.avanceCuentas, 0);
                          const totPptoDinero = resumenActivo.resumenDiario.reduce((acc, d) => acc + d.pptoDinero, 0);
                          const totAvanceDinero = resumenActivo.resumenDiario.reduce((acc, d) => acc + d.avanceDinero, 0);
                          return (
                            <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                              <tr>
                                <td className="px-4 py-2 font-black uppercase border border-slate-200 dark:border-slate-700">TOTALES</td>
                                <td className="px-4 py-2 text-center font-mono font-bold border border-slate-200 dark:border-slate-700">{totPptoCtas}</td>
                                <td className="px-4 py-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">{totAvanceCtas}</td>
                                <td className="px-4 py-2 text-right font-mono font-bold border border-slate-200 dark:border-slate-700">{formatCurrency(totPptoDinero)}</td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">{formatCurrency(totAvanceDinero)}</td>
                              </tr>
                            </tfoot>
                          );
                        })()}
                      </table>
                    </div>

                    {/* 3 LÍNEAS SOLICITADAS DEBAJO DE LA TABLA DE PPTO Y AVANCE DIARIO */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 divide-y divide-slate-200/60 dark:divide-slate-700/60 text-xs">
                      <div className="flex justify-between items-center py-2 font-bold">
                        <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          PORCENTAJE COMISIÓN
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm font-black">
                            {resumenActivo?.porcentajeCtasSinDobles ?? 0}%
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({resumenActivo?.pagarConPorcentajeSinDobles ? "Pagar con % sin dobles <81%" : "Meta Cumplida >=81%"})
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-2 font-bold">
                        <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                          PORCENTAJE SALDOS VENCIDOS
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-rose-600 dark:text-rose-400 text-sm font-black">
                            {resumenActivo?.totalCartera && resumenActivo.totalCartera > 0
                              ? ((resumenActivo.totalVencido / resumenActivo.totalCartera) * 100).toFixed(1)
                              : "0.0"}%
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({formatCurrency(resumenActivo?.totalVencido ?? 0)} de {formatCurrency(resumenActivo?.totalCartera ?? 0)})
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-2 font-bold">
                        <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-500" />
                          VERIFICACIONES
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-600 dark:text-blue-400 text-sm font-black">
                            {clientes.filter(c => (tabResumenEmpresa === "GLOBAL" || (tabResumenEmpresa === "DQ" ? c.codigoCliente?.startsWith("DQ") : c.codigoCliente?.startsWith("DP"))) && (c.problema === "VD" || (c as any).vdStatus)).length} ctas
                          </span>
                          <span className="text-[10px] text-slate-500">
                            (VDs asignadas / realizadas en cartera)
                          </span>
                        </div>
                      </div>
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
                <div className="flex justify-between"><span>Cobrado Abonos:</span><span className="font-mono font-bold text-emerald-600">{formatCurrency(totalCobradoReal)}</span></div>
                {totalMoratorioReal > 0 && (
                  <div className="flex justify-between"><span>Interés Moratorio:</span><span className="font-mono font-bold text-amber-600">{formatCurrency(totalMoratorioReal)}</span></div>
                )}
                <div className="flex justify-between border-t border-blue-200 dark:border-blue-900 pt-1 font-bold"><span>Total Recaudado:</span><span className="font-mono text-emerald-600 font-black">{formatCurrency(totalCobradoConMoratorioReal)}</span></div>
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

        {/* MODAL: Cerrar Corte Semanal Oficial */}
        <Dialog open={cerrarCorteModalOpen} onOpenChange={setCerrarCorteModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-700 dark:text-amber-400">
                <Lock className="w-5 h-5" /> Cerrar y Congelar Corte Semanal
              </DialogTitle>
              <DialogDescription className="text-xs">
                Auditoría y cierre oficial de la <strong>Semana {semana} ({anio})</strong> para el cobrador{" "}
                <strong>{getSelectedCobradorName()}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1.5 text-amber-900 dark:text-amber-200">
                <div className="flex justify-between"><span>Cobrador / Gestor:</span><span className="font-bold">{getSelectedCobradorName()}</span></div>
                <div className="flex justify-between"><span>Total Cuentas Cartera:</span><span className="font-mono font-bold">{clientes.length}</span></div>
                <div className="flex justify-between"><span>Cobrado Abonos:</span><span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalCobradoReal)}</span></div>
                {totalMoratorioReal > 0 && (
                  <div className="flex justify-between"><span>Interés Moratorio:</span><span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalMoratorioReal)}</span></div>
                )}
                <div className="flex justify-between border-t border-amber-200 dark:border-amber-800/60 pt-1 font-bold"><span>Total Recaudado:</span><span className="font-mono font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(totalCobradoConMoratorioReal)}</span></div>
                <div className="flex justify-between"><span>Sugerido de Semana:</span><span className="font-mono font-bold">{formatCurrency(totalCobrar)}</span></div>
                <div className="flex justify-between"><span>Saldo Vencido:</span><span className="font-mono font-bold text-rose-700 dark:text-rose-400">{formatCurrency(totalSaldoVencido)}</span></div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" /> Efectos del cierre oficial:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <li>La lista de cuentas y abonos de esta semana queda <strong>definitivamente congelada</strong>.</li>
                  <li>Los nuevos pagos y clientes asignados <strong>se registrarán para la siguiente semana</strong>.</li>
                </ul>
              </div>

              <div className="space-y-1">
                <Label htmlFor="obsCierre" className="text-xs font-bold text-slate-600 dark:text-slate-400">Observaciones de Cierre (opcional)</Label>
                <Input
                  id="obsCierre"
                  placeholder="Ej. Corte auditado y conciliado con caja el viernes por la tarde..."
                  value={observacionesCierre}
                  onChange={(e) => setObservacionesCierre(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setCerrarCorteModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmarCerrarCorte}
                disabled={closingCorte}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> {closingCorte ? "Cerrando..." : "Confirmar y Cerrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: Reabrir Corte Semanal */}
        <Dialog open={reabrirCorteModalOpen} onOpenChange={setReabrirCorteModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Unlock className="w-5 h-5 text-amber-600" /> Reabrir Corte Semanal
              </DialogTitle>
              <DialogDescription className="text-xs">
                ¿Deseas reactivar el corte de la <strong>Semana {semana} ({anio})</strong> para <strong>{getSelectedCobradorName()}</strong>?
              </DialogDescription>
            </DialogHeader>

            <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
              Al reabrir el corte, volverá a estar en estatus <strong>ABIERTO</strong>, permitiendo editar clasificaciones de problema y recalcular cobros en vivo.
            </p>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setReabrirCorteModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmarReabrirCorte}
                disabled={closingCorte}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" /> {closingCorte ? "Reabriendo..." : "Confirmar Reanudación"}
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

        {/* MODAL: Visor PDF Oficial (Plantilla Lista Cobranza) */}
        <Dialog open={modalPDFOpen} onOpenChange={setModalPDFOpen}>
          <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Plantilla Lista Cobranza - Semana {semana} ({getSelectedCobradorCodigo()})
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Vista previa oficial de la cartera completa paginada y el Resumen Ejecutivo oficial.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                  onClick={() => {
                    if (iframePDFRef.current?.contentWindow) {
                      iframePDFRef.current.contentWindow.print();
                    } else if (pdfBlobUrl) {
                      window.open(pdfBlobUrl, "_blank");
                    }
                  }}
                >
                  <Printer className="w-4 h-4" /> Imprimir / Guardar como PDF
                </Button>
                {pdfBlobUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700"
                    onClick={() => window.open(pdfBlobUrl, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" /> Abrir en Ventana
                  </Button>
                )}
              </div>
            </DialogHeader>

            <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 my-2">
              {pdfBlobUrl ? (
                <iframe
                  ref={iframePDFRef}
                  src={pdfBlobUrl}
                  title="PDF Oficial Lista Cobranza"
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Generando documento oficial...
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setModalPDFOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
