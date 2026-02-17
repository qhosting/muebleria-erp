"use client";

import { useEffect, useState } from "react";
import { usePlatform } from "@/hooks/usePlatform";
import { Loader2, DollarSign, Printer, Download, CreditCard, ChevronUp, ChevronDown } from "lucide-react";

export default function MobileCaja() {
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Mock Data
    const [stats, setStats] = useState({
        cobradoHoy: 2500,
        pagosRegistrados: 12,
        efectivo: 2000,
        transferencia: 500,
    });

    const [pagos, setPagos] = useState([
        { id: 1, cliente: "Juan Pérez", monto: 200, hora: "10:30 AM", metodo: "Efectivo" },
        { id: 2, cliente: "María González", monto: 500, hora: "11:15 AM", metodo: "Transferencia" },
        { id: 3, cliente: "Tienda Don Pepe", monto: 1800, hora: "12:45 PM", metodo: "Efectivo" },
    ]);

    const toggleExpand = () => setIsExpanded(!isExpanded);

    return (
        <div className="space-y-6">
            {/* HEADER CAJA */}
            <h1 className="text-2xl font-bold text-slate-100 mb-4 px-2">Caja Diaria</h1>

            {/* RESUMEN PRINCIPAL */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="relative z-10">
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Total Cobrado Hoy</p>
                    <p className="text-4xl font-bold text-emerald-400 tracking-tighter">${stats.cobradoHoy.toLocaleString()}</p>

                    <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-700/50 pt-4">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase">Efectivo</p>
                            <p className="text-lg font-mono text-slate-200">${stats.efectivo.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase">Transferencia</p>
                            <p className="text-lg font-mono text-slate-200">${stats.transferencia.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACCIONES DE CAJA */}
            <div className="grid grid-cols-2 gap-3">
                <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 p-4 rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors active:scale-95">
                    <Printer className="w-6 h-6 text-sky-400" />
                    <span className="text-xs font-bold">Imprimir Reporte</span>
                </button>
                <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 p-4 rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors active:scale-95">
                    <CreditCard className="w-6 h-6 text-amber-400" />
                    <span className="text-xs font-bold">Cierrre Parcial</span>
                </button>
            </div>

            {/* LISTA DE PAGOS DEL DÍA */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Últimos Movimientos</h2>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-md">{pagos.length} Pagos</span>
                </div>

                <div className="relative">
                    {/* Línea de tiempo vertical */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-800 pointer-events-none"></div>

                    <div className="space-y-6 pl-0">
                        {pagos.map((pago) => (
                            <div key={pago.id} className="relative flex items-start pl-10 group">
                                <div className="absolute left-[11px] top-1 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-900 group-hover:bg-emerald-500 transition-colors z-10"></div>

                                <div className="flex-1 bg-slate-900/50 border border-slate-800/50 rounded-xl p-3 hover:bg-slate-800 transition-colors active:scale-[0.99]">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-slate-200 text-sm">{pago.cliente}</p>
                                        <p className="font-mono text-emerald-400 font-bold text-sm">+${pago.monto}</p>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                        <div className="flex items-center space-x-2">
                                            <span>{pago.metodo}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                            <span>{pago.hora}</span>
                                        </div>
                                        {/* Botón ticket pequeño */}
                                        <button className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                                            <Printer className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* BOTÓN CIERRE DE DÍA */}
            <div className="sticky bottom-4 mx-4">
                <button className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-rose-900/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2">
                    <Download className="w-5 h-5" />
                    <span>Cerrar Caja del Día</span>
                </button>
            </div>
        </div>
    );
}
