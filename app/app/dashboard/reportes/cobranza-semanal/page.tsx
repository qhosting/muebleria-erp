"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Calendar,
  CalendarDays,
  Download,
  Filter,
  TrendingUp,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  CalendarCheck
} from "lucide-react";

interface FilaDiaria {
  dia: string;
  proyeccion: number;
  proyeccionSistema: number;
  logro: number;
  diferencia: number;
  porcentaje: number;
  ctasCobradas: number;
  ctasProyectadas: number;
}

interface FilaGestor {
  gestor: string;
  codigoGestor: string;
  carteraAsig: number;
  p87: number;
  p85: number;
  p83: number;
  ruta: number;
  dif: number;
  presupuesto: number;
  acCtas: number;
  difCuentas: number;
  acumulado: number;
  diferencia: number;
  porcCuentas: number;
  porcDinero: number;
}

interface ReporteData {
  semana: number;
  anio: number;
  esSemanaActual: boolean;
  rangoSemana: {
    inicioStr: string;
    finStr: string;
    label: string;
  };
  cartera: "DP" | "DQ" | "TODAS";
  diaFiltro: string;
  proyeccionDiaria: {
    filas: FilaDiaria[];
    totales: {
      proyeccion: number;
      logro: number;
      diferencia: number;
      porcentaje: number;
    };
  };
  gestores: {
    filas: FilaGestor[];
    totales: FilaGestor;
  };
}

const DIAS_FILTRO = [
  { key: "TODOS", label: "Semana Completa", short: "Todos" },
  { key: "SABADO", label: "Sábado", short: "Sáb" },
  { key: "LUNES", label: "Lunes", short: "Lun" },
  { key: "MARTES", label: "Martes", short: "Mar" },
  { key: "MIERCOLES", label: "Miércoles", short: "Mié" },
  { key: "JUEVES", label: "Jueves", short: "Jue" },
  { key: "VIERNES", label: "Viernes", short: "Vie" },
];

export const dynamic = "force-dynamic";

export default function CobranzaSemanalPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        </DashboardLayout>
      }
    >
      <CobranzaSemanalContenido />
    </Suspense>
  );
}

