"use client";

import { useEffect, useState } from "react";
import { usePlatform } from "@/hooks/usePlatform";
import { Loader2, DollarSign, Printer, Download, CreditCard, ChevronUp, ChevronDown, CheckCircle2 } from "lucide-react";
import { useBluetoothPrinter } from "@/hooks/use-bluetooth-printer";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function MobileCaja() {
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [stats, setStats] = useState({
        cobradoHoy: 0,
        pagosRegistrados: 0,
        efectivo: 0,
        transferencia: 0,
    });
    const [pagos, setPagos] = useState<any[]>([]);
    const { isConnected, printTicket, printCollectionReport, connectToPrinter } = useBluetoothPrinter();
    const [printing, setPrinting] = useState<string | null>(null);
    const [selectedPago, setSelectedPago] = useState<any | null>(null);

    useEffect(() => {
        const fetchCajaData = async () => {
            try {
                const response = await fetch('/api/mobile/caja');
                if (response.ok) {
                    const data = await response.json();
                    setStats(data.stats);
                    setPagos(data.pagos);
                }
            } catch (error) {
                console.error("Error fetching caja data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCajaData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p>Calculando arqueo de caja...</p>
            </div>
        );
    }

    const toggleExpand = () => setIsExpanded(!isExpanded);

    const handlePrintReport = async () => {
        if (!isConnected) {
            toast.error("Impresora no conectada", {
                action: {
                    label: "Conectar",
                    onClick: () => connectToPrinter()
                }
            });
            return;
        }

        setPrinting("report");
        try {
            await printCollectionReport(stats, pagos);
        } catch (error) {
            console.error("Error al imprimir reporte:", error);
        } finally {
            setPrinting(null);
        }
    };

    const fetchPagoDetails = async (pagoId: string) => {
        try {
            const response = await fetch(`/api/pagos/${pagoId}`);
            if (!response.ok) throw new Error("No se pudo obtener el detalle");
            const data = await response.json();
            setSelectedPago(data);
        } catch (error) {
            toast.error("Error al cargar detalles");
        }
    };

    const handleReprintTicket = async (pagoId: string) => {
        if (!isConnected) {
            toast.error("Conecta la impresora primero");
            return;
        }

        setPrinting(pagoId);
        try {
            const response = await fetch(`/api/pagos/${pagoId}`);
            if (!response.ok) throw new Error("No se pudo obtener el detalle del pago");
            
            const data = await response.json();
            
            // Mapear a formato TicketData
            const ticketData = {
                numeroRecibo: data.numeroRecibo || "",
                cliente: {
                    nombreCompleto: data.cliente.nombreCompleto,
                    telefono: data.cliente.telefono,
                    direccion: data.cliente.direccionCompleta,
                    diaPago: data.cliente.diaPago
                },
                cobrador: {
                    nombre: data.cobrador?.name || "Cobrador",
                    id: data.cobrador?.id || ""
                },
                pago: {
                    monto: data.monto,
                    interesMoratorio: data.interesMoratorio,
                    gastosCobranza: data.gastosCobranza,
                    tipoPago: data.tipoPago,
                    metodoPago: data.metodoPago,
                    concepto: data.concepto,
                    fechaPago: data.fechaPago
                },
                saldos: {
                    anterior: data.saldoAnterior,
                    nuevo: data.saldoNuevo,
                },
                empresa: {
                    nombre: 'MUEBLERIA LA ECONOMICA',
                    direccion: 'Dirección de la empresa',
                    telefono: 'Tel: (555) 123-4567'
                }
            };

            await printTicket(ticketData as any);
        } catch (error) {
            console.error("Error reimprimiendo:", error);
            toast.error("Error al reimprimir ticket");
        } finally {
            setPrinting(null);
        }
    };

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
                <button 
                    onClick={handlePrintReport}
                    disabled={printing === "report"}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 p-4 rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors active:scale-95 disabled:opacity-50"
                >
                    <Printer className={`w-6 h-6 text-sky-400 ${printing === "report" ? "animate-pulse" : ""}`} />
                    <span className="text-xs font-bold">Imprimir Reporte</span>
                </button>
                <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 p-4 rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors active:scale-95">
                    <CreditCard className="w-6 h-6 text-amber-400" />
                    <span className="text-xs font-bold">Arqueo de Caja</span>
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

                                <div 
                                    className="flex-1 bg-slate-900/50 border border-slate-800/50 rounded-xl p-3 hover:bg-slate-800 transition-colors active:scale-[0.99]"
                                    onClick={() => fetchPagoDetails(pago.id)}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-slate-200 text-sm">{pago.cliente}</p>
                                        <p className="font-mono text-emerald-400 font-bold text-sm">+{formatCurrency(pago.monto)}</p>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                        <div className="flex items-center space-x-2">
                                            <span>{pago.metodo}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                            <span>{pago.hora}</span>
                                        </div>
                                        {/* Botón ticket pequeño */}
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReprintTicket(pago.id);
                                            }}
                                            disabled={!!printing}
                                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors active:scale-90"
                                        >
                                            <Printer className={`w-4 h-4 ${printing === pago.id ? "animate-spin text-emerald-400" : ""}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MODAL DE DETALLE DE PAGO */}
            {selectedPago && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-slate-100 font-bold">Detalle del Pago</h3>
                                <button onClick={() => setSelectedPago(null)} className="text-slate-500 hover:text-slate-300">
                                    <ChevronDown className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Cliente</p>
                                    <p className="text-slate-200 font-medium">{selectedPago.cliente.nombreCompleto}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase">Monto Abono</p>
                                        <p className="text-slate-200 font-mono">{formatCurrency(selectedPago.monto)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase">Método</p>
                                        <p className="text-slate-200">{selectedPago.metodoPago}</p>
                                    </div>
                                </div>

                                {(selectedPago.interesMoratorio > 0 || selectedPago.gastosCobranza > 0) && (
                                    <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
                                        {selectedPago.interesMoratorio > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">Int. Moratorio:</span>
                                                <span className="text-amber-400">{formatCurrency(selectedPago.interesMoratorio)}</span>
                                            </div>
                                        )}
                                        {selectedPago.gastosCobranza > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">Gastos Cobranza:</span>
                                                <span className="text-sky-400">{formatCurrency(selectedPago.gastosCobranza)}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-slate-700 pt-1 flex justify-between text-sm font-bold">
                                            <span className="text-slate-300">Total Recibido:</span>
                                            <span className="text-emerald-400">
                                                {formatCurrency(selectedPago.monto + (selectedPago.interesMoratorio || 0) + (selectedPago.gastosCobranza || 0))}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase">Saldo Anterior</p>
                                        <p className="text-slate-400 font-mono text-xs">{formatCurrency(selectedPago.saldoAnterior)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase">Saldo Nuevo</p>
                                        <p className="text-emerald-400 font-bold font-mono">{formatCurrency(selectedPago.saldoNuevo)}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Fecha y Hora</p>
                                    <p className="text-slate-400 text-xs">
                                        {new Date(selectedPago.fechaPago).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-2">
                                <button 
                                    onClick={() => handleReprintTicket(selectedPago.id)}
                                    className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>Reimprimir</span>
                                </button>
                                <button 
                                    onClick={() => setSelectedPago(null)}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
