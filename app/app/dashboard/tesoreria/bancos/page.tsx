
"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Landmark, Search, Download, Upload, FileUp, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

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
    const [importing, setImporting] = useState<string | null>(null); // 'santander' | 'banorte' | null
    const [importResult, setImportResult] = useState<any>(null);

    const santanderInputRef = useRef<HTMLInputElement>(null);
    const banorteInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMovimientos();
    }, [currentPage, searchTerm]);

    const fetchMovimientos = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: "100",
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

    const handleImport = async (banco: 'santander' | 'banorte', file: File) => {
        setImporting(banco);
        setImportResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('banco', banco);

            const res = await fetch('/api/tesoreria/bancos/importar', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setImportResult(data);
                toast.success(data.mensaje);
                // Refresh table
                fetchMovimientos();
            } else {
                toast.error(data.error || 'Error al importar');
                setImportResult({ error: data.error });
            }
        } catch (error) {
            toast.error('Error de conexión al importar');
        } finally {
            setImporting(null);
        }
    };

    const onFileSelected = (banco: 'santander' | 'banorte', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error('Solo se permiten archivos CSV');
            return;
        }

        handleImport(banco, file);
        // Reset the input
        e.target.value = '';
    };

    const exportarExcel = () => {
        if (movimientos.length === 0) return;

        const csvContent = [
            ["Fecha", "Banco Origen", "Concepto", "Referencia", "Clave Rastreo", "Abono", "Cargo", "Saldo"],
            ...movimientos.map(m => [
                m.fechaOperacion.split("T")[0],
                m.bancoOrigen,
                `"${m.concepto || m.descripcionGeneral || "-"}"`,
                `"${m.referencia || "-"}"`,
                `"${m.claveRastreo || "-"}"`,
                m.abono || 0,
                m.cargo || 0,
                m.saldo || 0
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `EstadoDeCuenta-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Estado de Cuenta Bancario</h1>
                        <p className="text-muted-foreground mt-1">
                            Importa y visualiza los movimientos bancarios de Santander y Banorte.
                        </p>
                    </div>
                    <Button variant="outline" onClick={exportarExcel} disabled={loading || movimientos.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                </div>

                {/* Import Buttons */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    {/* Santander */}
                    <Card className="border-red-100 bg-gradient-to-br from-red-50/50 to-white shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-14 w-14 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-red-200 flex-shrink-0">
                                S
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-base">Santander</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Importar CSV del estado de cuenta de Santander</p>
                            </div>
                            <div>
                                <input
                                    ref={santanderInputRef}
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={(e) => onFileSelected('santander', e)}
                                />
                                <Button
                                    onClick={() => santanderInputRef.current?.click()}
                                    disabled={importing !== null}
                                    className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200"
                                >
                                    {importing === 'santander' ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                                    ) : (
                                        <><Upload className="h-4 w-4 mr-2" /> Importar CSV</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Banorte */}
                    <Card className="border-orange-100 bg-gradient-to-br from-orange-50/50 to-white shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-14 w-14 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-200 flex-shrink-0">
                                B
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-base">Banorte</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Importar CSV del estado de cuenta de Banorte</p>
                            </div>
                            <div>
                                <input
                                    ref={banorteInputRef}
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={(e) => onFileSelected('banorte', e)}
                                />
                                <Button
                                    onClick={() => banorteInputRef.current?.click()}
                                    disabled={importing !== null}
                                    className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200"
                                >
                                    {importing === 'banorte' ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                                    ) : (
                                        <><Upload className="h-4 w-4 mr-2" /> Importar CSV</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Import Results */}
                {importResult && !importResult.error && (
                    <Card className="border-green-200 bg-green-50/50">
                        <CardContent className="p-4 flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="font-bold text-green-800 text-sm">Importación Exitosa — {importResult.banco}</h4>
                                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                                    <div>
                                        <span className="text-green-600 font-bold text-lg">{importResult.insertados}</span>
                                        <p className="text-green-700 text-xs">Registros importados</p>
                                    </div>
                                    <div>
                                        <span className="text-orange-600 font-bold text-lg">{importResult.duplicados}</span>
                                        <p className="text-orange-700 text-xs">Duplicados omitidos</p>
                                    </div>
                                    <div>
                                        <span className={`font-bold text-lg ${importResult.errores > 0 ? 'text-red-600' : 'text-gray-400'}`}>{importResult.errores}</span>
                                        <p className="text-gray-500 text-xs">Errores</p>
                                    </div>
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

                {/* Transactions Table */}
                <Card>
                    <CardHeader className="pb-3 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <CardTitle className="text-lg font-medium">
                                Historial de Transacciones
                                <Badge variant="outline" className="ml-3 font-mono text-xs">{pagination.total} registros</Badge>
                            </CardTitle>
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
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                                                Cargando movimientos...
                                            </td>
                                        </tr>
                                    ) : movimientos.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center">
                                                <Landmark className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500 font-medium">No se encontraron movimientos</p>
                                                <p className="text-sm text-gray-400 mt-1">Importa un estado de cuenta CSV para comenzar.</p>
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
