"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ticket as TicketIcon, Search, CheckCircle2, AlertCircle, Eye, Download, Clock, DollarSign, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function TicketsPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        currentPage: 1,
        perPage: 50,
    });

    useEffect(() => {
        fetchTickets();
    }, [currentPage, searchTerm]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: "100", // Aumentamos el límite para vista amplia
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
                                    placeholder="Buscar folio, cliente, referencia..."
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
                                        <th scope="col" className="px-4 py-3">Folio / Ref</th>
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
                                                        <div>{ticket.folio || ticket.referencia || `#${ticket.legacyId}`}</div>
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
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600">
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
        </DashboardLayout>
    );
}
