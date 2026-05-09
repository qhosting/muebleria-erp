"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, Link2, Sparkles, CheckCircle2, ChevronRight, Book, History, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ConciliadorPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [movimientos, setMovimientos] = useState<any[]>([]);
    const [sugerencias, setSugerencias] = useState<any[]>([]);
    const [cuentasConocidas, setCuentasConocidas] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("conciliador");

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
                setCuentasConocidas(data.totalCuentasConocidas || 0);
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
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
                            <RefreshCcw className="mr-3 h-8 w-8 text-blue-600" />
                            Gestión de Tesorería
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Empareja los pagos de tus sistemas con los registros oficiales de tu banco y gestiona el aprendizaje automático.
                        </p>
                    </div>
                    
                    <div className="bg-white border border-blue-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                        <div className="bg-blue-50 p-2 rounded-xl">
                            <History className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cuentas Conocidas</p>
                            <p className="text-xl font-black text-slate-900">{cuentasConocidas}</p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="conciliador" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-100 p-1 rounded-xl">
                        <TabsTrigger value="conciliador" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Sparkles className="h-4 w-4 mr-2" /> Conciliador Inteligente
                        </TabsTrigger>
                        <TabsTrigger value="catalogo" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Book className="h-4 w-4 mr-2" /> Catálogo de Cuentas
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="conciliador" className="space-y-6 mt-6">
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
                                            <div className="flex justify-between items-start mb-1">
                                                <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-200 h-4 px-1">Ticket</Badge>
                                                <span className="font-mono text-[10px] text-gray-400">{sug.ticket.folio || `#${sug.ticket.legacyId || sug.ticket.id.substring(0, 5)}`}</span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <p className="font-bold text-gray-900 text-base">{formatCurrency(sug.ticket.monto)}</p>
                                                <p className="text-[10px] text-gray-400">{formatDate(sug.ticket.fecha || sug.ticket.creadoEn)}</p>
                                            </div>
                                            <p className="text-xs font-medium text-blue-700 truncate">{sug.ticket.cliente?.nombreCompleto}</p>
                                            <p className="text-[10px] text-gray-500 font-mono">Contrato: {sug.ticket.cliente?.codigoCliente}</p>
                                            <p className="text-[10px] text-gray-600 mt-1 italic truncate border-t border-gray-50 pt-1">
                                                {sug.ticket.concepto || sug.ticket.referencia || "Sin concepto"}
                                            </p>
                                            {sug.ticket.cuentaOrigen && (
                                                <p className="text-[9px] text-indigo-500 font-mono mt-0.5">
                                                    CLABE: {sug.ticket.cuentaOrigen}
                                                </p>
                                            )}
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
                                            <span className="text-[10px] text-gray-400">{formatDate(t.fecha || t.creadoEn)}</span>
                                        </div>
                                        <div className="text-sm text-blue-700 font-medium truncate mt-1">{t.cliente?.nombreCompleto || 'Desconocido'}</div>
                                        <div className="flex justify-between items-center mt-1">
                                            <div className="text-[10px] text-gray-500 font-mono">Contrato: {t.cliente?.codigoCliente}</div>
                                            <div className="text-[10px] text-gray-400 font-mono">{t.folio || t.referencia}</div>
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1 italic truncate">{t.concepto || "Sin concepto"}</div>
                                        {t.cuentaOrigen && <div className="text-[9px] text-indigo-400 font-mono mt-0.5">CLABE: {t.cuentaOrigen}</div>}
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
                                <Button size="lg" className="shadow-2xl bg-slate-900 hover:bg-black text-white rounded-full pl-6 pr-8 h-16 ring-4 ring-white" onClick={handeMatchManual}>
                                    <Link2 className="w-5 h-5 mr-3" />
                                    Vincular Seleccionados
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="catalogo" className="mt-6">
                        <Card className="border-none shadow-sm">
                            <CardHeader className="bg-white border-b border-slate-100">
                                <CardTitle className="text-xl font-black">Inteligencia de Cuentas Bancarias</CardTitle>
                                <CardDescription>
                                    Este catálogo se alimenta automáticamente cada vez que concilias un pago. 
                                    Ayuda al sistema a reconocer transferencias futuras del mismo cliente.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 min-h-[400px] flex items-center justify-center text-slate-400">
                                <div className="text-center space-y-4 p-12">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                        <Search className="h-8 w-8" />
                                    </div>
                                    <p className="font-medium max-w-xs mx-auto">
                                        El sistema ha aprendido <span className="text-blue-600 font-bold">{cuentasConocidas} cuentas</span> bancarias de clientes.
                                        Se utilizarán automáticamente en el siguiente escaneo.
                                    </p>
                                    <Button variant="outline" onClick={fetchData} className="rounded-xl border-slate-200">
                                        Refrescar Datos
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
        </DashboardLayout>
    );
}
