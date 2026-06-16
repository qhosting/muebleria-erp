
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RegistrarVentaModal } from "@/components/mobile/registrar-venta-modal";
import { DigitalizadorModal } from "@/components/ventas/digitalizador-modal";
import { useSession } from "next-auth/react";
import { TrendingUp, Target, Package, DollarSign, Calendar, ChevronRight, User, MapPin, UserPlus, Star, Tag, UserCheck, FileText, Image as ImageIcon, Loader2, ShieldCheck, Search, Award, Filter, ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function SalesMobilePage() {
  const [data, setData] = useState<any>(null);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el digitalizador
  const [showDigitalizador, setShowDigitalizador] = useState(false);
  const [selectedForDocs, setSelectedForDocs] = useState<any>(null);
  const { data: session, status } = useSession();

  // Estados para directivos/administradores (modo direccion)
  const [reportData, setReportData] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [searchAsesor, setSearchAsesor] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedAsesor, setExpandedAsesor] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const userRole = (session?.user as any)?.role || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_role') : null);
  const isDireccion = userRole === 'direccion' || userRole === 'admin';

  const fetchReporteVentas = async () => {
    setLoadingReport(true);
    try {
      const params = new URLSearchParams({ fechaDesde, fechaHasta });
      const response = await fetch(`/api/reportes/ventas?${params.toString()}`);
      if (response.ok) {
        const json = await response.json();
        setReportData(json);
      } else {
        toast.error("Error al cargar reporte de ventas");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar reporte de ventas");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (isDireccion) {
      fetchReporteVentas();
    } else {
      fetchMetrics();
      fetchSolicitudes();
    }
  }, [isDireccion, fechaDesde, fechaHasta]);

  const fetchSolicitudes = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("/api/ventas/solicitudes", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        setSolicitudes(json);
      }
    } catch (e) {
      console.error(e);
    }
  };


  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("/api/ventas/metrics", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="animate-pulse">Verificando credenciales...</p>
      </div>
    );
  }

  if (isDireccion && loadingReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="animate-pulse">Cargando reporte de ventas y metas...</p>
      </div>
    );
  }

  if (!isDireccion && loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="animate-pulse">Cargando métricas de venta...</p>
      </div>
    );
  }

  if (isDireccion) {
    const totalPptoClientes = reportData.reduce((sum: number, r: any) => sum + (r.pptoClientes || 0), 0);
    const totalPptoMonto = reportData.reduce((sum: number, r: any) => sum + (r.pptoMonto || 0), 0);
    const totalLogroCl = reportData.reduce((sum: number, r: any) => sum + (r.logroCl || 0), 0);
    const totalLogroMonto = reportData.reduce((sum: number, r: any) => sum + (r.logroMonto || 0), 0);

    const totalPorcentajeCl = totalPptoClientes > 0 ? Math.round((totalLogroCl / totalPptoClientes) * 100) : 0;
    const totalPorcentajeMonto = totalPptoMonto > 0 ? Math.round((totalLogroMonto / totalPptoMonto) * 100) : 0;

    const filteredReportData = reportData.filter((r: any) =>
      r.asesor.toLowerCase().includes(searchAsesor.toLowerCase())
    );

    return (
      <div className="space-y-6 pb-20">
        {/* --- FILTROS DE RANGO --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4 active:bg-slate-800 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-300">Periodo de Metas</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-slate-500 font-medium">
                {format(new Date(fechaDesde + 'T12:00:00'), 'dd/MM/yyyy')} - {format(new Date(fechaHasta + 'T12:00:00'), 'dd/MM/yyyy')}
              </span>
              {showFilters ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
            </div>
          </button>

          {showFilters && (
            <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top duration-200">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Desde</label>
                  <Input 
                    type="date" 
                    value={fechaDesde}
                    onChange={(e: any) => setFechaDesde(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs text-white h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Hasta</label>
                  <Input 
                    type="date" 
                    value={fechaHasta}
                    onChange={(e: any) => setFechaHasta(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs text-white h-10 rounded-xl"
                  />
                </div>
              </div>
              <Button 
                onClick={() => {
                  fetchReporteVentas();
                  setShowFilters(false);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl"
              >
                <Filter className="w-4 h-4 mr-2" />
                Actualizar Reporte
              </Button>
            </div>
          )}
        </div>

        {/* --- TARJETAS DE RESUMEN EJECUTIVO --- */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-emerald-600 to-teal-800 border-none text-white shadow-lg relative overflow-hidden rounded-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-8 -mt-8 pointer-events-none"></div>
            <CardContent className="p-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] uppercase font-bold opacity-80 tracking-wider">Logro Total Ventas ($)</p>
                <p className="text-3xl font-black mt-1">{formatCurrency(totalLogroMonto)}</p>
                <p className="text-xs opacity-90 mt-1">Presupuesto: {formatCurrency(totalPptoMonto)}</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 flex flex-col items-center justify-center min-w-16">
                <DollarSign className="h-6 w-6 text-white mb-0.5" />
                <span className="text-xs font-black">{totalPorcentajeMonto}%</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-slate-900 border border-slate-800 text-white shadow-md rounded-2xl overflow-hidden">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Piezas / Clientes</p>
                  <Award className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-lg font-black">{totalLogroCl} / {totalPptoClientes}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-indigo-400 font-extrabold">{totalPorcentajeCl}%</span>
                    <Progress value={totalPorcentajeCl} className="h-1 flex-1 bg-slate-850" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border border-slate-800 text-white shadow-md rounded-2xl">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Acciones</p>
                  <RefreshCw 
                    onClick={fetchReporteVentas} 
                    className={`h-4 w-4 text-emerald-400 cursor-pointer hover:rotate-45 transition-all ${loadingReport ? 'animate-spin' : ''}`} 
                  />
                </div>
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchReporteVentas} 
                    className="w-full text-[10px] font-bold h-7 border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300"
                  >
                    Actualizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* --- BUSCADOR --- */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Buscar asesor..."
            value={searchAsesor}
            onChange={(e) => setSearchAsesor(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-800 text-xs text-white rounded-xl placeholder:text-slate-500 h-10 w-full"
          />
        </div>

        {/* --- LISTADO DE ASESORES --- */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold text-slate-400 px-1 mb-2 tracking-wider flex items-center justify-between">
            <span>Rendimiento por Asesor ({filteredReportData.length})</span>
            {filteredReportData.length > 0 && <span className="text-[10px] text-emerald-400 lowercase font-mono">En Vivo</span>}
          </h3>

          {filteredReportData.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
              <User className="h-10 w-10 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No se encontraron asesores.</p>
            </div>
          ) : (
            filteredReportData.map((row: any, idx: number) => {
              const colorMonto = row.porcentajeMonto >= 100 ? 'bg-emerald-500' : row.porcentajeMonto >= 70 ? 'bg-indigo-500' : row.porcentajeMonto >= 40 ? 'bg-amber-500' : 'bg-rose-500';
              const colorClientes = row.porcentajeCl >= 100 ? 'bg-emerald-500' : row.porcentajeCl >= 70 ? 'bg-indigo-500' : row.porcentajeCl >= 40 ? 'bg-amber-500' : 'bg-rose-500';
              
              const textMonto = row.porcentajeMonto >= 100 ? 'text-emerald-400' : row.porcentajeMonto >= 70 ? 'text-indigo-400' : row.porcentajeMonto >= 40 ? 'text-amber-400' : 'text-rose-400';
              const textClientes = row.porcentajeCl >= 100 ? 'text-emerald-400' : row.porcentajeCl >= 70 ? 'text-indigo-400' : row.porcentajeCl >= 40 ? 'text-amber-400' : 'text-rose-400';

              const initials = row.asesor.split(' ').map((n: string) => n[0]).slice(0, 2).join('');

              return (
                <Card 
                  key={idx} 
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:bg-slate-850/80 transition-colors cursor-pointer"
                  onClick={() => setExpandedAsesor(expandedAsesor === row.asesor ? null : row.asesor)}
                >
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-indigo-400 font-extrabold text-sm uppercase">
                          {initials}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-200 text-sm">{row.asesor}</p>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase">{row.diasMes} días del periodo</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-right">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-850 border border-slate-700/80 rounded-full text-slate-300">
                          SM: {row.sm || '-'}
                        </span>
                        {expandedAsesor === row.asesor ? (
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-800/60">
                      <div className="space-y-1">
                        <div className="flex justify-between items-end text-xs font-semibold text-slate-300">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                            Ventas ($)
                          </span>
                          <span className="font-mono">
                            <span className={textMonto}>{formatCurrency(row.logroMonto)}</span> / {formatCurrency(row.pptoMonto)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${colorMonto} rounded-full`} style={{ width: `${Math.min(row.porcentajeMonto, 100)}%` }} />
                          </div>
                          <span className={`text-[10px] font-black w-8 text-right font-mono ${textMonto}`}>{row.porcentajeMonto}%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-end text-xs font-semibold text-slate-300">
                          <span className="flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-slate-400" />
                            Clientes / Piezas
                          </span>
                          <span className="font-mono">
                            <span className={textClientes}>{row.logroCl}</span> / {row.pptoClientes}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${colorClientes} rounded-full`} style={{ width: `${Math.min(row.porcentajeCl, 100)}%` }} />
                          </div>
                          <span className={`text-[10px] font-black w-8 text-right font-mono ${textClientes}`}>{row.porcentajeCl}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Detalle diario de ventas (se muestra al dar click) */}
                    {expandedAsesor === row.asesor && (
                      <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-2.5 animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                        <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider ml-1">Desglose de Ventas</p>
                        {row.ventasDetalle && row.ventasDetalle.length > 0 ? (
                          row.ventasDetalle.map((v: any, vidx: number) => (
                            <div key={vidx} className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 flex justify-between items-center text-xs">
                              <div className="space-y-0.5 pr-2">
                                <p className="font-bold text-slate-200 truncate max-w-[160px]">{v.cliente}</p>
                                <p className="text-[10px] text-slate-500">
                                  {format(new Date(v.fecha), 'dd/MM/yyyy')} • <span className="text-indigo-400/80 font-medium">{v.producto || 'Sin producto'}</span>
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-mono text-emerald-400 font-bold">+{formatCurrency(v.monto)}</p>
                                {v.piezas > 1 && <p className="text-[9px] text-slate-500 font-bold">{v.piezas} pzas</p>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 italic text-center py-2">No hay ventas registradas en este periodo.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  }

  const metaMonto = data?.presupuesto?.metaMonto || 0;
  const logradoMonto = data?.presupuesto?.logradoMonto || 0;
  const faltanMonto = metaMonto - logradoMonto;

  const metaPiezas = data?.presupuesto?.metaPiezas || 0;
  const logradoPiezas = data?.presupuesto?.logradoPiezas || 0;
  const faltanPiezas = metaPiezas - logradoPiezas;

  return (
    <div className="space-y-6 pb-20">
      {/* --- MI PRESUPUESTO Y AVANCE --- */}
      {data?.presupuesto && (
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg font-medium opacity-90 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Meta: {data.presupuesto.nombre || "Periodo Activo"}
              </CardTitle>
              <TrendingUp className="h-8 w-8 opacity-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase opacity-70 font-bold">Monto ($)</p>
                <p className="text-xl font-bold">{formatCurrency(data.presupuesto.logradoMonto)} / {formatCurrency(data.presupuesto.metaMonto)}</p>
                <Progress value={data.presupuesto.porcentajeMonto} className="h-1.5 bg-white/20" />
                <p className="text-[10px] text-right font-medium">{data.presupuesto.porcentajeMonto.toFixed(1)}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase opacity-70 font-bold">Piezas (Un.)</p>
                <p className="text-xl font-bold">{data.presupuesto.logradoPiezas} / {data.presupuesto.metaPiezas}</p>
                <Progress value={data.presupuesto.porcentajePiezas} className="h-1.5 bg-white/20" />
                <p className="text-[10px] text-right font-medium">{data.presupuesto.porcentajePiezas.toFixed(1)}%</p>
              </div>
            </div>

            {/* Faltantes para la Meta */}
            <div className="pt-3 border-t border-white/15 text-xs space-y-1.5 text-blue-100/90 font-medium">
              {faltanMonto > 0 ? (
                <p>• Te faltan <span className="font-bold text-white">{formatCurrency(faltanMonto)}</span> para alcanzar tu meta de monto.</p>
              ) : (
                <p className="text-emerald-300 font-bold">✓ ¡Meta de monto alcanzada!</p>
              )}
              {faltanPiezas > 0 ? (
                <p>• Te faltan <span className="font-bold text-white">{faltanPiezas} {faltanPiezas === 1 ? 'pieza' : 'piezas'}</span> para alcanzar tu meta de volumen.</p>
              ) : (
                <p className="text-emerald-300 font-bold">✓ ¡Meta de volumen alcanzada!</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- SIN PRESUPUESTO --- */}
      {!data?.presupuesto && (
        <Card className="bg-slate-900 border border-slate-800 text-white rounded-2xl">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-10 w-10 text-amber-500 mx-auto mb-3 opacity-80 animate-pulse" />
            <p className="text-sm font-bold text-slate-200">No tienes un presupuesto asignado este mes.</p>
            <p className="text-xs text-slate-400 mt-1">Comunícate con tu jefe de ventas para establecer tus metas.</p>
          </CardContent>
        </Card>
      )}

      {/* --- ACCIONES --- */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/mobile/ventas/solicitud" className="w-full">
          <Button className="w-full bg-slate-900 hover:bg-slate-800 h-12 rounded-xl shadow-lg flex items-center justify-center gap-2 border border-slate-700 text-xs font-bold text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Nueva Solicitud
          </Button>
        </Link>
        <RegistrarVentaModal onSuccess={fetchMetrics} />
      </div>

      {/* --- VENTAS DEL DÍA --- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
            <Calendar className="h-4 w-4 text-slate-500" />
            Cerradas Hoy
          </h2>
          <Badge variant="outline" className="rounded-full bg-slate-800 text-slate-300 border-slate-700">{data?.ventasHoy?.length || 0}</Badge>
        </div>

        <div className="space-y-3">
          {data?.ventasHoy?.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
              <Package className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Aún no has registrado ventas hoy. ¡A la carga!</p>
            </div>
          ) : (
            data.ventasHoy.map((venta: any) => (
              <Card key={venta.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:bg-slate-850/80 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-blue-400">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-200 text-sm">{venta.producto}</p>
                        <p className="text-xs text-slate-500 font-mono">{venta.contrato}</p>
                      </div>
                    </div>
                    <p className="font-bold text-emerald-400 text-base">{formatCurrency(venta.monto)}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-medium text-slate-300 truncate">{venta.cliente}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-medium text-slate-300">{venta.equipo}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* --- AVANCE DIARIO DEL MES --- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            Avance Diario del Mes
          </h2>
          <Badge variant="outline" className="rounded-full bg-slate-800 text-slate-300 border-slate-700">{data?.ventasMes?.length || 0}</Badge>
        </div>

        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
          {!data?.ventasMes || data.ventasMes.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
              <Package className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No tienes ventas registradas este mes.</p>
            </div>
          ) : (
            data.ventasMes.map((v: any, idx: number) => (
              <div key={v.id || idx} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex justify-between items-center text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-200 truncate max-w-[170px]">{v.cliente}</p>
                  <p className="text-[10px] text-slate-500">
                    {format(new Date(v.fecha), 'dd/MM/yyyy')} • <span className="text-indigo-400 font-medium">{v.producto || 'Venta Directa'}</span>
                  </p>
                  {v.contrato && <p className="text-[9px] font-mono text-slate-600">Contrato: {v.contrato}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-emerald-400 font-bold">+{formatCurrency(v.monto)}</p>
                  {v.piezas > 0 && <p className="text-[9px] text-slate-500 font-bold">{v.piezas} {v.piezas === 1 ? 'pza' : 'pzas'}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- MIS SOLICITUDES DE CRÉDITO --- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
            <FileText className="h-4 w-4 text-sky-500" />
            Solicitudes de Crédito
          </h2>
          <Badge variant="outline" className="rounded-full bg-slate-800 text-slate-300 border-slate-700">{solicitudes.length}</Badge>
        </div>

        <div className="space-y-3">
          {solicitudes.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
              <FileText className="h-8 w-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No tienes solicitudes pendientes.</p>
            </div>
          ) : (
            solicitudes.map((sol: any) => (
              <Card key={sol.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-slate-200 text-sm">{sol.nombreCompleto}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">{sol.telefono}</p>
                        {sol.scoreBuro && (
                          <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 border-emerald-800 text-emerald-400 bg-emerald-950/40">
                            Score: {sol.scoreBuro}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className={
                      sol.status === 'APROBADA' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800' :
                      sol.status === 'RECHAZADA' ? 'bg-rose-950/40 text-rose-400 border border-rose-800' :
                      'bg-amber-950/40 text-amber-400 border border-amber-800'
                    }>
                      {sol.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
                    <Tag className="h-3.5 w-3.5" />
                    <span>{sol.productoInteres || "Producto no especificado"}</span>
                  </div>

                  <Button 
                    className="w-full h-10 bg-slate-950 hover:bg-slate-900 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-800"
                    onClick={() => {
                      setSelectedForDocs({
                        nombreCompleto: sol.nombreCompleto,
                        curp: sol.curp || "",
                        codigoCliente: sol.contpaqiCodigo || "",
                        numContrato: sol.id // Usamos el ID de solicitud como folio para la bóveda
                      });
                      setShowDigitalizador(true);
                    }}
                  >
                    <ImageIcon className="h-4 w-4" />
                    DIGITALIZAR DOCUMENTOS
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* MODALES */}
      {selectedForDocs && (
        <DigitalizadorModal 
          open={showDigitalizador}
          onOpenChange={setShowDigitalizador}
          cliente={selectedForDocs}
          isAdmin={false}
        />
      )}
    </div>
  );
}
