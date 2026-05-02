"use client";

import { useEffect, useState } from "react";
import { usePlatform } from "@/hooks/usePlatform";
import { Loader2, DollarSign, MapPin, Printer, TrendingUp } from "lucide-react";
import Link from "next/link";
import { isPlatform } from "@/hooks/usePlatform";

export default function MobileHome() {
    const [loading, setLoading] = useState(true);
    const { isNative } = usePlatform();
    const [stats, setStats] = useState({
        cobradoHoy: 0,
        clientesPendientes: 0,
        rutaNombre: "Cargando ruta...",
        proximosClientes: []
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await fetch('/api/mobile/dashboard');
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
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

    return (
        <div className="space-y-6">
            {/* TARJETA RESUMEN DEL DÍA */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
                <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">Resumen del Día</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-3xl font-bold text-emerald-400">${stats.cobradoHoy}</p>
                        <p className="text-xs text-slate-500">Cobrado Hoy</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-3xl font-bold text-amber-400">{stats.clientesPendientes}</p>
                        <p className="text-xs text-slate-500">Clientes Pendientes</p>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-sky-400" />
                        <span className="text-sm">{stats.rutaNombre || "Ruta General"}</span>
                    </div>
                    <Link href="/mobile/mapa-ruta">
                        <button className="bg-sky-600 hover:bg-sky-500 transition-colors text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg active:scale-95 transition-transform">
                            Iniciar Ruta
                        </button>
                    </Link>
                </div>
            </div>

            {/* ACCIONES RÁPIDAS */}
            <div className="grid grid-cols-2 gap-4">
                <Link href="/mobile/clientes" className="w-full">
                    <ActionButton
                        icon={<DollarSign className="w-6 h-6 text-white" />}
                        label="Cobranza"
                        color="bg-emerald-600"
                    />
                </Link>
                <Link href="/mobile/ventas" className="w-full">
                    <ActionButton
                        icon={<TrendingUp className="h-6 w-6 text-white" />}
                        label="Ventas"
                        color="bg-blue-600"
                    />
                </Link>
                <ActionButton
                    icon={<Printer className="w-6 h-6 text-white" />}
                    label="Corte de Caja"
                    color="bg-slate-700"
                />
            </div>

            {/* LISTA DE PRÓXIMOS CLIENTES (REAL DATA) */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Próximos Clientes</h3>
                    <Link href="/mobile/clientes" className="text-xs text-sky-400 font-medium">Ver todos</Link>
                </div>

                {stats.proximosClientes.length > 0 ? (
                    (stats.proximosClientes as any[]).map((cliente) => (
                        <div key={cliente.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between active:scale-95 transition-transform">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-500">
                                    {cliente.nombre.charAt(0)}
                                </div>
                                <div className="max-w-[180px]">
                                    <p className="font-bold text-slate-200 truncate">{cliente.nombre}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{cliente.direccion}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-mono text-emerald-500 font-bold">${cliente.saldo}</p>
                                <p className="text-[10px] text-slate-600 uppercase">{cliente.periodicidad}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-slate-900/50 border border-dashed border-slate-800 p-8 rounded-xl text-center">
                        <p className="text-slate-500 text-sm italic">No hay clientes pendientes en tu ruta</p>
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
