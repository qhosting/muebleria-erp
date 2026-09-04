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
    FileText,
    Copy,
    LayoutList,
    LayoutGrid,
    Trash2,
    ArrowUpDown,
    Clock
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

function copiarAlPortapapeles(texto: string, label: string) {
    if (!texto || texto === "—") return;
    navigator.clipboard.writeText(texto).then(() => {
        toast.success(`${label} copiado al portapapeles`);
    }).catch(() => {
        toast.info(texto);
    });
}

function getNombreOrdenante(mov: any): string {
    if (!mov) return "—";
    if (mov.descripcionDetallada) {
        const mOrigen = mov.descripcionDetallada.match(/Origen:\s*([^(|]+)(?:\s*\(([^)]+)\))?/i);
        if (mOrigen && mOrigen[1].trim()) return mOrigen[1].trim();
        const mTitular = mov.descripcionDetallada.match(/Titular:\s*([^,|]+)/i);
        if (mTitular && mTitular[1].trim()) return mTitular[1].trim();
        const mDe = mov.descripcionDetallada.match(/(?:ordenante|emisor):\s*([^,|]+)/i);
        if (mDe && mDe[1].trim()) return mDe[1].trim();
    }
    const concepto = mov.concepto || mov.descripcionGeneral || "";
    const mConceptoDe = concepto.match(/\b(?:DE|ORDENANTE)\s+([A-ZÁÉÍÓÚÑ\s]{4,35})/i);
    if (mConceptoDe && mConceptoDe[1].trim()) return mConceptoDe[1].trim();
    if (mov.ticket?.cliente?.nombreCompleto) return mov.ticket.cliente.nombreCompleto;
    if (mov.cliente?.nombreCompleto) return mov.cliente.nombreCompleto;
    return "—";
}

function getCuentaOrdenante(mov: any): string {
    if (!mov) return "—";
    if (mov.clabeEmisor) return mov.clabeEmisor;
    if (mov.cuentaEmisor) return mov.cuentaEmisor;
    if (mov.descripcionDetallada) {
        const mCta = mov.descripcionDetallada.match(/(?:CLABE\/Cta|Cta|Cuenta|CLABE):\s*(\d{10,18})/i);
        if (mCta && mCta[1]) return mCta[1];
    }
    return "—";
}

