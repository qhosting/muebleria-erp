"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCcw, Link2, Sparkles, CheckCircle2, ChevronRight, Book, History, Search, Image as ImageIcon, Info, Download, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    const [filterByAmount, setFilterByAmount] = useState(true);

    const [expandedMovs, setExpandedMovs] = useState<Record<string, boolean>>({});
    const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

    const toggleMovDetails = (id: string) => {
        setExpandedMovs(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const formatTime = (time: any) => {
        if (!time) return "";
        if (time instanceof Date) {
            return time.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
        }
        const str = String(time);
        if (str.includes("T")) {
            try {
                return new Date(str).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true });
            } catch (e) {
                // fallback
            }
        }
        const parts = str.split(":");
        if (parts.length >= 2) {
            const hour = parseInt(parts[0], 10);
            const minute = parts[1];
            const ampm = hour >= 12 ? "PM" : "AM";
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minute} ${ampm}`;
        }
        return str;
    };

    const isSameDay = (d1: any, d2: any) => {
        if (!d1 || !d2) return false;
        try {
            const date1 = new Date(d1);
            const date2 = new Date(d2);
            return date1.getFullYear() === date2.getFullYear() &&
                   date1.getMonth() === date2.getMonth() &&
                   date1.getDate() === date2.getDate();
        } catch (e) {
            return false;
        }
    };

    const getDatesMatchLevel = (d1: any, d2: any) => {
        if (!d1 || !d2) return "none";
        try {
            const date1 = new Date(d1);
            const date2 = new Date(d2);
            const isExact = date1.getFullYear() === date2.getFullYear() &&
                            date1.getMonth() === date2.getMonth() &&
                            date1.getDate() === date2.getDate();
            if (isExact) return "exact";
            
            const diffHours = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
            if (diffHours <= 48) return "approximate";
            
            return "none";
        } catch (e) {
            return "none";
        }
    };

    const getTicketKnownAccounts = (t: any) => {
        if (!t) return [];
        const accounts: string[] = [];
        if (t.cuentaOrigen) {
            accounts.push(t.cuentaOrigen.trim());
        }
        if (t.cliente?.cuentasBancarias && Array.isArray(t.cliente.cuentasBancarias)) {
            t.cliente.cuentasBancarias.forEach((acc: any) => {
                if (acc.clabe) accounts.push(acc.clabe.trim());
                if (acc.cuenta) accounts.push(acc.cuenta.trim());
            });
        }
        return accounts;
    };

    const hasHistoricalAccountMatch = (t: any, m: any) => {
        if (!t || !m) return false;
        const knownAccs = getTicketKnownAccounts(t);
        const mClabe = m.clabeEmisor?.trim();
        const mCuenta = m.cuentaEmisor?.trim();
        return knownAccs.some(acc => (mClabe && acc === mClabe) || (mCuenta && acc === mCuenta));
    };

    const isGenericConcept = (concept: string | null | undefined) => {
        if (!concept) return true;
        const clean = concept.trim().toUpperCase();
        return clean.includes("TICKET WHATSAPP") || clean === "N/A" || clean === "";
    };

    const getTicketQueries = (t: any) => {
        if (!t) return [];
        const queries: string[] = [];
        
        // Contrato
        if (t.cliente?.codigoCliente) {
            queries.push(t.cliente.codigoCliente);
        }
        
        // Nombre cliente (words)
        if (t.cliente?.nombreCompleto) {
            const nameParts = String(t.cliente.nombreCompleto)
                .split(/\s+/)
                .map((p: string) => p.trim())
                .filter((p: string) => p.length >= 3 && !/^(de|del|la|las|los|y|en)$/i.test(p));
            queries.push(...nameParts);
            queries.push(t.cliente.nombreCompleto);
        }
        
        // Folio
        if (t.folio) {
            queries.push(t.folio);
        }
        
        // Referencia
        if (t.referencia) {
            queries.push(t.referencia);
        }
        
        // Clave de rastreo
        if (t.claveRastreo) {
            queries.push(t.claveRastreo);
        }
        
        // Cuentas conocidas / históricas
        const knownAccs = getTicketKnownAccounts(t);
        queries.push(...knownAccs);
        
        return queries;
    };

    const getMovimientoTextWords = (m: any) => {
        if (!m) return [];
        const pool = `${m.concepto || ""} ${m.descripcionGeneral || ""} ${m.descripcionDetallada || ""}`.toUpperCase();
        return pool.split(/[^A-Z0-9]/i)
            .map(w => w.trim())
            .filter(w => w.length >= 3 && !/^(de|del|la|las|los|y|en|spei|abono|transferencia|destino|origen|concepto|cuenta|banco)$/i.test(w));
    };

    const highlightText = (text: string | null | undefined, queries: string[]) => {
        if (!text) return "";
        const cleanQueries = queries
            .filter(q => q && q.trim().length >= 3)
            .map(q => q.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
        
        if (cleanQueries.length === 0) return <span>{text}</span>;
        
        try {
            const regex = new RegExp(`(${cleanQueries.join('|')})`, 'gi');
            const parts = text.split(regex);
            
            return (
                <span>
                    {parts.map((part, i) => 
                        regex.test(part) ? (
                            <mark key={i} className="bg-yellow-100 text-yellow-900 px-0.5 rounded font-bold">{part}</mark>
                        ) : (
                            part
                        )
                    )}
                </span>
            );
        } catch (e) {
            return <span>{text}</span>;
        }
    };

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

    const activeMovObjForTickets = movimientos.find(mov => mov.id === selectedMovimiento);
    const displayedTickets = tickets.filter(t => {
        if (filterByAmount && activeMovObjForTickets) {
            return Number(t.monto) === Number(activeMovObjForTickets.abono || activeMovObjForTickets.cargo);
        }
        return true;
    });

    const activeTicketObjForMovs = tickets.find(t => t.id === selectedTicket);
    const displayedMovimientos = movimientos.filter(m => {
        if (filterByAmount && activeTicketObjForMovs) {
            return Number(m.abono || m.cargo) === Number(activeTicketObjForMovs.monto);
        }
        return true;
    });

    return (
        <>
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
                                {sugerencias.map((sug, idx) => {
                                    const ticketQueries = getTicketQueries(sug.ticket);
                                    const movWords = getMovimientoTextWords(sug.movimiento);
                                    const datesMatchLevel = getDatesMatchLevel(sug.ticket.fecha || sug.ticket.creadoEn, sug.movimiento.fechaOperacion);
                                    const hasHistMatch = hasHistoricalAccountMatch(sug.ticket, sug.movimiento);

                                    return (
                                        <div key={idx} className="flex flex-col md:flex-row items-center justify-between p-4 hover:bg-blue-50/30 transition-colors gap-4">

                                            {/* Tarjeta Simulación de Ticket */}
                                            <div className="flex-1 w-full bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-col justify-between min-h-[160px]">
                                                <div>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-200 h-4 px-1">Ticket</Badge>
                                                        <span className="font-mono text-[10px] text-gray-400">{sug.ticket.folio || `#${sug.ticket.legacyId || sug.ticket.id.substring(0, 5)}`}</span>
                                                    </div>
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <p className="font-bold text-gray-900 text-base">{formatCurrency(sug.ticket.monto)}</p>
                                                        {datesMatchLevel === "exact" ? (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-bold">
                                                                {formatDate(sug.ticket.fecha || sug.ticket.creadoEn)}
                                                            </span>
                                                        ) : datesMatchLevel === "approximate" ? (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                                                {formatDate(sug.ticket.fecha || sug.ticket.creadoEn)} (±48h)
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400 font-medium">
                                                                {formatDate(sug.ticket.fecha || sug.ticket.creadoEn)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-semibold text-blue-700 truncate">{highlightText(sug.ticket.cliente?.nombreCompleto, movWords)}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono">Contrato: {highlightText(sug.ticket.cliente?.codigoCliente, movWords)}</p>
                                                    
                                                    <div className="text-[10px] text-gray-600 mt-2 border-t border-gray-100 pt-2 space-y-1">
                                                        {!isGenericConcept(sug.ticket.concepto) && (
                                                            <p><span className="font-semibold text-slate-500 font-medium">Concepto:</span> {highlightText(sug.ticket.concepto, movWords)}</p>
                                                        )}
                                                        {sug.ticket.referencia && (
                                                            <p><span className="font-semibold text-slate-500">Referencia:</span> {highlightText(sug.ticket.referencia, movWords)}</p>
                                                        )}
                                                        {sug.ticket.claveRastreo && (
                                                            <p><span className="font-semibold text-slate-500">Clave Rastreo:</span> <span className="font-mono text-indigo-600">{highlightText(sug.ticket.claveRastreo, movWords)}</span></p>
                                                        )}
                                                        {sug.ticket.remitente && (
                                                            <p><span className="font-semibold text-slate-500">Remitente:</span> {highlightText(sug.ticket.remitente, movWords)}</p>
                                                        )}
                                                        {sug.ticket.cuentaOrigen && (
                                                            <p><span className="font-semibold text-slate-500 font-mono">CLABE Orig:</span> <span className="font-mono text-purple-600">{highlightText(sug.ticket.cuentaOrigen, movWords)}</span></p>
                                                        )}
                                                    </div>
                                                </div>
                                                {sug.ticket.urlComprobante && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full mt-2 h-7 text-[10px] flex items-center justify-center gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 bg-blue-50/50 rounded-lg"
                                                        onClick={() => setViewingImageUrl(sug.ticket.urlComprobante)}
                                                    >
                                                        <ImageIcon className="w-3.5 h-3.5" />
                                                        Ver Comprobante
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="flex-shrink-0 flex items-center justify-center text-indigo-300">
                                                <ChevronRight className="hidden md:block w-6 h-6" />
                                                <Link2 className="w-5 h-5 mx-2 text-indigo-500" />
                                                <ChevronRight className="hidden md:block w-6 h-6" />
                                            </div>

                                            {/* Tarjeta Movimiento Bancario */}
                                            <div className="flex-1 w-full bg-white border border-indigo-100 rounded-lg p-3 shadow-sm bg-gradient-to-br from-white to-indigo-50/30">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">Banco</Badge>
                                                    <div className="text-right">
                                                        <span className="font-mono text-xs text-gray-500 block">{sug.movimiento.bancoOrigen}</span>
                                                        {sug.movimiento.cuentaDestino && (
                                                            <span className="font-mono text-[10px] text-gray-400 block">Cta: {sug.movimiento.cuentaDestino}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Monto y fecha */}
                                                <div className="flex justify-between items-baseline mb-2">
                                                    <p className="font-black text-green-700 text-lg">{formatCurrency(sug.movimiento.abono)}</p>
                                                    {datesMatchLevel === "exact" ? (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-bold">
                                                            {formatDate(sug.movimiento.fechaOperacion).split(' ')[0]}
                                                        </span>
                                                    ) : datesMatchLevel === "approximate" ? (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                                            {formatDate(sug.movimiento.fechaOperacion).split(' ')[0]} (±48h)
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 font-medium">
                                                            {formatDate(sug.movimiento.fechaOperacion).split(' ')[0]}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Concepto */}
                                                {(sug.movimiento.concepto || sug.movimiento.descripcionGeneral) && (
                                                    <p className="text-xs text-gray-700 font-medium leading-tight mb-1">
                                                        {highlightText(sug.movimiento.concepto || sug.movimiento.descripcionGeneral, ticketQueries)}
                                                    </p>
                                                )}
                                                {/* Descripción detallada si es diferente al concepto */}
                                                {sug.movimiento.descripcionDetallada && sug.movimiento.descripcionDetallada !== sug.movimiento.concepto && (
                                                    <p className="text-[10px] text-gray-500 italic leading-tight mb-1 line-clamp-2">
                                                        {highlightText(sug.movimiento.descripcionDetallada, ticketQueries)}
                                                    </p>
                                                )}
                                                {/* Clave de rastreo */}
                                                {sug.movimiento.claveRastreo && (
                                                    <div className="flex items-center gap-1 mt-1.5">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase">Rastreo</span>
                                                        <span className="font-mono text-[9px] text-indigo-600 break-all">{highlightText(sug.movimiento.claveRastreo, ticketQueries)}</span>
                                                    </div>
                                                )}
                                                {/* Referencia */}
                                                {sug.movimiento.referencia && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase">Ref</span>
                                                        <span className="font-mono text-[9px] text-gray-500">{highlightText(sug.movimiento.referencia, ticketQueries)}</span>
                                                    </div>
                                                )}
                                                {/* CLABE/Cuenta Emisor */}
                                                {(sug.movimiento.clabeEmisor || sug.movimiento.cuentaEmisor) && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase">CLABE</span>
                                                        <span className="font-mono text-[9px] text-purple-600">{highlightText(sug.movimiento.clabeEmisor || sug.movimiento.cuentaEmisor, ticketQueries)}</span>
                                                    </div>
                                                )}
                                                {/* Razon del match */}
                                                <div className="mt-2 flex items-center gap-1.5 border-t border-indigo-50 pt-1.5">
                                                    <Badge className="text-[9px] h-3.5 px-1.5 bg-indigo-500 text-white">{sug.prioridad}</Badge>
                                                    <span className="text-[10px] text-indigo-600 font-medium italic">{sug.razon}</span>
                                                    {hasHistMatch && (
                                                        <Badge className="text-[9px] h-3.5 px-1.5 bg-emerald-500 text-white font-bold ml-auto">
                                                            Cuenta Histórica
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Botón para expandir detalles completos del movimiento */}
                                                <div className="mt-2 border-t pt-1.5 flex justify-between items-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-1.5 text-[9px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleMovDetails(sug.movimiento.id);
                                                        }}
                                                    >
                                                        <Info className="w-3.5 h-3.5" />
                                                        {expandedMovs[sug.movimiento.id] ? "Ocultar detalles" : "Ver todo el movimiento"}
                                                    </Button>
                                                    {sug.movimiento.bancoDestino && (
                                                        <span className="text-[9px] text-slate-400 font-mono">
                                                            Destino: {sug.movimiento.bancoDestino}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Detalles completos */}
                                                {expandedMovs[sug.movimiento.id] && (
                                                    <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded-md text-[10px] space-y-1 text-slate-700 animate-in fade-in duration-200">
                                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                            <div><span className="font-semibold text-slate-500 font-medium">Monto:</span> <span className="font-mono font-bold text-green-700">{sug.movimiento.abono ? formatCurrency(sug.movimiento.abono) : "$0.00"}</span></div>
                                                            <div><span className="font-semibold text-slate-500 font-medium">Cargo:</span> <span className="font-mono text-red-600">{sug.movimiento.cargo ? formatCurrency(sug.movimiento.cargo) : "$0.00"}</span></div>
                                                            <div><span className="font-semibold text-slate-500 font-medium">Saldo:</span> <span className="font-mono">{sug.movimiento.saldo ? formatCurrency(sug.movimiento.saldo) : "N/A"}</span></div>
                                                            <div><span className="font-semibold text-slate-500 font-medium">Fecha:</span> <span>{formatDate(sug.movimiento.fechaOperacion)}</span></div>
                                                            <div><span className="font-semibold text-slate-500 font-medium">Hora:</span> <span>{sug.movimiento.horaOperacion ? formatTime(sug.movimiento.horaOperacion) : "N/A"}</span></div>
                                                            <div><span className="font-semibold text-slate-500 font-medium">Banco Orig:</span> <span>{sug.movimiento.bancoOrigen || "N/A"}</span></div>
                                                            <div><span className="font-semibold text-slate-500 font-medium">Banco Dest:</span> <span>{sug.movimiento.bancoDestino || "N/A"}</span></div>
                                                            <div><span className="font-semibold text-slate-500 font-medium">Cta Dest:</span> <span className="font-mono">{sug.movimiento.cuentaDestino || "N/A"}</span></div>
                                                            <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium">Clave Rastreo:</span> <span className="font-mono text-indigo-600 break-all">{highlightText(sug.movimiento.claveRastreo, ticketQueries)}</span></div>
                                                            <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium">Ref:</span> <span className="font-mono">{highlightText(sug.movimiento.referencia, ticketQueries)}</span></div>
                                                            <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium">CLABE Emisor:</span> <span className="font-mono">{highlightText(sug.movimiento.clabeEmisor || sug.movimiento.cuentaEmisor, ticketQueries)}</span></div>
                                                            <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium">Cta Emisor:</span> <span className="font-mono">{highlightText(sug.movimiento.cuentaEmisor, ticketQueries)}</span></div>
                                                            <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium block">Concepto:</span> <span className="text-slate-800 break-words">{highlightText(sug.movimiento.concepto, ticketQueries)}</span></div>
                                                            <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium block">Desc Gral:</span> <span className="text-slate-800 break-words">{highlightText(sug.movimiento.descripcionGeneral, ticketQueries)}</span></div>
                                                            <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium block">Desc Detallada:</span> <span className="text-slate-800 break-words">{highlightText(sug.movimiento.descripcionDetallada, ticketQueries)}</span></div>
                                                            <div className="col-span-2 border-t pt-1 flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                                                                <span>ID: {sug.movimiento.id}</span>
                                                                <span>Importado: {sug.movimiento.fechaIngreso ? formatDateTime(sug.movimiento.fechaIngreso) : "N/A"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
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
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Panel Inferior: Match Manual */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Link2 className="w-5 h-5 text-blue-600" />
                                Conciliación Manual
                            </h3>
                            <p className="text-slate-500 text-xs mt-0.5">
                                Asocia manualmente registros cuando el algoritmo automático no encuentra un match exacto.
                            </p>
                        </div>
                        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-center">
                            <input
                                type="checkbox"
                                id="filter-by-amount"
                                checked={filterByAmount}
                                onChange={(e) => setFilterByAmount(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="filter-by-amount" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                Filtrar por monto coincidente
                            </label>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Columna Izquierda: Tickets */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b py-3 px-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-700">1. Seleccionar Ticket de Sistema</CardTitle>
                                <Badge variant="secondary" className="text-[10px] font-bold">
                                    {displayedTickets.length} de {tickets.length}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                                <ul className="divide-y divide-gray-100">
                                    {displayedTickets.map(t => {
                                    const activeMovObj = movimientos.find(mov => mov.id === selectedMovimiento);
                                    const activeMovWords = activeMovObj ? getMovimientoTextWords(activeMovObj) : [];
                                    const datesMatchLevel = activeMovObj ? getDatesMatchLevel(t.fecha || t.creadoEn, activeMovObj.fechaOperacion) : "none";
                                    const hasHistMatch = activeMovObj ? hasHistoricalAccountMatch(t, activeMovObj) : false;

                                    return (
                                        <li
                                            key={t.id}
                                            className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${selectedTicket === t.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                            onClick={() => setSelectedTicket(t.id)}
                                        >
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-medium text-gray-900">{formatCurrency(t.monto)}</span>
                                                {datesMatchLevel === "exact" ? (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-bold">
                                                        {formatDate(t.fecha || t.creadoEn)}
                                                    </span>
                                                ) : datesMatchLevel === "approximate" ? (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                                        {formatDate(t.fecha || t.creadoEn)} (±48h)
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {formatDate(t.fecha || t.creadoEn)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm font-semibold text-blue-700 truncate mt-1">
                                                {highlightText(t.cliente?.nombreCompleto, activeMovWords)}
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <div className="text-[10px] text-gray-500 font-mono">
                                                    Contrato: {highlightText(t.cliente?.codigoCliente, activeMovWords)}
                                                </div>
                                                {hasHistMatch && (
                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-bold h-4 px-1">
                                                        Cuenta Histórica
                                                    </Badge>
                                                )}
                                                <div className="text-[10px] text-gray-400 font-mono">
                                                    {highlightText(t.folio || t.referencia, activeMovWords)}
                                                </div>
                                            </div>
                                            
                                            <div className="text-[10px] text-gray-600 mt-2 border-t border-gray-100 pt-2 space-y-1">
                                                {!isGenericConcept(t.concepto) && (
                                                    <p><span className="font-semibold text-slate-500">Concepto:</span> {highlightText(t.concepto, activeMovWords)}</p>
                                                )}
                                                {t.referencia && (
                                                    <p><span className="font-semibold text-slate-500">Referencia:</span> {highlightText(t.referencia, activeMovWords)}</p>
                                                )}
                                                {t.claveRastreo && (
                                                    <p><span className="font-semibold text-slate-500">Clave Rastreo:</span> <span className="font-mono text-indigo-600">{highlightText(t.claveRastreo, activeMovWords)}</span></p>
                                                )}
                                                {t.remitente && (
                                                    <p><span className="font-semibold text-slate-500">Remitente:</span> {highlightText(t.remitente, activeMovWords)}</p>
                                                )}
                                                {t.cuentaOrigen && (
                                                    <p><span className="font-semibold text-slate-500 font-mono">CLABE Orig:</span> <span className="font-mono text-purple-600">{highlightText(t.cuentaOrigen, activeMovWords)}</span></p>
                                                )}
                                            </div>

                                            {t.urlComprobante && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full mt-2 h-7 text-[10px] flex items-center justify-center gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 bg-blue-50/50 rounded-lg"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewingImageUrl(t.urlComprobante);
                                                    }}
                                                >
                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                    Ver Comprobante
                                                </Button>
                                            )}
                                        </li>
                                    );
                                })}
                                {displayedTickets.length === 0 && !loading && (
                                    <p className="p-4 text-center text-sm text-gray-500">
                                        {tickets.length === 0 ? "No hay tickets pendientes." : "No hay tickets con el mismo monto."}
                                    </p>
                                )}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Columna Derecha: Banco */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b py-3 px-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-700">2. Seleccionar Movimiento Bancario</CardTitle>
                            <Badge variant="secondary" className="text-[10px] font-bold">
                                {displayedMovimientos.length} de {movimientos.length}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                            <ul className="divide-y divide-gray-100">
                                {displayedMovimientos.map(m => {
                                    const activeTicketObj = tickets.find(t => t.id === selectedTicket);
                                    const activeTicketQueries = activeTicketObj ? getTicketQueries(activeTicketObj) : [];
                                    const datesMatchLevel = activeTicketObj ? getDatesMatchLevel(activeTicketObj.fecha || activeTicketObj.creadoEn, m.fechaOperacion) : "none";
                                    const hasHistMatch = activeTicketObj ? hasHistoricalAccountMatch(activeTicketObj, m) : false;

                                    return (
                                        <li
                                            key={m.id}
                                            className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${selectedMovimiento === m.id ? 'bg-green-50 border-l-4 border-green-500' : ''}`}
                                            onClick={() => setSelectedMovimiento(m.id)}
                                        >
                                            {/* Monto y fecha */}
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-black text-green-700 text-base">{m.abono ? formatCurrency(m.abono) : '-'}</span>
                                                {datesMatchLevel === "exact" ? (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-bold">
                                                        {formatDate(m.fechaOperacion).split(' ')[0]}
                                                    </span>
                                                ) : datesMatchLevel === "approximate" ? (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                                        {formatDate(m.fechaOperacion).split(' ')[0]} (±48h)
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400">{formatDate(m.fechaOperacion).split(' ')[0]}</span>
                                                )}
                                            </div>
                                            {/* Banco origen y cuenta destino */}
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{m.bancoOrigen}</span>
                                                    {m.cuentaDestino && (
                                                        <span className="text-[10px] font-mono text-gray-400">→ {m.bancoDestino} {m.cuentaDestino}</span>
                                                    )}
                                                </div>
                                                {hasHistMatch && (
                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-bold h-4 px-1">
                                                        Cuenta Histórica
                                                    </Badge>
                                                )}
                                            </div>
                                            {/* Concepto */}
                                            {(m.concepto || m.descripcionGeneral) && (
                                                <p className="text-xs text-gray-700 font-medium leading-tight mb-0.5">
                                                    {highlightText(m.concepto || m.descripcionGeneral, activeTicketQueries)}
                                                </p>
                                            )}
                                            {/* Descripción detallada */}
                                            {m.descripcionDetallada && m.descripcionDetallada !== m.concepto && (
                                                <p className="text-[10px] text-gray-500 italic leading-tight mb-0.5 line-clamp-2">
                                                    {highlightText(m.descripcionDetallada, activeTicketQueries)}
                                                </p>
                                            )}
                                            {/* Clave rastreo */}
                                            {m.claveRastreo && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Rastreo</span>
                                                    <span className="font-mono text-[9px] text-indigo-600 break-all">{highlightText(m.claveRastreo, activeTicketQueries)}</span>
                                                </div>
                                            )}
                                            {/* Referencia */}
                                            {m.referencia && m.referencia !== m.claveRastreo && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Ref</span>
                                                    <span className="font-mono text-[9px] text-gray-500">{highlightText(m.referencia, activeTicketQueries)}</span>
                                                </div>
                                            )}
                                            {/* CLABE / Cuenta Emisor */}
                                            {(m.clabeEmisor || m.cuentaEmisor) && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] font-bold text-purple-400 uppercase">CLABE</span>
                                                    <span className="font-mono text-[9px] text-purple-600">{highlightText(m.clabeEmisor || m.cuentaEmisor, activeTicketQueries)}</span>
                                                </div>
                                            )}
                                            {/* Remitente si existe */}
                                            {m.remitente && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Remitente</span>
                                                    <span className="text-[9px] text-gray-600">{highlightText(m.remitente, activeTicketQueries)}</span>
                                                </div>
                                            )}

                                            {/* Botón para expandir detalles completos del movimiento */}
                                            <div className="mt-2 border-t pt-1.5 flex justify-between items-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-1.5 text-[9px] text-green-700 hover:text-green-900 flex items-center gap-0.5"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleMovDetails(m.id);
                                                    }}
                                                >
                                                    <Info className="w-3 h-3" />
                                                    {expandedMovs[m.id] ? "Ocultar detalles" : "Ver todo el movimiento"}
                                                </Button>
                                                {m.bancoDestino && (
                                                    <span className="text-[9px] text-slate-400 font-mono">
                                                        Destino: {m.bancoDestino}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Detalles completos */}
                                            {expandedMovs[m.id] && (
                                                <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded-md text-[10px] space-y-1 text-slate-700 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                        <div><span className="font-semibold text-slate-500">Monto:</span> <span className="font-mono font-bold text-green-700">{m.abono ? formatCurrency(m.abono) : "$0.00"}</span></div>
                                                        <div><span className="font-semibold text-slate-500">Cargo:</span> <span className="font-mono text-red-600">{m.cargo ? formatCurrency(m.cargo) : "$0.00"}</span></div>
                                                        <div><span className="font-semibold text-slate-500">Saldo:</span> <span className="font-mono">{m.saldo ? formatCurrency(m.saldo) : "N/A"}</span></div>
                                                        <div><span className="font-semibold text-slate-500">Fecha:</span> <span>{formatDate(m.fechaOperacion)}</span></div>
                                                        <div><span className="font-semibold text-slate-500">Hora:</span> <span>{m.horaOperacion ? formatTime(m.horaOperacion) : "N/A"}</span></div>
                                                        <div><span className="font-semibold text-slate-500">Banco Orig:</span> <span>{m.bancoOrigen || "N/A"}</span></div>
                                                        <div><span className="font-semibold text-slate-500">Banco Dest:</span> <span>{m.bancoDestino || "N/A"}</span></div>
                                                        <div><span className="font-semibold text-slate-500">Cta Dest:</span> <span className="font-mono">{m.cuentaDestino || "N/A"}</span></div>
                                                        <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium">Clave Rastreo:</span> <span className="font-mono text-indigo-600 break-all">{highlightText(m.claveRastreo, activeTicketQueries)}</span></div>
                                                        <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium">Ref:</span> <span className="font-mono">{highlightText(m.referencia, activeTicketQueries)}</span></div>
                                                        <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium">CLABE Emisor:</span> <span className="font-mono">{highlightText(m.clabeEmisor || m.cuentaEmisor, activeTicketQueries)}</span></div>
                                                        <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium">Cta Emisor:</span> <span className="font-mono">{highlightText(m.cuentaEmisor, activeTicketQueries)}</span></div>
                                                        <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium block">Concepto:</span> <span className="text-slate-800 break-words">{highlightText(m.concepto, activeTicketQueries)}</span></div>
                                                        <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium block">Desc Gral:</span> <span className="text-slate-800 break-words">{highlightText(m.descripcionGeneral, activeTicketQueries)}</span></div>
                                                        <div className="col-span-2"><span className="font-semibold text-slate-500 font-medium block">Desc Detallada:</span> <span className="text-slate-800 break-words">{highlightText(m.descripcionDetallada, activeTicketQueries)}</span></div>
                                                        <div className="col-span-2 border-t pt-1 flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                                                            <span>ID: {m.id}</span>
                                                            <span>Importado: {m.fechaIngreso ? formatDateTime(m.fechaIngreso) : "N/A"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                                {displayedMovimientos.length === 0 && !loading && (
                                    <p className="p-4 text-center text-sm text-gray-500">
                                        {movimientos.length === 0 ? "No hay movimientos pendientes en banco." : "No hay movimientos con el mismo monto."}
                                    </p>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                    </div>
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

            {/* Modal para Visualizar Comprobante de Pago (Ticket) */}
            <Dialog open={!!viewingImageUrl} onOpenChange={(open) => !open && setViewingImageUrl(null)}>
                <DialogContent className="max-w-3xl w-full p-6 bg-white border border-slate-200 shadow-2xl rounded-2xl">
                    <DialogHeader className="border-b pb-4 mb-4 flex flex-row items-center justify-between">
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                            Comprobante de Pago (Ticket)
                        </DialogTitle>
                    </DialogHeader>
                    {viewingImageUrl && (
                        <div className="flex flex-col items-center justify-center gap-4 mt-2">
                            <div className="relative border border-slate-200 rounded-xl overflow-hidden max-h-[60vh] w-full bg-slate-50 flex items-center justify-center p-2 shadow-inner">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={viewingImageUrl}
                                    alt="Comprobante de Pago"
                                    className="max-h-[58vh] max-w-full object-contain mx-auto transition-transform duration-200"
                                />
                            </div>
                            <div className="flex items-center gap-2 justify-end w-full border-t pt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(viewingImageUrl, "_blank")}
                                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 animate-none transition-none"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Abrir en pestaña nueva
                                </Button>
                                <a
                                    href={viewingImageUrl}
                                    download="comprobante-pago"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Button size="sm" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs">
                                        <Download className="w-4 h-4" />
                                        Descargar Imagen
                                    </Button>
                                </a>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
