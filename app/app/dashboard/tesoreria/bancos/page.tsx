"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Landmark, Search, ArrowUpDown } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function BancosPage() {
    const [movimientos, setMovimientos] = useState<any[]>([]);
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
        fetchMovimientos();
    }, [currentPage, searchTerm]);

    const fetchMovimientos = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: "50",
                search: searchTerm,
            });

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
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Estado de Cuenta Bancario</h1>
                    <p className="text-muted-foreground mt-1">
                        Visualización y seguimiento de todos los depósitos y transacciones bancarias importadas.
                    </p>
                </div>

                <Card>
                    <CardHeader className="pb-3 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <CardTitle className="text-lg font-medium">Historial de Transacciones</CardTitle>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar por concepto, rastreo..."
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
                                        <th scope="col" className="px-4 py-3">Banco Origen</th>
                                        <th scope="col" className="px-4 py-3 min-w-[200px]">Concepto</th>
                                        <th scope="col" className="px-4 py-3">Rastreo / Ref</th>
                                        <th scope="col" className="px-4 py-3 text-right text-green-700">Abono</th>
                                        <th scope="col" className="px-4 py-3 text-right text-red-700">Cargo</th>
                                        <th scope="col" className="px-4 py-3 text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                Cargando movimientos...
                                            </td>
                                        </tr>
                                    ) : movimientos.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center">
                                                <Landmark className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500 font-medium">No se encontraron movimientos</p>
                                                <p className="text-sm text-gray-400 mt-1">Intenta con otros términos de búsqueda.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        movimientos.map((mov) => (
                                            <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {formatDate(mov.fechaOperacion).split(' ')[0]}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{mov.bancoOrigen}</td>
                                                <td className="px-4 py-3">
                                                    <p className="truncate max-w-[250px]" title={mov.concepto || mov.descripcionGeneral || ""}>
                                                        {mov.concepto || mov.descripcionGeneral || "-"}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-mono text-gray-500">
                                                    {mov.claveRastreo || mov.referencia || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-green-700">
                                                    {mov.abono ? formatCurrency(mov.abono) : "-"}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-red-600">
                                                    {mov.cargo ? formatCurrency(mov.cargo) : "-"}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                    {mov.saldo ? formatCurrency(mov.saldo) : "-"}
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
