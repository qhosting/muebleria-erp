"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, Link2, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ConciliadorPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [movimientos, setMovimientos] = useState<any[]>([]);
    const [sugerencias, setSugerencias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Selecciones manuales
    const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
    const [selectedMovimiento, setSelectedMovimiento] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/tesoreria/conciliador");
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets || []);
                setMovimientos(data.movimientos || []);
                setSugerencias(data.sugerencias || []);
            }
        } catch (error) {
            console.error("Error al cargar datos", error);
        } finally {
            setLoading(false);
        }
    };

    const handeMatchManual = async () => {
        if (!selectedTicket || !selectedMovimiento) {
            toast.error("Seleccione un Ticket y un Movimiento Bancario", { position: "top-center" });
            return;
        }

        try {
            const res = await fetch("/api/tesoreria/conciliador", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticketId: selectedTicket, movimientoId: selectedMovimiento }),
            });

            if (res.ok) {
                toast.success("Enlace realizado exitosamente");
                // Refrescar paneles
                setSelectedTicket(null);
                setSelectedMovimiento(null);
                fetchData();
            } else {
                toast.error("Error al conciliar");
            }
        } catch (e) {
            toast.error("Error de servidor");
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
                        <RefreshCcw className="mr-3 h-8 w-8 text-blue-600" />
                        Conciliador Inteligente
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Empareja los pagos de tus sistemas con los registros oficiales de tu banco.
                    </p>
                </div>

                {/* Panel Superior: Sugerencias Inteligentes */}
                <Card className="border-blue-100 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Sparkles className="h-5 w-5 text-indigo-500" />
                            <CardTitle className="text-lg text-indigo-900">Matches Encontrados</CardTitle>
                        </div>
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">{sugerencias.length} posibles</Badge>
                    </div>
                    <CardContent className="p-0">
                        {loading ? (
                            <p className="p-6 text-center text-gray-400 text-sm">Escaneando transacciones...</p>
                        ) : sugerencias.length === 0 ? (
                            <p className="p-6 text-center text-gray-500 bg-gray-50/50">El algoritmo no encontró cruces exactos automáticos el día de hoy.</p>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {sugerencias.map((sug, idx) => (
                                    <div key={idx} className="flex flex-col md:flex-row items-center justify-between p-4 hover:bg-blue-50/30 transition-colors gap-4">

                                        {/* Tarjeta Simulación de Ticket */}
                                        <div className="flex-1 w-full bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className="text-gray-500 border-gray-300">Ticket</Badge>
                                                <span className="font-mono text-xs text-gray-500">{sug.ticket.folio || `#${sug.ticket.legacyId}`}</span>
                                            </div>
                                            <p className="font-semibold text-gray-900">{formatCurrency(sug.ticket.monto)}</p>
                                            <p className="text-xs text-blue-600 truncate">{sug.ticket.cliente?.nombreCompleto}</p>
                                        </div>

                                        <div className="flex-shrink-0 flex items-center justify-center text-indigo-300">
                                            <ChevronRight className="hidden md:block w-6 h-6" />
                                            <Link2 className="w-5 h-5 mx-2 text-indigo-500" />
                                            <ChevronRight className="hidden md:block w-6 h-6" />
                                        </div>

                                        {/* Tarjeta Simulación de Banco */}
                                        <div className="flex-1 w-full bg-white border border-indigo-100 rounded-lg p-3 shadow-sm bg-gradient-to-br from-white to-indigo-50/30">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">Banco</Badge>
                                                <span className="font-mono text-xs text-gray-500">{sug.movimiento.bancoOrigen}</span>
                                            </div>
                                            <p className="font-semibold text-green-700">{formatCurrency(sug.movimiento.abono)}</p>
                                            <p className="text-xs text-gray-600 truncate">{sug.movimiento.concepto || sug.movimiento.descripcionGeneral}</p>
                                            <div className="mt-1 flex items-center gap-1">
                                                <Badge className="text-[9px] h-3 px-1 bg-indigo-500">{sug.prioridad}</Badge>
                                                <span className="text-[10px] text-indigo-600 font-medium italic">{sug.razon}</span>
                                            </div>
                                        </div>

                                        <div className="flex-shrink-0">
                                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 w-full" onClick={() => {
                                                setSelectedTicket(sug.ticket.id);
                                                setSelectedMovimiento(sug.movimiento.id);
                                                setTimeout(handeMatchManual, 100);
                                            }}>
                                                Aprobar
                                            </Button>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Panel Inferior: Match Manual */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Columna Izquierda: Tickets */}
                    <Card>
                        <CardHeader className="bg-gray-50/50 border-b">
                            <CardTitle className="text-base text-gray-700">1. Seleccionar Ticket de Sistema</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                            <ul className="divide-y divide-gray-100">
                                {tickets.map(t => (
                                    <li
                                        key={t.id}
                                        className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${selectedTicket === t.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                        onClick={() => setSelectedTicket(t.id)}
                                    >
                                        <div className="flex justify-between">
                                            <span className="font-medium text-gray-900">{formatCurrency(t.monto)}</span>
                                            <span className="text-xs text-gray-500">{formatDate(t.creadoEn).split(' ')[0]}</span>
                                        </div>
                                        <div className="text-sm text-gray-600 truncate mt-1">{t.cliente?.nombreCompleto || 'Desconocido'}</div>
                                        <div className="text-xs text-gray-400 font-mono mt-1">{t.folio || t.referencia} • {t.gestor?.name}</div>
                                    </li>
                                ))}
                                {tickets.length === 0 && !loading && (
                                    <p className="p-4 text-center text-sm text-gray-500">No hay tickets pendientes.</p>
                                )}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Columna Derecha: Banco */}
                    <Card>
                        <CardHeader className="bg-gray-50/50 border-b">
                            <CardTitle className="text-base text-gray-700">2. Seleccionar Movimiento Bancario</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                            <ul className="divide-y divide-gray-100">
                                {movimientos.map(m => (
                                    <li
                                        key={m.id}
                                        className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${selectedMovimiento === m.id ? 'bg-green-50 border-l-4 border-green-500' : ''}`}
                                        onClick={() => setSelectedMovimiento(m.id)}
                                    >
                                        <div className="flex justify-between">
                                            <span className="font-medium text-green-700">{m.abono ? formatCurrency(m.abono) : '-'}</span>
                                            <span className="text-xs text-gray-500">{formatDate(m.fechaOperacion).split(' ')[0]}</span>
                                        </div>
                                        <div className="text-sm text-gray-600 truncate mt-1">{m.concepto || m.descripcionGeneral || m.bancoOrigen}</div>
                                        <div className="text-xs text-gray-400 font-mono mt-1">Ref: {m.referencia || m.claveRastreo || 'N/A'}</div>
                                    </li>
                                ))}
                                {movimientos.length === 0 && !loading && (
                                    <p className="p-4 text-center text-sm text-gray-500">No hay movimientos pendientes en banco.</p>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Botón de Match Manual Flotante (Si ambos están seleccionados) */}
                {selectedTicket && selectedMovimiento && (
                    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
                        <Button size="lg" className="shadow-xl bg-gray-900 hover:bg-gray-800 rounded-full pl-6 pr-8 h-14" onClick={handeMatchManual}>
                            <Link2 className="w-5 h-5 mr-3" />
                            Forzar Emparejamiento
                        </Button>
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
}
