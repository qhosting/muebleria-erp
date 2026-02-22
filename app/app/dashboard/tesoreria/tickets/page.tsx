"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ticket as TicketIcon, Search, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function TicketsPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
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
                limit: "50",
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Registro de Tickets</h1>
                    <p className="text-muted-foreground mt-1">
                        Bandeja general de pagos, interacciones e ingresos reportados.
                    </p>
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
                                        <th scope="col" className="px-4 py-3 text-center">Estado</th>
                                        <th scope="col" className="px-4 py-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                Cargando tickets...
                                            </td>
                                        </tr>
                                    ) : tickets.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center">
                                                <TicketIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500 font-medium">No se encontraron tickets</p>
                                                <p className="text-sm text-gray-400 mt-1">Intenta con otros términos de búsqueda.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        tickets.map((ticket) => (
                                            <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {formatDate(ticket.fecha || ticket.creadoEn).split(' ')[0]}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-sm text-gray-900">
                                                    {ticket.folio || ticket.referencia || `#${ticket.legacyId}`}
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
                                                        {ticket.gestor?.name || ticket.gestor?.codigoGestor || "Sin Gestor"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                    {formatCurrency(ticket.monto)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
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
                                                <td className="px-4 py-3 text-center">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
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
