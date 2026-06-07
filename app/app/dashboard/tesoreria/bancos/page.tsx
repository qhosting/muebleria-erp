
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
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

type TabKey = "todas" | "santander_22001022837" | "santander_65505732541" | "banorte_0330253963";

const TABS: { key: TabKey; label: string; bancoParam: string; color: string; bg: string; border: string; logoChar: string; logoBg: string; logoShadow: string }[] = [
    {
        key: "todas",
        label: "Todas las cuentas",
        bancoParam: "",
        color: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
        logoChar: "★",
        logoBg: "bg-blue-600",
        logoShadow: "shadow-blue-200",
    },
    {
        key: "santander_22001022837",
        label: "Santander - 22001022837",
        bancoParam: "22001022837",
        color: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
        logoChar: "S",
        logoBg: "bg-red-600",
        logoShadow: "shadow-red-200",
    },
    {
        key: "santander_65505732541",
        label: "Santander - 65505732541",
        bancoParam: "65505732541",
        color: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
        logoChar: "S",
        logoBg: "bg-red-800",
        logoShadow: "shadow-red-300",
    },
    {
        key: "banorte_0330253963",
        label: "Banorte - 0330253963",
        bancoParam: "0330253963",
        color: "text-orange-700",
        bg: "bg-orange-50",
        border: "border-orange-200",
        logoChar: "B",
        logoBg: "bg-orange-600",
        logoShadow: "shadow-orange-200",
    },
];

