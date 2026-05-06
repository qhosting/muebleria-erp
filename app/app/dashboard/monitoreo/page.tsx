"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Map as MapIcon, 
    RefreshCcw, 
    Filter, 
    Calendar,
    Users,
    Activity,
    DollarSign,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

// Cargar el mapa dinámicamente para evitar errores de SSR
const MonitoreoMap = dynamic(() => import("@/components/dashboard/monitoreo-map"), {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-2xl bg-slate-100" />
});

export default function MonitoreoPage() {
    const [pagos, setPagos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalHoy: 0,
        montoHoy: 0,
        cobradoresActivos: 0
    });

    useEffect(() => {
        fetchData();
        // Auto-refresh cada 2 minutos
        const interval = setInterval(fetchData, 120000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/pagos?fechaDesde=${today}`);
            const data = await response.json();
            
            if (response.ok) {
                setPagos(data.pagos || []);
                
                // Calcular estadísticas rápidas
                const total = data.pagos?.length || 0;
                const monto = data.pagos?.reduce((sum: number, p: any) => sum + parseFloat(p.monto), 0) || 0;
                const uniqueCobradores = new Set(data.pagos?.map((p: any) => p.cobradorId)).size;
                
                setStats({
                    totalHoy: total,
                    montoHoy: monto,
                    cobradoresActivos: uniqueCobradores
                });
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Error al actualizar monitoreo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col gap-6 h-[calc(100vh-120px)]">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Activity className="text-emerald-500 w-6 h-6" />
                            Monitoreo en Tiempo Real
                        </h1>
                        <p className="text-slate-500 text-sm">Seguimiento geográfico de cobros y visitas del día.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 animate-pulse">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            VIVO
                        </Badge>
                        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
                    
                    {/* Sidebar Stats */}
                    <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                        <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-lg">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between opacity-80 mb-2">
                                    <span className="text-xs font-bold uppercase tracking-widest">Cobrado Hoy</span>
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <h2 className="text-3xl font-black">{formatCurrency(stats.montoHoy)}</h2>
                                <p className="text-xs mt-2 opacity-70 font-medium">Recaudación total reportada.</p>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-slate-400 mb-1"><MapIcon className="w-4 h-4" /></div>
                                    <p className="text-2xl font-bold">{stats.totalHoy}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Eventos</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-slate-400 mb-1"><Users className="w-4 h-4" /></div>
                                    <p className="text-2xl font-bold">{stats.cobradoresActivos}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Cobradores</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="flex-1">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    Últimos Reportes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                    {pagos.slice(0, 10).map((pago: any) => (
                                        <div key={pago.id} className="p-3 hover:bg-slate-50 transition-colors cursor-pointer group">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{pago.cliente?.nombreCompleto}</p>
                                                <span className="text-[10px] font-mono text-slate-400">{new Date(pago.fechaPago).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-slate-500 font-medium">{pago.cobrador?.name}</span>
                                                <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-none font-bold">
                                                    {formatCurrency(pago.monto)}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {pagos.length === 0 && !loading && (
                                        <div className="p-8 text-center text-slate-400 text-xs italic">
                                            No hay actividad registrada hoy.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Map Area */}
                    <div className="lg:col-span-3 h-full min-h-[400px]">
                        <Card className="h-full border-slate-200 shadow-xl overflow-hidden relative">
                            <MonitoreoMap pagos={pagos} />
                            
                            {/* Leyenda del Mapa */}
                            <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 space-y-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Simbología</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                    <span className="text-[10px] font-bold text-slate-700">Pago Regular</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                    <span className="text-[10px] font-bold text-slate-700">Moratorio / Otros</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
