"use client";

import { useEffect, useState } from "react";
import { usePlatform } from "@/hooks/usePlatform";
import { Loader2, DollarSign, MapPin, Printer } from "lucide-react";
import { isPlatform } from "@/hooks/usePlatform";

export default function MobileHome() {
    const [loading, setLoading] = useState(true);
    const { isNative } = usePlatform();
    const [stats, setStats] = useState({
        cobradoHoy: 0,
        clientesPendientes: 12,
        rutaNombre: "Ruta Norte - Zona 1"
    });

    useEffect(() => {
        // Simular carga de datos iniciales
        setTimeout(() => setLoading(false), 1000);
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p>Cargando ruta...</p>
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
                        <span className="text-sm">{stats.rutaNombre}</span>
                    </div>
                    <button className="bg-sky-600 hover:bg-sky-500 transition-colors text-white text-xs font-bold px-3 py-1.5 rounded-full">
                        Iniciar Ruta
                    </button>
                </div>
            </div>

            {/* ACCIONES RÁPIDAS */}
            <div className="grid grid-cols-2 gap-4">
                <ActionButton
                    icon={<DollarSign className="w-6 h-6 text-white" />}
                    label="Cobro Rápido"
                    color="bg-emerald-600"
                />
                <ActionButton
                    icon={<Printer className="w-6 h-6 text-white" />}
                    label="Corte de Caja"
                    color="bg-slate-700"
                />
            </div>

            {/* LISTA DE PRÓXIMOS CLIENTES (MOCK) */}
            <div className="space-y-3">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider px-2">Próximos Clientes</h3>

                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between active:scale-95 transition-transform">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                                {String.fromCharCode(64 + i)}
                            </div>
                            <div>
                                <p className="font-bold text-slate-200">Cliente Ejemplo {i}</p>
                                <p className="text-xs text-slate-500">Calle 5 de Mayo #12{i}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-mono text-emerald-500 font-bold">$250.00</p>
                            <p className="text-[10px] text-slate-600">Semanal</p>
                        </div>
                    </div>
                ))}
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
