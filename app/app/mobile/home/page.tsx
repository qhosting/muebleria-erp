"use client";

import { useEffect, useState } from "react";
import { Loader2, DollarSign, MapPin, Printer, TrendingUp } from "lucide-react";
import Link from "next/link";
import { isPlatform } from "@/hooks/usePlatform";
import { db } from "@/lib/offline-db";

export default function MobileHome() {
    const [loading, setLoading] = useState(true);
    const { isNative } = usePlatform();
    const [data, setData] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const isActuallyOffline = !navigator.onLine;
            setIsOffline(isActuallyOffline);

            try {
                if (isActuallyOffline) {
                    console.log("Dashboard en modo offline...");
                    await loadOfflineDashboard();
                    return;
                }

                const response = await fetch('/api/mobile/dashboard');
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                } else {
                    await loadOfflineDashboard();
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                await loadOfflineDashboard();
            } finally {
                setLoading(false);
            }
        };

        const loadOfflineDashboard = async () => {
            try {
                // 1. Calcular cobrado hoy desde base de datos local
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                
                const pagosHoy = await db.pagos.where('fechaPago').aboveOrEqual(hoy.toISOString()).toArray();
                const totalCobrado = pagosHoy.reduce((acc, p) => acc + Number(p.monto), 0);
                const cuentasCobradas = pagosHoy.length;

                // 2. Clientes pendientes (Simplificado para offline)
                const clientesActivos = await db.clientes.where('statusCuenta').equals('activo').toArray();
                const clientesPendientes = clientesActivos.length; // En offline asumimos activos como pendientes si no hay sync complejo

                // 3. Próximos clientes (Top 10 por saldo vencido)
                const proximos = await db.clientes
                    .where('statusCuenta').equals('activo')
                    .reverse()
                    .sortBy('saldoVencido');

                setData({
                    stats: {
                        totalCobrado,
                        cuentasCobradas,
                        clientesPendientes,
                        efectividad: clientesActivos.length > 0 ? Math.round((cuentasCobradas / (cuentasCobradas + clientesPendientes)) * 100) : 100
                    },
                    proximosClientes: proximos.slice(0, 10).map(c => ({
                        id: c.id,
                        nombre: c.nombreCompleto,
                        direccion: c.direccion,
                        saldo: Number(c.saldoPendiente || 0),
                        vencido: Number(c.saldoVencido || 0)
                    }))
                });
            } catch (err) {
                console.error("Error loading offline dashboard:", err);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p className="animate-pulse">Sincronizando datos...</p>
            </div>
        );
    }

    const stats = data?.stats || { totalCobrado: 0, clientesPendientes: 0, cuentasCobradas: 0, efectividad: 0 };
    const proximosClientes = data?.proximosClientes || [];

    return (
        <div className="space-y-6">
            {/* TARJETA RESUMEN DEL DÍA */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
                <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">Resumen del Día</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-3xl font-bold text-emerald-400">${stats.totalCobrado}</p>
                        <p className="text-xs text-slate-500">Cobrado Hoy</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-3xl font-bold text-amber-400">{stats.clientesPendientes}</p>
                        <p className="text-xs text-slate-500">Clientes Pendientes</p>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-slate-300">
                        <TrendingUp className="w-4 h-4 text-sky-400" />
                        <span className="text-sm">Efectividad: {stats.efectividad}%</span>
                    </div>
                    <Link href="/mobile/mapa-ruta" className="bg-sky-600 hover:bg-sky-500 transition-colors text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg active:scale-95 transition-transform inline-block text-center">
                        Ver Ruta
                    </Link>
                </div>
            </div>

            {/* LISTA DE PRÓXIMOS CLIENTES (REAL DATA) */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Prioridad de Visita</h3>
                    <Link href="/mobile/clientes" className="text-xs text-sky-400 font-medium">Ver todos</Link>
                </div>

                {proximosClientes.length > 0 ? (
                    proximosClientes.map((cliente: any) => (
                        <Link key={cliente.id} href={`/mobile/clientes?search=${encodeURIComponent(cliente.nombre)}`} className="block">
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between active:scale-95 transition-transform">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-500">
                                        {cliente.nombre?.charAt(0) || "C"}
                                    </div>
                                    <div className="max-w-[180px]">
                                        <p className="font-bold text-slate-200 truncate">{cliente.nombre}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{cliente.direccion}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-emerald-500 font-bold">${cliente.saldo}</p>
                                    <p className="text-[10px] text-amber-500 uppercase font-bold">Vencido: ${cliente.vencido}</p>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="bg-slate-900/50 border border-dashed border-slate-800 p-8 rounded-xl text-center">
                        <p className="text-slate-500 text-sm italic">No tienes cobros programados para hoy</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionButton({ icon, label, color }: any) {
    return (
        <button className={`${color} p-4 rounded-xl flex flex-col items-center justify-center space-y-2 active:opacity-80 transition-opacity shadow-lg`}>
            <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm">
                {icon}
            </div>
            <span className="font-bold text-sm">{label}</span>
        </button>
    );
}