export default function BancosPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("todas");
    const [movimientos, setMovimientos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        total: 0,
        pages: 0,
        currentPage: 1,
        perPage: 100,
    });
    const [importing, setImporting] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<any>(null);

    const santanderInputRef = useRef<HTMLInputElement>(null);
    const banorteInputRef = useRef<HTMLInputElement>(null);

    const currentTabConfig = TABS.find((t) => t.key === activeTab)!;

    const fetchMovimientos = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: "100",
                search: searchTerm,
            });
            if (currentTabConfig.bancoParam) {
                params.set("banco", currentTabConfig.bancoParam);
            }

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

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    useEffect(() => {
        fetchMovimientos();
    }, [fetchMovimientos]);

    const handleImport = async (banco: "santander" | "banorte", file: File) => {
        setImporting(banco);
        setImportResult(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("banco", banco);

            const res = await fetch("/api/tesoreria/bancos/importar", {
                method: "POST",
                body: formData,
            });

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

        const extension = file.name.split(".").pop()?.toLowerCase();
        if (extension !== "csv" && extension !== "xlsx" && extension !== "xls") {
            toast.error("Solo se permiten archivos CSV o Excel (.xlsx, .xls)");
            return;
        }

        handleImport(banco, file);
        e.target.value = "";
    };

    const exportarExcel = () => {
        if (movimientos.length === 0) return;

        const csvContent = [
            ["Fecha", "Banco Destino", "Banco Origen", "Concepto", "Referencia", "Clave Rastreo", "Abono", "Cargo", "Saldo"],
            ...movimientos.map((m) => [
                m.fechaOperacion.split("T")[0],
                m.bancoDestino || m.bancoOrigen,
                m.bancoOrigen,
                `"${m.concepto || m.descripcionGeneral || "-"}"`,
                `"${m.referencia || "-"}"`,
                `"${m.claveRastreo || "-"}"`,
                m.abono || 0,
                m.cargo || 0,
                m.saldo || 0,
            ]),
        ]
            .map((e) => e.join(","))
            .join("\n");

        const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const tabLabel = currentTabConfig.label.replace(/ /g, "-");
        a.download = `EstadoDeCuenta-${tabLabel}-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
    };

    // Totals for the active tab
    const totalAbonos = movimientos.reduce((s, m) => s + (m.abono || 0), 0);
    const totalCargos = movimientos.reduce((s, m) => s + (m.cargo || 0), 0);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                            Estado de Cuenta Bancario
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Importa y visualiza los movimientos de las 3 cuentas bancarias autorizadas.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={exportarExcel}
                        disabled={loading || movimientos.length === 0}
                    >
                        <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                </div>

                {/* Import Cards — always visible, always useful */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    {/* Santander */}
                    <Card className="border-red-100 bg-gradient-to-br from-red-50/50 to-white shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-red-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-red-200 flex-shrink-0">
                                S
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-sm">Santander (Excel/CSV)</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Detecta automáticamente la cuenta</p>
                            </div>
                            <div>
                                <input
                                    ref={santanderInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    className="hidden"
                                    onChange={(e) => onFileSelected("santander", e)}
                                />
                                <Button
                                    size="sm"
                                    onClick={() => santanderInputRef.current?.click()}
                                    disabled={importing !== null}
                                    className="bg-red-600 hover:bg-red-700 text-white shadow shadow-red-200"
                                >
                                    {importing === "santander" ? (
                                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Importando...</>
                                    ) : (
                                        <><Upload className="h-3.5 w-3.5 mr-1.5" /> Importar</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Banorte */}
                    <Card className="border-orange-100 bg-gradient-to-br from-orange-50/50 to-white shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-200 flex-shrink-0">
                                B
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 text-sm">Banorte (Excel/CSV)</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Detecta automáticamente la cuenta</p>
                            </div>
                            <div>
                                <input
                                    ref={banorteInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    className="hidden"
                                    onChange={(e) => onFileSelected("banorte", e)}
                                />
                                <Button
                                    size="sm"
                                    onClick={() => banorteInputRef.current?.click()}
                                    disabled={importing !== null}
                                    className="bg-orange-600 hover:bg-orange-700 text-white shadow shadow-orange-200"
                                >
                                    {importing === "banorte" ? (
                                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Importando...</>
                                    ) : (
                                        <><Upload className="h-3.5 w-3.5 mr-1.5" /> Importar</>
                                    )}
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
                                <h4 className="font-bold text-green-800 text-sm">
                                    Importación Exitosa
                                </h4>
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
                                        <span className={`font-bold text-lg ${importResult.errores > 0 ? "text-red-600" : "text-gray-400"}`}>
                                            {importResult.errores}
                                        </span>
                                        <p className="text-gray-500 text-xs">Errores</p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{importResult.mensaje}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => setImportResult(null)}>
                                ✕
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {importResult?.error && (
                    <Card className="border-red-200 bg-red-50/50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            <p className="text-red-700 text-sm font-medium flex-1">{importResult.error}</p>
                            <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => setImportResult(null)}>
                                ✕
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Tabs + Table Card */}
                <Card className="overflow-hidden">
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-100 bg-gray-50/50">
                        <div className="flex overflow-x-auto">
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`
                                            flex items-center gap-2.5 px-5 py-3.5 text-sm font-medium whitespace-nowrap
                                            border-b-2 transition-all duration-200
                                            ${isActive
                                                ? `border-blue-500 ${tab.color} bg-white`
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                                            }
                                        `}
                                        style={isActive ? {
                                            borderBottomColor: tab.key === "todas" ? "#3b82f6" : tab.key.startsWith("santander") ? "#dc2626" : "#ea580c",
                                            color: tab.key === "todas" ? "#1d4ed8" : tab.key.startsWith("santander") ? "#b91c1c" : "#c2410c",
                                        } : {}}
                                    >
                                        <div className={`h-5 w-5 rounded-md ${tab.logoBg} flex items-center justify-center text-white text-[10px] font-black flex-shrink-0`}>
                                            {tab.logoChar}
                                        </div>
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary row */}
                    {!loading && movimientos.length > 0 && (
                        <div className={`grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 ${currentTabConfig.bg}/30`}>
                            <div className="px-5 py-3 flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Registros</p>
                                    <p className="font-bold text-gray-900 text-sm">{pagination.total}</p>
                                </div>
                            </div>
                            <div className="px-5 py-3 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                <div>
                                    <p className="text-xs text-gray-500">Abonos (página)</p>
                                    <p className="font-bold text-green-700 text-sm">{formatCurrency(totalAbonos)}</p>
                                </div>
                            </div>
                            <div className="px-5 py-3 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />
                                <div>
                                    <p className="text-xs text-gray-500">Cargos (página)</p>
                                    <p className="font-bold text-red-600 text-sm">{formatCurrency(totalCargos)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search + Table */}
                    <CardHeader className="pb-3 border-b border-gray-100 pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <CardTitle className="text-base font-medium">
                                Historial de Transacciones
                                <Badge variant="outline" className="ml-3 font-mono text-xs">
                                    {pagination.total} registros
                                </Badge>
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
                                        {activeTab === "todas" && (
                                            <th scope="col" className="px-4 py-3">Cuenta Destino</th>
                                        )}
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
                                            <td colSpan={activeTab === "todas" ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                                                Cargando movimientos...
                                            </td>
                                        </tr>
                                    ) : movimientos.length === 0 ? (
                                        <tr>
                                            <td colSpan={activeTab === "todas" ? 8 : 7} className="px-4 py-12 text-center">
                                                <Landmark className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500 font-medium">No se encontraron movimientos</p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    {activeTab !== "todas"
                                                        ? `Importa un estado de cuenta de ${currentTabConfig.label} para comenzar.`
                                                        : "Importa un estado de cuenta CSV o Excel para comenzar."}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        movimientos.map((mov) => (
                                            <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {formatDate(mov.fechaOperacion).split(" ")[0]}
                                                </td>
                                                {activeTab === "todas" && (
                                                    <td className="px-4 py-3">
                                                        {mov.cuentaDestino ? (
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs font-semibold ${mov.bancoDestino === "SANTANDER"
                                                                    ? "border-red-200 text-red-700 bg-red-50"
                                                                    : mov.bancoDestino === "BANORTE"
                                                                    ? "border-orange-200 text-orange-700 bg-orange-50"
                                                                    : "border-gray-200 text-gray-600"
                                                                }`}
                                                            >
                                                                {mov.cuentaDestino}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">—</span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 font-medium text-gray-900 text-xs">
                                                    {mov.bancoOrigen}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p
                                                        className="truncate max-w-[250px]"
                                                        title={mov.concepto || mov.descripcionGeneral || ""}
                                                    >
                                                        {mov.concepto || mov.descripcionGeneral || "—"}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-mono text-gray-500">
                                                    {mov.claveRastreo || mov.referencia || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-green-700">
                                                    {mov.abono ? formatCurrency(mov.abono) : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-red-650">
                                                    {mov.cargo ? formatCurrency(mov.cargo) : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-900">
                                                    {mov.saldo ? formatCurrency(mov.saldo) : "—"}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
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
