"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCheck, Search, Calendar, Download, MapPin, Eye } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function VerificacionesReportPage() {
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

            const res = await fetch(`/api/reportes/verificaciones?${params}`);
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
        a.download = `Reporte-Verificaciones-${fechaDesde}.csv`;
        a.click();
        toast.success("Descarga iniciada");
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white">
                    <div className="bg-blue-600 p-6 rounded-xl w-full shadow-lg border border-blue-400">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                                <UserCheck className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Reporte de Verificaciones VD</h1>
                                <p className="text-blue-100 mt-1">
                                    Historial y control de visitas domiciliarias realizadas por el equipo de cobranza.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-gray-50/50 border-b">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Search className="h-4 w-4 text-blue-500" /> Filtros de Búsqueda
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="relative md:col-span-2">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar por cliente o gestor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 border-gray-200 focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Desde</label>
                                <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="border-gray-200" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Hasta</label>
                                <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="border-gray-200" />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button onClick={exportarExcel} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" disabled={loading || verificaciones.length === 0}>
                                <Download className="mr-2 h-4 w-4" /> Exportar Reporte CSV
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle text-gray-600">
                                <thead className="bg-gray-50/75 border-b border-gray-100 font-bold text-gray-700 uppercase tracking-tighter text-[11px]">
                                    <tr>
                                        <th scope="col" className="px-6 py-4">Fecha Visita</th>
                                        <th scope="col" className="px-6 py-4">Cliente</th>
                                        <th scope="col" className="px-6 py-4">Dirección Validada</th>
                                        <th scope="col" className="px-6 py-4">Gestor Asignado</th>
                                        <th scope="col" className="px-6 py-4 text-center">Estatus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                                    Generando reporte...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : verificaciones.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-16 text-center">
                                                <MapPin className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                                <p className="text-gray-500 font-semibold">No hay registros en este periodo</p>
                                                <p className="text-xs text-gray-400 mt-1 uppercase">Ajusta los filtros para ver más resultados</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        verificaciones.map((v) => (
                                            <tr key={v.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                                                    {formatDate(v.fecha).split(' ')[0]}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-gray-900 leading-none mb-1 group-hover:text-blue-600 transition-colors">{v.cliente?.nombreCompleto || "Desconocido"}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono tracking-widest">{v.cliente?.codigoCliente}</p>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <p className="truncate text-gray-500 italic text-xs" title={v.cliente?.direccionCompleta}>
                                                        {v.cliente?.direccionCompleta || "Sin dirección registrada"}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 bg-blue-100 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-700">
                                                            {v.gestor?.name?.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-gray-700">{v.gestor?.name || "-"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors px-3 py-1 font-bold">
                                                        EFECTUADA
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
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                                <span className="text-[11px] font-bold text-gray-400 uppercase">
                                    Página {pagination.currentPage} de {pagination.pages} • {pagination.total} registros encontrados
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs font-bold uppercase"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs font-bold uppercase"
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