function getSugerenciasParaTicket(ticket: any, movsDisponibles: any[], globalIndexMap: Map<string, number>) {
    const montoTicket = parseFloat(ticket.monto?.toString() || "0");
    const contratoNorm = (ticket.cliente?.codigoCliente || ticket.contrato || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const folioNorm = (ticket.folio || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const refNorm = (ticket.referencia || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const rastreoNorm = (ticket.claveRastreo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const nombreCompleto = (ticket.cliente?.nombreCompleto || "").toUpperCase();
    const palabrasNombre = nombreCompleto
        .split(/\s+/)
        .filter((w: string) => w.length >= 4 && !['DE', 'DEL', 'LOS', 'LAS', 'SAN', 'SANTA', 'MARIA', 'JOSE'].includes(w));

    const sugerencias: any[] = [];
    const manuales: any[] = [];

    for (const mov of movsDisponibles) {
        const valKey = `${mov.tabla}__${mov.id}`;
        const movIdx = globalIndexMap.get(valKey) ?? 0;
        const movAbono = parseFloat(mov.abono?.toString() || "0");
        const isMontoExact = Math.abs(montoTicket - movAbono) < 0.01;

        const bancoNombre = mov.bancoDestino || (mov.tabla?.includes("Banorte") ? "BANORTE" : "SANTANDER");
        const ctaDestino = mov.cuentaDestino || (mov.tabla?.includes("22001022837") ? "22001022837" : mov.tabla?.includes("65505732541") ? "65505732541" : "0330253963");
        const fechaStr = mov.fechaOperacion ? mov.fechaOperacion.toString().slice(0, 10) : "";
        const horaStr = extractHoraOperacion(mov);
        const horaDisplay = horaStr ? ` | Hr: ${horaStr}` : "";

        const movRaw = `${mov.claveRastreo || ''} ${mov.concepto || ''} ${mov.descripcionDetallada || ''} ${mov.descripcionGeneral || ''} ${mov.referencia || ''}`.toUpperCase();
        const movNorm = movRaw.replace(/[^A-Z0-9]/g, "");

        let prioridad = 999;
        let etiquetaPrioridad = "";

        // 🛡️ Regla estricta de auditoría: Solo se clasifica como sugerencia si el monto coincide exactamente
        if (isMontoExact) {
            if (rastreoNorm && rastreoNorm.length >= 6 && movNorm.includes(rastreoNorm)) {
                prioridad = 1;
                etiquetaPrioridad = "⚡ SPEI Exacto";
            } else if (contratoNorm && contratoNorm.length >= 5 && movNorm.includes(contratoNorm)) {
                prioridad = 2;
                etiquetaPrioridad = "🟢 Contrato";
            } else if ((folioNorm && folioNorm.length >= 6 && movNorm.includes(folioNorm)) || (refNorm && refNorm.length >= 6 && movNorm.includes(refNorm))) {
                prioridad = 3;
                etiquetaPrioridad = "🔵 Folio/Ref";
            } else if (palabrasNombre.length > 0 && palabrasNombre.filter((p: string) => movRaw.includes(p)).length >= 2) {
                prioridad = 4;
                etiquetaPrioridad = "🟣 Nombre";
            } else {
                prioridad = 5;
                etiquetaPrioridad = "🔴 Monto Exacto";
            }
        }

        const descFull = (mov.descripcionDetallada || mov.concepto || mov.descripcionGeneral || "ABONO").trim();
        const descCorta = descFull.length > 55 ? `${descFull.slice(0, 55)}...` : descFull;
        const rastreoTxt = mov.claveRastreo ? ` | Rastreo: ${mov.claveRastreo}` : "";
        const refTxt = mov.referencia ? ` | Ref: ${mov.referencia}` : "";

        const statusMontoTag = isMontoExact ? "[✅ MONTO COINCIDE]" : `[⚠️ DIFIERE: $${movAbono.toFixed(2)} vs $${montoTicket.toFixed(2)}]`;
        const label = `ID: ${movIdx} | ${statusMontoTag} | [${bancoNombre} ${ctaDestino}] | ${fechaStr}${horaDisplay} | $${movAbono.toFixed(2)} | ${descCorta}${refTxt}${rastreoTxt}${etiquetaPrioridad ? ` (${etiquetaPrioridad})` : ""}`;

        const item = {
            valKey,
            movIdx,
            mov,
            prioridad,
            etiquetaPrioridad,
            isMontoExact,
            label
        };

        if (prioridad < 999) {
            sugerencias.push(item);
        } else {
            manuales.push(item);
        }
    }

    sugerencias.sort((a, b) => a.prioridad - b.prioridad);

    return { sugerencias, manuales };
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
    const [cobradorFiltro, setCobradorFiltro] = useState<string>("TODOS"); // ID del cobrador o TODOS
    const [orden, setOrden] = useState<"asc" | "desc">("asc"); // asc: antiguos primero, desc: recientes primero
    const [cobradores, setCobradores] = useState<any[]>([]);

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
    const [vistaModo, setVistaModo] = useState<"tabla" | "tarjetas">("tarjetas");

    // Filtros y búsqueda para el Modal de Aprobación SPEI
    const [speiSearchText, setSpeiSearchText] = useState<string>("");
    const [speiCodigoFilter, setSpeiCodigoFilter] = useState<"TODOS" | "DP" | "DQ">("TODOS");
    const [speiTipoFilter, setSpeiTipoFilter] = useState<string>("TODOS");

    useEffect(() => {
        fetchData();
    }, [estadoFiltro, cobradorFiltro, orden]);

    const fetchData = async (customDesde?: string, customHasta?: string, customEstado?: string, customCobrador?: string, customOrden?: "asc" | "desc") => {
        setLoading(true);
        try {
            const d = customDesde !== undefined ? customDesde : desde;
            const h = customHasta !== undefined ? customHasta : hasta;
            const est = customEstado !== undefined ? customEstado : estadoFiltro;
            const cob = customCobrador !== undefined ? customCobrador : cobradorFiltro;
            const ord = customOrden !== undefined ? customOrden : orden;

            const params = new URLSearchParams();
            if (d) params.append("desde", d);
            if (h) params.append("hasta", h);
            if (est) params.append("estado", est);
            if (cob && cob !== "TODOS") params.append("cobradorId", cob);
            params.append("orden", ord);

            const res = await fetch(`/api/tesoreria/conciliador?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                const rawTickets: any[] = data.tickets || [];
                const sortedTickets = [...rawTickets].sort((a: any, b: any) => {
                    const timeA = new Date(a.fecha || a.creadoEn).getTime();
                    const timeB = new Date(b.fecha || b.creadoEn).getTime();
                    return ord === "desc" ? timeB - timeA : timeA - timeB;
                });
                setTickets(sortedTickets);
                setMovimientos(data.movimientos || []);
                if (data.cobradores && Array.isArray(data.cobradores)) {
                    setCobradores(data.cobradores);
                }

                // Auto-seleccionar el mejor movimiento para cada ticket si coincide el monto
                const initialSelected: Record<string, string> = {};
                const initialAmountFilter: Record<string, string> = {};

                (data.tickets || []).forEach((t: any) => {
                    const montoTicket = parseFloat(t.monto?.toString() || "0");
                    initialAmountFilter[t.id] = montoTicket.toFixed(2);

                    // Buscar si hay sugerencia o match exacto de monto coincidente
                    const sugerencia = (data.sugerencias || []).find((s: any) => s.ticket?.id === t.id);
                    if (sugerencia?.movimiento && Math.abs(parseFloat(sugerencia.movimiento.abono?.toString() || "0") - montoTicket) < 0.01) {
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
        fetchData(desde, hasta, estadoFiltro, cobradorFiltro);
    };

    const setSemanaActual = () => {
        const week = getSabadoAViernesRange(0);
        setDesde(week.desde);
        setHasta(week.hasta);
        fetchData(week.desde, week.hasta, estadoFiltro, cobradorFiltro);
    };

    const setSemanaAnterior = () => {
        const week = getSabadoAViernesRange(-1);
        setDesde(week.desde);
        setHasta(week.hasta);
        fetchData(week.desde, week.hasta, estadoFiltro, cobradorFiltro);
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
                    setSpeiSearchText("");
                    setSpeiCodigoFilter("TODOS");
                    setSpeiTipoFilter("TODOS");
                    // Por defecto, marcar como aprobadas SOLO las coincidencias con montos exactos
                    const initialSelection: Record<string, boolean> = {};
                    data.matches.forEach((m: any) => {
                        const movAbono = parseFloat(m.movimiento?.abono?.toString() || "0");
                        const tktMonto = parseFloat(m.ticket?.monto?.toString() || "0");
                        if (Math.abs(movAbono - tktMonto) < 0.01) {
                            initialSelection[m.matchKey] = true;
                        }
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

    // Estadísticas de códigos DP / DQ y tipos de coincidencia (Etiquetas)
    const speiStats = useMemo(() => {
        if (!previewMatches) return { 
            total: 0, 
            dp: 0, 
            dq: 0, 
            otros: 0, 
            byTipo: {} as Record<string, number> 
        };
        let dp = 0, dq = 0, otros = 0;
        const byTipo: Record<string, number> = {};

        previewMatches.forEach(m => {
            const c = (m.ticket?.contrato || "").toUpperCase();
            if (c.startsWith("DP")) dp++;
            else if (c.startsWith("DQ")) dq++;
            else otros++;

            const tipo = m.tipoMatch || "SUGERENCIA";
            byTipo[tipo] = (byTipo[tipo] || 0) + 1;
        });
        return { total: previewMatches.length, dp, dq, otros, byTipo };
    }, [previewMatches]);

    // Coincidencias filtradas según búsqueda de texto, tipo de código (DP/DQ) y etiqueta (tipoMatch)
    const filteredPreviewMatches = useMemo(() => {
        if (!previewMatches) return [];
        return previewMatches.filter(m => {
            // Filtro por código DP / DQ
            if (speiCodigoFilter === "DP" && !m.ticket?.contrato?.toUpperCase().startsWith("DP")) {
                return false;
            }
            if (speiCodigoFilter === "DQ" && !m.ticket?.contrato?.toUpperCase().startsWith("DQ")) {
                return false;
            }

            // Filtro por Etiqueta / Tipo de Coincidencia
            if (speiTipoFilter !== "TODOS") {
                if (speiTipoFilter === "CUENTA_HABITUAL") {
                    if (m.tipoMatch !== "CUENTA_HABITUAL_CLIENTE" && m.tipoMatch !== "REMITENTE_HABITUAL") return false;
                } else if (m.tipoMatch !== speiTipoFilter) {
                    return false;
                }
            }

            // Filtro de texto libre (Nombre, Código DP/DQ, Folio, Rastreo, Concepto, ID Ticket)
            if (speiSearchText.trim()) {
                const query = speiSearchText.toLowerCase().trim();
                const nombre = (m.ticket?.nombre || "").toLowerCase();
                const contrato = (m.ticket?.contrato || "").toLowerCase();
                const ticketId = String(m.ticket?.id || "").toLowerCase();
                const folio = (m.ticket?.folio || "").toLowerCase();
                const claveRastreo = (m.ticket?.claveRastreo || "").toLowerCase();
                const concepto = (m.movimiento?.concepto || "").toLowerCase();
                const banco = (m.banco || "").toLowerCase();
                const tipoMatch = (m.tipoMatch || "").toLowerCase();

                const matchText = nombre.includes(query) ||
                    contrato.includes(query) ||
                    ticketId.includes(query) ||
                    folio.includes(query) ||
                    claveRastreo.includes(query) ||
                    concepto.includes(query) ||
                    banco.includes(query) ||
                    tipoMatch.includes(query);

                if (!matchText) return false;
            }

            return true;
        });
    }, [previewMatches, speiCodigoFilter, speiTipoFilter, speiSearchText]);

    // Alternar selección individual de una coincidencia
    const toggleMatchSelection = (matchKey: string) => {
        setSelectedMatches(prev => ({
            ...prev,
            [matchKey]: !prev[matchKey]
        }));
    };

    // Seleccionar o deseleccionar todas las coincidencias globales
    const toggleSelectAllMatches = (select: boolean) => {
        if (!previewMatches) return;
        const newSelection: Record<string, boolean> = {};
        previewMatches.forEach(m => {
            newSelection[m.matchKey] = select;
        });
        setSelectedMatches(newSelection);
    };

    // Seleccionar o deseleccionar solo las coincidencias actualmente filtradas/visibles
    const toggleSelectFilteredMatches = (select: boolean) => {
        if (!previewMatches) return;
        setSelectedMatches(prev => {
            const next = { ...prev };
            filteredPreviewMatches.forEach(m => {
                next[m.matchKey] = select;
            });
            return next;
        });
    };

    // Seleccionar solo por código específico (DP o DQ)
    const selectOnlyByCode = (prefix: "DP" | "DQ") => {
        if (!previewMatches) return;
        const next: Record<string, boolean> = {};
        previewMatches.forEach(m => {
            const c = (m.ticket?.contrato || "").toUpperCase();
            next[m.matchKey] = c.startsWith(prefix);
        });
        setSelectedMatches(next);
        toast.info(`Marcadas únicamente coincidencias con contrato ${prefix}`);
    };

    // Seleccionar solo por una etiqueta / tipo de coincidencia (Nombre, Folio, SPEI, Cuenta Habitual, etc.)
    const selectOnlyByTipo = (tipo: string, label: string) => {
        if (!previewMatches) return;
        const next: Record<string, boolean> = {};
        let count = 0;
        previewMatches.forEach(m => {
            const isMatch = tipo === "CUENTA_HABITUAL"
                ? (m.tipoMatch === "CUENTA_HABITUAL_CLIENTE" || m.tipoMatch === "REMITENTE_HABITUAL")
                : m.tipoMatch === tipo;
            next[m.matchKey] = isMatch;
            if (isMatch) count++;
        });
        setSelectedMatches(next);
        toast.info(`Marcadas ${count} coincidencias encontradas por "${label}"`);
    };

    // 2. Ejecutar la conciliación solo de las cuentas aprobadas
    const handleConfirmApprovedSpei = async () => {
        if (!previewMatches) return;

        const approvedList = previewMatches.filter(m => {
            if (!selectedMatches[m.matchKey]) return false;
            const movAbono = parseFloat(m.movimiento?.abono?.toString() || "0");
            const tktMonto = parseFloat(m.ticket?.monto?.toString() || "0");
            return Math.abs(movAbono - tktMonto) < 0.01;
        });
        if (approvedList.length === 0) {
            toast.warning("Debes seleccionar al menos una coincidencia donde los montos coincidan exactamente");
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

        const movTarget = movimientos.find(m => m.tabla === tabla && String(m.id) === String(movimientoId));
        if (movTarget) {
            const movAbono = parseFloat(movTarget.abono?.toString() || "0");
            const tktMonto = parseFloat(ticket.monto?.toString() || "0");
            if (Math.abs(movAbono - tktMonto) > 0.01) {
                toast.error(`No se puede conciliar: El depósito bancario ($${movAbono.toFixed(2)}) no coincide con el monto del ticket ($${tktMonto.toFixed(2)}).`);
                return;
            }
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

    const handleConciliarMigracion = async (ticket: any) => {
        const montoStr = formatCurrency(parseFloat(ticket.monto?.toString() || "0"));
        const clienteStr = ticket.cliente?.nombreCompleto || ticket.cliente?.codigoCliente || "N/A";
        const confirm = window.confirm(
            `¿Autorizar y conciliar ticket #${ticket.id} como MIGRACIÓN?\n\n` +
            `• Monto: ${montoStr}\n` +
            `• Cliente: ${clienteStr}\n\n` +
            `Esta acción marcará el ticket como CONCILIADO y sus pagos pasarán de PENDIENTE a MIGRACIÓN sin vincularse a ningún movimiento bancario.`
        );
        if (!confirm) return;

        setActionLoading(prev => ({ ...prev, [ticket.id]: true }));
        try {
            const res = await fetch("/api/tesoreria/conciliador", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "conciliar_migracion",
                    ticketId: ticket.id
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `Ticket #${ticket.id} conciliado como MIGRACIÓN`);
                if (estadoFiltro === "PENDIENTE") {
                    setTickets(prev => prev.filter(t => t.id !== ticket.id));
                } else {
                    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, conciliado: true, concepto: "MIGRACIÓN MANUAL" } : t));
                }
            } else {
                toast.error(data.error || "Error al conciliar como migración");
            }
        } catch (error) {
            console.error("Error conciliando como migración:", error);
            toast.error("Error de conexión con el servidor");
        } finally {
            setActionLoading(prev => ({ ...prev, [ticket.id]: false }));
        }
    };

    const handleEliminarTicket = async (ticketId: string) => {
        const confirm = window.confirm("¿Eliminar ticket? Esta acción no se puede deshacer.");
        if (!confirm) return;

        setActionLoading(prev => ({ ...prev, [ticketId]: true }));
        try {
            const res = await fetch("/api/tesoreria/conciliador", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "eliminar",
                    ticketId
                })
            });

            if (res.ok) {
                toast.success("Ticket eliminado exitosamente");
                setTickets(prev => prev.filter(t => t.id !== ticketId));
            } else {
                toast.error("Error al eliminar el ticket");
            }
        } catch (error) {
            console.error("Error eliminando ticket:", error);
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
            ["Fecha", "Contrato", "Cliente", "Concepto", "Ordenante", "Rastreo SPEI", "Referencia", "ID Folio Ticket", "ID Sistema", "Pago Vinculado", "ID Pago", "Gestor", "Monto", "Estado"],
            ...tickets.map(t => [
                (t.fecha || t.creadoEn || "").slice(0, 19),
                `"${t.cliente?.codigoCliente || "N/A"}"`,
                `"${t.cliente?.nombreCompleto || "N/A"}"`,
                `"${t.concepto || "-"}"`,
                `"${t.remitente || t.cliente?.nombreCompleto || "-"}"`,
                `"${t.claveRastreo || "-"}"`,
                `"${t.referencia || "-"}"`,
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

                        {/* Filtro por Cobrador */}
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700 text-xs flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-gray-500" />
                                Cobrador:
                            </span>
                            <select
                                value={cobradorFiltro}
                                onChange={(e) => setCobradorFiltro(e.target.value)}
                                className="h-9 bg-gray-50 border border-gray-300 rounded px-2.5 text-xs text-gray-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[220px]"
                            >
                                <option value="TODOS">Todos los Cobradores</option>
                                {cobradores.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} {c.codigoGestor ? `(${c.codigoGestor})` : ''}
                                    </option>
                                ))}
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

                        {/* Selector de Orden: Antiguos primero vs Recientes primero */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const nuevoOrden = orden === "asc" ? "desc" : "asc";
                                setOrden(nuevoOrden);
                                setTickets(prev => [...prev].sort((a: any, b: any) => {
                                    const timeA = new Date(a.fecha || a.creadoEn).getTime();
                                    const timeB = new Date(b.fecha || b.creadoEn).getTime();
                                    return nuevoOrden === "desc" ? timeB - timeA : timeA - timeB;
                                }));
                            }}
                            className={`h-7 text-[11px] px-2.5 font-semibold rounded flex items-center gap-1.5 transition-all ${orden === "asc" ? "border-amber-300 text-amber-900 bg-amber-50/90 hover:bg-amber-100" : "border-gray-200 text-gray-700 hover:bg-gray-100"}`}
                            title={orden === "asc" ? "Ordenando: Más antiguos primero (clic para cambiar a recientes)" : "Ordenando: Más recientes primero (clic para cambiar a antiguos)"}
                        >
                            <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
                            <span>{orden === "asc" ? "Antiguos primero" : "Recientes primero"}</span>
                        </Button>

                        {/* Selector de Modo de Visualización: Tabla o Tarjetas */}
                        <div className="flex items-center border border-gray-300 rounded overflow-hidden h-7 bg-white shadow-xs ml-1">
                            <button
                                type="button"
                                onClick={() => setVistaModo("tabla")}
                                className={`px-2.5 h-full text-[11px] font-semibold flex items-center gap-1 transition-colors ${vistaModo === "tabla" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                                title="Vista en Tabla con Columnas"
                            >
                                <LayoutList className="w-3.5 h-3.5" />
                                Tabla
                            </button>
                            <button
                                type="button"
                                onClick={() => setVistaModo("tarjetas")}
                                className={`px-2.5 h-full text-[11px] font-semibold flex items-center gap-1 transition-colors ${vistaModo === "tarjetas" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                                title="Vista en Tarjetas Detalladas"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                Tarjetas
                            </button>
                        </div>
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
                ) : vistaModo === "tabla" ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left align-middle text-gray-700">
                                <thead className="bg-gray-50/90 border-b border-gray-200 font-semibold text-gray-700 text-xs">
                                    <tr>
                                        <th className="px-3 py-3 whitespace-nowrap">Fecha y Hora</th>
                                        <th className="px-3 py-3 whitespace-nowrap">Contrato</th>
                                        <th className="px-3 py-3 min-w-[150px]">Cliente</th>
                                        <th className="px-3 py-3 whitespace-nowrap">Gestor</th>
                                        <th className="px-3 py-3 min-w-[200px]">Concepto / Ordenante</th>
                                        <th className="px-3 py-3 min-w-[170px]">Rastreo SPEI / Ref</th>
                                        <th className="px-3 py-3 text-right whitespace-nowrap">Monto</th>
                                        <th className="px-3 py-3 min-w-[260px]">Movimiento Bancario Asignado</th>
                                        <th className="px-3 py-3 text-center whitespace-nowrap">Estado</th>
                                        <th className="px-3 py-3 text-center whitespace-nowrap">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tickets.map((ticket) => {
                                        const montoTicketNum = parseFloat(ticket.monto?.toString() || "0");
                                        const selectedMovValue = selectedMovByTicket[ticket.id];
                                        const estaConciliado = ticket.conciliado;

                                        let selectedMovObj: any = null;
                                        if (selectedMovValue) {
                                            const [tTabla, tId] = selectedMovValue.split("__");
                                            selectedMovObj = movimientos.find(m => m.tabla === tTabla && String(m.id) === String(tId));
                                        }

                                        const gestorDisplay = ticket.gestor?.codigoGestor || ticket.cliente?.cobradorAsignado?.codigoGestor || ticket.gestor?.name || "Sin Asignar";
                                        const conceptoDisplay = ticket.concepto || selectedMovObj?.concepto || selectedMovObj?.descripcionGeneral || "—";
                                        const ordenanteDisplay = ticket.remitente || getNombreOrdenante(selectedMovObj) || ticket.cliente?.nombreCompleto || "—";
                                        const rastreoVal = ticket.claveRastreo || selectedMovObj?.claveRastreo;
                                        const refVal = ticket.referencia || selectedMovObj?.referencia;

                                        return (
                                            <tr key={ticket.id} className={`hover:bg-slate-50/70 transition-colors ${estaConciliado ? "bg-emerald-50/20" : ""}`}>
                                                {/* Fecha y Hora */}
                                                <td className="px-3 py-3 whitespace-nowrap text-gray-800">
                                                    <span className="font-medium text-gray-900 block">
                                                        {formatDateTime(ticket.fecha || ticket.creadoEn).split(' ')[0]}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500 font-mono mt-0.5 block">
                                                        {formatDateTime(ticket.fecha || ticket.creadoEn).split(' ')[1] || ""}
                                                    </span>
                                                </td>

                                                {/* Contrato */}
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                                        {ticket.cliente?.codigoCliente || "S/C"}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 block font-mono mt-0.5">
                                                        #{ticket.legacyId || ticket.id.slice(-6)}
                                                    </span>
                                                </td>

                                                {/* Cliente */}
                                                <td className="px-3 py-3 min-w-[150px] max-w-[200px]">
                                                    <p className="font-semibold text-gray-900 truncate" title={ticket.cliente?.nombreCompleto || "Cliente Desconocido"}>
                                                        {ticket.cliente?.nombreCompleto || "Cliente Desconocido"}
                                                    </p>
                                                </td>

                                                {/* Gestor */}
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <Badge variant="outline" className="text-[11px] font-medium bg-blue-50 text-blue-700 border-blue-200">
                                                        {gestorDisplay}
                                                    </Badge>
                                                </td>

                                                {/* Concepto / Ordenante */}
                                                <td className="px-3 py-3 min-w-[200px] max-w-[260px]">
                                                    <p className="font-semibold text-gray-900 truncate" title={conceptoDisplay}>
                                                        {conceptoDisplay}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1" title={ordenanteDisplay}>
                                                        <span className="text-gray-400 font-normal">Ord:</span>
                                                        <span className="font-medium text-slate-700">{ordenanteDisplay}</span>
                                                    </p>
                                                </td>

                                                {/* Rastreo SPEI / Ref */}
                                                <td className="px-3 py-3 min-w-[170px] max-w-[220px]">
                                                    <div className="space-y-1">
                                                        {rastreoVal ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 truncate max-w-[140px]" title={rastreoVal}>
                                                                    {rastreoVal}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); copiarAlPortapapeles(rastreoVal, "Clave de Rastreo SPEI"); }}
                                                                    className="text-gray-400 hover:text-blue-600 p-0.5"
                                                                    title="Copiar Clave de Rastreo"
                                                                >
                                                                    <Copy className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-[11px] block">—</span>
                                                        )}
                                                        {refVal && (
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                                                                <span className="truncate max-w-[130px]" title={`Ref: ${refVal}`}>Ref: {refVal}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); copiarAlPortapapeles(refVal, "Referencia"); }}
                                                                    className="text-gray-400 hover:text-gray-700 p-0.5"
                                                                    title="Copiar Referencia"
                                                                >
                                                                    <Copy className="h-2.5 w-2.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Monto */}
                                                <td className="px-3 py-3 text-right font-black text-xs text-gray-900 whitespace-nowrap">
                                                    {formatCurrency(montoTicketNum)}
                                                </td>

                                                {/* Movimiento Bancario Asignado */}
                                                <td className="px-3 py-3 min-w-[260px] max-w-[340px]">
                                                    {estaConciliado ? (
                                                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded p-1.5 text-[11px]">
                                                            <span className="font-bold block">✓ Conciliado en Banco</span>
                                                            {selectedMovObj && (
                                                                <span className="font-mono text-[10px] block mt-0.5">
                                                                    {selectedMovObj.bancoDestino || "BANCO"} · {formatCurrency(selectedMovObj.abono)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <select
                                                                value={selectedMovValue || ""}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setSelectedMovByTicket(prev => ({ ...prev, [ticket.id]: val }));
                                                                }}
                                                                className={`w-full h-8 bg-white border rounded px-2 text-[11px] font-mono text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate ${
                                                                    selectedMovValue && (!selectedMovObj || Math.abs(parseFloat(selectedMovObj.abono?.toString() || "0") - montoTicketNum) >= 0.01)
                                                                        ? "border-red-500 bg-red-50/40"
                                                                        : "border-gray-300"
                                                                }`}
                                                            >
                                                                <option value="">-- Seleccionar Movimiento Bancario --</option>
                                                                {(() => {
                                                                    const coincidentes = movimientos.filter(m => Math.abs(parseFloat(m.abono?.toString() || "0") - montoTicketNum) < 0.01);
                                                                    const diferentes = movimientos.filter(m => Math.abs(parseFloat(m.abono?.toString() || "0") - montoTicketNum) >= 0.01);
                                                                    return (
                                                                        <>
                                                                            {coincidentes.length > 0 && (
                                                                                <optgroup label={`⭐ Monto Coincide ($${montoTicketNum.toFixed(2)}) - ${coincidentes.length}`}>
                                                                                    {coincidentes.map((mov, idx) => {
                                                                                        const valKey = `${mov.tabla}__${mov.id}`;
                                                                                        const movIndex = globalMovIndexMap.get(valKey) ?? idx;
                                                                                        const fechaOperacionStr = mov.fechaOperacion ? mov.fechaOperacion.toString().slice(0, 10) : "N/A";
                                                                                        const horaOperacionStr = extractHoraOperacion(mov);
                                                                                        const horaLabel = horaOperacionStr ? ` ${horaOperacionStr}` : "";
                                                                                        const montoMov = parseFloat(mov.abono?.toString() || "0").toFixed(2);
                                                                                        const bancoLabel = mov.bancoDestino || (mov.cuentaDestino ? `CTA ${mov.cuentaDestino}` : "BANCO");
                                                                                        return (
                                                                                            <option key={valKey} value={valKey}>
                                                                                                ID:{movIndex} | {fechaOperacionStr}{horaLabel} | ${montoMov} | [{bancoLabel}]
                                                                                            </option>
                                                                                        );
                                                                                    })}
                                                                                </optgroup>
                                                                            )}
                                                                            {diferentes.length > 0 && (
                                                                                <optgroup label={`⚠️ Montos Diferentes (Bloqueados) - ${diferentes.length}`}>
                                                                                    {diferentes.map((mov, idx) => {
                                                                                        const valKey = `${mov.tabla}__${mov.id}`;
                                                                                        const movIndex = globalMovIndexMap.get(valKey) ?? idx;
                                                                                        const fechaOperacionStr = mov.fechaOperacion ? mov.fechaOperacion.toString().slice(0, 10) : "N/A";
                                                                                        const horaOperacionStr = extractHoraOperacion(mov);
                                                                                        const horaLabel = horaOperacionStr ? ` ${horaOperacionStr}` : "";
                                                                                        const montoMov = parseFloat(mov.abono?.toString() || "0").toFixed(2);
                                                                                        const bancoLabel = mov.bancoDestino || (mov.cuentaDestino ? `CTA ${mov.cuentaDestino}` : "BANCO");
                                                                                        return (
                                                                                            <option key={valKey} value={valKey}>
                                                                                                [⚠️ NO COINCIDE] ID:{movIndex} | ${montoMov} vs ${montoTicketNum.toFixed(2)} | [{bancoLabel}]
                                                                                            </option>
                                                                                        );
                                                                                    })}
                                                                                </optgroup>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </select>
                                                            {selectedMovObj && Math.abs(parseFloat(selectedMovObj.abono?.toString() || "0") - montoTicketNum) >= 0.01 && (
                                                                <span className="text-[10px] text-red-600 font-bold block mt-0.5">
                                                                    ⛔ Monto no coincide: Banco (${parseFloat(selectedMovObj.abono?.toString() || "0").toFixed(2)}) ≠ Ticket (${montoTicketNum.toFixed(2)})
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Estado */}
                                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                                    {estaConciliado ? (
                                                        <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Conciliado
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">
                                                            <AlertCircle className="w-3 h-3 mr-1" />
                                                            Pendiente
                                                        </Badge>
                                                    )}
                                                </td>

                                                {/* Acciones */}
                                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleVerComprobante(ticket)}
                                                            className="h-7 text-xs text-blue-600 hover:bg-blue-50 px-2 flex items-center gap-1 font-semibold"
                                                            title="Ver Comprobante"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            Comprobante
                                                        </Button>
                                                        {!estaConciliado && (() => {
                                                            const isExactMatch = selectedMovObj ? Math.abs(parseFloat(selectedMovObj.abono?.toString() || "0") - montoTicketNum) < 0.01 : false;
                                                            return (
                                                                <>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        disabled={actionLoading[ticket.id] || !selectedMovValue || !isExactMatch}
                                                                        onClick={() => handleConciliarPago(ticket)}
                                                                        className="h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-none disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                                        title={!isExactMatch && selectedMovValue ? "No se puede conciliar: El depósito bancario no coincide con el ticket" : "Conciliar ticket con el movimiento bancario seleccionado"}
                                                                    >
                                                                        {actionLoading[ticket.id] ? (
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                        ) : (
                                                                            "Conciliar"
                                                                        )}
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        disabled={actionLoading[ticket.id]}
                                                                        onClick={() => handleConciliarMigracion(ticket)}
                                                                        className="h-7 text-[11px] px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-none flex items-center gap-1"
                                                                        title="Autorizar como MIGRACIÓN (conciliar sin movimiento bancario)"
                                                                    >
                                                                        {actionLoading[ticket.id] ? (
                                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                                        ) : (
                                                                            <ShieldCheck className="w-3 h-3" />
                                                                        )}
                                                                        Migración
                                                                    </Button>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {tickets.map((ticket) => {
                            const montoTicketNum = parseFloat(ticket.monto?.toString() || "0");
                            const currentAmountFilter = amountFilterByTicket[ticket.id] !== undefined
                                ? amountFilterByTicket[ticket.id]
                                : montoTicketNum.toFixed(2);
                            const selectedMovValue = selectedMovByTicket[ticket.id];
                            const estaConciliado = ticket.conciliado;

                            // Filtrar los movimientos disponibles para este ticket según el filtro de monto
                            const filteredMovimientos = movimientos.filter((m) => {
                                if (!currentAmountFilter || currentAmountFilter === "TODOS") return true;
                                const filterNum = parseFloat(currentAmountFilter);
                                const movAbonoNum = parseFloat(m.abono?.toString() || "0");
                                if (isNaN(filterNum)) return true;
                                return Math.abs(movAbonoNum - filterNum) < 0.01;
                            });

                            // Calcular sugerencias automáticas inteligentes y resto manual
                            const { sugerencias, manuales } = getSugerenciasParaTicket(ticket, filteredMovimientos, globalMovIndexMap);

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
                                    className={`bg-white rounded-lg border border-gray-200 border-l-[6px] ${
                                        estaConciliado ? "border-l-emerald-600 bg-emerald-50/10" : "border-l-red-600"
                                    } p-6 shadow-sm relative transition-all`}
                                >
                                    {/* Cabecera del Contrato */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 mb-4 border-b border-gray-200">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                                                    Contrato: {ticket.cliente?.codigoCliente || ticket.contrato || "SIN_CONTRATO"}
                                                </h2>
                                                {estaConciliado ? (
                                                    <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold">
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                        Conciliado
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold">
                                                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                                        Pendiente
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
                                                    onClick={() => handleConciliarMigracion(ticket)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 h-8 rounded text-xs flex items-center gap-1.5 shadow-none transition-colors"
                                                    title="Autorizar este ticket como MIGRACIÓN (conciliar sin vincular a banco)"
                                                >
                                                    {actionLoading[ticket.id] ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                    )}
                                                    Migración
                                                </Button>
                                            )}
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={actionLoading[ticket.id]}
                                                onClick={() => handleEliminarTicket(ticket.id)}
                                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 h-8 rounded text-xs flex items-center gap-1.5 shadow-none transition-colors"
                                                title="Eliminar ticket"
                                            >
                                                {actionLoading[ticket.id] ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                )}
                                                Eliminar
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Cajas de Información del Ticket (8 campos en 2 filas) */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-lg p-3">
                                            <strong className="text-[10px] font-bold text-[#495057] uppercase tracking-wider block mb-1">
                                                TICKET ID
                                            </strong>
                                            <span className="font-semibold text-xs text-gray-900 block font-mono truncate">
                                                {ticket.legacyId ? ticket.legacyId : ticket.id}
                                            </span>
                                        </div>
                                        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-lg p-3">
                                            <strong className="text-[10px] font-bold text-[#495057] uppercase tracking-wider block mb-1">
                                                MONTO
                                            </strong>
                                            <span className="font-bold text-xs text-gray-900 block">
                                                {formatCurrency(montoTicketNum)}
                                            </span>
                                        </div>
                                        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-lg p-3">
                                            <strong className="text-[10px] font-bold text-[#495057] uppercase tracking-wider block mb-1">
                                                FECHA
                                            </strong>
                                            <span className="font-medium text-xs text-gray-900 block truncate" title={formatDateTime(ticket.fecha || ticket.creadoEn)}>
                                                {formatDateTime(ticket.fecha || ticket.creadoEn)}
                                            </span>
                                        </div>
                                        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-lg p-3">
                                            <strong className="text-[10px] font-bold text-[#495057] uppercase tracking-wider block mb-1">
                                                FOLIO
                                            </strong>
                                            <span className="font-mono font-semibold text-xs text-gray-900 block truncate">
                                                {ticket.folio ? ticket.folio : "null"}
                                            </span>
                                        </div>
                                        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-lg p-3">
                                            <strong className="text-[10px] font-bold text-[#495057] uppercase tracking-wider block mb-1">
                                                GESTOR
                                            </strong>
                                            <span className="font-bold text-xs text-blue-900 block truncate">
                                                {gestorDisplay}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-lg p-3">
                                            <strong className="text-[10px] font-bold text-[#495057] uppercase tracking-wider block mb-1">
                                                REFERENCIA
                                            </strong>
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="font-mono font-semibold text-xs text-gray-900 truncate" title={ticket.referencia || "null"}>
                                                    {ticket.referencia || "null"}
                                                </span>
                                                {ticket.referencia && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); copiarAlPortapapeles(ticket.referencia, "Referencia"); }}
                                                        className="text-gray-400 hover:text-gray-700 p-0.5"
                                                        title="Copiar referencia"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-lg p-3">
                                            <strong className="text-[10px] font-bold text-[#495057] uppercase tracking-wider block mb-1">
                                                CLAVE RASTREO
                                            </strong>
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="font-mono font-bold text-xs text-blue-700 truncate" title={ticket.claveRastreo || "null"}>
                                                    {ticket.claveRastreo || "null"}
                                                </span>
                                                {ticket.claveRastreo && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); copiarAlPortapapeles(ticket.claveRastreo, "Clave de Rastreo"); }}
                                                        className="text-gray-400 hover:text-blue-700 p-0.5"
                                                        title="Copiar Clave de Rastreo"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-lg p-3">
                                            <strong className="text-[10px] font-bold text-[#495057] uppercase tracking-wider block mb-1">
                                                REMITENTE
                                            </strong>
                                            <span className="font-medium text-xs text-gray-900 block truncate" title={ticket.remitente || ticket.cliente?.nombreCompleto || "null"}>
                                                {ticket.remitente || ticket.cliente?.nombreCompleto || "null"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Separador punteado */}
                                    <div className="border-t border-dotted border-gray-300 my-4" />

                                    {/* Sección de Selección y Filtrado de Movimiento Bancario */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-gray-800 block mb-1">
                                                Filtrar por monto:
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={currentAmountFilter === "TODOS" ? "" : currentAmountFilter}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setAmountFilterByTicket(prev => ({ ...prev, [ticket.id]: val }));
                                                    }}
                                                    placeholder="0.00"
                                                    className="w-full h-9 bg-white border border-gray-300 rounded-md px-3 text-xs font-mono font-bold text-gray-900"
                                                />
                                                {currentAmountFilter !== montoTicketNum.toFixed(2) && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setAmountFilterByTicket(prev => ({ ...prev, [ticket.id]: montoTicketNum.toFixed(2) }))}
                                                        className="h-9 text-[11px] px-2.5 text-gray-700 shrink-0 font-semibold"
                                                        title="Restablecer al monto original del ticket"
                                                    >
                                                        Monto Ticket (${montoTicketNum.toFixed(2)})
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setAmountFilterByTicket(prev => ({ ...prev, [ticket.id]: "TODOS" }))}
                                                    className={`h-9 text-[11px] px-2.5 shrink-0 font-semibold ${currentAmountFilter === "TODOS" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                                                    title="Ver todos los movimientos sin filtrar por monto"
                                                >
                                                    Ver Todos ({movimientos.length})
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Dropdown de Movimiento Bancario con Sugerencias y Manual */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-bold text-gray-800 block">
                                                    Sugerencias / Selección Manual:
                                                </label>
                                                {sugerencias.length > 0 ? (
                                                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                                        ⭐ {sugerencias.length} sugerencia{sugerencias.length > 1 ? "s" : ""}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                                        Sin sugerencias
                                                    </Badge>
                                                )}
                                            </div>

                                            <select
                                                value={selectedMovValue || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSelectedMovByTicket(prev => ({ ...prev, [ticket.id]: val }));
                                                }}
                                                disabled={estaConciliado}
                                                className="w-full h-10 bg-white border border-gray-300 rounded-md px-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono truncate disabled:bg-gray-100 shadow-xs"
                                            >
                                                <option value="">-- Seleccionar movimiento bancario --</option>
                                                {sugerencias.length > 0 && (
                                                    <optgroup label={`⭐ Sugerencias Automáticas (${sugerencias.length})`}>
                                                        {sugerencias.map((sug) => (
                                                            <option key={sug.valKey} value={sug.valKey}>
                                                                {sug.label}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}
                                                <optgroup label={`📋 Selección Manual (${manuales.length} movimientos)`}>
                                                    {manuales.map((mov) => (
                                                        <option key={mov.valKey} value={mov.valKey}>
                                                            {mov.label}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>

                                        {/* Vista Previa Detallada del Movimiento Seleccionado (Caja Completa) */}
                                        {selectedMovObj && (() => {
                                            const selectedValKey = `${selectedMovObj.tabla}__${selectedMovObj.id}`;
                                            const selectedMovIdx = globalMovIndexMap.get(selectedValKey) ?? 0;
                                            const horaStr = extractHoraOperacion(selectedMovObj);
                                            const montoMovNum = parseFloat(selectedMovObj.abono?.toString() || "0");
                                            const fechaOperacionStr = selectedMovObj.fechaOperacion ? formatDateTime(selectedMovObj.fechaOperacion) : "N/A";
                                            const cuentaDestinoStr = selectedMovObj.cuentaDestino || (selectedMovObj.tabla?.includes("22001022837") ? "22001022837" : selectedMovObj.tabla?.includes("65505732541") ? "65505732541" : selectedMovObj.tabla?.includes("0330253963") ? "0330253963" : "N/A");
                                            const bancoDestinoStr = selectedMovObj.bancoDestino || (selectedMovObj.tabla?.includes("Banorte") ? "BANORTE" : "SANTANDER");

                                            const cleanText = (v: any) => {
                                                if (!v || v === "null" || v === "undefined" || v === "N/A" || v === "none") return "—";
                                                return String(v).trim();
                                            };

                                            const claveRastreoLimpia = cleanText(selectedMovObj.claveRastreo);
                                            const referenciaLimpia = cleanText(selectedMovObj.referencia);
                                            const cuentaEmisorLimpia = cleanText(selectedMovObj.cuentaEmisor || selectedMovObj.clabeEmisor);
                                            const conceptoLimpio = cleanText(selectedMovObj.concepto || selectedMovObj.descripcionGeneral);
                                            const descGeneralLimpia = cleanText(selectedMovObj.descripcionGeneral);
                                            const descDetalladaLimpia = cleanText(selectedMovObj.descripcionDetallada);

                                            return (
                                                <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded-lg p-4 text-xs space-y-3 shadow-xs">
                                                    {/* Encabezado del Movimiento */}
                                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-950 border border-blue-200">
                                                                🏦 Movimiento Bancario: ID #{selectedMovIdx}
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                                {bancoDestinoStr} · Cta: {cuentaDestinoStr}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {selectedMovObj.saldo !== undefined && selectedMovObj.saldo !== null && (
                                                                <span className="text-[11px] text-gray-500 font-mono">
                                                                    Saldo: <strong className="text-gray-800">{formatCurrency(selectedMovObj.saldo)}</strong>
                                                                </span>
                                                            )}
                                                            <span className="font-black text-base text-emerald-700 font-mono">
                                                                {formatCurrency(montoMovNum)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Validación Estricta de Coincidencia de Montos */}
                                                    {Math.abs(montoMovNum - montoTicketNum) < 0.01 ? (
                                                        <div className="bg-emerald-50 border border-emerald-300 rounded-md p-2.5 flex items-center justify-between text-xs text-emerald-900 font-semibold shadow-2xs">
                                                            <div className="flex items-center gap-2">
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                <span>Los montos coinciden exactamente: Depósito bancario de <strong>{formatCurrency(montoMovNum)}</strong> = Ticket <strong>{formatCurrency(montoTicketNum)}</strong></span>
                                                            </div>
                                                            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold shrink-0">✓ Coincidencia 100%</span>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-red-50 border border-red-300 rounded-md p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-red-900 font-bold shadow-2xs">
                                                            <div className="flex items-center gap-2">
                                                                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                                                                <div>
                                                                    <span className="block text-red-800">⛔ Montos NO coinciden: Depósito Bancario ({formatCurrency(montoMovNum)}) ≠ Ticket ({formatCurrency(montoTicketNum)})</span>
                                                                    <span className="text-[11px] text-red-700 font-normal">
                                                                        Diferencia de <strong>{formatCurrency(Math.abs(montoMovNum - montoTicketNum))}</strong>. La auditoría exige que los montos sean idénticos para poder conciliar.
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] bg-red-200 text-red-900 px-2.5 py-1 rounded font-mono font-black uppercase tracking-wider shrink-0">
                                                                BLOQUEADO
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Grid 1: Fechas, Horas e Identificadores */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">ID MOVIMIENTO:</span>
                                                            <span className="font-mono font-bold text-gray-900 block mt-0.5">
                                                                ID: {selectedMovIdx}
                                                            </span>
                                                        </div>
                                                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">FECHA OPERACIÓN:</span>
                                                            <span className="font-semibold text-gray-900 block mt-0.5">
                                                                {fechaOperacionStr}
                                                            </span>
                                                        </div>
                                                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">HORA OPERACIÓN:</span>
                                                            <span className="font-mono font-semibold text-gray-900 block mt-0.5">
                                                                {horaStr || "—"}
                                                            </span>
                                                        </div>
                                                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">BANCO ORIGEN:</span>
                                                            <span className="font-bold text-gray-900 block mt-0.5 truncate" title={selectedMovObj.bancoOrigen || "—"}>
                                                                {cleanText(selectedMovObj.bancoOrigen)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Grid 2: Referencias, SPEI y Cuentas Emisoras */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">REFERENCIA:</span>
                                                            <span className="font-mono font-bold text-gray-900 block mt-0.5 truncate" title={referenciaLimpia}>
                                                                {referenciaLimpia}
                                                            </span>
                                                        </div>
                                                        <div className="bg-white border border-gray-200 rounded-lg p-2 sm:col-span-2">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">CLAVE DE RASTREO SPEI:</span>
                                                            <span className="font-mono font-bold text-blue-700 bg-blue-50/70 px-1.5 py-0.5 rounded border border-blue-100 block mt-0.5 break-all" title={claveRastreoLimpia}>
                                                                {claveRastreoLimpia}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Grid 3: Concepto, Descripción y Ordenante */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">CONCEPTO / MOTIVO DE PAGO:</span>
                                                            <span className="font-semibold text-gray-900 block mt-1 break-words">
                                                                {conceptoLimpio}
                                                            </span>
                                                        </div>
                                                        <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">ORDENANTE / CUENTA EMISORA:</span>
                                                            <span className="font-mono font-medium text-gray-800 block mt-1 break-words">
                                                                {cuentaEmisorLimpia !== "—" ? cuentaEmisorLimpia : (descDetalladaLimpia !== "—" ? descDetalladaLimpia : "—")}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Grid 4: Descripciones Adicionales si existen */}
                                                    {(descDetalladaLimpia !== "—" && descDetalladaLimpia !== conceptoLimpio) && (
                                                        <div className="bg-white border border-gray-200 rounded-lg p-2.5">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">DESCRIPCIÓN DETALLADA / LEYENDA:</span>
                                                            <span className="text-gray-700 block mt-1 break-words font-mono text-[11px]">
                                                                {descDetalladaLimpia}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Botones de Conciliación */}
                                        {estaConciliado ? (
                                            <div className="w-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold py-3 rounded-lg text-sm text-center flex items-center justify-center gap-2 mt-4">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                {ticket.concepto?.includes("MIGRACION") ? "Ticket Conciliado como MIGRACIÓN" : "Ticket Conciliado en Banco"}
                                            </div>
                                        ) : (() => {
                                            const isCardMontoExact = selectedMovObj ? Math.abs(parseFloat(selectedMovObj.abono?.toString() || "0") - montoTicketNum) < 0.01 : false;
                                            return (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleConciliarPago(ticket)}
                                                        disabled={actionLoading[ticket.id] || !selectedMovObj || !isCardMontoExact}
                                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                        title={!isCardMontoExact && selectedMovObj ? "No se puede conciliar: El depósito bancario no coincide con el ticket" : "Conciliar ticket con el movimiento bancario seleccionado"}
                                                    >
                                                        {actionLoading[ticket.id] ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : !isCardMontoExact && selectedMovObj ? (
                                                            <>
                                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                                                <span>Montos no coinciden</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Check className="w-4 h-4 stroke-[3]" />
                                                                <span>✓ Conciliar con Banco</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleConciliarMigracion(ticket)}
                                                        disabled={actionLoading[ticket.id]}
                                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                                                        title="Autorizar como MIGRACIÓN histórica (conciliar sin vincular a movimiento bancario)"
                                                    >
                                                        {actionLoading[ticket.id] ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <ShieldCheck className="w-4 h-4" />
                                                                <span>Conciliar como MIGRACIÓN</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            );
                                        })()}
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

                        {/* Barra de Filtros, Búsqueda y Acciones Rápidas */}
                        {previewMatches && (
                            <div className="mt-3 space-y-2.5">
                                {/* Fila 1: Buscador de texto libre y Selector rápido de Código DP / DQ */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                        <Input
                                            type="text"
                                            placeholder="Buscar por Nombre de cliente, Contrato DP/DQ, Folio, Rastreo..."
                                            value={speiSearchText}
                                            onChange={(e) => setSpeiSearchText(e.target.value)}
                                            className="h-8 pl-8 pr-7 text-xs bg-white border-gray-300 focus-visible:ring-emerald-500 rounded-lg"
                                        />
                                        {speiSearchText && (
                                            <button
                                                type="button"
                                                onClick={() => setSpeiSearchText("")}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Selector rápido de Código DP / DQ */}
                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setSpeiCodigoFilter("TODOS")}
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                                                speiCodigoFilter === "TODOS"
                                                    ? "bg-white text-gray-900 shadow-sm"
                                                    : "text-gray-500 hover:text-gray-800"
                                            }`}
                                        >
                                            Todos ({speiStats.total})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSpeiCodigoFilter("DP")}
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                                                speiCodigoFilter === "DP"
                                                    ? "bg-indigo-600 text-white shadow-sm font-bold"
                                                    : "text-indigo-700 hover:bg-indigo-50"
                                            }`}
                                        >
                                            Solo DP ({speiStats.dp})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSpeiCodigoFilter("DQ")}
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                                                speiCodigoFilter === "DQ"
                                                    ? "bg-purple-600 text-white shadow-sm font-bold"
                                                    : "text-purple-700 hover:bg-purple-50"
                                            }`}
                                        >
                                            Solo DQ ({speiStats.dq})
                                        </button>
                                    </div>
                                </div>

                                {/* Fila 2: Filtros por Etiqueta / Método de Coincidencia */}
                                <div className="flex flex-wrap items-center gap-1.5 py-1">
                                    <span className="text-[11px] font-bold text-gray-500 mr-1 flex items-center gap-1">
                                        <Filter className="w-3 h-3 text-gray-400" />
                                        Etiqueta:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSpeiTipoFilter("TODOS")}
                                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border transition-all ${
                                            speiTipoFilter === "TODOS"
                                                ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                                        }`}
                                    >
                                        Todas ({speiStats.total})
                                    </button>

                                    {(speiStats.byTipo['NOMBRE_CLIENTE'] || 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSpeiTipoFilter(speiTipoFilter === "NOMBRE_CLIENTE" ? "TODOS" : "NOMBRE_CLIENTE")}
                                            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border transition-all flex items-center gap-1 ${
                                                speiTipoFilter === "NOMBRE_CLIENTE"
                                                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                                    : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                            }`}
                                        >
                                            <User className="w-3 h-3" />
                                            Nombre Cliente ({speiStats.byTipo['NOMBRE_CLIENTE']})
                                        </button>
                                    )}

                                    {(speiStats.byTipo['FOLIO_REFERENCIA'] || 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSpeiTipoFilter(speiTipoFilter === "FOLIO_REFERENCIA" ? "TODOS" : "FOLIO_REFERENCIA")}
                                            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border transition-all flex items-center gap-1 ${
                                                speiTipoFilter === "FOLIO_REFERENCIA"
                                                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                                                    : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                            }`}
                                        >
                                            <Hash className="w-3 h-3" />
                                            Folio / Referencia ({speiStats.byTipo['FOLIO_REFERENCIA']})
                                        </button>
                                    )}

                                    {(speiStats.byTipo['SPEI_EXACTO'] || 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSpeiTipoFilter(speiTipoFilter === "SPEI_EXACTO" ? "TODOS" : "SPEI_EXACTO")}
                                            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border transition-all flex items-center gap-1 ${
                                                speiTipoFilter === "SPEI_EXACTO"
                                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                            }`}
                                        >
                                            <Zap className="w-3 h-3" />
                                            SPEI Exacto ({speiStats.byTipo['SPEI_EXACTO']})
                                        </button>
                                    )}

                                    {(speiStats.byTipo['CONTRATO_DP_DQ'] || 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSpeiTipoFilter(speiTipoFilter === "CONTRATO_DP_DQ" ? "TODOS" : "CONTRATO_DP_DQ")}
                                            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border transition-all flex items-center gap-1 ${
                                                speiTipoFilter === "CONTRATO_DP_DQ"
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                            }`}
                                        >
                                            <FileText className="w-3 h-3" />
                                            Contrato en Leyenda ({speiStats.byTipo['CONTRATO_DP_DQ']})
                                        </button>
                                    )}

                                    {((speiStats.byTipo['CUENTA_HABITUAL_CLIENTE'] || 0) + (speiStats.byTipo['REMITENTE_HABITUAL'] || 0)) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSpeiTipoFilter(speiTipoFilter === "CUENTA_HABITUAL" ? "TODOS" : "CUENTA_HABITUAL")}
                                            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border transition-all flex items-center gap-1 ${
                                                speiTipoFilter === "CUENTA_HABITUAL"
                                                    ? "bg-cyan-700 text-white border-cyan-700 shadow-xs"
                                                    : "bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100"
                                            }`}
                                        >
                                            <Building className="w-3 h-3" />
                                            Cuenta Habitual ({(speiStats.byTipo['CUENTA_HABITUAL_CLIENTE'] || 0) + (speiStats.byTipo['REMITENTE_HABITUAL'] || 0)})
                                        </button>
                                    )}

                                    {(speiStats.byTipo['MONTO_FECHA'] || 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSpeiTipoFilter(speiTipoFilter === "MONTO_FECHA" ? "TODOS" : "MONTO_FECHA")}
                                            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border transition-all flex items-center gap-1 ${
                                                speiTipoFilter === "MONTO_FECHA"
                                                    ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                                                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                                            }`}
                                        >
                                            <Calendar className="w-3 h-3" />
                                            Monto y Fecha ({speiStats.byTipo['MONTO_FECHA']})
                                        </button>
                                    )}
                                </div>

                                {/* Fila 3: Acciones de Selección Directa y Resumen */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 bg-slate-50/80 p-2.5 rounded-xl border text-xs">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {/* Botones de Seleccionar Visibles / Todas */}
                                        {(speiSearchText.trim() || speiCodigoFilter !== "TODOS" || speiTipoFilter !== "TODOS") ? (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleSelectFilteredMatches(true)}
                                                    className="h-7 text-[11px] px-2 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-semibold flex items-center gap-1"
                                                >
                                                    <CheckSquare className="w-3.5 h-3.5" />
                                                    Seleccionar Visibles ({filteredPreviewMatches.length})
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => toggleSelectFilteredMatches(false)}
                                                    className="h-7 text-[11px] px-2 bg-white text-gray-600 border-gray-300 hover:bg-gray-100 font-semibold flex items-center gap-1"
                                                >
                                                    <Square className="w-3.5 h-3.5" />
                                                    Deseleccionar Visibles
                                                </Button>
                                            </>
                                        ) : (
                                            <>
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
                                            </>
                                        )}

                                        <div className="h-4 w-px bg-gray-300 mx-1 hidden sm:block" />

                                        <span className="text-[10px] font-bold text-gray-400 uppercase hidden lg:inline">Marcar solo:</span>

                                        {/* Botones directos de 1 clic para seleccionar por Código */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => selectOnlyByCode("DP")}
                                            className="h-7 text-[10px] px-2 text-indigo-700 hover:bg-indigo-100 font-semibold border border-indigo-200/60"
                                            title="Marcar únicamente contratos DP"
                                        >
                                            Solo DP
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => selectOnlyByCode("DQ")}
                                            className="h-7 text-[10px] px-2 text-purple-700 hover:bg-purple-100 font-semibold border border-purple-200/60"
                                            title="Marcar únicamente contratos DQ"
                                        >
                                            Solo DQ
                                        </Button>

                                        {/* Botones directos de 1 clic para seleccionar por Etiqueta / Método */}
                                        {(speiStats.byTipo['NOMBRE_CLIENTE'] || 0) > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => selectOnlyByTipo("NOMBRE_CLIENTE", "Nombre Cliente")}
                                                className="h-7 text-[10px] px-2 text-purple-800 bg-purple-50 hover:bg-purple-100 font-semibold border border-purple-200"
                                                title="Marcar todas las coincidencias encontradas por Nombre del Cliente"
                                            >
                                                <User className="w-3 h-3 mr-0.5 text-purple-600" />
                                                Por Nombre ({speiStats.byTipo['NOMBRE_CLIENTE']})
                                            </Button>
                                        )}

                                        {(speiStats.byTipo['FOLIO_REFERENCIA'] || 0) > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => selectOnlyByTipo("FOLIO_REFERENCIA", "Folio / Referencia")}
                                                className="h-7 text-[10px] px-2 text-amber-800 bg-amber-50 hover:bg-amber-100 font-semibold border border-amber-200"
                                                title="Marcar todas las coincidencias encontradas por Folio o Referencia"
                                            >
                                                <Hash className="w-3 h-3 mr-0.5 text-amber-600" />
                                                Por Folio/Ref ({speiStats.byTipo['FOLIO_REFERENCIA']})
                                            </Button>
                                        )}

                                        {(speiStats.byTipo['SPEI_EXACTO'] || 0) > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => selectOnlyByTipo("SPEI_EXACTO", "SPEI Exacto")}
                                                className="h-7 text-[10px] px-2 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold border border-emerald-200"
                                                title="Marcar todas las coincidencias encontradas por Clave SPEI Exacta"
                                            >
                                                <Zap className="w-3 h-3 mr-0.5 text-emerald-600" />
                                                Por SPEI ({speiStats.byTipo['SPEI_EXACTO']})
                                            </Button>
                                        )}

                                        {((speiStats.byTipo['CUENTA_HABITUAL_CLIENTE'] || 0) + (speiStats.byTipo['REMITENTE_HABITUAL'] || 0)) > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => selectOnlyByTipo("CUENTA_HABITUAL", "Cuenta Habitual")}
                                                className="h-7 text-[10px] px-2 text-cyan-800 bg-cyan-50 hover:bg-cyan-100 font-semibold border border-cyan-200"
                                                title="Marcar todas las coincidencias por Cuenta o Remitente Habitual"
                                            >
                                                <Building className="w-3 h-3 mr-0.5 text-cyan-600" />
                                                Por Cuenta
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs">
                                        {(speiSearchText.trim() || speiCodigoFilter !== "TODOS" || speiTipoFilter !== "TODOS") && (
                                            <span className="text-gray-500 font-medium">
                                                Visibles: <strong className="text-gray-800 font-bold font-mono">{filteredPreviewMatches.length}</strong> de {previewMatches.length}
                                            </span>
                                        )}
                                        <span className="text-gray-600">
                                            Aprobadas:{" "}
                                            <strong className="text-emerald-700 font-bold font-mono">
                                                {previewMatches.filter(m => selectedMatches[m.matchKey]).length} de {previewMatches.length}
                                            </strong>
                                        </span>
                                        <span className="text-gray-600">
                                            Monto:{" "}
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
                            </div>
                        )}
                    </DialogHeader>

                    {/* Lista de Tarjetas de Coincidencias */}
                    <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
                        {filteredPreviewMatches.length === 0 ? (
                            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-gray-300">
                                <Search className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                                <p className="text-xs font-semibold text-gray-700">No se encontraron coincidencias con los filtros aplicados</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">Prueba cambiando el término de búsqueda o seleccionando "Todos".</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSpeiSearchText("");
                                        setSpeiCodigoFilter("TODOS");
                                    }}
                                    className="mt-3 h-7 text-xs font-semibold"
                                >
                                    Limpiar Filtros
                                </Button>
                            </div>
                        ) : (
                            filteredPreviewMatches.map((m) => {
                                const movAbono = parseFloat(m.movimiento?.abono?.toString() || "0");
                                const tktMonto = parseFloat(m.ticket?.monto?.toString() || "0");
                                const isMontoExact = Math.abs(movAbono - tktMonto) < 0.01;
                                const isSelected = !!selectedMatches[m.matchKey] && isMontoExact;
                                return (
                                    <div
                                        key={m.matchKey}
                                        onClick={() => {
                                            if (!isMontoExact) {
                                                toast.error(`No se puede conciliar: El depósito bancario (${formatCurrency(movAbono)}) no coincide con el ticket (${formatCurrency(tktMonto)}).`);
                                                return;
                                            }
                                            toggleMatchSelection(m.matchKey);
                                        }}
                                        className={`p-4 rounded-xl border-2 transition-all select-none flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                            !isMontoExact
                                                ? "bg-red-50/40 border-red-200 opacity-75 cursor-not-allowed"
                                                : isSelected
                                                ? "bg-emerald-50/50 border-emerald-400 shadow-sm cursor-pointer"
                                                : "bg-gray-50/70 border-gray-200 opacity-60 hover:opacity-100 cursor-pointer"
                                        }`}
                                    >
                                        {/* Botón de Check / Toggle */}
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                                                    !isMontoExact
                                                        ? "border border-red-300 bg-red-100 text-red-600"
                                                        : isSelected
                                                        ? "bg-emerald-600 text-white shadow"
                                                        : "border-2 border-gray-300 bg-white text-transparent"
                                                }`}
                                            >
                                                {!isMontoExact ? (
                                                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                                ) : (
                                                    <Check className="w-4 h-4 stroke-[3]" />
                                                )}
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
                                                ) : m.tipoMatch === 'FOLIO_REFERENCIA' ? (
                                                    <Badge className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-sm">
                                                        <Hash className="w-3 h-3 text-white" />
                                                        Folio / Referencia
                                                    </Badge>
                                                ) : m.tipoMatch === 'CUENTA_HABITUAL_CLIENTE' ? (
                                                    <Badge className="bg-cyan-700 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-sm">
                                                        <Building className="w-3 h-3 text-white" />
                                                        Cuenta Habitual
                                                    </Badge>
                                                ) : m.tipoMatch === 'REMITENTE_HABITUAL' ? (
                                                    <Badge className="bg-teal-700 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shadow-sm">
                                                        <User className="w-3 h-3 text-white" />
                                                        Remitente Habitual
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-300 font-bold">
                                                        {m.tipoMatch === 'MONTO_FECHA' ? 'Monto y Fecha' : (m.tipoMatch || 'Sugerencia')}
                                                    </Badge>
                                                )}

                                                <Badge variant="outline" className="text-[10px] font-mono bg-white font-bold border-indigo-200 text-indigo-700">
                                                    Ticket #{m.ticket.id}
                                                </Badge>
                                                <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                                    m.ticket.contrato?.toUpperCase().startsWith("DP")
                                                        ? "bg-indigo-100 text-indigo-800"
                                                        : m.ticket.contrato?.toUpperCase().startsWith("DQ")
                                                        ? "bg-purple-100 text-purple-800"
                                                        : "bg-gray-100 text-gray-800"
                                                }`}>
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
                                                {!isMontoExact ? (
                                                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 text-[10px] font-bold">
                                                        ⛔ Montos Difieren
                                                    </Badge>
                                                ) : isSelected ? (
                                                    <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 font-bold">
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
                            })
                        )}
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
