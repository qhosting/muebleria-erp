"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Loader2,
    Download,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Search,
    RefreshCcw,
    Eye,
    ExternalLink,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Maximize2,
    Calendar,
    Filter,
    Zap,
    Sparkles,
    CheckCheck,
    CheckSquare,
    Square,
    Check,
    X,
    Building,
    ArrowRight,
    ShieldCheck,
    User,
    Hash,
    FileText
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Función para calcular el rango de la semana de cobranza (Sábado a Viernes)
function getSabadoAViernesRange(offsetWeeks = 0) {
    const now = new Date();
    now.setDate(now.getDate() + offsetWeeks * 7);
    const dayOfWeek = now.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb
    const daysSinceSaturday = (dayOfWeek + 1) % 7;

    const startSabado = new Date(now);
    startSabado.setDate(now.getDate() - daysSinceSaturday);

    const endViernes = new Date(startSabado);
    endViernes.setDate(startSabado.getDate() + 6);

    return {
        desde: startSabado.toISOString().split("T")[0],
        hasta: endViernes.toISOString().split("T")[0]
    };
}

// Función inteligente para extraer y formatear la hora de operación (HH:MM / HH:MM:SS) de cualquier movimiento bancario
function extractHoraOperacion(mov: any): string {
    if (!mov) return "";

    // Si se pasa directamente un string o date
    if (typeof mov === "string" || mov instanceof Date) {
        return formatHoraString(mov);
    }

    // 1. Extraer del campo horaOperacion
    if (mov.horaOperacion) {
        const res = formatHoraString(mov.horaOperacion);
        if (res && res !== "00:00" && res !== "00:00:00") return res;
    }

    // 2. Extraer de fechaOperacion si contiene hora (distinta a medianoche 00:00 UTC)
    if (mov.fechaOperacion) {
        const res = formatHoraFromDateTime(mov.fechaOperacion);
        if (res && res !== "00:00" && res !== "00:00:00") return res;
    }

    // 3. Buscar patrón de hora en descripcionDetallada, concepto o descripcionGeneral
    const textPool = `${mov.descripcionDetallada || ''} ${mov.concepto || ''} ${mov.descripcionGeneral || ''}`;
    if (textPool.trim()) {
        const match = textPool.match(/(?:(?:HORA|HR|HRS|A LAS)\s*:?\s*)?([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/i);
        if (match) {
            const hh = match[1].padStart(2, '0');
            const mm = match[2].padStart(2, '0');
            const ss = match[3] ? `:${match[3].padStart(2, '0')}` : '';
            return `${hh}:${mm}${ss}`;
        }
    }

    // 4. Fallback a fechaIngreso si existe hora registrada
    if (mov.fechaIngreso) {
        const res = formatHoraFromDateTime(mov.fechaIngreso);
        if (res && res !== "00:00" && res !== "00:00:00") return res;
    }

    return "";
}

function formatHoraString(val: any): string {
    if (!val) return "";
    const str = String(val).trim();

    // Formato directo HH:MM o HH:MM:SS
    const simpleMatch = str.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (simpleMatch) {
        const hh = simpleMatch[1].padStart(2, '0');
        const mm = simpleMatch[2].padStart(2, '0');
        const ss = simpleMatch[3] ? `:${simpleMatch[3].padStart(2, '0')}` : '';
        return `${hh}:${mm}${ss}`;
    }

    // Formato ISO string con T (ej: 1970-01-01T15:25:00.000Z o 2026-09-01T15:25:00Z)
    if (str.includes("T")) {
        const timePart = str.split("T")[1];
        if (timePart) {
            const m = timePart.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/);
            if (m) {
                const hh = m[1].padStart(2, '0');
                const mm = m[2].padStart(2, '0');
                const ss = m[3] ? `:${m[3].padStart(2, '0')}` : '';
                if (hh !== "00" || mm !== "00") return `${hh}:${mm}${ss}`;
            }
        }
    }

    try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            // Si es fecha base 1970, tomar UTC
            if (d.getUTCFullYear() === 1970) {
                const hh = String(d.getUTCHours()).padStart(2, '0');
                const mm = String(d.getUTCMinutes()).padStart(2, '0');
                const ss = String(d.getUTCSeconds()).padStart(2, '0');
                if (hh !== "00" || mm !== "00") {
                    return ss !== "00" ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
                }
            }
            return new Intl.DateTimeFormat('es-MX', {
                timeZone: 'America/Mexico_City',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(d);
        }
    } catch {}

    return str;
}

function formatHoraFromDateTime(val: any): string {
    if (!val) return "";
    try {
        const d = typeof val === "string" ? new Date(val) : val;
        if (d instanceof Date && !isNaN(d.getTime())) {
            // Si no es medianoche exacta UTC (00:00:00.000Z)
            if (!(d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0)) {
                return new Intl.DateTimeFormat('es-MX', {
                    timeZone: 'America/Mexico_City',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).format(d);
            }
        }
    } catch {}
    return "";
}

// Función para formatear Fecha y Hora completa en zona horaria CDMX (YYYY-MM-DD HH:MM:SS)
function formatDateTime(val: any): string {
    if (!val) return "N/A";
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        return new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(d);
    } catch {
        return String(val);
    }
}

export default function ConciliadorPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [movimientos, setMovimientos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    // Mapeo de índice numérico corto (0, 1, 2...) para cada movimiento bancario disponible
    const globalMovIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        movimientos.forEach((m, idx) => {
            map.set(`${m.tabla}__${m.id}`, idx);
        });
        return map;
    }, [movimientos]);

    // Rango inicial de fecha: Semana actual (Sábado a Viernes)
    const initialWeek = getSabadoAViernesRange();
    const [desde, setDesde] = useState(initialWeek.desde);
    const [hasta, setHasta] = useState(initialWeek.hasta);
    const [estadoFiltro, setEstadoFiltro] = useState<string>("PENDIENTE"); // PENDIENTE, CONCILIADO, TODOS

    // Estado por cada ticket para el movimiento seleccionado y el filtro de monto
    const [selectedMovByTicket, setSelectedMovByTicket] = useState<Record<string, string>>({});
    const [amountFilterByTicket, setAmountFilterByTicket] = useState<Record<string, string>>({});

    // Modal de imagen de comprobante con Zoom
    const [viewingTicket, setViewingTicket] = useState<any | null>(null);
    const [ticketImage, setTicketImage] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(false);
    const [zoomScale, setZoomScale] = useState<number>(1);

    // Estado para Auto-Conciliación Inteligente SPEI
    const [autoSpeiLoading, setAutoSpeiLoading] = useState(false);
    const [autoSpeiResult, setAutoSpeiResult] = useState<any | null>(null);
    const [previewMatches, setPreviewMatches] = useState<any[] | null>(null);
    const [selectedMatches, setSelectedMatches] = useState<Record<string, boolean>>({});
    const [isConfirmingSpei, setIsConfirmingSpei] = useState(false);

    useEffect(() => {
        fetchData();
    }, [estadoFiltro]);

    const fetchData = async (customDesde?: string, customHasta?: string, customEstado?: string) => {
        setLoading(true);
        try {
            const d = customDesde !== undefined ? customDesde : desde;
            const h = customHasta !== undefined ? customHasta : hasta;
            const est = customEstado !== undefined ? customEstado : estadoFiltro;

            const params = new URLSearchParams();
            if (d) params.append("desde", d);
            if (h) params.append("hasta", h);
            if (est) params.append("estado", est);

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
        fetchData(desde, hasta, estadoFiltro);
    };

    const setSemanaActual = () => {
        const week = getSabadoAViernesRange(0);
        setDesde(week.desde);
        setHasta(week.hasta);
        fetchData(week.desde, week.hasta, estadoFiltro);
    };

    const setSemanaAnterior = () => {
        const week = getSabadoAViernesRange(-1);
        setDesde(week.desde);
        setHasta(week.hasta);
        fetchData(week.desde, week.hasta, estadoFiltro);
    };

    // 1. Escanear y Previsualizar Coincidencias SPEI sin conciliar todavía
    const handleAutoConciliarSpei = async () => {
        setAutoSpeiLoading(true);
        try {
            const res = await fetch("/api/tesoreria/conciliador", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "preview_spei"
                })
            });

            const data = await res.json();
            if (res.ok) {
                if (data.matchesCount > 0 && Array.isArray(data.matches)) {
                    setPreviewMatches(data.matches);
                    // Por defecto, marcar todas las coincidencias como aprobadas/seleccionadas
                    const initialSelection: Record<string, boolean> = {};
                    data.matches.forEach((m: any) => {
                        initialSelection[m.matchKey] = true;
                    });
                    setSelectedMatches(initialSelection);
                } else {
                    toast.info("No se encontraron tickets pendientes con Clave de Rastreo SPEI coincidente en los movimientos bancarios.");
                }
            } else {
                toast.error(data.error || "Error al escanear coincidencias SPEI");
            }
        } catch (error) {
            console.error("Error al escanear coincidencias SPEI:", error);
            toast.error("Error de conexión al consultar coincidencias SPEI");
        } finally {
            setAutoSpeiLoading(false);
        }
    };

    // Alternar selección individual de una coincidencia
    const toggleMatchSelection = (matchKey: string) => {
        setSelectedMatches(prev => ({
            ...prev,
            [matchKey]: !prev[matchKey]
        }));
    };

    // Seleccionar o deseleccionar todas las coincidencias
    const toggleSelectAllMatches = (select: boolean) => {
        if (!previewMatches) return;
        const newSelection: Record<string, boolean> = {};
        previewMatches.forEach(m => {
            newSelection[m.matchKey] = select;
        });
        setSelectedMatches(newSelection);
    };

    // 2. Ejecutar la conciliación solo de las cuentas aprobadas
    const handleConfirmApprovedSpei = async () => {
        if (!previewMatches) return;

        const approvedList = previewMatches.filter(m => selectedMatches[m.matchKey]);
        if (approvedList.length === 0) {
            toast.warning("Debes seleccionar al menos una cuenta para conciliar");
            return;
        }

        setIsConfirmingSpei(true);
        try {
            const res = await fetch("/api/tesoreria/conciliador", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "confirm_spei",
                    matches: approvedList.map(m => ({
                        ticketId: m.ticketId,
                        movimientoId: m.movimientoId,
                        tabla: m.tabla
                    }))
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(`🎉 ¡${data.conciliadosCount} ticket(s) conciliado(s) exitosamente!`);
                setPreviewMatches(null);
                setAutoSpeiResult(data);
                fetchData(desde, hasta, estadoFiltro);
            } else {
                toast.error(data.error || "Error al conciliar las cuentas seleccionadas");
            }
        } catch (error) {
            console.error("Error al confirmar conciliación SPEI:", error);
            toast.error("Error de conexión al conciliar las cuentas");
        } finally {
            setIsConfirmingSpei(false);
        }
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
                if (estadoFiltro === "PENDIENTE") {
                    // Si estamos viendo solo no conciliados, remover el ticket de la vista
                    setTickets(prev => prev.filter(t => t.id !== ticket.id));
                } else {
                    // Si estamos viendo Todos o Conciliados, marcarlo como conciliado
                    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, conciliado: true } : t));
                }
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
            ["Fecha", "Contrato", "Cliente", "ID Folio Ticket", "ID Sistema", "Pago Vinculado", "ID Pago", "Gestor", "Monto", "Estado"],
            ...tickets.map(t => [
                (t.fecha || t.creadoEn || "").slice(0, 19),
                `"${t.cliente?.codigoCliente || "N/A"}"`,
                `"${t.cliente?.nombreCompleto || "N/A"}"`,
                `"${t.folio || t.referencia || t.legacyId || t.id}"`,
                `"${t.id}"`,
                (t.pagos && t.pagos.length > 0) ? "APLICADO" : "SIN APLICAR",
                `"${(t.pagos && t.pagos.length > 0) ? t.pagos.map((p: any) => p.id).join("; ") : "-"}"`,
                `"${t.gestor?.codigoGestor || t.cliente?.cobradorAsignado?.codigoGestor || "-"}"`,
                t.monto,
                t.conciliado ? "CONCILIADO" : "NO CONCILIADO"
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Conciliacion-${estadoFiltro}-${desde}-al-${hasta}.csv`;
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
                {/* Header y Filtros Superiores */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center gap-4">
                    <form onSubmit={handleFiltrar} className="flex flex-wrap items-center justify-center gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700 text-xs">Desde:</span>
                            <Input
                                type="date"
                                value={desde}
                                onChange={(e) => setDesde(e.target.value)}
                                className="w-36 h-9 text-xs font-mono bg-gray-50 border-gray-300 rounded"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700 text-xs">Hasta:</span>
                            <Input
                                type="date"
                                value={hasta}
                                onChange={(e) => setHasta(e.target.value)}
                                className="w-36 h-9 text-xs font-mono bg-gray-50 border-gray-300 rounded"
                            />
                        </div>

                        {/* Filtro de Estado de Conciliación */}
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700 text-xs">Estado:</span>
                            <select
                                value={estadoFiltro}
                                onChange={(e) => setEstadoFiltro(e.target.value)}
                                className="h-9 bg-gray-50 border border-gray-300 rounded px-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="PENDIENTE">No Conciliados (Pendientes)</option>
                                <option value="CONCILIADO">Conciliados</option>
                                <option value="TODOS">Todos (Pendientes y Conciliados)</option>
                            </select>
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

                    {/* Accesos Rápidos de Rango Semanal y Exportar */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAutoConciliarSpei}
                            disabled={autoSpeiLoading || loading}
                            className="h-7 text-[11px] font-bold px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded shadow-sm flex items-center gap-1.5 transition-all"
                            title="Conciliar automáticamente todos los tickets con Clave de Rastreo SPEI en bancos"
                        >
                            {autoSpeiLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                            )}
                            Auto-Conciliar SPEI
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={setSemanaActual}
                            className="h-7 text-[11px] px-3 font-semibold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 rounded"
                            title="Semana de Cobranza Actual (Sábado a Viernes)"
                        >
                            <Calendar className="w-3 h-3 mr-1" />
                            Semana Actual (Sáb - Vie)
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={setSemanaAnterior}
                            className="h-7 text-[11px] px-3 font-semibold border-gray-200 text-gray-700 hover:bg-gray-100 rounded"
                        >
                            Semana Anterior (Sáb - Vie)
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={exportarExcel}
                            disabled={loading || tickets.length === 0}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-[11px] font-semibold px-3 h-7 rounded shadow-none flex items-center gap-1.5"
                        >
                            <Download className="w-3 h-3" />
                            Exportar a Excel
                        </Button>
                    </div>
                </div>

                {/* Lista de Tarjetas de Tickets */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
                        <p className="text-gray-600 font-medium">Cargando tickets ({estadoFiltro.toLowerCase()}) y movimientos bancarios...</p>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-gray-800">
                            {estadoFiltro === "PENDIENTE" ? "¡Todo al día! Sin tickets pendientes" : "No se encontraron tickets"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                            No hay tickets registrados con estado <strong>{estadoFiltro}</strong> en el rango del <strong>{desde}</strong> al <strong>{hasta}</strong>.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {tickets.map((ticket) => {
                            const montoTicketNum = parseFloat(ticket.monto?.toString() || "0");
                            const currentAmountFilter = amountFilterByTicket[ticket.id] ?? montoTicketNum.toFixed(2);
                            const selectedMovValue = selectedMovByTicket[ticket.id];
                            const tienePago = ticket.pagos && ticket.pagos.length > 0;
                            const pagoPrincipal = tienePago ? ticket.pagos[0] : null;
                            const folioDisplay = ticket.folio || ticket.referencia || (ticket.legacyId ? `#${ticket.legacyId}` : ticket.id);
                            const estaConciliado = ticket.conciliado;

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
                                    className={`bg-white rounded-xl border border-gray-200 border-l-4 ${
                                        estaConciliado ? "border-l-emerald-600 bg-emerald-50/10" : "border-l-blue-600"
                                    } p-6 shadow-sm relative transition-all`}
                                >
                                    {/* Cabecera del Contrato */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                                    Contrato: {ticket.cliente?.codigoCliente || "SIN_CONTRATO"}
                                                </h2>
                                                {estaConciliado ? (
                                                    <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold">
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                        Conciliado
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-bold">
                                                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                                        No Conciliado
                                                    </Badge>
                                                )}
                                            </div>
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
                                            {!estaConciliado && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    disabled={actionLoading[ticket.id]}
                                                    onClick={() => handleDescartar(ticket.id)}
                                                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 h-8 rounded text-xs transition-colors shadow-none"
                                                >
                                                    {actionLoading[ticket.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Descartar"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cajas de Información del Ticket (8 campos) */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-4">
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800" title={`ID: ${ticket.id}`}>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">TICKET ID:</span>
                                            <span className="font-mono font-bold text-gray-900 truncate block mt-0.5">
                                                {ticket.legacyId ? ticket.legacyId : ticket.id}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">MONTO:</span>
                                            <span className="font-bold text-gray-900 block mt-0.5">{formatCurrency(montoTicketNum)}</span>
                                        </div>
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">FECHA:</span>
                                            <span className="font-medium text-gray-900 truncate block mt-0.5" title={formatDateTime(ticket.fecha || ticket.creadoEn)}>
                                                {formatDateTime(ticket.fecha || ticket.creadoEn)}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">FOLIO:</span>
                                            <span className="font-mono font-semibold text-gray-900 truncate block mt-0.5">{ticket.folio ? ticket.folio : "null"}</span>
                                        </div>
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">GESTOR:</span>
                                            <span className="font-bold text-blue-900 truncate block mt-0.5">{gestorDisplay}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5">
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">REF:</span>
                                            <span className="font-mono font-semibold text-gray-900 truncate block mt-0.5">{ticket.referencia || "null"}</span>
                                        </div>
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">RASTREO:</span>
                                            <span className="font-mono font-semibold text-blue-700 truncate block mt-0.5" title={ticket.claveRastreo || "null"}>
                                                {ticket.claveRastreo || "null"}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50/90 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">REMITENTE:</span>
                                            <span className="font-mono text-gray-700 truncate block mt-0.5" title={ticket.remitente || "null"}>
                                                {ticket.remitente || "null"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Caja de Pago Vinculado a este Ticket */}
                                    {tienePago && pagoPrincipal ? (
                                        <div className="mt-3 bg-emerald-50/90 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-200 text-emerald-900">
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                                                    Pago Vinculado
                                                </span>
                                                <span className="font-mono font-bold text-gray-900">
                                                    ID: #{pagoPrincipal.id}
                                                </span>
                                                {pagoPrincipal.metodoPago && (
                                                    <span className="text-[11px] text-emerald-800 font-medium">
                                                        ({pagoPrincipal.metodoPago})
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] font-mono text-emerald-900 flex items-center gap-2">
                                                <span>Monto: <strong>{formatCurrency(pagoPrincipal.monto)}</strong></span>
                                                <span>•</span>
                                                <span>{formatDateTimeLocal(pagoPrincipal.fechaPago)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-3 bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200 text-amber-900">
                                                    <AlertCircle className="w-3 h-3 mr-1 text-amber-700" />
                                                    Sin Pago en Sistema
                                                </span>
                                                <span className="text-amber-800 text-[11px]">
                                                    El abono se aplicará y registrará automáticamente a la cuenta al conciliar
                                                </span>
                                            </div>
                                        </div>
                                    )}

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
                                                disabled={estaConciliado}
                                                className="w-full h-9 bg-white border border-gray-300 rounded-md px-3 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono truncate disabled:bg-gray-100"
                                            >
                                                <option value="">-- Seleccionar Movimiento Bancario --</option>
                                                {filteredMovimientos.map((mov, idx) => {
                                                    const valKey = `${mov.tabla}__${mov.id}`;
                                                    const movIndex = globalMovIndexMap.get(valKey) ?? idx;
                                                    const fechaOperacionStr = mov.fechaOperacion ? mov.fechaOperacion.toString().slice(0, 10) : "N/A";
                                                    const horaOperacionStr = extractHoraOperacion(mov);
                                                    const horaLabel = horaOperacionStr ? ` | Hr: ${horaOperacionStr}` : "";
                                                    const montoMov = parseFloat(mov.abono?.toString() || "0").toFixed(2);
                                                    const bancoLabel = mov.bancoDestino || (mov.cuentaDestino ? `CTA ${mov.cuentaDestino}` : "BANCO");
                                                    const rastreoShort = mov.claveRastreo ? ` | Rastreo: ${mov.claveRastreo}` : "";
                                                    const refShort = mov.referencia ? ` | Ref: ${mov.referencia}` : "";
                                                    const conceptoShort = mov.concepto ? ` | Concepto: ${mov.concepto}` : ` | Desc: ${mov.descripcionGeneral || "ABONO"}`;
                                                    const label = `ID: ${movIndex} | ${fechaOperacionStr}${horaLabel} | $${montoMov} | [${bancoLabel}]${conceptoShort}${refShort}${rastreoShort}`;
                                                    return (
                                                        <option key={valKey} value={valKey}>
                                                            {label}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        {/* Vista Previa Detallada del Movimiento Seleccionado (Cajas Completas) */}
                                        {selectedMovObj && (() => {
                                            const selectedValKey = `${selectedMovObj.tabla}__${selectedMovObj.id}`;
                                            const selectedMovIdx = globalMovIndexMap.get(selectedValKey) ?? 0;
                                            const horaStr = extractHoraOperacion(selectedMovObj);
                                            const montoMovNum = parseFloat(selectedMovObj.abono?.toString() || "0");
                                            const fechaOperacionStr = selectedMovObj.fechaOperacion ? selectedMovObj.fechaOperacion.toString().slice(0, 10) : "N/A";
                                            const cuentaDestinoStr = selectedMovObj.cuentaDestino || (selectedMovObj.tabla?.includes("22001022837") ? "22001022837" : selectedMovObj.tabla?.includes("65505732541") ? "65505732541" : selectedMovObj.tabla?.includes("0330253963") ? "0330253963" : "N/A");
                                            const bancoDestinoStr = selectedMovObj.bancoDestino || (selectedMovObj.tabla?.includes("Banorte") ? "BANORTE" : "SANTANDER");

                                            return (
                                                <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs space-y-2.5 shadow-2xs">
                                                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900">
                                                                🏦 Movimiento Bancario: ID #{selectedMovIdx}
                                                            </span>
                                                            <span className="text-[11px] font-semibold text-slate-700">
                                                                {bancoDestinoStr} ({cuentaDestinoStr})
                                                            </span>
                                                        </div>
                                                        <span className="font-bold text-sm text-emerald-700">
                                                            {formatCurrency(montoMovNum)}
                                                        </span>
                                                    </div>

                                                    {/* Grid de Cajas de Datos del Movimiento Bancario */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        <div className="bg-white border border-slate-200 rounded p-2">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ID MOVIMIENTO:</span>
                                                            <span className="font-mono font-bold text-slate-900 block mt-0.5">
                                                                ID: {selectedMovIdx}
                                                            </span>
                                                        </div>
                                                        <div className="bg-white border border-slate-200 rounded p-2">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">FECHA OPERACIÓN:</span>
                                                            <span className="font-medium text-slate-900 block mt-0.5">
                                                                {fechaOperacionStr}
                                                            </span>
                                                        </div>
                                                        <div className="bg-white border border-slate-200 rounded p-2">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">HORA OPERACIÓN:</span>
                                                            <span className="font-mono font-medium text-slate-900 block mt-0.5">
                                                                {horaStr || "N/A"}
                                                            </span>
                                                        </div>
                                                        <div className="bg-white border border-slate-200 rounded p-2">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">BANCO ORIGEN:</span>
                                                            <span className="font-bold text-slate-900 block mt-0.5 truncate" title={selectedMovObj.bancoOrigen || "N/A"}>
                                                                {selectedMovObj.bancoOrigen || "N/A"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div className="bg-white border border-slate-200 rounded p-2">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">REFERENCIA:</span>
                                                            <span className="font-mono font-semibold text-slate-900 block mt-0.5 truncate" title={selectedMovObj.referencia || "null"}>
                                                                {selectedMovObj.referencia || "null"}
                                                            </span>
                                                        </div>
                                                        <div className="bg-white border border-slate-200 rounded p-2">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CLAVE DE RASTREO SPEI:</span>
                                                            <span className="font-mono font-semibold text-blue-800 block mt-0.5 truncate" title={selectedMovObj.claveRastreo || "null"}>
                                                                {selectedMovObj.claveRastreo || "null"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div className="bg-white border border-slate-200 rounded p-2">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CONCEPTO / MOTIVO:</span>
                                                            <span className="font-medium text-slate-900 block mt-0.5 break-words">
                                                                {selectedMovObj.concepto || selectedMovObj.descripcionGeneral || "ABONO TRANSFERENCIA SPEI"}
                                                            </span>
                                                        </div>
                                                        <div className="bg-white border border-slate-200 rounded p-2">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ORDENANTE / DETALLES:</span>
                                                            <span className="font-medium text-slate-900 block mt-0.5 break-words">
                                                                {selectedMovObj.descripcionDetallada || selectedMovObj.cuentaEmisor || "N/A"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Botón Grande de Conciliar */}
                                        {estaConciliado ? (
                                            <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold py-2.5 rounded-lg text-sm text-center flex items-center justify-center gap-2 mt-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                Ticket Conciliado en Banco
                                            </div>
                                        ) : (
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
                                        )}
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
                                    Comprobante Ticket #{viewingTicket?.folio || viewingTicket?.id} ({viewingTicket?.cliente?.codigoCliente})
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

            {/* Modal Interactivo de Previsualización y Aprobación de Coincidencias SPEI */}
            <Dialog open={!!previewMatches} onOpenChange={(open) => !open && !isConfirmingSpei && setPreviewMatches(null)}>
                <DialogContent className="max-w-4xl p-6 max-h-[90vh] flex flex-col">
                    <DialogHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        Aprobación de Coincidencias SPEI
                                        <Badge className="bg-emerald-600 text-white font-mono text-xs">
                                            {previewMatches?.length || 0} encontradas
                                        </Badge>
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-gray-500 mt-0.5">
                                        Revisa los detalles de cada ticket y cuenta bancaria emparejada. Puedes aprobar o desmarcar las que no desees conciliar.
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>

                        {/* Barra de Acciones Rápidas y Resumen de Selección */}
                        {previewMatches && (
                            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleSelectAllMatches(true)}
                                        className="h-7 text-[11px] px-2.5 bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-semibold flex items-center gap-1"
                                    >
                                        <CheckSquare className="w-3.5 h-3.5" />
                                        Seleccionar Todas
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleSelectAllMatches(false)}
                                        className="h-7 text-[11px] px-2.5 bg-white text-gray-600 border-gray-300 hover:bg-gray-100 font-semibold flex items-center gap-1"
                                    >
                                        <Square className="w-3.5 h-3.5" />
                                        Deseleccionar Todas
                                    </Button>
                                </div>

                                <div className="flex items-center gap-4 text-xs">
                                    <span className="text-gray-600">
                                        Aprobadas:{" "}
                                        <strong className="text-emerald-700 font-bold font-mono">
                                            {previewMatches.filter(m => selectedMatches[m.matchKey]).length} de {previewMatches.length}
                                        </strong>
                                    </span>
                                    <span className="text-gray-600">
                                        Monto total a conciliar:{" "}
                                        <strong className="text-gray-900 font-bold font-mono">
                                            {formatCurrency(
                                                previewMatches
                                                    .filter(m => selectedMatches[m.matchKey])
                                                    .reduce((sum, m) => sum + (m.ticket?.monto || 0), 0)
                                            )}
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        )}
                    </DialogHeader>

                    {/* Lista de Tarjetas de Coincidencias */}
                    <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
                        {previewMatches?.map((m) => {
                            const isSelected = !!selectedMatches[m.matchKey];
                            return (
                                <div
                                    key={m.matchKey}
                                    onClick={() => toggleMatchSelection(m.matchKey)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                        isSelected
                                            ? "bg-emerald-50/50 border-emerald-400 shadow-sm"
                                            : "bg-gray-50/70 border-gray-200 opacity-60 hover:opacity-100"
                                    }`}
                                >
                                    {/* Botón de Check / Toggle */}
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                                isSelected
                                                    ? "bg-emerald-600 text-white shadow"
                                                    : "border-2 border-gray-300 bg-white text-transparent"
                                            }`}
                                        >
                                            <Check className="w-4 h-4 stroke-[3]" />
                                        </div>
                                    </div>

                                    {/* Columna Izquierda: Información del Ticket */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            {m.tipoMatch === 'SPEI_EXACTO' ? (
                                                <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-sm">
                                                    <Zap className="w-3 h-3 fill-amber-300 text-amber-300" />
                                                    SPEI Exacto
                                                </Badge>
                                            ) : m.tipoMatch === 'CONTRATO_DP_DQ' ? (
                                                <Badge className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-sm">
                                                    <FileText className="w-3 h-3 text-white" />
                                                    Contrato DP/DQ
                                                </Badge>
                                            ) : m.tipoMatch === 'NOMBRE_CLIENTE' ? (
                                                <Badge className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-sm">
                                                    <User className="w-3 h-3 text-white" />
                                                    Nombre Cliente
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 font-bold">
                                                    {m.tipoMatch || 'Sugerencia'}
                                                </Badge>
                                            )}

                                            <Badge variant="outline" className="text-[10px] font-mono bg-white font-bold border-indigo-200 text-indigo-700">
                                                Ticket #{m.ticket.id}
                                            </Badge>
                                            <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                                                {m.ticket.contrato}
                                            </span>
                                            {m.ticket.tienePago ? (
                                                <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200">
                                                    Pago Vinculado
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                                                    Crea Pago Nuevo
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-gray-900 truncate">
                                            {m.ticket.nombre}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                                            <span className="font-semibold text-gray-500">Rastreo SPEI:</span>
                                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 break-all">
                                                {m.ticket.claveRastreo || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Separador / Flecha */}
                                    <div className="hidden md:flex flex-col items-center justify-center px-2 text-gray-400">
                                        <ArrowRight className="w-5 h-5 text-emerald-600" />
                                    </div>

                                    {/* Columna Derecha: Información Bancaria */}
                                    <div className="flex-1 min-w-0 bg-white/80 p-2.5 rounded-lg border border-gray-200">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-1.5">
                                                <Building className="w-3.5 h-3.5 text-gray-500" />
                                                <Badge variant="outline" className="text-[10px] font-bold bg-slate-100 text-slate-800 border-slate-300">
                                                    {m.banco}
                                                </Badge>
                                                <span className="text-[10px] font-mono text-gray-500 font-semibold">
                                                    Cta: {m.cuentaDestino}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-mono">
                                                {formatDateTime(m.movimiento.fechaOperacion)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-700 line-clamp-2" title={m.movimiento.concepto}>
                                            <span className="font-semibold text-gray-500">Concepto: </span>
                                            {m.movimiento.concepto || "Sin concepto"}
                                        </p>
                                        <div className="mt-1 flex items-center justify-between text-xs">
                                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                ✓ {m.razon}
                                            </span>
                                            <span className="font-mono font-bold text-gray-900">
                                                Abono: {formatCurrency(m.movimiento.abono)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Monto y Estado */}
                                    <div className="text-right flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
                                        <div className="text-right">
                                            <span className="text-[10px] text-gray-400 block uppercase">Monto Ticket</span>
                                            <span className="text-base font-black font-mono text-gray-900">
                                                {formatCurrency(m.ticket.monto)}
                                            </span>
                                        </div>

                                        <div>
                                            {isSelected ? (
                                                <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5">
                                                    ✓ Aprobado
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-300 text-[10px] px-2 py-0.5">
                                                    Excluido
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pie de Diálogo con Confirmación */}
                    <div className="pt-3 border-t flex items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isConfirmingSpei}
                            onClick={() => setPreviewMatches(null)}
                            className="text-gray-600 text-xs"
                        >
                            Cancelar
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                disabled={
                                    isConfirmingSpei ||
                                    !previewMatches ||
                                    previewMatches.filter(m => selectedMatches[m.matchKey]).length === 0
                                }
                                onClick={handleConfirmApprovedSpei}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs px-5 h-9 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                            >
                                {isConfirmingSpei ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                        Conciliando cuentas...
                                    </>
                                ) : (
                                    <>
                                        <CheckCheck className="w-4 h-4" />
                                        Aprobar y Conciliar ({previewMatches?.filter(m => selectedMatches[m.matchKey]).length || 0})
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Resumen de Auto-Conciliación SPEI */}
            <Dialog open={!!autoSpeiResult} onOpenChange={(open) => !open && setAutoSpeiResult(null)}>
                <DialogContent className="max-w-2xl p-6">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-full">
                                <Zap className="h-6 w-6 fill-emerald-600 text-emerald-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-gray-900">
                                    Resultado de Auto-Conciliación SPEI
                                </DialogTitle>
                                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                                    {autoSpeiResult?.message}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {autoSpeiResult && (
                        <div className="space-y-4 my-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                                    <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Conciliados Exitosamente</span>
                                    <span className="text-2xl font-black text-emerald-700 font-mono">
                                        {autoSpeiResult.conciliadosCount || 0}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                                    <span className="text-[11px] font-semibold text-gray-600 uppercase block">Tickets Revisados</span>
                                    <span className="text-2xl font-black text-gray-800 font-mono">
                                        {autoSpeiResult.totalRevisados || 0}
                                    </span>
                                </div>
                            </div>

                            {autoSpeiResult.conciliados && autoSpeiResult.conciliados.length > 0 && (
                                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                    <table className="w-full text-xs text-left text-gray-600">
                                        <thead className="bg-gray-50 border-b font-semibold text-gray-700">
                                            <tr>
                                                <th className="px-3 py-2">Ticket ID</th>
                                                <th className="px-3 py-2">Cliente</th>
                                                <th className="px-3 py-2">Clave de Rastreo</th>
                                                <th className="px-3 py-2 text-right">Monto</th>
                                                <th className="px-3 py-2 text-center">Banco</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {autoSpeiResult.conciliados.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-emerald-50/40">
                                                    <td className="px-3 py-2 font-mono font-bold text-gray-900">
                                                        #{item.ticketId}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <span className="font-semibold text-gray-900">{item.nombre}</span>
                                                        <span className="text-gray-400 block font-mono text-[10px]">{item.contrato}</span>
                                                    </td>
                                                    <td className="px-3 py-2 font-mono text-[11px] text-blue-700 break-all">
                                                        {item.claveRastreo}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">
                                                        {formatCurrency(item.monto || 0)}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                                            {item.banco}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button
                                    onClick={() => setAutoSpeiResult(null)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs px-5"
                                >
                                    Cerrar y Actualizar
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
