"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Search, Calendar, Download, Handshake, Eye, MapPin } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function ConveniosReportPage() {
    const [convenios, setConvenios] = useState<any[]>([]);
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
        fetchConvenios();
    }, [currentPage, searchTerm, fechaDesde, fechaHasta]);

    const fetchConvenios = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: "50",
                search: searchTerm,
                fechaDesde: fechaDesde ? `${fechaDesde}T00:00:00.000Z` : "",
                fechaHasta: fechaHasta ? `${fechaHasta}T23:59:59.999Z` : "",
            });

            const res = await fetch(`/api/reportes/convenios?${params}`);
            if (res.ok) {
                const data = await res.json();
                setConvenios(data.convenios);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Error al obtener convenios", error);
            toast.error("Error al cargar convenios");
        } finally {
            setLoading(false);
        }
    };

    const exportarExcel = () => {
        if (convenios.length === 0) return;

        const csvContent = [
            ["ID", "Fecha Acuerdo", "Codigo Cliente", "Nombre Cliente", "Tipo Convenio", "Monto Acordado", "Gestor", "Comentario"],
            ...convenios.map(c => [
                c.id,
                c.fecha.split("T")[0],
                c.cliente?.codigoCliente || "-",
                `"${c.cliente?.nombreCompleto || "-"}"`,
                `"${c.tipoConvenio || "-"}"`,
                c.monto,
                c.gestor?.name || "-",
                `"${c.comentario || ""}"`
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Reporte-Convenios-${fechaDesde}.csv`;
        a.click();
        toast.success("Reporte generado exitosamente");
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-700 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                        <Handshake className="h-64 w-64" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                                <Handshake className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-blue-100">Módulo de Seguimiento</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight">Registro de Convenios de Pago</h1>
                        <p className="text-blue-100 mt-2 max-w-2xl text-lg font-light">
                            Visualiza y gestiona los compromisos de pago acordados entre gestores y clientes para la recuperación de cartera.
                        </p>
                    </div>
                </div>

                {/* Filtros */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="relative md:col-span-2">
                                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1 ml-1">Búsqueda Inteligente</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Nombre, código de cliente o gestor..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 h-11 bg-gray-50 border-gray-100 focus:bg-white transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1 ml-1">Rango Desde</label>
                                <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="h-11 bg-gray-50 border-gray-100 shadow-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1 ml-1">Rango Hasta</label>
                                <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="h-11 bg-gray-50 border-gray-100 shadow-sm" />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                            <p className="text-xs text-gray-400 italic">Mostrando acuerdos registrados en el periodo seleccionado.</p>
                            <Button onClick={exportarExcel} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all font-bold px-6" disabled={loading || convenios.length === 0}>
                                <Download className="mr-2 h-4 w-4" /> Exportar a Excel (CSV)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-white overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th scope="col" className="px-6 py-5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Fecha Acuerdo</th>
                                        <th scope="col" className="px-6 py-5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Cliente / Cuenta</th>
                                        <th scope="col" className="px-6 py-5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Tipo / Modalidad</th>
                                        <th scope="col" className="px-6 py-5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Monto Comprometido</th>
                                        <th scope="col" className="px-6 py-5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Responsable</th>
                                        <th scope="col" className="px-6 py-5 font-bold text-gray-400 uppercase tracking-widest text-[10px] text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex space-x-2">
                                                        <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                                                        <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                        <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.5s]"></div>
                                                    </div>
                                                    <span className="text-gray-400 font-medium text-xs uppercase tracking-tighter">Procesando Base de Datos...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : convenios.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-24 text-center">
                                                <div className="max-w-xs mx-auto">
                                                    <Handshake className="h-16 w-16 text-gray-100 mx-auto mb-4" />
                                                    <p className="text-gray-600 font-bold text-lg">Sin convenios registrados</p>
                                                    <p className="text-sm text-gray-400 mt-2">No se han encontrado acuerdos de pago que coincidan con los criterios de búsqueda.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        convenios.map((c) => (
                                            <tr key={c.id} className="hover:bg-blue-50/30 transition-all group">
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900">{formatDate(c.fecha).split(' ')[0]}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Registrado hoy</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <p className="font-extrabold text-blue-900 group-hover:text-blue-600 transition-colors uppercase leading-none mb-1">{c.cliente?.nombreCompleto || "Desconocido"}</p>
                                                    <p className="text-[11px] text-gray-500 font-mono tracking-widest flex items-center gap-1">
                                                        <span className="h-1.5 w-1.5 bg-blue-400 rounded-full"></span> {c.cliente?.codigoCliente}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 font-bold px-3 py-1">
                                                        {c.tipoConvenio?.toUpperCase() || "CARTERA"}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-lg font-black text-gray-900">{formatCurrency(c.monto)}</span>
                                                        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">En negociación</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl flex items-center justify-center font-black text-indigo-700 shadow-sm border border-white">
                                                            {c.gestor?.name?.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="font-bold text-gray-700 text-sm">{c.gestor?.name || "Sin Asignar"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <Button variant="ghost" size="icon" className="hover:bg-blue-100 text-blue-600 rounded-xl shadow-sm hover:shadow-md transition-all">
                                                        <Eye className="h-5 w-5" />
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
                            <div className="flex items-center justify-between px-8 py-5 border-t border-gray-100 bg-gray-50/30">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Página {pagination.currentPage} / {pagination.pages} • {pagination.total} Acuerdos de Pago
                                </span>
                                <div className="flex gap-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-10 px-6 font-black uppercase text-[10px] tracking-widest rounded-xl border-gray-200 hover:bg-white shadow-sm"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-10 px-6 font-black uppercase text-[10px] tracking-widest rounded-xl border-gray-200 hover:bg-white shadow-sm"
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
