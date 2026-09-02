"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Map as MapIcon, 
    RefreshCcw, 
    Calendar,
    Users,
    Activity,
    DollarSign,
    Clock,
    ChevronLeft,
    ChevronRight,
    CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

// Cargar el mapa dinámicamente para evitar errores de SSR
const MonitoreoMap = dynamic(() => import("@/components/dashboard/monitoreo-map"), {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-2xl bg-slate-100" />
});

export default function MonitoreoPage() {
    const getTodayCdmx = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());

    const [selectedDate, setSelectedDate] = useState<string>(getTodayCdmx);
    const [selectedCobrador, setSelectedCobrador] = useState<string>("all");
    const [cobradores, setCobradores] = useState<any[]>([]);
    const [pagos, setPagos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        monto: 0,
        cobradoresActivos: 0
    });

    const isToday = selectedDate === getTodayCdmx();

    const fetchCobradores = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                setCobradores(data.filter((u: any) => u.role === "cobrador"));
            }
        } catch (e) {
            console.error("Error fetching cobradores:", e);
        }
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const p = new URLSearchParams({
                fechaDesde: selectedDate,
                fechaHasta: selectedDate,
                limit: "1000"
            });
            if (selectedCobrador !== "all") {
                p.append("cobradorId", selectedCobrador);
            }

            const response = await fetch(`/api/pagos?${p.toString()}`);
            const data = await response.json();
            
            if (response.ok) {
                const list = data.pagos || [];
                setPagos(list);
                
                // Calcular estadísticas
                const total = list.length;
                const monto = list.reduce((sum: number, p: any) => sum + (parseFloat(p.monto) || 0), 0);
                const uniqueCobradores = new Set(list.map((p: any) => p.cobradorId)).size;
                
                setStats({
                    total,
                    monto,
                    cobradoresActivos: uniqueCobradores
                });
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Error al actualizar monitoreo");
        } finally {
            setLoading(false);
        }
    }, [selectedDate, selectedCobrador]);

    useEffect(() => {
        fetchCobradores();
    }, []);

    useEffect(() => {
        fetchData();
        // Auto-refresh cada 2 minutos únicamente si estamos viendo el día de hoy
        if (isToday) {
            const interval = setInterval(fetchData, 120000);
            return () => clearInterval(interval);
        }
    }, [fetchData, isToday]);

    const changeDateByDays = (days: number) => {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        d.setDate(d.getDate() + days);
        const yStr = d.getFullYear();
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        const dStr = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${yStr}-${mStr}-${dStr}`);
    };

    const setQuickDate = (offsetDays: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        const [year, month, day] = [d.getFullYear(), d.getMonth() + 1, d.getDate()];
        const yStr = year;
        const mStr = String(month).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        setSelectedDate(`${yStr}-${mStr}-${dStr}`);
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-5 h-[calc(100vh-120px)]">
                {/* Header Section con Filtros de Fecha */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                                <Activity className="text-emerald-500 w-6 h-6" />
                                Monitoreo {isToday ? "en Tiempo Real" : "Geográfico"}
                            </h1>
                            {isToday ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 animate-pulse">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                    EN VIVO
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 font-semibold">
                                    <Calendar className="w-3 h-3 text-blue-500" />
                                    HISTÓRICO
                                </Badge>
                            )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5">
                            {isToday 
                                ? "Seguimiento geográfico de cobros y visitas del día de hoy."
                                : `Visualizando registros del ${formatDate(selectedDate)}.`}
                        </p>
                    </div>

                    {/* Controles de Fecha y Filtros */}
                    <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                        {/* Selector de Gestor */}
                        {cobradores.length > 0 && (
                            <div className="w-full sm:w-44">
                                <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                                    <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                                        <SelectValue placeholder="Gestor..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los gestores</SelectItem>
                                        {cobradores.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Botones rápidos */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <Button 
                                type="button"
                                variant={isToday ? "default" : "ghost"} 
                                size="sm" 
                                className="h-8 px-2.5 text-xs font-semibold"
                                onClick={() => setQuickDate(0)}
                            >
                                Hoy
                            </Button>
                            <Button 
                                type="button"
                                variant={selectedDate === new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date(Date.now() - 86400000)) ? "default" : "ghost"} 
                                size="sm" 
                                className="h-8 px-2.5 text-xs font-semibold"
                                onClick={() => setQuickDate(-1)}
                            >
                                Ayer
                            </Button>
                        </div>

                        {/* Navegación Día a Día */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            <Button 
                                type="button"
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-slate-600 hover:bg-white"
                                onClick={() => changeDateByDays(-1)}
                                title="Día anterior"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            
                            <div className="flex items-center gap-1.5 px-1">
                                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                                <Input 
                                    type="date" 
                                    value={selectedDate} 
                                    onChange={(e) => setSelectedDate(e.target.value)} 
                                    className="h-7 w-32 border-none bg-transparent shadow-none text-xs font-semibold p-0 focus-visible:ring-0"
                                />
                            </div>

                            <Button 
                                type="button"
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-slate-600 hover:bg-white"
                                onClick={() => changeDateByDays(1)}
                                title="Día siguiente"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Botón Actualizar */}
                        <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading} className="gap-1.5 h-9 text-xs">
                            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
                    
                    {/* Sidebar Stats */}
                    <div className="lg:col-span-1 space-y-5 overflow-y-auto pr-2 custom-scrollbar">
                        <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-md">
                            <CardContent className="pt-5 pb-5">
                                <div className="flex items-center justify-between opacity-80 mb-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider">
                                        {isToday ? "Cobrado Hoy" : `Cobrado (${formatDate(selectedDate)})`}
                                    </span>
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <h2 className="text-3xl font-black">{formatCurrency(stats.monto)}</h2>
                                <p className="text-[11px] mt-1.5 opacity-75 font-medium">
                                    {isToday ? "Recaudación total reportada en el día." : `Total recaudado el ${formatDate(selectedDate)}.`}
                                </p>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-3">
                            <Card className="border-slate-200">
                                <CardContent className="p-3.5">
                                    <div className="text-slate-400 mb-1"><MapIcon className="w-4 h-4" /></div>
                                    <p className="text-2xl font-black text-slate-900">{stats.total}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cobros / Eventos</p>
                                </CardContent>
                            </Card>
                            <Card className="border-slate-200">
                                <CardContent className="p-3.5">
                                    <div className="text-slate-400 mb-1"><Users className="w-4 h-4" /></div>
                                    <p className="text-2xl font-black text-slate-900">{stats.cobradoresActivos}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cobradores</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="flex-1 border-slate-200">
                            <CardHeader className="py-3 px-4 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-700 uppercase tracking-wider">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        Reportes del Día ({pagos.length})
                                    </CardTitle>
                                    <span className="text-[10px] font-medium text-slate-400">
                                        {formatDate(selectedDate)}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                                    {pagos.slice(0, 30).map((pago: any) => (
                                        <div key={pago.id} className="p-2.5 hover:bg-slate-50 transition-colors cursor-pointer group">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate max-w-[150px]">
                                                    {pago.cliente?.nombreCompleto || "Cliente"}
                                                </p>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    {pago.fechaPago && !isNaN(new Date(pago.fechaPago).getTime()) 
                                                        ? new Date(pago.fechaPago).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'}) 
                                                        : '--:--'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                                                    {pago.cobrador?.name || "Sistema"}
                                                </span>
                                                <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-none font-bold py-0">
                                                    {formatCurrency(pago.monto)}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {pagos.length === 0 && !loading && (
                                        <div className="p-8 text-center text-slate-400 text-xs italic">
                                            No hay actividad registrada el {formatDate(selectedDate)}.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Map Area */}
                    <div className="lg:col-span-3 h-full min-h-[400px]">
                        <Card className="h-full border-slate-200 shadow-md overflow-hidden relative">
                            <MonitoreoMap pagos={pagos} />
                            
                            {/* Leyenda del Mapa */}
                            <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 space-y-1.5">
                                <div className="flex items-center justify-between gap-4">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Simbología</p>
                                    <span className="text-[9px] font-semibold text-slate-400 font-mono">
                                        {pagos.filter(p => p.latitud && p.longitud).length} ubicaciones
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                                    <span className="text-[10px] font-semibold text-slate-700">Pago Regular</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full"></div>
                                    <span className="text-[10px] font-semibold text-slate-700">Moratorio / Otros</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}

