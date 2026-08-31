"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    Loader2,
    Download,
    CheckCircle2,
    XCircle,
    Search,
    RefreshCcw,
    Eye,
    ExternalLink,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Maximize2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function ConciliadorPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [movimientos, setMovimientos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // Filtros de fecha (por defecto últimos 30 días o fechas recientes)
    const todayStr = new Date().toISOString().split("T")[0];
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 15);
    const pastStr = pastDate.toISOString().split("T")[0];

    const [desde, setDesde] = useState(pastStr);
    const [hasta, setHasta] = useState(todayStr);

    // Estado por cada ticket para el movimiento seleccionado y el filtro de monto
    const [selectedMovByTicket, setSelectedMovByTicket] = useState<Record<string, string>>({});
    const [amountFilterByTicket, setAmountFilterByTicket] = useState<Record<string, string>>({});

    // Modal de imagen de comprobante con Zoom
    const [viewingTicket, setViewingTicket] = useState<any | null>(null);
    const [ticketImage, setTicketImage] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(false);
    const [zoomScale, setZoomScale] = useState<number>(1);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (customDesde?: string, customHasta?: string) => {
        setLoading(true);
        try {
            const d = customDesde || desde;
            const h = customHasta || hasta;
            const params = new URLSearchParams();
            if (d) params.append("desde", d);
            if (h) params.append("hasta", h);

            const res = await fetch(`/api/tesoreria/conciliador?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets || []);
                setMovimientos(data.movimientos || []);

                // Auto-seleccionar el mejor movimiento para cada ticket si coincide el monto
                const initialSelected: Record<string, string> = {};
                const initialAmountFilter: Record<string, string> = {};

                (data.tickets || []).forEach((t: any) => {
                    const montoTicket = parseFloat(t.monto?.toString() || "0");
                    initialAmountFilter[t.id] = montoTicket.toFixed(2);

                    // Buscar si hay sugerencia o match exacto de monto
                    const sugerencia = (data.sugerencias || []).find((s: any) => s.ticket?.id === t.id);
                    if (sugerencia?.movimiento) {
                        initialSelected[t.id] = `${sugerencia.movimiento.tabla}__${sugerencia.movimiento.id}`;
                    } else {
                        const matchingMov = (data.movimientos || []).find((m: any) => Math.abs(parseFloat(m.abono?.toString() || "0") - montoTicket) < 0.01);
                        if (matchingMov) {
                            initialSelected[t.id] = `${matchingMov.tabla}__${matchingMov.id}`;
                        }
                    }
                });

                setSelectedMovByTicket(initialSelected);
                setAmountFilterByTicket(initialAmountFilter);
            } else {
                toast.error("Error al cargar datos del conciliador");
            }
        } catch (error) {
            console.error("Error cargando datos:", error);
            toast.error("Error de conexión al obtener datos");
        } finally {
            setLoading(false);
        }
    };

    const handleFiltrar = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData(desde, hasta);
    };

    const handleConciliarPago = async (ticket: any) => {
        const selectedValue = selectedMovByTicket[ticket.id];
        if (!selectedValue) {
            toast.error("Selecciona un movimiento bancario para conciliar este ticket");
            return;
        }

        const [tabla, movimientoId] = selectedValue.split("__");
        if (!tabla || !movimientoId) {
            toast.error("Movimiento bancario no válido");
            return;
        }

        setActionLoading(prev => ({ ...prev, [ticket.id]: true }));
        try {
            const res = await fetch("/api/tesoreria/conciliador", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "conciliar",
                    ticketId: ticket.id,
                    movimientoId,
                    tabla
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(`¡Ticket ${ticket.id} conciliado exitosamente!`);
                // Remover el ticket conciliado de la vista
                setTickets(prev => prev.filter(t => t.id !== ticket.id));
                // Remover el movimiento usado de la lista disponible
                setMovimientos(prev => prev.filter(m => !(m.tabla === tabla && String(m.id) === String(movimientoId))));
            } else {
                toast.error(data.error || "Error al conciliar el pago");
            }
        } catch (error) {
            console.error("Error al conciliar:", error);
            toast.error("Error de conexión con el servidor");
        } finally {
            setActionLoading(prev => ({ ...prev, [ticket.id]: false }));
        }
    };

    const handleDescartar = async (ticketId: string) => {
        const confirm = window.confirm("¿Estás seguro de descartar este ticket? Se marcará como procesado para no volver a mostrarse en el conciliador.");
        if (!confirm) return;

        setActionLoading(prev => ({ ...prev, [ticketId]: true }));
        try {
            const res = await fetch("/api/tesoreria/conciliador", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "descartar",
                    ticketId
                })
            });

            if (res.ok) {
                toast.success("Ticket descartado correctamente");
                setTickets(prev => prev.filter(t => t.id !== ticketId));
            } else {
                toast.error("Error al descartar el ticket");
            }
        } catch (error) {
            console.error("Error descartando ticket:", error);
            toast.error("Error de conexión con el servidor");
        } finally {
            setActionLoading(prev => ({ ...prev, [ticketId]: false }));
        }
    };

    const handleVerComprobante = async (ticket: any) => {
        setViewingTicket(ticket);
        setTicketImage(null);
        setImageLoading(true);
        setZoomScale(1);

        try {
            if (ticket.urlComprobante) {
                setTicketImage(ticket.urlComprobante);
                return;
            }

            const res = await fetch(`/api/tesoreria/tickets/${ticket.id}/comprobante`);
            if (res.ok) {
                const data = await res.json();
                if (data.found) {
                    setTicketImage(data.base64 || data.url);
                }
            }
        } catch (err) {
            console.error("Error cargando imagen:", err);
        } finally {
            setImageLoading(false);
        }
    };

    const handleZoomIn = () => {
        setZoomScale(prev => Math.min(prev + 0.35, 3.5));
    };

    const handleZoomOut = () => {
        setZoomScale(prev => Math.max(prev - 0.35, 0.5));
    };

    const handleResetZoom = () => {
        setZoomScale(1);
    };

    const toggleZoomClick = () => {
        setZoomScale(prev => (prev > 1.1 ? 1 : 1.8));
    };

    const exportarExcel = () => {
        if (tickets.length === 0) {
            toast.info("No hay tickets para exportar en el rango seleccionado");
            return;
        }

        const csvContent = [
            ["Fecha", "Contrato", "Cliente", "ID Ticket", "Folio/Ref", "Gestor", "Monto", "Estado"],
            ...tickets.map(t => [
                (t.fecha || t.creadoEn || "").slice(0, 19),
                `"${t.cliente?.codigoCliente || "N/A"}"`,
                `"${t.cliente?.nombreCompleto || "N/A"}"`,
                `"${t.id}"`,
                `"${t.folio || t.referencia || t.legacyId || "-"}"`,
                `"${t.gestor?.codigoGestor || t.cliente?.cobradorAsignado?.codigoGestor || "-"}"`,
                t.monto,
                t.conciliado ? "CONCILIADO" : "PENDIENTE"
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Conciliacion-Tickets-${desde}-al-${hasta}.csv`;
        a.click();
    };

    const formatDateTimeLocal = (dateInput: any) => {
        if (!dateInput) return "N/A";
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput);
        return new Intl.DateTimeFormat("es-MX", {
            timeZone: "America/Mexico_City",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }).format(d).replace(",", "");
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6 pb-16">
                {/* Header y Filtro Superior */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-3">
                    <form onSubmit={handleFiltrar} className="flex flex-wrap items-center justify-center gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">Desde:</span>
                            <Input
                                type="date"
                                value={desde}
                                onChange={(e) => setDesde(e.target.value)}
                                className="w-36 h-9 text-xs font-mono bg-gray-50 border-gray-300 rounded"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">Hasta:</span>
                            <Input
                                type="date"
                                value={hasta}
                                onChange={(e) => setHasta(e.target.value)}
                                className="w-36 h-9 text-xs font-mono bg-gray-50 border-gray-300 rounded"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={loading}
                            className="bg-gray-400 hover:bg-gray-500 text-gray-900 font-semibold px-4 h-9 rounded shadow-none text-xs"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                            Filtrar
                        </Button>
                    </form>

                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={exportarExcel}
                        disabled={loading || tickets.length === 0}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold px-4 h-8 rounded shadow-none flex items-center gap-1.5"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Exportar a Excel
                    </Button>
                </div>

                {/* Lista de Tarjetas de Tickets */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                        <p className="text-gray-600 font-medium">Cargando tickets pendientes y movimientos bancarios...</p>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-gray-800">¡Todo al día!</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                            No hay tickets pendientes de conciliación en el rango del <strong>{desde}</strong> al <strong>{hasta}</strong>.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {tickets.map((ticket) => {
                            const montoTicketNum = parseFloat(ticket.monto?.toString() || "0");
                            const currentAmountFilter = amountFilterByTicket[ticket.id] ?? montoTicketNum.toFixed(2);
                            const selectedMovValue = selectedMovByTicket[ticket.id];

                            // Filtrar los movimientos disponibles para este ticket según el filtro de monto
                            const filteredMovimientos = movimientos.filter((m) => {
                                if (currentAmountFilter === "TODOS") return true;
                                const filterNum = parseFloat(currentAmountFilter);
                                const movAbonoNum = parseFloat(m.abono?.toString() || "0");
                                if (isNaN(filterNum)) return true;
                                return Math.abs(movAbonoNum - filterNum) < 0.01;
                            });

                            // Obtener el objeto del movimiento seleccionado actualmente
                            let selectedMovObj: any = null;
                            if (selectedMovValue) {
                                const [tTabla, tId] = selectedMovValue.split("__");
                                selectedMovObj = movimientos.find(m => m.tabla === tTabla && String(m.id) === String(tId));
                            }

                            const gestorDisplay = ticket.gestor?.codigoGestor || ticket.cliente?.cobradorAsignado?.codigoGestor || ticket.gestor?.name || "Sin Asignar";

                            return (
                                <div
                                    key={ticket.id}
                                    className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-blue-600 p-6 shadow-sm relative transition-all"
                                >
                                    {/* Cabecera del Contrato */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                                Contrato: {ticket.cliente?.codigoCliente || "SIN_CONTRATO"}
                                            </h2>
                                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-0.5">
                                                {ticket.cliente?.nombreCompleto || "Cliente Desconocido"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleVerComprobante(ticket)}
                                                className="h-8 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-1 font-semibold"
                                                title="Ver comprobante"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Ver Comprobante
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={actionLoading[ticket.id]}
                                                onClick={() => handleDescartar(ticket.id)}
                                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 h-8 rounded text-xs transition-colors shadow-none"
                                            >
                                                {actionLoading[ticket.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Descartar"}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* 4 Cajas de Resumen en Fila */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800">
                                            <span className="font-bold">ID:</span> {ticket.folio || ticket.legacyId || ticket.id}
                                        </div>
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800">
                                            <span className="font-bold">Monto:</span> {formatCurrency(montoTicketNum)}
                                        </div>
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 truncate" title={formatDateTimeLocal(ticket.fecha || ticket.creadoEn)}>
                                            <span className="font-bold">Fecha:</span> {formatDateTimeLocal(ticket.fecha || ticket.creadoEn)}
                                        </div>
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800">
                                            <span className="font-bold">Gestor:</span> {gestorDisplay}
                                        </div>
                                    </div>

                                    {/* Separador punteado */}
                                    <div className="border-t border-dotted border-gray-300 my-4" />

                                    {/* Sección de Selección y Filtrado de Movimiento Bancario */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-semibold text-gray-700 mb-1 block">
                                                Filtrar:
                                            </label>
                                            <select
                                                value={currentAmountFilter}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setAmountFilterByTicket(prev => ({ ...prev, [ticket.id]: val }));
                                                }}
                                                className="w-full h-9 bg-white border border-gray-300 rounded-md px-3 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                                            >
                                                <option value={montoTicketNum.toFixed(2)}>{montoTicketNum.toFixed(2)} (Monto del ticket)</option>
                                                <option value="TODOS">Todos los montos</option>
                                                {/* Obtener otros montos únicos presentes en los movimientos */}
                                                {Array.from(new Set(movimientos.map(m => parseFloat(m.abono?.toString() || "0").toFixed(2))))
                                                    .filter(amt => amt !== montoTicketNum.toFixed(2))
                                                    .sort((a, b) => parseFloat(a) - parseFloat(b))
                                                    .map(amt => (
                                                        <option key={amt} value={amt}>{amt}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>

                                        {/* Dropdown de Movimiento Bancario */}
                                        <div>
                                            <select
                                                value={selectedMovValue || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSelectedMovByTicket(prev => ({ ...prev, [ticket.id]: val }));
                                                }}
                                                className="w-full h-9 bg-white border border-gray-300 rounded-md px-3 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono truncate"
                                            >
                                                <option value="">-- Seleccionar Movimiento Bancario --</option>
                                                {filteredMovimientos.map((mov) => {
                                                    const valKey = `${mov.tabla}__${mov.id}`;
                                                    const fechaOperacionStr = mov.fechaOperacion ? mov.fechaOperacion.toString().slice(0, 10) : "N/A";
                                                    const montoMov = parseFloat(mov.abono?.toString() || "0").toFixed(2);
                                                    const label = `ID: ${mov.id} | Fecha: ${fechaOperacionStr} | Monto: ${montoMov} | Desc: ${mov.descripcionGeneral || mov.concepto || "ABONO"} | Concepto: ${(mov.concepto || mov.descripcionDetallada || "").slice(0, 45)}...`;
                                                    return (
                                                        <option key={valKey} value={valKey}>
                                                            {label}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        {/* Vista Previa Detallada del Movimiento Seleccionado */}
                                        {selectedMovObj && (
                                            <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-[11px] font-mono text-gray-800 leading-relaxed break-words select-text">
                                                <p>
                                                    <strong>ID:</strong> {selectedMovObj.id} |{" "}
                                                    <strong>Fecha:</strong> {selectedMovObj.fechaOperacion ? selectedMovObj.fechaOperacion.toString().slice(0, 10) : "N/A"} |{" "}
                                                    <strong>Monto:</strong> ${parseFloat(selectedMovObj.abono?.toString() || "0").toFixed(2)} |{" "}
                                                    <strong>Desc:</strong> {selectedMovObj.descripcionGeneral || "ABONO TRANSFERENCIA SPEI"} |{" "}
                                                    <strong>Concepto:</strong> {selectedMovObj.concepto || "N/A"}{" "}
                                                    {selectedMovObj.descripcionDetallada ? `| Origen: ${selectedMovObj.descripcionDetallada}` : ""}{" "}
                                                    {selectedMovObj.bancoOrigen ? `(${selectedMovObj.bancoOrigen})` : ""}{" "}
                                                    | <strong>Banco Destino:</strong> {selectedMovObj.bancoDestino || "SANTANDER"}
                                                </p>
                                            </div>
                                        )}

                                        {/* Botón Grande de Conciliar */}
                                        <Button
                                            type="button"
                                            onClick={() => handleConciliarPago(ticket)}
                                            disabled={actionLoading[ticket.id] || !selectedMovObj}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
                                        >
                                            {actionLoading[ticket.id] ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            Conciliar Pago
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de Vista de Comprobante con Zoom */}
            <Dialog open={!!viewingTicket} onOpenChange={(open) => !open && setViewingTicket(null)}>
                <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-5">
                    <DialogHeader className="pb-2 border-b">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <DialogTitle className="text-lg font-bold text-gray-900">
                                    Comprobante Ticket #{viewingTicket?.id} ({viewingTicket?.cliente?.codigoCliente})
                                </DialogTitle>
                                <DialogDescription className="text-xs text-gray-500">
                                    {viewingTicket?.cliente?.nombreCompleto} — Monto: {formatCurrency(viewingTicket?.monto || 0)}
                                </DialogDescription>
                            </div>

                            {/* Barra de Herramientas de Zoom */}
                            {ticketImage && !imageLoading && (
                                <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg border">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleZoomOut}
                                        disabled={zoomScale <= 0.5}
                                        className="h-7 w-7 p-0 text-gray-700 hover:bg-white"
                                        title="Reducir Zoom (-)"
                                    >
                                        <ZoomOut className="w-4 h-4" />
                                    </Button>
                                    <span className="text-[11px] font-mono font-bold text-gray-700 w-12 text-center">
                                        {Math.round(zoomScale * 100)}%
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleZoomIn}
                                        disabled={zoomScale >= 3.5}
                                        className="h-7 w-7 p-0 text-gray-700 hover:bg-white"
                                        title="Aumentar Zoom (+)"
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetZoom}
                                        className="h-7 px-2 text-[10px] text-gray-700 hover:bg-white font-semibold"
                                        title="Restablecer a tamaño normal"
                                    >
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                        100%
                                    </Button>
                                    <a
                                        href={ticketImage}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-7 px-2 text-[10px] text-blue-600 hover:bg-white font-semibold inline-flex items-center rounded transition-colors"
                                        title="Abrir imagen completa en pestaña nueva"
                                    >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        Pestaña
                                    </a>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {/* Contenedor del Comprobante con Zoom y Scroll */}
                    <div className="flex-1 min-h-[350px] max-h-[70vh] overflow-auto bg-slate-900/5 rounded-xl border p-4 flex items-center justify-center relative mt-3 select-none">
                        {imageLoading ? (
                            <div className="flex flex-col items-center justify-center text-gray-400 gap-2 py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                <p className="text-xs font-medium">Buscando comprobante...</p>
                            </div>
                        ) : ticketImage ? (
                            <div
                                className="transition-transform duration-200 ease-out origin-center cursor-pointer flex items-center justify-center"
                                style={{ transform: `scale(${zoomScale})` }}
                                onClick={toggleZoomClick}
                                title={zoomScale > 1.1 ? "Click para reducir zoom" : "Click para ampliar zoom"}
                            >
                                <img
                                    src={ticketImage}
                                    alt="Comprobante"
                                    className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md pointer-events-none"
                                />
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <p className="text-sm font-semibold text-gray-600">No se encontró imagen adjunta</p>
                                <p className="text-xs text-gray-400 mt-1">Este ticket fue registrado directamente sin captura visual.</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