function CobranzaSemanalContenido() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Estados de control
  const [cartera, setCartera] = useState<"DP" | "DQ">(() => {
    const c = searchParams?.get("cartera")?.toUpperCase();
    return c === "DQ" ? "DQ" : "DP";
  });
  const [diaFiltro, setDiaFiltro] = useState<string>("TODOS");
  const [semana, setSemana] = useState<number | null>(null);
  const [anio, setAnio] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReporteData | null>(null);

  // Cargar datos
  const cargarReporte = async (targetSemana?: number, targetAnio?: number, targetCartera?: string, targetDia?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const sem = targetSemana ?? semana;
      const yr = targetAnio ?? anio;
      const cart = targetCartera ?? cartera;
      const dia = targetDia ?? diaFiltro;

      if (sem) params.set("semana", sem.toString());
      if (yr) params.set("anio", yr.toString());
      params.set("cartera", cart);
      params.set("dia", dia);

      const res = await fetch(`/api/reportes/cobranza-semanal?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Error al obtener datos del reporte");
      }
      const json: ReporteData = await res.json();
      setData(json);
      setSemana(json.semana);
      setAnio(json.anio);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al cargar reporte");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const carteraQuery = searchParams?.get("cartera")?.toUpperCase();
    if (carteraQuery === "DP" || carteraQuery === "DQ") {
      setCartera(carteraQuery);
    }
    const diaQuery = searchParams?.get("dia")?.toUpperCase();
    if (diaQuery) {
      setDiaFiltro(diaQuery);
    }
    cargarReporte();
  }, [searchParams]);

  const cambiarCartera = (nuevaCartera: "DP" | "DQ") => {
    setCartera(nuevaCartera);
    cargarReporte(semana ?? undefined, anio ?? undefined, nuevaCartera, diaFiltro);
  };

  const cambiarDiaFiltro = (nuevoDia: string) => {
    setDiaFiltro(nuevoDia);
    cargarReporte(semana ?? undefined, anio ?? undefined, cartera, nuevoDia);
  };

  const navegarSemana = (delta: number) => {
    if (!semana || !anio) return;
    let nuevaSemana = semana + delta;
    let nuevoAnio = anio;
    if (nuevaSemana < 1) {
      nuevaSemana = 52;
      nuevoAnio -= 1;
    } else if (nuevaSemana > 52) {
      nuevaSemana = 1;
      nuevoAnio += 1;
    }
    setSemana(nuevaSemana);
    setAnio(nuevoAnio);
    cargarReporte(nuevaSemana, nuevoAnio, cartera, diaFiltro);
  };

  const irSemanaActual = () => {
    setSemana(null);
    setAnio(null);
    cargarReporte(undefined, undefined, cartera, diaFiltro);
  };

  // Exportar a Excel
  const exportarExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Hoja 1: Concentrado Gestores
    const wsGestoresData = [
      [`REPORTE DE COBRANZA SEMANAL - CARTERA ${data.cartera}`],
      [`Semana: ${data.semana} (${data.rangoSemana.label})`, `Filtro Día: ${data.diaFiltro}`],
      [""],
      [
        "GESTOR",
        "CARTERA ASIG",
        "87%",
        "85%",
        "83%",
        "RUTA",
        "DIF (ASIG-RUTA)",
        "$ PRESUPUESTO",
        "Ac Ctas",
        "DIF CUENTAS",
        "$ Acumulado",
        "Diferencia",
        "% CUENTAS",
        "% DINERO",
      ],
      ...data.gestores.filas.map((g) => [
        g.gestor,
        g.carteraAsig,
        g.p87,
        g.p85,
        g.p83,
        g.ruta,
        g.dif,
        g.presupuesto,
        g.acCtas,
        g.difCuentas,
        g.acumulado,
        g.diferencia,
        `${g.porcCuentas}%`,
        `${g.porcDinero}%`,
      ]),
      [
        "TOTALES",
        data.gestores.totales.carteraAsig,
        data.gestores.totales.p87,
        data.gestores.totales.p85,
        data.gestores.totales.p83,
        data.gestores.totales.ruta,
        data.gestores.totales.dif,
        data.gestores.totales.presupuesto,
        data.gestores.totales.acCtas,
        data.gestores.totales.difCuentas,
        data.gestores.totales.acumulado,
        data.gestores.totales.diferencia,
        `${data.gestores.totales.porcCuentas}%`,
        `${data.gestores.totales.porcDinero}%`,
      ],
    ];
    const wsGestores = XLSX.utils.aoa_to_sheet(wsGestoresData);
    XLSX.utils.book_append_sheet(wb, wsGestores, `Gestores ${data.cartera}`);

    // Hoja 2: Proyección Diaria
    const wsDiarioData = [
      [`PROYECCIÓN Y LOGRO DIARIO - ${data.cartera}`],
      [`Semana: ${data.semana}`, `Período: ${data.rangoSemana.label}`],
      [""],
      ["DÍA", "PROYECCIÓN", "LOGRO", "DIFERENCIA", "% CUMPLIMIENTO", "CTAS COBRADAS"],
      ...data.proyeccionDiaria.filas.map((d) => [
        d.dia,
        d.proyeccion,
        d.logro,
        d.diferencia,
        `${d.porcentaje}%`,
        d.ctasCobradas,
      ]),
      [
        "TOTAL",
        data.proyeccionDiaria.totales.proyeccion,
        data.proyeccionDiaria.totales.logro,
        data.proyeccionDiaria.totales.diferencia,
        `${data.proyeccionDiaria.totales.porcentaje}%`,
        data.proyeccionDiaria.filas.reduce((acc, d) => acc + d.ctasCobradas, 0),
      ],
    ];
    const wsDiario = XLSX.utils.aoa_to_sheet(wsDiarioData);
    XLSX.utils.book_append_sheet(wb, wsDiario, `Proyección Diaria`);

    XLSX.writeFile(wb, `Reporte_Cobranza_Semanal_${data.cartera}_Sem${data.semana}_${data.anio}.xlsx`);
    toast.success("Reporte exportado correctamente");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 max-w-7xl mx-auto">
        {/* Cabecera Principal */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Cobranza Semanal
              </h1>
              <Badge
                className={`text-xs px-2.5 py-1 font-bold ${
                  cartera === "DP"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {cartera === "DP" ? "CARTERA DP" : "CARTERA DQ"}
              </Badge>
              {data?.esSemanaActual && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Semana Actual
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Seguimiento de presupuestos, metas de cuentas y avance de cobranza diaria y por gestor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportarExcel}
              disabled={loading || !data}
              className="gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => cargarReporte()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Barra de Control: Tabs DP/DQ + Selector de Semana */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-white dark:bg-slate-900 p-3 rounded-xl border shadow-sm">
          {/* Selector de Cartera DP / DQ */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
              Cartera:
            </span>
            <div className="grid grid-cols-2 w-full p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => cambiarCartera("DP")}
                className={`py-2 text-xs sm:text-sm font-black rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  cartera === "DP"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Proyección DP
              </button>
              <button
                type="button"
                onClick={() => cambiarCartera("DQ")}
                className={`py-2 text-xs sm:text-sm font-black rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  cartera === "DQ"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Proyección DQ
              </button>
            </div>
          </div>

          {/* Selector y Navegación de Semana */}
          <div className="lg:col-span-8 flex flex-wrap items-center justify-start lg:justify-end gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navegarSemana(-1)}
                title="Semana Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-3 text-center">
                <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                  Semana {data?.semana ?? "--"} ({data?.anio ?? "--"})
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {data?.rangoSemana?.label ?? "Cargando..."}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navegarSemana(1)}
                title="Semana Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {!data?.esSemanaActual && (
              <Button
                variant="secondary"
                size="sm"
                onClick={irSemanaActual}
                className="text-xs font-bold gap-1.5"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                Semana Actual
              </Button>
            )}
          </div>
        </div>

        {/* Filtro por Día (Horizontal Selector) */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-500" />
              Filtrar por Día de Cobro:
            </span>
            {diaFiltro !== "TODOS" && (
              <button
                onClick={() => cambiarDiaFiltro("TODOS")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline"
              >
                Limpiar filtro (Ver semana completa)
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DIAS_FILTRO.map((d) => {
              const isActive = diaFiltro === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => cambiarDiaFiltro(d.key)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    isActive
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI Cards Resumen */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Proyección {diaFiltro !== "TODOS" ? `(${diaFiltro})` : "Semanal"}
                </span>
                <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {formatCurrency(
                    diaFiltro === "TODOS"
                      ? data.proyeccionDiaria.totales.proyeccion
                      : data.proyeccionDiaria.filas.find((f) => f.dia === diaFiltro)?.proyeccion ?? 0
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Meta económica programada</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Logro Cobrado
                </span>
                <div className="text-xl lg:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(
                    diaFiltro === "TODOS"
                      ? data.proyeccionDiaria.totales.logro
                      : data.proyeccionDiaria.filas.find((f) => f.dia === diaFiltro)?.logro ?? 0
                  )}
                </div>
                <p className="text-[11px] text-emerald-600/80 mt-0.5 font-medium">Ingresos recaudados</p>
              </CardContent>
            </Card>

            <Card
              className={`border-l-4 shadow-sm ${
                (diaFiltro === "TODOS"
                  ? data.proyeccionDiaria.totales.diferencia
                  : (data.proyeccionDiaria.filas.find((f) => f.dia === diaFiltro)?.diferencia ?? 0)) >= 0
                  ? "border-l-emerald-500"
                  : "border-l-rose-500"
              }`}
            >
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Diferencia Meta
                </span>
                <div
                  className={`text-xl lg:text-2xl font-black mt-1 ${
                    (diaFiltro === "TODOS"
                      ? data.proyeccionDiaria.totales.diferencia
                      : (data.proyeccionDiaria.filas.find((f) => f.dia === diaFiltro)?.diferencia ?? 0)) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatCurrency(
                    diaFiltro === "TODOS"
                      ? data.proyeccionDiaria.totales.diferencia
                      : data.proyeccionDiaria.filas.find((f) => f.dia === diaFiltro)?.diferencia ?? 0
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Logro menos proyección</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 shadow-sm">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  % Cumplimiento Dinero
                </span>
                <div className="text-xl lg:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {diaFiltro === "TODOS"
                    ? `${data.proyeccionDiaria.totales.porcentaje}%`
                    : `${data.proyeccionDiaria.filas.find((f) => f.dia === diaFiltro)?.porcentaje ?? 0}%`}
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        diaFiltro === "TODOS"
                          ? data.proyeccionDiaria.totales.porcentaje
                          : data.proyeccionDiaria.filas.find((f) => f.dia === diaFiltro)?.porcentaje ?? 0
                      )}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 shadow-sm col-span-2 sm:col-span-1">
              <CardContent className="p-4">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Cuentas Cobradas
                </span>
                <div className="text-xl lg:text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                  {data.gestores.totales.acCtas}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    / {data.gestores.totales.ruta} ruta
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                  {data.gestores.totales.porcCuentas}% de cuentas cobradas
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SECCIÓN 1: TABLA PROYECCIÓN VS LOGRO DIARIO (Exacto Formato Imagen 2 y Imagen 3) */}
        {data && (
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 bg-slate-50 dark:bg-slate-800/60 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Proyección vs Logro Diario - {cartera} (Semana {data.semana})
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Ciclo operativo de Sábado a Viernes ({data.rangoSemana.label})
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {cartera}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left align-middle border-collapse">
                  <thead className="bg-[#0f172a] text-white text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 border border-slate-700 text-center w-24">
                        {data.semana}
                      </th>
                      <th className="px-4 py-2.5 border border-slate-700 text-right">Proyección</th>
                      <th className="px-4 py-2.5 border border-slate-700 text-right bg-emerald-950/80 text-emerald-300">
                        Logro
                      </th>
                      <th className="px-4 py-2.5 border border-slate-700 text-right">Diferencia</th>
                      <th className="px-4 py-2.5 border border-slate-700 text-center">% Logro</th>
                      <th className="px-4 py-2.5 border border-slate-700 text-center">Cuentas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                    {data.proyeccionDiaria.filas.map((fila) => {
                      const isSelected = diaFiltro === fila.dia;
                      const dif = fila.diferencia;
                      const esPositivo = dif >= 0;

                      return (
                        <tr
                          key={fila.dia}
                          onClick={() => cambiarDiaFiltro(isSelected ? "TODOS" : fila.dia)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/40 font-bold"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <td className="px-4 py-2.5 font-bold uppercase border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span>{fila.dia}</span>
                            {isSelected && (
                              <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">
                                Activo
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                            {formatCurrency(fila.proyeccion)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold border border-slate-100 dark:border-slate-800 text-emerald-600 dark:text-emerald-400">
                            {fila.logro > 0 ? formatCurrency(fila.logro) : "-"}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono font-bold border border-slate-100 dark:border-slate-800 ${
                              esPositivo
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {fila.logro === 0 && fila.proyeccion > 0
                              ? `-${formatCurrency(fila.proyeccion)}`
                              : formatCurrency(dif)}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold border border-slate-100 dark:border-slate-800">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                                fila.porcentaje >= 100
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black"
                                  : fila.porcentaje >= 75
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  : fila.porcentaje > 0
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  : "text-slate-400"
                              }`}
                            >
                              {fila.porcentaje}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                            {fila.ctasCobradas > 0 ? fila.ctasCobradas : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                    <tr>
                      <td className="px-4 py-2.5 font-black uppercase border border-slate-200 dark:border-slate-700">
                        TOTALES
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold border border-slate-200 dark:border-slate-700">
                        {formatCurrency(data.proyeccionDiaria.totales.proyeccion)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
                        {formatCurrency(data.proyeccionDiaria.totales.logro)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono font-black border border-slate-200 dark:border-slate-700 ${
                          data.proyeccionDiaria.totales.diferencia >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatCurrency(data.proyeccionDiaria.totales.diferencia)}
                      </td>
                      <td className="px-4 py-2.5 text-center font-black border border-slate-200 dark:border-slate-700">
                        {data.proyeccionDiaria.totales.porcentaje}%
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-bold border border-slate-200 dark:border-slate-700">
                        {data.proyeccionDiaria.filas.reduce((acc, d) => acc + d.ctasCobradas, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECCIÓN 2: TABLA CONCENTRADO DE GESTORES (Exacto Formato Imagen 1) */}
        {data && (
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="py-3.5 px-4 bg-slate-50 dark:bg-slate-800/60 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Concentrado de Cobranza por Gestor - {cartera}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {diaFiltro === "TODOS"
                    ? `Metas y avance acumulado de la semana ${data.semana}`
                    : `Mostrando cuentas programadas y cobros correspondientes a: ${diaFiltro}`}
                </CardDescription>
              </div>
              {diaFiltro !== "TODOS" && (
                <Badge className="bg-amber-500 text-white font-bold text-xs">
                  Filtro activo: {diaFiltro}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left align-middle border-collapse min-w-[950px]">
                  {/* Encabezados Jerárquicos idénticos a Imagen 1 */}
                  <thead>
                    <tr className="bg-[#facc15] text-slate-900 font-bold uppercase text-[10px] text-center border-b border-amber-400">
                      <th rowSpan={2} className="px-3 py-2 bg-[#06b6d4] text-white border border-slate-300 w-36">
                        GESTOR
                      </th>
                      <th colSpan={4} className="px-3 py-1 border border-amber-400 bg-[#fde047]">
                        CUENTAS
                      </th>
                      <th colSpan={2} className="px-3 py-1 border border-amber-400 bg-[#facc15]">
                        METAS
                      </th>
                      <th rowSpan={2} className="px-3 py-2 border border-amber-400 bg-[#38bdf8] text-slate-900">
                        $ PRESUPUESTO
                      </th>
                      <th rowSpan={2} className="px-3 py-2 border border-amber-400 bg-[#67e8f9] text-slate-900">
                        Ac Ctas
                      </th>
                      <th rowSpan={2} className="px-3 py-2 border border-amber-400 bg-[#fef08a] text-slate-900">
                        DIF CUENTAS
                      </th>
                      <th rowSpan={2} className="px-3 py-2 border border-amber-400 bg-[#38bdf8] text-slate-900">
                        $ Acumulado
                      </th>
                      <th rowSpan={2} className="px-3 py-2 border border-amber-400 bg-[#f87171] text-white">
                        Diferencia
                      </th>
                      <th rowSpan={2} className="px-3 py-2 border border-amber-400 bg-[#4ade80] text-slate-900">
                        % CUENTAS
                      </th>
                      <th rowSpan={2} className="px-3 py-2 border border-amber-400 bg-[#22c55e] text-white">
                        % DINERO
                      </th>
                    </tr>
                    <tr className="bg-[#fef08a] text-slate-800 font-bold text-[9px] uppercase text-center border-b border-amber-300">
                      <th className="px-2 py-1 border border-amber-300">CARTERA ASIG</th>
                      <th className="px-2 py-1 border border-amber-300 bg-[#bbf7d0]">87%</th>
                      <th className="px-2 py-1 border border-amber-300 bg-[#bbf7d0]">85%</th>
                      <th className="px-2 py-1 border border-amber-300 bg-[#bbf7d0]">83%</th>
                      <th className="px-2 py-1 border border-amber-300 bg-[#cbd5e1]">RUTA</th>
                      <th className="px-2 py-1 border border-amber-300 bg-[#cbd5e1]">DIF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                    {data.gestores.filas.map((g, idx) => (
                      <tr
                        key={g.gestor}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                          idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-900/50"
                        }`}
                      >
                        {/* GESTOR */}
                        <td className="px-3 py-2 font-bold uppercase border border-slate-200 dark:border-slate-800 bg-cyan-50/30 dark:bg-cyan-950/20 text-slate-900 dark:text-slate-100">
                          {g.gestor}
                        </td>
                        {/* CARTERA ASIG */}
                        <td className="px-2 py-2 text-center font-mono font-bold border border-slate-200 dark:border-slate-800">
                          {g.carteraAsig}
                        </td>
                        {/* 87% */}
                        <td className="px-2 py-2 text-center font-mono border border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                          {g.p87}
                        </td>
                        {/* 85% */}
                        <td className="px-2 py-2 text-center font-mono border border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                          {g.p85}
                        </td>
                        {/* 83% */}
                        <td className="px-2 py-2 text-center font-mono border border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20">
                          {g.p83}
                        </td>
                        {/* RUTA */}
                        <td className="px-2 py-2 text-center font-mono font-bold border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40">
                          {g.ruta}
                        </td>
                        {/* DIF (ASIG - RUTA) */}
                        <td className="px-2 py-2 text-center font-mono border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40">
                          {g.dif}
                        </td>
                        {/* $ PRESUPUESTO */}
                        <td className="px-3 py-2 text-right font-mono font-bold border border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-400 bg-blue-50/20">
                          {formatCurrency(g.presupuesto)}
                        </td>
                        {/* Ac Ctas */}
                        <td className="px-2 py-2 text-center font-mono font-bold border border-slate-200 dark:border-slate-800 text-indigo-700 dark:text-indigo-400">
                          {g.acCtas}
                        </td>
                        {/* DIF CUENTAS */}
                        <td className="px-2 py-2 text-center font-mono font-bold border border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400 bg-yellow-50/30">
                          {g.difCuentas}
                        </td>
                        {/* $ Acumulado */}
                        <td className="px-3 py-2 text-right font-mono font-black border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 bg-emerald-50/20">
                          {formatCurrency(g.acumulado)}
                        </td>
                        {/* Diferencia Dinero */}
                        <td
                          className={`px-3 py-2 text-right font-mono font-bold border border-slate-200 dark:border-slate-800 ${
                            g.diferencia <= 0
                              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/30"
                              : "text-rose-600 dark:text-rose-400 bg-rose-50/30"
                          }`}
                        >
                          {formatCurrency(g.diferencia)}
                        </td>
                        {/* % CUENTAS */}
                        <td className="px-2 py-2 text-center font-mono font-black border border-slate-200 dark:border-slate-800">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              g.porcCuentas >= 85
                                ? "bg-emerald-500 text-white font-black"
                                : g.porcCuentas >= 60
                                ? "bg-amber-100 text-amber-900 font-bold"
                                : "bg-rose-100 text-rose-800 font-medium"
                            }`}
                          >
                            {g.porcCuentas}%
                          </span>
                        </td>
                        {/* % DINERO */}
                        <td className="px-2 py-2 text-center font-mono font-black border border-slate-200 dark:border-slate-800">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              g.porcDinero >= 85
                                ? "bg-emerald-600 text-white font-black"
                                : g.porcDinero >= 60
                                ? "bg-blue-100 text-blue-900 font-bold"
                                : "bg-rose-100 text-rose-800 font-medium"
                            }`}
                          >
                            {g.porcDinero}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Fila de TOTALES idéntica a Imagen 1 */}
                  <tfoot className="bg-[#1e3a8a] text-white font-bold border-t-2 border-slate-900 text-xs">
                    <tr>
                      <td className="px-3 py-2.5 font-black uppercase border border-blue-900 bg-[#0f172a] text-white">
                        TOTALES
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-black border border-blue-900 bg-[#0284c7]">
                        {data.gestores.totales.carteraAsig}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-bold border border-blue-900 bg-[#0ea5e9]">
                        {data.gestores.totales.p87}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-bold border border-blue-900 bg-[#0ea5e9]">
                        {data.gestores.totales.p85}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-bold border border-blue-900 bg-[#0ea5e9]">
                        {data.gestores.totales.p83}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-black border border-blue-900 bg-[#0284c7]">
                        {data.gestores.totales.ruta}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-bold border border-blue-900 bg-[#0284c7]">
                        {data.gestores.totales.dif}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black border border-blue-900 bg-[#0284c7]">
                        {formatCurrency(data.gestores.totales.presupuesto)}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-black border border-blue-900 bg-[#38bdf8] text-slate-950">
                        {data.gestores.totales.acCtas}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-black border border-blue-900 bg-[#fde047] text-slate-950">
                        {data.gestores.totales.difCuentas}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black border border-blue-900 bg-[#0284c7]">
                        {formatCurrency(data.gestores.totales.acumulado)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black border border-blue-900 bg-[#ef4444] text-white">
                        {formatCurrency(data.gestores.totales.diferencia)}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-black border border-blue-900 bg-[#16a34a] text-white">
                        {data.gestores.totales.porcCuentas}%
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-black border border-blue-900 bg-[#16a34a] text-white">
                        {data.gestores.totales.porcDinero}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
