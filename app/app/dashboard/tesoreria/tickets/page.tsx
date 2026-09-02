"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Ticket as TicketIcon,
    Search,
    CheckCircle2,
    AlertCircle,
    Eye,
    Download,
    Clock,
    DollarSign,
    Loader2,
    ZoomIn,
    ZoomOut,
    ImageIcon,
    FileText,
    User,
    Calendar,
    Phone,
    CreditCard,
    Trash2
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function TicketsPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [deletingTicket, setDeletingTicket] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        currentPage: 1,
        perPage: 50,
    });

    // Modal de visualización de ticket
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [ticketImage, setTicketImage] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, [currentPage, searchTerm]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: "100",
                search: searchTerm,
            });

            const res = await fetch(`/api/tesoreria/tickets?${params}`);
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Error al obtener tickets", error);
            toast.error("Error al obtener la lista de tickets");
        } finally {
            setLoading(false);
        }
    };

    const handleViewTicket = async (ticket: any) => {
        setSelectedTicket(ticket);
        setIsZoomed(false);
        setTicketImage(null);
        setImageLoading(true);

        try {
            // Intentar primero con urlComprobante directo
            if (ticket.urlComprobante) {
                setTicketImage(ticket.urlComprobante);
                setImageLoading(false);
                return;
            }

            // Consultar endpoint de comprobante / buzon
            const res = await fetch(`/api/tesoreria/tickets/${ticket.id}/comprobante`);
            if (res.ok) {
                const data = await res.json();
                if (data.found) {
                    setTicketImage(data.base64 || data.url);
                }
            }
        } catch (err) {
            console.error("Error cargando comprobante:", err);
        } finally {
            setImageLoading(false);
        }
    };

    const handleAplicarPago = async (ticketId: string) => {
        const confirmAction = window.confirm(
            "¿Estás seguro de aplicar este pago manualmente al cliente?\n\nEsto registrará un abono, descontará el monto del saldo pendiente del cliente y marcará el ticket como conciliado."
        );
        if (!confirmAction) return;

        setApplyingId(ticketId);
        try {
            const res = await fetch("/api/tesoreria/tickets", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ticketId }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("¡Pago aplicado y registrado exitosamente al cliente!");
                fetchTickets();
                if (selectedTicket && selectedTicket.id === ticketId) {
                    setSelectedTicket((prev: any) => prev ? { ...prev, conciliado: true, pagos: [{ id: data.pagoId || 'NUEVO' }] } : null);
                }
            } else {
                toast.error(data.error || "Error al aplicar el pago");
            }
        } catch (error) {
            console.error("Error al aplicar pago:", error);
            toast.error("Error de conexión con el servidor");
        } finally {
            setApplyingId(null);
        }
    };

    const confirmDeleteTicket = async () => {
        if (!deletingTicket) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/tesoreria/tickets?ticketId=${deletingTicket.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "Ticket eliminado y saldo revertido exitosamente");
                if (selectedTicket?.id === deletingTicket.id) {
                    setSelectedTicket(null);
                }
                setDeletingTicket(null);
                fetchTickets();
            } else {
                toast.error(data.error || "Error al eliminar el ticket");
            }
        } catch (error) {
            console.error("Error al eliminar ticket:", error);
            toast.error("Error de conexión al eliminar el ticket");
        } finally {
            setIsDeleting(false);
        }
    };

    const exportarExcel = () => {
        if (tickets.length === 0) return;

        const csvContent = [
            ["Fecha", "ID Ticket", "Folio/Ref", "Codigo Cliente", "Nombre Cliente", "Gestor", "Monto", "Conciliacion", "Pago Cliente", "ID Pago"],
            ...tickets.map(t => [
                (t.fecha || t.creadoEn).split("T")[0],
                `"${t.id}"`,
                `"${t.folio || t.referencia || t.legacyId || "-"}"`,
                `"${t.cliente?.codigoCliente || "-"}"`,
                `"${t.cliente?.nombreCompleto || "-"}"`,
                `"${t.gestor?.codigoGestor || t.cliente?.cobradorAsignado?.codigoGestor || "-"}"`,
                t.monto,
                t.conciliado ? "CONCILIADO" : "PENDIENTE",
                (t.pagos && t.pagos.length > 0) ? "APLICADO" : "SIN APLICAR",
                `"${t.pagos && t.pagos.length > 0 ? t.pagos.map((p: any) => p.id).join("; ") : "-"}"`
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Tickets-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Registro de Tickets</h1>
                        <p className="text-muted-foreground mt-1">
                            Bandeja general de pagos, interacciones e ingresos reportados.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => window.location.href='/dashboard/tesoreria/tickets/cola'} className="border-amber-200 text-amber-700 hover:bg-amber-50">
                            <Clock className="mr-2 h-4 w-4" /> Ver Cola de Tickets
                        </Button>
                        <Button variant="outline" onClick={exportarExcel} disabled={loading || tickets.length === 0}>
                            <Download className="mr-2 h-4 w-4" /> Exportar CSV
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader className="pb-3 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <CardTitle className="text-lg font-medium">Bandeja de Entradas</CardTitle>
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar folio, rastreo, cliente, ref..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle text-gray-600">
                                <thead className="bg-gray-50/75 border-b border-gray-100 font-medium text-gray-700">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Fecha</th>
                                        <th scope="col" className="px-4 py-3">Folio / Ref / Rastreo</th>
                                        <th scope="col" className="px-4 py-3">Cliente</th>
                                        <th scope="col" className="px-4 py-3">Gestor</th>
                                        <th scope="col" className="px-4 py-3 text-right">Monto</th>
                                        <th scope="col" className="px-4 py-3 text-center">Conciliación</th>
                                        <th scope="col" className="px-4 py-3 text-center">Pago Cliente</th>
                                        <th scope="col" className="px-4 py-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                                Cargando tickets...
                                            </td>
                                        </tr>
                                    ) : tickets.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-12 text-center">
                                                <TicketIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500 font-medium">No se encontraron tickets</p>
                                                <p className="text-sm text-gray-400 mt-1">Intenta con otros términos de búsqueda.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        tickets.map((ticket) => {
                                            const tienePago = ticket.pagos && ticket.pagos.length > 0;
                                            return (
                                                <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {formatDate(ticket.fecha || ticket.creadoEn).split(' ')[0]}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-sm text-gray-900">
                                                        <div>{ticket.folio || ticket.referencia || ticket.claveRastreo || `#${ticket.legacyId}`}</div>
                                                        {ticket.claveRastreo && ticket.claveRastreo !== ticket.folio && ticket.claveRastreo !== ticket.referencia && (
                                                             <div className="text-[11px] text-blue-600 font-mono">
                                                                Rastreo: {ticket.claveRastreo}
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-gray-400 font-mono mt-0.5" title="Ticket ID">
                                                            ID: {ticket.id}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-gray-900 truncate max-w-[180px]">
                                                            {ticket.cliente?.nombreCompleto || "Cliente Desconocido"}
                                                        </p>
                                                        <p className="text-xs text-gray-500 font-mono">
                                                            {ticket.cliente?.codigoCliente}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            {ticket.gestor?.codigoGestor || ticket.cliente?.cobradorAsignado?.codigoGestor || "Sin Gestor"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                        {formatCurrency(ticket.monto)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                                        {ticket.conciliado ? (
                                                            <Badge variant="success" className="bg-green-50 text-green-700 border-green-200">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Conciliado
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200">
                                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                                Pendiente
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                                        {tienePago ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                    Aplicado
                                                                </Badge>
                                                                {ticket.pagos.map((pago: any) => (
                                                                    <span key={pago.id} className="text-[10px] text-gray-400 font-mono" title="Pago ID">
                                                                        ID: {pago.id}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
                                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                                Sin Aplicar
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleViewTicket(ticket)}
                                                                className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                                                                title="Ver detalles y comprobante"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            {!tienePago && ticket.clienteId && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={applyingId === ticket.id}
                                                                    onClick={() => handleAplicarPago(ticket.id)}
                                                                    className="h-8 text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 flex items-center gap-1 font-semibold rounded-lg transition-all"
                                                                >
                                                                    {applyingId === ticket.id ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        <DollarSign className="w-3 h-3" />
                                                                    )}
                                                                    Aplicar Pago
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setDeletingTicket(ticket)}
                                                                className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                                                                title="Eliminar ticket y revertir saldo"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination footer */}
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                                <span className="text-sm text-gray-500">
                                    Página {pagination.currentPage} de {pagination.pages} ({pagination.total} en total)
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                                        disabled={currentPage === pagination.pages}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Detalle y Comprobante */}
            <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <TicketIcon className="h-5 w-5 text-indigo-600" />
                                    Detalle del Ticket #{selectedTicket?.id}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                                    Información registrada, comprobante digital y trazabilidad de cobranza
                                </DialogDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedTicket?.conciliado ? (
                                    <Badge variant="success" className="bg-green-100 text-green-800 border-green-200">
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        Conciliado
                                    </Badge>
                                ) : (
                                    <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-200">
                                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                        Pendiente
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedTicket && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {/* Columna Izquierda: Vista del Comprobante */}
                            <div className="flex flex-col items-center justify-center bg-slate-900/5 rounded-xl border border-slate-200 p-4 min-h-[380px]">
                                {imageLoading ? (
                                    <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                                        <p className="text-xs font-medium">Buscando comprobante...</p>
                                    </div>
                                ) : ticketImage ? (
                                    <div className="relative w-full flex flex-col items-center">
                                        <div
                                            className="relative overflow-hidden max-h-[460px] w-full flex items-center justify-center cursor-pointer rounded-lg bg-black/10 border"
                                            onClick={() => setIsZoomed(!isZoomed)}
                                            title="Click para ampliar / reducir"
                                        >
                                            <img
                                                src={ticketImage}
                                                alt="Comprobante"
                                                className={`transition-all duration-300 rounded shadow-md object-contain ${
                                                    isZoomed ? "scale-150 max-h-[600px] cursor-zoom-out" : "max-h-[420px] cursor-zoom-in"
                                                }`}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between w-full mt-2 px-1 text-xs text-gray-500">
                                            <span className="flex items-center gap-1 text-[11px]">
                                                {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                                                {isZoomed ? "Click para reducir" : "Click para ampliar"}
                                            </span>
                                            <a
                                                href={ticketImage}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:text-indigo-800 font-semibold underline text-[11px]"
                                            >
                                                Abrir en pestaña nueva ↗
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                        <ImageIcon className="h-12 w-12 text-gray-300 mb-2" />
                                        <p className="text-sm font-semibold text-gray-600">Imagen no adjunta</p>
                                        <p className="text-xs text-gray-400 mt-1 max-w-[240px]">
                                            El comprobante se registró por texto o transferencia directa.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Columna Derecha: Tarjetas de Información */}
                            <div className="space-y-4">
                                {/* Resumen Principal */}
                                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Monto Registrado</p>
                                            <p className="text-2xl font-black text-indigo-900 mt-0.5">
                                                {formatCurrency(selectedTicket.monto || 0)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] text-gray-500">Fecha de Operación</p>
                                            <p className="text-sm font-bold text-gray-800">
                                                {formatDate(selectedTicket.fecha || selectedTicket.creadoEn)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Datos del Cliente */}
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                                    <p className="font-bold text-gray-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5 text-gray-500" />
                                        Cliente Asociado
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div>
                                            <span className="text-gray-500 block text-[10px]">Nombre Completo</span>
                                            <span className="font-semibold text-gray-900">{selectedTicket.cliente?.nombreCompleto || 'Desconocido'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-[10px]">Código Cliente</span>
                                            <span className="font-mono font-bold text-indigo-700">{selectedTicket.cliente?.codigoCliente || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-[10px]">Gestor / Cobrador</span>
                                            <span className="font-medium text-gray-800">
                                                {selectedTicket.gestor?.codigoGestor || selectedTicket.cliente?.cobradorAsignado?.codigoGestor || 'Sin Asignar'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-[10px]">Remitente</span>
                                            <span className="font-mono text-gray-700 truncate block">{selectedTicket.remitente || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Datos Bancarios y Rastreo */}
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                                    <p className="font-bold text-gray-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                        <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                                        Trazabilidad Bancaria
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <div>
                                            <span className="text-gray-500 block text-[10px]">Folio / Autorización</span>
                                            <span className="font-mono font-bold text-gray-900">{selectedTicket.folio || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-[10px]">Referencia</span>
                                            <span className="font-mono font-bold text-gray-900">{selectedTicket.referencia || 'N/A'}</span>
                                        </div>
                                        {selectedTicket.claveRastreo && (
                                            <div className="col-span-2">
                                                <span className="text-gray-500 block text-[10px]">Clave de Rastreo SPEI</span>
                                                <span className="font-mono text-blue-700 font-semibold break-all">{selectedTicket.claveRastreo}</span>
                                            </div>
                                        )}
                                        {selectedTicket.cuentaOrigen && (
                                            <div>
                                                <span className="text-gray-500 block text-[10px]">Cuenta Origen</span>
                                                <span className="font-mono text-gray-800">{selectedTicket.cuentaOrigen}</span>
                                            </div>
                                        )}
                                        {selectedTicket.cuentaDestino && (
                                            <div>
                                                <span className="text-gray-500 block text-[10px]">Cuenta Destino</span>
                                                <span className="font-mono text-gray-800">{selectedTicket.cuentaDestino}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Acciones de Aplicación y Eliminación */}
                                <div className="pt-2 flex flex-col gap-2">
                                    {(!selectedTicket.pagos || selectedTicket.pagos.length === 0) && selectedTicket.clienteId && (
                                        <Button
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-xl flex items-center justify-center gap-2"
                                            disabled={applyingId === selectedTicket.id}
                                            onClick={() => handleAplicarPago(selectedTicket.id)}
                                        >
                                            {applyingId === selectedTicket.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <DollarSign className="w-4 h-4" />
                                            )}
                                            Aplicar Pago Manualmente a la Cuenta
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-semibold py-2 rounded-xl flex items-center justify-center gap-2 transition-all"
                                        onClick={() => setDeletingTicket(selectedTicket)}
                                    >
                                        <Trash2 className="w-4 h-4 text-rose-600" />
                                        Eliminar Ticket y Revertir Saldo
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmación de Eliminación y Reversión de Saldo */}
            <Dialog open={!!deletingTicket} onOpenChange={(open) => !open && !isDeleting && setDeletingTicket(null)}>
                <DialogContent className="max-w-md p-6">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-full">
                                <Trash2 className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-gray-900">
                                    ¿Eliminar Ticket y Revertir Saldo?
                                </DialogTitle>
                                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                                    Esta acción eliminará el ticket y restaurará el saldo del cliente
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {deletingTicket && (
                        <div className="space-y-4 my-2">
                            <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Ticket ID:</span>
                                    <span className="font-mono font-bold text-gray-800">#{deletingTicket.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Folio / Ref:</span>
                                    <span className="font-mono text-gray-700">{deletingTicket.folio || deletingTicket.referencia || deletingTicket.claveRastreo || "S/N"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Cliente:</span>
                                    <span className="font-semibold text-gray-900 truncate max-w-[200px]">
                                        {deletingTicket.cliente?.nombreCompleto || "Desconocido"} ({deletingTicket.cliente?.codigoCliente || "N/A"})
                                    </span>
                                </div>
                                <div className="flex justify-between pt-1.5 border-t border-rose-200">
                                    <span className="text-rose-800 font-medium">Monto a reintegrar:</span>
                                    <span className="font-bold text-rose-700 text-sm">+{formatCurrency(deletingTicket.monto || 0)}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Efectos de esta operación:</p>
                                    <ul className="list-disc list-inside space-y-0.5 mt-1 text-[11px] text-amber-700">
                                        <li>Se eliminará el ticket definitivamente.</li>
                                        <li>Se eliminarán los registros de pago asociados en la cartera.</li>
                                        {deletingTicket.pagos && deletingTicket.pagos.length > 0 ? (
                                            <li>
                                                <strong>Se sumarán {formatCurrency(deletingTicket.monto || 0)}</strong> al saldo pendiente del cliente.
                                            </li>
                                        ) : (
                                            <li>El ticket no tenía pagos aplicados (no modificará saldos).</li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setDeletingTicket(null)}
                                    disabled={isDeleting}
                                    className="rounded-xl"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={confirmDeleteTicket}
                                    disabled={isDeleting}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl flex items-center gap-2"
                                >
                                    {isDeleting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    Confirmar y Eliminar
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
