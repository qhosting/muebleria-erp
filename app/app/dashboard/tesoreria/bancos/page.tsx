
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Landmark,
    Search,
    Download,
    Upload,
    CheckCircle2,
    AlertCircle,
    Loader2,
    TrendingUp,
    Wallet,
    Link2,
    X,
    Zap,
    ChevronRight,
    RefreshCw,
    AlertTriangle,
    User,
    Hash,
    FileText,
    Trash2,
    Calendar,
    Clock
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

// Funciones para formatear Fecha y Hora exacta del Ticket en Zona Horaria CDMX
function formatFechaTicket(fechaInput: any, creadoEnInput?: any): string {
    const val = fechaInput || creadoEnInput;
    if (!val) return "Sin fecha";
    try {
        const d = typeof val === "string" ? new Date(val) : val;
        if (d instanceof Date && !isNaN(d.getTime())) {
            return new Intl.DateTimeFormat('es-MX', {
                timeZone: 'America/Mexico_City',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(d);
        }
    } catch {}
    return String(val).slice(0, 10);
}

function formatHoraTicket(fechaInput: any, creadoEnInput?: any): string {
    const val = fechaInput || creadoEnInput;
    if (!val) return "";
    try {
        const d = typeof val === "string" ? new Date(val) : val;
        if (d instanceof Date && !isNaN(d.getTime())) {
            if (!(d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0)) {
                return new Intl.DateTimeFormat('es-MX', {
                    timeZone: 'America/Mexico_City',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).format(d);
            }
            if (creadoEnInput && creadoEnInput !== fechaInput) {
                const c = new Date(creadoEnInput);
                if (!isNaN(c.getTime()) && !(c.getUTCHours() === 0 && c.getUTCMinutes() === 0 && c.getUTCSeconds() === 0)) {
                    return new Intl.DateTimeFormat('es-MX', {
                        timeZone: 'America/Mexico_City',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    }).format(c);
                }
            }
        }
    } catch {}
    return "";
}

type TabKey = "todas" | "santander_22001022837" | "santander_65505732541" | "banorte_0330253963";

const TABS: {
    key: TabKey; label: string; bancoParam: string; color: string;
    bg: string; border: string; logoChar: string; logoBg: string; logoShadow: string;
}[] = [
    { key: "todas", label: "Todas las cuentas", bancoParam: "", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", logoChar: "★", logoBg: "bg-blue-600", logoShadow: "shadow-blue-200" },
    { key: "santander_22001022837", label: "Santander · 22001022837", bancoParam: "22001022837", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", logoChar: "S", logoBg: "bg-red-600", logoShadow: "shadow-red-200" },
    { key: "santander_65505732541", label: "Santander · 65505732541", bancoParam: "65505732541", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", logoChar: "S", logoBg: "bg-red-800", logoShadow: "shadow-red-300" },
    { key: "banorte_0330253963", label: "Banorte · 0330253963", bancoParam: "0330253963", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", logoChar: "B", logoBg: "bg-orange-600", logoShadow: "shadow-orange-200" },
];

interface Movimiento {
    id: string;
    fechaOperacion: string;
    bancoOrigen: string;
    bancoDestino?: string;
    cuentaDestino?: string;
    concepto?: string;
    descripcionGeneral?: string;
    descripcionDetallada?: string;
    referencia?: string;
    claveRastreo?: string;
    clabeEmisor?: string;
    cuentaEmisor?: string;
    abono?: number;
    cargo?: number;
    ticketId?: string | null;
    clienteId?: string | null;
    tabla?: string;
}

interface Ticket {
    id: string;
    folio?: string;
    referencia?: string;
    claveRastreo?: string;
    cuentaOrigen?: string;
    monto: number;
    creadoEn: string;
    fecha?: string;
    conciliado: boolean;
    cliente?: { id: string; nombreCompleto: string; codigoCliente: string } | null;
    gestor?: { name: string } | null;
}

interface SugerenciaIA {
    ticket: Ticket;
    prioridad: number;
    razon: string;
}

export default function BancosPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("todas");
    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, pages: 0, currentPage: 1, perPage: 100 });
    const [importing, setImporting] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<any>(null);

    // Panel de conciliación
    const [panelMov, setPanelMov] = useState<Movimiento | null>(null);
    const [ticketsPendientes, setTicketsPendientes] = useState<Ticket[]>([]);
    const [sugerenciaIA, setSugerenciaIA] = useState<SugerenciaIA | null>(null);
    const [loadingPanel, setLoadingPanel] = useState(false);
    const [conciliando, setConciliando] = useState(false);
    const [ticketSearch, setTicketSearch] = useState("");
    const [ticketSeleccionado, setTicketSeleccionado] = useState<Ticket | null>(null);

    const santanderInputRef = useRef<HTMLInputElement>(null);
    const banorteInputRef = useRef<HTMLInputElement>(null);
    const currentTabConfig = TABS.find((t) => t.key === activeTab)!;

    // ── Fetch movimientos ──
    const fetchMovimientos = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: currentPage.toString(), limit: "100", search: searchTerm });
            if (currentTabConfig.bancoParam) params.set("banco", currentTabConfig.bancoParam);
            const res = await fetch(`/api/tesoreria/bancos?${params}`);
            if (res.ok) {
                const data = await res.json();
                setMovimientos(data.movimientos);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Error al obtener estado de cuenta", error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, activeTab]);

    useEffect(() => { setCurrentPage(1); }, [activeTab, searchTerm]);
    useEffect(() => { fetchMovimientos(); }, [fetchMovimientos]);

    // ── Abrir panel de conciliación para un movimiento ──
    const abrirPanel = async (mov: Movimiento) => {
        // Solo para abonos sin conciliar
        if (!mov.abono || mov.ticketId) return;
        setPanelMov(mov);
        setTicketSeleccionado(null);
        setTicketSearch("");
        setSugerenciaIA(null);
        setLoadingPanel(true);

        try {
            // Cargar tickets pendientes + sugerencia IA del conciliador
            const res = await fetch("/api/tesoreria/conciliador");
            if (res.ok) {
                const data = await res.json();
                setTicketsPendientes(data.tickets || []);

                // Buscar la sugerencia para este movimiento específico
                const match = (data.sugerencias || []).find(
                    (s: any) => s.movimiento?.id === mov.id && s.movimiento?.tabla === mov.tabla
                );
                if (match) setSugerenciaIA(match);
            }
        } catch {
            toast.error("No se pudieron cargar los tickets pendientes");
        } finally {
            setLoadingPanel(false);
        }
    };

    const cerrarPanel = () => {
        setPanelMov(null);
        setTicketSeleccionado(null);
        setSugerenciaIA(null);
        setTicketSearch("");
    };

    // ── Ejecutar conciliación ──
    const conciliar = async (ticket: Ticket) => {
        if (!panelMov) return;
        setConciliando(true);

        try {
            const tabla = panelMov.tabla || inferirTabla(panelMov.cuentaDestino);
            const res = await fetch("/api/tesoreria/conciliador", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticketId: ticket.id, movimientoId: panelMov.id, tabla }),
            });

            if (res.ok) {
                toast.success(`✅ Movimiento conciliado con ticket ${ticket.folio || ticket.id.slice(-6)}`);
                // Marcar localmente el movimiento como conciliado
                setMovimientos((prev) =>
                    prev.map((m) => (m.id === panelMov.id ? { ...m, ticketId: ticket.id } : m))
                );
                cerrarPanel();
            } else {
                const err = await res.json();
                toast.error(err.error || "Error al conciliar");
            }
        } catch {
            toast.error("Error de conexión al conciliar");
        } finally {
            setConciliando(false);
        }
    };

    // Inferir tabla a partir de la cuenta destino si no viene en el objeto
    const inferirTabla = (cuentaDestino?: string): string => {
        if (cuentaDestino === "22001022837") return "movimientoSantander22001022837";
        if (cuentaDestino === "65505732541") return "movimientoSantander65505732541";
        if (cuentaDestino === "0330253963") return "movimientoBanorte0330253963";
        return "movimientoSantander22001022837";
    };

    // ── Importar ──
    const handleImport = async (banco: "santander" | "banorte", file: File) => {
        setImporting(banco);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("banco", banco);
            const res = await fetch("/api/tesoreria/bancos/importar", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok) {
                setImportResult(data);
                toast.success(data.mensaje);
                fetchMovimientos();
            } else {
                toast.error(data.error || "Error al importar");
                setImportResult({ error: data.error });
            }
        } catch {
            toast.error("Error de conexión al importar");
        } finally {
            setImporting(null);
        }
    };

    const onFileSelected = (banco: "santander" | "banorte", e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
            toast.error("Solo se permiten archivos CSV o Excel (.xlsx, .xls)");
            return;
        }
        handleImport(banco, file);
        e.target.value = "";
    };

    const exportarCSV = () => {
        if (movimientos.length === 0) return;
        const csvContent = [
            ["Fecha", "Banco Destino", "Banco Origen", "Concepto", "Referencia", "Clave Rastreo", "Abono", "Cargo", "Conciliado"],
            ...movimientos.map((m) => [
                m.fechaOperacion.split("T")[0],
                m.bancoDestino || m.bancoOrigen,
                m.bancoOrigen,
                `"${m.concepto || m.descripcionGeneral || "-"}"`,
                `"${m.referencia || "-"}"`,
                `"${m.claveRastreo || "-"}"`,
                m.abono || 0,
                m.cargo || 0,
                m.ticketId ? "Sí" : "No",
            ]),
        ].map((e) => e.join(",")).join("\n");
        const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `EstadoDeCuenta-${currentTabConfig.label.replace(/ /g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    const totalAbonos = movimientos.reduce((s, m) => s + (m.abono || 0), 0);
    const totalCargos = movimientos.reduce((s, m) => s + (m.cargo || 0), 0);
    const totalConciliados = movimientos.filter((m) => m.ticketId).length;
    const totalPendientes = movimientos.filter((m) => m.abono && !m.ticketId).length;

    // Tickets filtrados por búsqueda en el panel
    const ticketsFiltrados = ticketsPendientes.filter((t) => {
        if (!ticketSearch) return true;
        const q = ticketSearch.toLowerCase();
        return (
            (t.cliente?.nombreCompleto || "").toLowerCase().includes(q) ||
            (t.folio || "").toLowerCase().includes(q) ||
            (t.cliente?.codigoCliente || "").toLowerCase().includes(q) ||
            (t.referencia || "").toLowerCase().includes(q)
        );
    });

    const getPrioridadLabel = (p: number) => {
        if (p === 0) return { label: "Clave Rastreo", color: "bg-emerald-100 text-emerald-800" };
        if (p === 1) return { label: "Cuenta Conocida", color: "bg-green-100 text-green-800" };
        if (p === 2) return { label: "Contrato", color: "bg-blue-100 text-blue-800" };
        if (p === 3) return { label: "Referencia", color: "bg-indigo-100 text-indigo-800" };
        if (p === 4) return { label: "Nombre", color: "bg-violet-100 text-violet-800" };
        if (p <= 8) return { label: "Monto", color: "bg-amber-100 text-amber-800" };
        return { label: "Manual", color: "bg-gray-100 text-gray-700" };
    };

    const [deletingOld, setDeletingOld] = useState(false);

    const handleEliminarAnteriores = async () => {
        const confirm = window.confirm("¿Estás seguro de eliminar todos los registros bancarios anteriores al 27/08/2026 de todas las cuentas bancarias? Esta acción es irreversible.");
        if (!confirm) return;

        setDeletingOld(true);
        try {
            const res = await fetch("/api/tesoreria/bancos?antesDe=2026-08-27", {
                method: "DELETE"
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`¡Se eliminaron ${data.eliminados.total} registros bancarios anteriores al 27/08/2026!`);
                fetchMovimientos();
            } else {
                toast.error(data.error || "Error al eliminar registros bancarios");
            }
        } catch (err) {
            console.error("Error al eliminar registros:", err);
            toast.error("Error de conexión al eliminar registros");
        } finally {
            setDeletingOld(false);
        }
    };

    const colSpan = activeTab === "todas" ? 8 : 7;

    return (
        <DashboardLayout>
            <div className="flex gap-6 min-h-0" style={{ position: "relative" }}>

                {/* ── Main content ── */}
                <div className={`flex-1 space-y-5 min-w-0 transition-all duration-300 ${panelMov ? "mr-[420px]" : ""}`}>

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Estado de Cuenta Bancario</h1>
                            <p className="text-muted-foreground mt-1">
                                Importa, visualiza y concilia movimientos bancarios con tickets de pago.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={handleEliminarAnteriores}
                                disabled={loading || deletingOld}
                                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 text-xs font-semibold"
                                title="Eliminar movimientos bancarios anteriores al 27 de agosto de 2026"
                            >
                                {deletingOld ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5 text-red-600" />
                                )}
                                Depurar &lt; 27/08/2026
                            </Button>
                            <Button variant="outline" onClick={exportarCSV} disabled={loading || movimientos.length === 0}>
                                <Download className="mr-2 h-4 w-4" /> Exportar CSV
                            </Button>
                            <Button variant="outline" size="icon" onClick={fetchMovimientos} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </div>

                    {/* Import Cards */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                        {/* Santander */}
                        <Card className="border-red-100 bg-gradient-to-br from-red-50/50 to-white shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-red-200 flex-shrink-0">S</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-sm">Santander (Excel/CSV)</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Detecta automáticamente la cuenta</p>
                                </div>
                                <div>
                                    <input ref={santanderInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => onFileSelected("santander", e)} />
                                    <Button size="sm" onClick={() => santanderInputRef.current?.click()} disabled={importing !== null} className="bg-red-600 hover:bg-red-700 text-white shadow shadow-red-200">
                                        {importing === "santander" ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Importando...</> : <><Upload className="h-3.5 w-3.5 mr-1.5" /> Importar</>}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        {/* Banorte */}
                        <Card className="border-orange-100 bg-gradient-to-br from-orange-50/50 to-white shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-200 flex-shrink-0">B</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-sm">Banorte (Excel/CSV)</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Detecta automáticamente la cuenta</p>
                                </div>
                                <div>
                                    <input ref={banorteInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => onFileSelected("banorte", e)} />
                                    <Button size="sm" onClick={() => banorteInputRef.current?.click()} disabled={importing !== null} className="bg-orange-600 hover:bg-orange-700 text-white shadow shadow-orange-200">
                                        {importing === "banorte" ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Importando...</> : <><Upload className="h-3.5 w-3.5 mr-1.5" /> Importar</>}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Import feedback */}
                    {importResult && !importResult.error && (
                        <Card className="border-green-200 bg-green-50/50">
                            <CardContent className="p-4 flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-green-800 text-sm">Importación Exitosa</h4>
                                    <div className="grid grid-cols-3 gap-4 mt-2">
                                        <div><span className="text-green-600 font-bold text-lg">{importResult.insertados}</span><p className="text-green-700 text-xs">Importados</p></div>
                                        <div><span className="text-orange-600 font-bold text-lg">{importResult.duplicados}</span><p className="text-orange-700 text-xs">Duplicados</p></div>
                                        <div><span className={`font-bold text-lg ${importResult.errores > 0 ? "text-red-600" : "text-gray-400"}`}>{importResult.errores}</span><p className="text-gray-500 text-xs">Errores</p></div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => setImportResult(null)}>✕</Button>
                            </CardContent>
                        </Card>
                    )}
                    {importResult?.error && (
                        <Card className="border-red-200 bg-red-50/50">
                            <CardContent className="p-4 flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                <p className="text-red-700 text-sm font-medium flex-1">{importResult.error}</p>
                                <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => setImportResult(null)}>✕</Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Main Table Card */}
                    <Card className="overflow-hidden">
                        {/* Tabs */}
                        <div className="border-b border-gray-100 bg-gray-50/50">
                            <div className="flex overflow-x-auto">
                                {TABS.map((tab) => {
                                    const isActive = activeTab === tab.key;
                                    return (
                                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center gap-2.5 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${isActive ? `border-blue-500 ${tab.color} bg-white` : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"}`}
                                            style={isActive ? { borderBottomColor: tab.key === "todas" ? "#3b82f6" : tab.key.startsWith("santander") ? "#dc2626" : "#ea580c", color: tab.key === "todas" ? "#1d4ed8" : tab.key.startsWith("santander") ? "#b91c1c" : "#c2410c" } : {}}
                                        >
                                            <div className={`h-5 w-5 rounded-md ${tab.logoBg} flex items-center justify-center text-white text-[10px] font-black flex-shrink-0`}>{tab.logoChar}</div>
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Summary row */}
                        {!loading && movimientos.length > 0 && (
                            <div className={`grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 ${currentTabConfig.bg}/30`}>
                                <div className="px-4 py-3 flex items-center gap-2">
                                    <Wallet className="h-4 w-4 text-gray-400" />
                                    <div><p className="text-xs text-gray-500">Registros</p><p className="font-bold text-gray-900 text-sm">{pagination.total}</p></div>
                                </div>
                                <div className="px-4 py-3 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    <div><p className="text-xs text-gray-500">Abonos (pág.)</p><p className="font-bold text-green-700 text-sm">{formatCurrency(totalAbonos)}</p></div>
                                </div>
                                <div className="px-4 py-3 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                                    <div><p className="text-xs text-gray-500">Conciliados</p><p className="font-bold text-blue-700 text-sm">{totalConciliados}</p></div>
                                </div>
                                <div className="px-4 py-3 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                    <div><p className="text-xs text-gray-500">Por conciliar</p><p className="font-bold text-amber-700 text-sm">{totalPendientes}</p></div>
                                </div>
                            </div>
                        )}

                        {/* Search */}
                        <CardHeader className="pb-3 border-b border-gray-100 pt-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <CardTitle className="text-base font-medium">
                                    Historial de Transacciones
                                    <Badge variant="outline" className="ml-3 font-mono text-xs">{pagination.total} registros</Badge>
                                </CardTitle>
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input placeholder="Buscar por concepto, rastreo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                                </div>
                            </div>
                        </CardHeader>

                        {/* Table */}
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left align-middle text-gray-600">
                                    <thead className="bg-gray-50/75 border-b border-gray-100 font-medium text-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 w-8"></th>
                                            <th className="px-4 py-3">Fecha</th>
                                            {activeTab === "todas" && <th className="px-4 py-3">Cuenta</th>}
                                            <th className="px-4 py-3">Banco Origen</th>
                                            <th className="px-4 py-3 min-w-[200px]">Concepto</th>
                                            <th className="px-4 py-3">Rastreo / Ref</th>
                                            <th className="px-4 py-3 text-right text-green-700">Abono</th>
                                            <th className="px-4 py-3 text-right text-red-700">Cargo</th>
                                            <th className="px-4 py-3 text-center">Estatus</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr><td colSpan={colSpan + 2} className="px-4 py-8 text-center text-gray-500">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" /> Cargando movimientos...
                                            </td></tr>
                                        ) : movimientos.length === 0 ? (
                                            <tr><td colSpan={colSpan + 2} className="px-4 py-12 text-center">
                                                <Landmark className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500 font-medium">No se encontraron movimientos</p>
                                                <p className="text-sm text-gray-400 mt-1">Importa un estado de cuenta para comenzar.</p>
                                            </td></tr>
                                        ) : (
                                            movimientos.map((mov) => {
                                                const esConciliado = !!mov.ticketId;
                                                const esAbono = (mov.abono || 0) > 0;
                                                const esClickable = esAbono && !esConciliado;
                                                const isSelected = panelMov?.id === mov.id;

                                                return (
                                                    <tr
                                                        key={mov.id}
                                                        onClick={() => esClickable ? abrirPanel(mov) : undefined}
                                                        className={`transition-colors ${esClickable
                                                            ? "hover:bg-blue-50/60 cursor-pointer"
                                                            : esConciliado ? "bg-emerald-50/30" : ""
                                                        } ${isSelected ? "bg-blue-100/60 ring-1 ring-inset ring-blue-300" : ""}`}
                                                    >
                                                        {/* Indicador visual */}
                                                        <td className="pl-3 pr-1 py-3">
                                                            {esConciliado ? (
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                            ) : esAbono ? (
                                                                <Link2 className="h-4 w-4 text-blue-400 opacity-60" />
                                                            ) : (
                                                                <span className="block h-4 w-4" />
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-gray-800">
                                                            {formatDate(mov.fechaOperacion).split(" ")[0]}
                                                        </td>
                                                        {activeTab === "todas" && (
                                                            <td className="px-4 py-3">
                                                                {mov.cuentaDestino ? (
                                                                    <Badge variant="outline" className={`text-xs font-semibold ${mov.bancoDestino === "SANTANDER" ? "border-red-200 text-red-700 bg-red-50" : "border-orange-200 text-orange-700 bg-orange-50"}`}>
                                                                        {mov.cuentaDestino}
                                                                    </Badge>
                                                                ) : <span className="text-gray-400 text-xs">—</span>}
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 font-medium text-gray-900 text-xs">{mov.bancoOrigen}</td>
                                                        <td className="px-4 py-3">
                                                            <p className="truncate max-w-[240px]" title={mov.concepto || mov.descripcionGeneral || ""}>
                                                                {mov.concepto || mov.descripcionGeneral || "—"}
                                                            </p>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-mono text-gray-500">
                                                            {mov.claveRastreo || mov.referencia || "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-semibold text-green-700">
                                                            {mov.abono ? formatCurrency(mov.abono) : "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium text-red-600">
                                                            {mov.cargo ? formatCurrency(mov.cargo) : "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {esConciliado ? (
                                                                <Badge className="bg-emerald-100 text-emerald-800 border-none text-xs font-bold">Conciliado</Badge>
                                                            ) : esAbono ? (
                                                                <Badge className="bg-amber-100 text-amber-800 border-none text-xs font-bold hover:bg-amber-200 transition-colors">
                                                                    <Link2 className="h-3 w-3 mr-1" /> Conciliar
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs text-gray-400">Cargo</Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación */}
                            {pagination.pages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                                    <span className="text-sm text-gray-500">Página {pagination.currentPage} de {pagination.pages}</span>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))} disabled={currentPage === pagination.pages}>Siguiente</Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Panel Lateral de Conciliación ── */}
                {panelMov && (
                    <div className="fixed top-0 right-0 h-full w-[420px] bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col overflow-hidden">
                        {/* Header del panel */}
                        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white flex-shrink-0">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Link2 className="h-5 w-5 text-blue-200" />
                                    <h2 className="font-bold text-base">Conciliar Movimiento</h2>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 rounded-full" onClick={cerrarPanel}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-blue-100 text-xs">Selecciona el ticket o pago que corresponde a este depósito</p>
                        </div>

                        {/* Info del movimiento seleccionado */}
                        <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex-shrink-0">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Abono</p>
                                    <p className="text-xl font-black text-blue-900">{formatCurrency(panelMov.abono || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Fecha</p>
                                    <p className="font-bold text-blue-900">{formatDate(panelMov.fechaOperacion).split(" ")[0]}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Concepto</p>
                                    <p className="text-blue-900 text-xs leading-relaxed line-clamp-2">{panelMov.concepto || panelMov.descripcionGeneral || "—"}</p>
                                </div>
                                {panelMov.claveRastreo && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Clave de Rastreo</p>
                                        <p className="font-mono text-xs text-blue-800">{panelMov.claveRastreo}</p>
                                    </div>
                                )}
                                {(panelMov.cuentaDestino || panelMov.bancoDestino) && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Cuenta Destino</p>
                                        <p className="font-mono text-xs text-blue-800">{panelMov.bancoDestino} · {panelMov.cuentaDestino}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contenido scrolleable */}
                        <div className="flex-1 overflow-y-auto">
                            {loadingPanel ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-3">
                                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                    <p className="text-sm text-gray-500">Buscando tickets pendientes...</p>
                                </div>
                            ) : (
                                <div className="p-5 space-y-5">
                                    {/* ── Sugerencia IA ── */}
                                    {sugerenciaIA && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Zap className="h-4 w-4 text-amber-500" />
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Sugerencia IA</span>
                                                {(() => {
                                                    const p = getPrioridadLabel(sugerenciaIA.prioridad);
                                                    return <Badge className={`${p.color} border-none text-xs`}>{p.label}</Badge>;
                                                })()}
                                            </div>
                                            <div
                                                onClick={() => setTicketSeleccionado(sugerenciaIA.ticket)}
                                                className={`border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${ticketSeleccionado?.id === sugerenciaIA.ticket.id ? "border-blue-500 bg-blue-50" : "border-amber-200 bg-amber-50/40 hover:border-amber-400"}`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-900 text-sm truncate">{sugerenciaIA.ticket.cliente?.nombreCompleto || "Sin cliente"}</p>
                                                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                                                            {sugerenciaIA.ticket.cliente?.codigoCliente && (
                                                                <span className="font-mono font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded text-[11px]">
                                                                    #{sugerenciaIA.ticket.cliente.codigoCliente}
                                                                </span>
                                                            )}
                                                            {sugerenciaIA.ticket.gestor && <span>· {sugerenciaIA.ticket.gestor.name}</span>}
                                                        </div>
                                                    </div>
                                                    <p className="font-black text-green-700 text-base whitespace-nowrap">{formatCurrency(sugerenciaIA.ticket.monto)}</p>
                                                </div>

                                                {/* Fecha y Hora */}
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-600 font-medium">
                                                    <span className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded border border-amber-200/60">
                                                        <Calendar className="h-3 w-3 text-amber-600" />
                                                        {formatFechaTicket(sugerenciaIA.ticket.fecha, sugerenciaIA.ticket.creadoEn)}
                                                    </span>
                                                    {formatHoraTicket(sugerenciaIA.ticket.fecha, sugerenciaIA.ticket.creadoEn) && (
                                                        <span className="flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded border border-amber-200/60 font-mono">
                                                            <Clock className="h-3 w-3 text-amber-600" />
                                                            {formatHoraTicket(sugerenciaIA.ticket.fecha, sugerenciaIA.ticket.creadoEn)}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-[10px] text-amber-700 mt-2 font-medium bg-amber-100/60 rounded px-2 py-1">{sugerenciaIA.razon}</p>
                                                
                                                {sugerenciaIA.ticket.claveRastreo && (
                                                    <p className="text-[10px] text-blue-700 mt-1.5 font-mono break-all bg-blue-50/70 px-2 py-0.5 rounded border border-blue-200/50">
                                                        SPEI: {sugerenciaIA.ticket.claveRastreo}
                                                    </p>
                                                )}
                                                {sugerenciaIA.ticket.folio && (
                                                    <p className="text-[10px] text-gray-400 mt-1 font-mono">Folio: {sugerenciaIA.ticket.folio}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Buscar ticket manualmente ── */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <FileText className="h-4 w-4 text-gray-500" />
                                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Tickets Pendientes ({ticketsPendientes.length})</span>
                                        </div>
                                        <div className="relative mb-3">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                            <Input
                                                placeholder="Buscar por cliente, folio, código..."
                                                value={ticketSearch}
                                                onChange={(e) => setTicketSearch(e.target.value)}
                                                className="pl-9 h-9 text-sm"
                                            />
                                        </div>

                                        {ticketsFiltrados.length === 0 ? (
                                            <div className="text-center py-8 text-gray-400">
                                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No hay tickets pendientes</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                                {ticketsFiltrados.map((ticket) => {
                                                    const isSelected = ticketSeleccionado?.id === ticket.id;
                                                    const montoCoincidie = ticket.monto === panelMov.abono;
                                                    const fechaFormatted = formatFechaTicket(ticket.fecha, ticket.creadoEn);
                                                    const horaFormatted = formatHoraTicket(ticket.fecha, ticket.creadoEn);

                                                    return (
                                                        <div
                                                            key={ticket.id}
                                                            onClick={() => setTicketSeleccionado(ticket)}
                                                            className={`border rounded-xl p-3 cursor-pointer transition-all hover:shadow-sm ${isSelected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                                        <User className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                                                                        <p className="font-bold text-gray-900 text-xs truncate">{ticket.cliente?.nombreCompleto || "Sin cliente"}</p>
                                                                    </div>
                                                                    
                                                                    {/* Código, Folio y Gestor */}
                                                                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-1">
                                                                        {ticket.cliente?.codigoCliente && (
                                                                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                                                #{ticket.cliente.codigoCliente}
                                                                            </span>
                                                                        )}
                                                                        {ticket.folio && <span className="font-mono text-gray-500">Folio: {ticket.folio}</span>}
                                                                        {ticket.gestor && <span className="text-gray-400">· {ticket.gestor.name}</span>}
                                                                    </div>

                                                                    {/* Fecha y Hora del Ticket */}
                                                                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-gray-600">
                                                                        <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                                                                            <Calendar className="h-3 w-3 text-gray-500" />
                                                                            {fechaFormatted}
                                                                        </span>
                                                                        {horaFormatted && (
                                                                            <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono font-medium">
                                                                                <Clock className="h-3 w-3 text-blue-600" />
                                                                                {horaFormatted}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Clave de Rastreo SPEI si existe */}
                                                                    {ticket.claveRastreo && (
                                                                        <div className="mt-1 text-[10px] font-mono text-blue-700 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-100 truncate" title={ticket.claveRastreo}>
                                                                            SPEI: {ticket.claveRastreo}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="text-right flex-shrink-0">
                                                                    <p className={`font-black text-sm ${montoCoincidie ? "text-green-700" : "text-gray-800"}`}>
                                                                        {formatCurrency(ticket.monto)}
                                                                    </p>
                                                                    {montoCoincidie && <p className="text-[9px] text-green-600 font-bold">✓ Monto exacto</p>}
                                                                </div>
                                                            </div>

                                                            {isSelected && (
                                                                <div className="mt-2.5 pt-1.5 border-t border-blue-200/60 flex items-center justify-between text-blue-700">
                                                                    <div className="flex items-center gap-1">
                                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                                        <span className="text-[11px] font-bold">Seleccionado para conciliar</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-mono font-semibold">#{ticket.id}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer de acción */}
                        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 space-y-2">
                            {ticketSeleccionado && (
                                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200/60">
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] text-blue-600 font-semibold uppercase tracking-wide">Ticket seleccionado</p>
                                            <p className="font-bold text-blue-950 text-sm truncate">{ticketSeleccionado.cliente?.nombreCompleto || "Sin cliente"}</p>
                                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-blue-800 mt-1">
                                                {ticketSeleccionado.cliente?.codigoCliente && (
                                                    <span className="font-mono font-bold">#{ticketSeleccionado.cliente.codigoCliente}</span>
                                                )}
                                                <span>· {formatFechaTicket(ticketSeleccionado.fecha, ticketSeleccionado.creadoEn)}</span>
                                                {formatHoraTicket(ticketSeleccionado.fecha, ticketSeleccionado.creadoEn) && (
                                                    <span className="font-mono">· {formatHoraTicket(ticketSeleccionado.fecha, ticketSeleccionado.creadoEn)}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-black text-green-700 text-base">{formatCurrency(ticketSeleccionado.monto)}</p>
                                            {ticketSeleccionado.monto !== panelMov.abono && (
                                                <p className="text-[10px] text-amber-600 font-bold">
                                                    Dif: {formatCurrency(Math.abs(ticketSeleccionado.monto - (panelMov.abono || 0)))}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={cerrarPanel} className="flex-1">Cancelar</Button>
                                <Button
                                    onClick={() => ticketSeleccionado && conciliar(ticketSeleccionado)}
                                    disabled={!ticketSeleccionado || conciliando}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {conciliando
                                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Conciliando...</>
                                        : <><Link2 className="h-4 w-4 mr-2" /> Conciliar</>
                                    }
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
