"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCheck, Search, Calendar, Download, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function VerificacionesPage() {
    const [verificaciones, setVerificaciones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const [fechaDesde, setFechaDesde] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split("T")[0]);

    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        currentPage: 1,
        perPage: 50,
    });

    useEffect(() => {
        fetchVerificaciones();
    }, [currentPage, searchTerm, fechaDesde, fechaHasta]);

    const fetchVerificaciones = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: "50",
                search: searchTerm,
                fechaDesde: fechaDesde ? `${fechaDesde}T00:00:00.000Z` : "",
                fechaHasta: fechaHasta ? `${fechaHasta}T23:59:59.999Z` : "",
            });

            const res = await fetch(`/api/tesoreria/verificaciones?${params}`);
            if (res.ok) {
                const data = await res.json();
                setVerificaciones(data.verificaciones);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Error al obtener verificaciones", error);
            toast.error("Error al cargar verificaciones");
        } finally {
            setLoading(false);
        }
    };

    const exportarExcel = () => {
        if (verificaciones.length === 0) return;

        const csvContent = [
            ["ID", "Fecha", "Codigo Cliente", "Nombre Cliente", "Direccion", "Gestor", "Estatus"],
            ...verificaciones.map(v => [
                v.id,
                v.fecha.split("T")[0],
                v.cliente?.codigoCliente || "-",
                `"${v.cliente?.nombreCompleto || "-"}"`,
                `"${v.cliente?.direccionCompleta || "-"}"`,
                v.gestor?.name || "-",
                "REALIZADA"
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Verificaciones-${fechaDesde}.csv`;
        a.click();
        toast.success("Descarga iniciada");
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
                            <UserCheck className="mr-3 h-8 w-8 text-blue-600" />
                            Verificaciones Domiciliarias
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Historial de visitas y validaciones de domicilio realizadas por los gestores.
                        </p>
                    </div>
                    <Button onClick={exportarExcel} disabled={loading || verificaciones.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                </div>

                {/* Filtros */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="relative md:col-span-2">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar por cliente o gestor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <div className="space-y-2">
                                <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle text-gray-600">
                                <thead className="bg-gray-50/75 border-b border-gray-100 font-medium text-gray-700">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Fecha</th>
                                        <th scope="col" className="px-4 py-3">Cliente</th>
                                        <th scope="col" className="px-4 py-3">Dirección</th>
                                        <th scope="col" className="px-4 py-3">Gestor</th>
                                        <th scope="col" className="px-4 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                Cargando verificaciones...
                                            </td>
                                        </tr>
                                    ) : verificaciones.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center">
                                                <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500 font-medium">No se encontraron verificaciones</p>
                                                <p className="text-sm text-gray-400 mt-1">Asegúrate de que hay datos migrados o capturados.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        verificaciones.map((v) => (
                                            <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {formatDate(v.fecha).split(' ')[0]}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-gray-900">{v.cliente?.nombreCompleto || "Desconocido"}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{v.cliente?.codigoCliente}</p>
                                                </td>
                                                <td className="px-4 py-3 max-w-xs">
                                                    <p className="truncate text-gray-600" title={v.cliente?.direccionCompleta}>
                                                        {v.cliente?.direccionCompleta || "-"}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                                                        {v.gestor?.name || "-"}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">
                                                        Visitado
                                                    </Badge>
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
