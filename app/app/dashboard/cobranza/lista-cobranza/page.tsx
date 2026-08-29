"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Filter, FileText, Users, Phone, MapPin, Search, Calendar, DollarSign, AlertCircle, TrendingUp, Layers } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import * as XLSX from "xlsx";

interface User {
    id: string;
    name: string;
    codigoGestor?: string;
    role?: string;
}

interface Cliente {
    id: string;
    codigoCliente: string;
    nombreCompleto: string;
    direccionCompleta: string;
    telefono?: string;
    telefonoTrabajo?: string;
    diaPago: string;
    periodicidad: string;
    montoPago: number;
    saldoActual: number;
    saldoVencido?: number;
    diasVencidos?: number;
    pv?: number;
    gestor?: string;
    numContrato?: string;
    fechaVenta?: string;
    vendedor?: string;
    descripcionProducto?: string;
    importe1?: number;
    importe2?: number;
}

export default function ListaCobranzaPage() {
    const { data: session } = useSession();
    const [cobradores, setCobradores] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCobradores, setLoadingCobradores] = useState(true);

    // Filtros/Formulario
    const [selectedCobrador, setSelectedCobrador] = useState<string>("");
    const [semana, setSemana] = useState<string>(() => {
        const d = new Date();
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const days = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        return Math.ceil((d.getDay() + 1 + days) / 7).toString();
    });

    // Filtro de empresa / tipo de cuenta
    const [filtroEmpresa, setFiltroEmpresa] = useState<"TODAS" | "DQ" | "DP">("TODAS");

    // Resultados
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [calendario, setCalendario] = useState<any>(null);
    const [busqueda, setBusqueda] = useState<string>("");
    const [searched, setSearched] = useState<boolean>(false);

    useEffect(() => {
        fetchCobradores();
    }, []);

    const fetchCobradores = async () => {
        try {
            setLoadingCobradores(true);
            const res = await fetch("/api/users");
            if (res.ok) {
                const users = await res.json();
                // Filtrar SOLO cobradores / gestores de cobranza
                const gestores = users.filter((u: any) => 
                    u.role === "cobrador" || 
                    u.role === "gestor_cobranza"
                );
                setCobradores(gestores);
                
                if (gestores.length > 0) {
                    setSelectedCobrador("TODOS");
                }
            }
        } catch (error) {
            console.error("Error al cargar cobradores:", error);
            toast.error("Error al cargar la lista de cobradores");
        } finally {
            setLoadingCobradores(false);
        }
    };

    const handleBuscar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCobrador) {
            toast.error("Por favor selecciona un gestor o todos");
            return;
        }
        if (!semana) {
            toast.error("Por favor ingresa una semana");
            return;
        }

        setLoading(true);
        setSearched(true);
        try {
            const params = new URLSearchParams({
                cobradorId: selectedCobrador,
                semana: semana,
                anio: new Date().getFullYear().toString()
            });

            const res = await fetch(`/api/reportes/lista-cobranza?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setClientes(data.clientes || []);
                setCalendario(data.calendario || null);
            } else {
                const err = await res.json();
                toast.error(err.error || "Error al buscar la lista");
            }
        } catch (error) {
            console.error("Error al buscar lista de cobranza:", error);
            toast.error("Error de red al consultar la lista");
        } finally {
            setLoading(false);
        }
    };

    const getSelectedCobradorName = () => {
        if (selectedCobrador === "TODOS") {
            return "GENERAL - TODOS LOS COBRADORES";
        }
        const cobrador = cobradores.find(c => c.id === selectedCobrador);
        return cobrador ? (cobrador.codigoGestor || cobrador.name) : "Gestor";
    };

    const exportarExcel = () => {
        if (clientes.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        const cobradorName = getSelectedCobradorName();
        const workbook = XLSX.utils.book_new();

        const buildSheetData = (items: Cliente[]) => {
            const rows = items.map(c => ({
                "CODIGO CLIENTE": c.codigoCliente || "-",
                "CUENTA": c.codigoCliente || "-",
                "CONTRATO": c.numContrato || c.codigoCliente || "-",
                "Periodo Inicial": c.fechaVenta ? new Date(c.fechaVenta).toLocaleDateString("es-MX") : "-",
                "RAZON SOCIAL": c.nombreCompleto || "-",
                "TELÉFONO": c.telefono || c.telefonoTrabajo || "-",
                "PERIODO DE PAGO": c.periodicidad ? c.periodicidad.toUpperCase() : "-",
                "PAGO SUGERIDO": c.montoPago || 0,
                "SALDO VENCIDO": c.saldoVencido || 0,
                "PV": c.pv || 0,
                "SALDO ACTUAL": c.saldoActual || 0,
                "GESTOR": c.gestor || cobradorName || "-"
            }));

            // Agregar fila de totales al final
            const tCobrar = items.reduce((acc, curr) => acc + (curr.montoPago || 0), 0);
            const tVencido = items.reduce((acc, curr) => acc + (curr.saldoVencido || 0), 0);
            const tSaldo = items.reduce((acc, curr) => acc + (curr.saldoActual || 0), 0);

            rows.push({
                "CODIGO CLIENTE": "TOTALES",
                "CUENTA": `(${items.length} cuentas)`,
                "CONTRATO": "",
                "Periodo Inicial": "",
                "RAZON SOCIAL": "",
                "TELÉFONO": "",
                "PERIODO DE PAGO": "",
                "PAGO SUGERIDO": tCobrar as any,
                "SALDO VENCIDO": tVencido as any,
                "PV": "" as any,
                "SALDO ACTUAL": tSaldo as any,
                "GESTOR": ""
            });

            return rows;
        };

        const colWidths = [
            { wch: 16 }, // CODIGO CLIENTE
            { wch: 16 }, // CUENTA
            { wch: 16 }, // CONTRATO
            { wch: 16 }, // Periodo Inicial
            { wch: 35 }, // RAZON SOCIAL
            { wch: 18 }, // TELÉFONO
            { wch: 18 }, // PERIODO DE PAGO
            { wch: 16 }, // PAGO SUGERIDO
            { wch: 16 }, // SALDO VENCIDO
            { wch: 10 }, // PV
            { wch: 16 }, // SALDO ACTUAL
            { wch: 18 }  // GESTOR
        ];

        // Separar clientes DQ y DP
        const clientesDQ = clientes.filter(c => {
            const cod = (c.codigoCliente || '').toUpperCase();
            const cont = (c.numContrato || '').toUpperCase();
            return cod.startsWith('DQ') || cont.startsWith('DQ');
        });

        const clientesDP = clientes.filter(c => {
            const cod = (c.codigoCliente || '').toUpperCase();
            const cont = (c.numContrato || '').toUpperCase();
            return cod.startsWith('DP') || cont.startsWith('DP');
        });

        const otrosClientes = clientes.filter(c => !clientesDQ.includes(c) && !clientesDP.includes(c));

        // Hoja 1: Cuentas DQ
        const wsDQ = XLSX.utils.json_to_sheet(buildSheetData(clientesDQ));
        wsDQ['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(workbook, wsDQ, `Cuentas DQ (${clientesDQ.length})`);

        // Hoja 2: Cuentas DP
        const wsDP = XLSX.utils.json_to_sheet(buildSheetData(clientesDP));
        wsDP['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(workbook, wsDP, `Cuentas DP (${clientesDP.length})`);

        // Si existen otras cuentas no categorizadas
        if (otrosClientes.length > 0) {
            const wsOtros = XLSX.utils.json_to_sheet(buildSheetData(otrosClientes));
            wsOtros['!cols'] = colWidths;
            XLSX.utils.book_append_sheet(workbook, wsOtros, `Otras Cuentas (${otrosClientes.length})`);
        }

        XLSX.writeFile(workbook, `ListaCobranza-${cobradorName}-Semana${semana}.xlsx`);
        toast.success(`Lista de cobranza exportada con hojas separadas (DQ: ${clientesDQ.length}, DP: ${clientesDP.length})`);
    };

    // Filtrado por texto y por tipo de cuenta (DP / DQ / TODAS)
    const clientesFiltrados = clientes.filter(c => {
        const cod = (c.codigoCliente || '').toUpperCase();
        const cont = (c.numContrato || '').toUpperCase();
        
        // Filtro por tipo de cuenta
        if (filtroEmpresa === "DQ" && !cod.startsWith("DQ") && !cont.startsWith("DQ")) {
            return false;
        }
        if (filtroEmpresa === "DP" && !cod.startsWith("DP") && !cont.startsWith("DP")) {
            return false;
        }

        // Filtro por búsqueda
        return (
            c.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
            c.codigoCliente.toLowerCase().includes(busqueda.toLowerCase()) ||
            (c.numContrato && c.numContrato.toLowerCase().includes(busqueda.toLowerCase())) ||
            (c.telefono && c.telefono.includes(busqueda)) ||
            c.direccionCompleta.toLowerCase().includes(busqueda.toLowerCase())
        );
    });

    const totalCuentasDQ = clientes.filter(c => (c.codigoCliente || '').toUpperCase().startsWith('DQ') || (c.numContrato || '').toUpperCase().startsWith('DQ')).length;
    const totalCuentasDP = clientes.filter(c => (c.codigoCliente || '').toUpperCase().startsWith('DP') || (c.numContrato || '').toUpperCase().startsWith('DP')).length;

    const totalCobrar = clientesFiltrados.reduce((acc, curr) => acc + (curr.montoPago || 0), 0);
    const totalSaldoVencido = clientesFiltrados.reduce((acc, curr) => acc + (curr.saldoVencido || 0), 0);
    const totalSaldo = clientesFiltrados.reduce((acc, curr) => acc + (curr.saldoActual || 0), 0);

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6">
                {/* Encabezado */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
                            <FileText className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Lista de Cobranza por Gestor
                            </h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Generación de ruta de cobro con orden oficial de columnas, teléfono, periodos y exportación multi-hoja (DQ / DP).
                            </p>
                        </div>
                    </div>
                    {clientes.length > 0 && (
                        <Button 
                            onClick={exportarExcel} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none h-9 text-xs font-bold gap-2"
                        >
                            <Download className="h-4 w-4" /> Exportar a Excel (Hojas DQ y DP)
                        </Button>
                    )}
                </div>

                {/* Formulario de Filtro */}
                <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
                    <CardHeader className="py-3.5 border-b bg-gray-50/50 dark:bg-slate-800/50">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <Filter className="h-3.5 w-3.5" /> Parámetros de Consulta
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleBuscar} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-1.5">
                                <Label htmlFor="gestor" className="text-xs font-bold text-slate-600 dark:text-slate-400">Cobrador / Gestor</Label>
                                <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                                    <SelectTrigger id="gestor" disabled={loadingCobradores} className="h-9 text-xs">
                                        <SelectValue placeholder={loadingCobradores ? "Cargando cobradores..." : "Selecciona un cobrador"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TODOS" className="font-bold text-blue-600 dark:text-blue-400">
                                            🌟 TODOS LOS COBRADORES (GENERAL)
                                        </SelectItem>
                                        {cobradores.map((c) => (
                                             <SelectItem key={c.id} value={c.id}>
                                                {c.codigoGestor ? `${c.codigoGestor} - ${c.name}` : c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="semana" className="text-xs font-bold text-slate-600 dark:text-slate-400">Semana (1 - 52)</Label>
                                <Input
                                    id="semana"
                                    type="number"
                                    min="1"
                                    max="52"
                                    value={semana}
                                    onChange={(e) => setSemana(e.target.value)}
                                    placeholder="Ej. 35"
                                    className="h-9 text-xs"
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                                {loading ? "Buscando cuentas..." : "Consultar Ruta"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Detalles del Calendario Activo */}
                {calendario && (
                    <Card className="border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
                        <CardContent className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-blue-900 dark:text-blue-300">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-bold">Período Semana {calendario.semana}:</span>
                                <span>
                                    {new Date(calendario.fechaInicio).toLocaleDateString("es-MX")} al{" "}
                                    {new Date(calendario.fechaFin).toLocaleDateString("es-MX")}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold">Periodicidades Activas:</span>
                                <div className="flex gap-1.5">
                                    {(calendario.periodicidadesActivas as string[]).map(p => (
                                        <Badge key={p} variant="secondary" className="text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-200 border-none">
                                            {p}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* KPIs Resumen */}
                {searched && clientes.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-slate-500">Cuentas en Ruta</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{clientesFiltrados.length}</p>
                                </div>
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600">
                                    <Users className="w-5 h-5" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-slate-500">Total Pago Sugerido</p>
                                    <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(totalCobrar)}</p>
                                </div>
                                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-slate-500">Total Saldo Vencido</p>
                                    <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(totalSaldoVencido)}</p>
                                </div>
                                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-gray-100 dark:border-slate-800 shadow-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-slate-500">Cartera Total</p>
                                    <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">{formatCurrency(totalSaldo)}</p>
                                </div>
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tabla de Resultados con Filtro DP / DQ y 12 Columnas Oficiales */}
                {searched && (
                    <Card className="border-gray-100 dark:border-slate-800 shadow-lg">
                        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4 border-b bg-gray-50/50 dark:bg-slate-800/50">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>Desglose Oficial de Cobranza ({clientesFiltrados.length})</span>
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 mt-0.5">
                                    Ruta semanal asignada a <span className="font-semibold text-slate-800 dark:text-slate-200">{getSelectedCobradorName()}</span>.
                                </CardDescription>
                            </div>

                            {/* Filtros rápidos DP / DQ y Barra de Búsqueda */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                                <div className="inline-flex bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setFiltroEmpresa("TODAS")}
                                        className={`px-3 py-1 rounded-md font-bold transition-all ${filtroEmpresa === "TODAS" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}
                                    >
                                        Todas ({clientes.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroEmpresa("DQ")}
                                        className={`px-3 py-1 rounded-md font-bold transition-all ${filtroEmpresa === "DQ" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-blue-600"}`}
                                    >
                                        DQ ({totalCuentasDQ})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltroEmpresa("DP")}
                                        className={`px-3 py-1 rounded-md font-bold transition-all ${filtroEmpresa === "DP" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-indigo-600"}`}
                                    >
                                        DP ({totalCuentasDP})
                                    </button>
                                </div>

                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="search"
                                        placeholder="Buscar cliente, contrato, tel..."
                                        className="pl-8 h-9 text-xs"
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left align-middle text-gray-600 dark:text-slate-300 border-collapse">
                                    <thead className="bg-[#0f172a] text-white text-[10px] font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-3.5 py-3 text-center border border-slate-700 whitespace-nowrap">CODIGO CLIENTE</th>
                                            <th className="px-3.5 py-3 text-center border border-slate-700 whitespace-nowrap">CUENTA</th>
                                            <th className="px-3.5 py-3 text-center border border-slate-700 whitespace-nowrap">CONTRATO</th>
                                            <th className="px-3.5 py-3 text-center border border-slate-700 whitespace-nowrap">Periodo Inicial</th>
                                            <th className="px-3.5 py-3 border border-slate-700 whitespace-nowrap">RAZON SOCIAL</th>
                                            <th className="px-3.5 py-3 text-center border border-slate-700 whitespace-nowrap">TELÉFONO</th>
                                            <th className="px-3.5 py-3 text-center border border-slate-700 whitespace-nowrap">PERIODO DE PAGO</th>
                                            <th className="px-3.5 py-3 text-right border border-slate-700 whitespace-nowrap">PAGO SUGERIDO</th>
                                            <th className="px-3.5 py-3 text-right border border-slate-700 whitespace-nowrap">SALDO VENCIDO</th>
                                            <th className="px-3.5 py-3 text-center border border-slate-700 whitespace-nowrap">PV</th>
                                            <th className="px-3.5 py-3 text-right border border-slate-700 whitespace-nowrap">SALDO ACTUAL</th>
                                            <th className="px-3.5 py-3 text-center border border-slate-700 whitespace-nowrap">GESTOR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={12} className="py-12 text-center text-gray-500 text-xs">
                                                    Cargando cuentas de la ruta de cobranza...
                                                </td>
                                            </tr>
                                        ) : clientesFiltrados.length === 0 ? (
                                            <tr>
                                                <td colSpan={12} className="py-14 text-center text-gray-400 text-xs">
                                                    No se encontraron clientes asignados para este gestor con los filtros aplicados.
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                                {clientesFiltrados.map((c) => (
                                                    <tr key={c.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors text-xs">
                                                        {/* 1. CODIGO CLIENTE */}
                                                        <td className="px-3.5 py-2.5 text-center font-bold font-mono text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800">
                                                            {c.codigoCliente}
                                                        </td>
                                                        {/* 2. CUENTA */}
                                                        <td className="px-3.5 py-2.5 text-center font-mono text-slate-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800">
                                                            {c.codigoCliente}
                                                        </td>
                                                        {/* 3. CONTRATO */}
                                                        <td className="px-3.5 py-2.5 text-center font-mono font-semibold text-slate-800 dark:text-slate-200 border border-gray-100 dark:border-slate-800">
                                                            {c.numContrato || c.codigoCliente || "-"}
                                                        </td>
                                                        {/* 4. Periodo Inicial */}
                                                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-800">
                                                            {c.fechaVenta ? new Date(c.fechaVenta).toLocaleDateString("es-MX") : "-"}
                                                        </td>
                                                        {/* 5. RAZON SOCIAL */}
                                                        <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 whitespace-nowrap">
                                                            {c.nombreCompleto}
                                                        </td>
                                                        {/* 6. TELÉFONO */}
                                                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap font-mono text-slate-700 dark:text-slate-300 border border-gray-100 dark:border-slate-800">
                                                            {c.telefono || c.telefonoTrabajo || "-"}
                                                        </td>
                                                        {/* 7. PERIODO DE PAGO (SOLO EL PERIODO) */}
                                                        <td className="px-3.5 py-2.5 text-center border border-gray-100 dark:border-slate-800 whitespace-nowrap">
                                                            <Badge variant="outline" className="text-[10px] uppercase font-bold py-0">
                                                                {c.periodicidad ? c.periodicidad.toUpperCase() : "-"}
                                                            </Badge>
                                                        </td>
                                                        {/* 8. PAGO SUGERIDO */}
                                                        <td className="px-3.5 py-2.5 text-right border border-gray-100 dark:border-slate-800 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                                            {formatCurrency(c.montoPago)}
                                                        </td>
                                                        {/* 9. SALDO VENCIDO */}
                                                        <td className="px-3.5 py-2.5 text-right border border-gray-100 dark:border-slate-800 font-bold font-mono text-rose-600 dark:text-rose-400">
                                                            {formatCurrency(c.saldoVencido || 0)}
                                                        </td>
                                                        {/* 10. PV */}
                                                        <td className="px-3.5 py-2.5 text-center border border-gray-100 dark:border-slate-800 font-mono font-bold">
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${(c.pv || 0) > 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                                {c.pv || 0}
                                                            </span>
                                                        </td>
                                                        {/* 11. SALDO ACTUAL */}
                                                        <td className="px-3.5 py-2.5 text-right border border-gray-100 dark:border-slate-800 font-black font-mono text-slate-900 dark:text-white">
                                                            {formatCurrency(c.saldoActual)}
                                                        </td>
                                                        {/* 12. GESTOR */}
                                                        <td className="px-3.5 py-2.5 text-center border border-gray-100 dark:border-slate-800 font-mono text-xs">
                                                            <Badge variant="secondary" className="text-[10px] font-bold">
                                                                {c.gestor || getSelectedCobradorName()}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Fila de Totales */}
                                                <tr className="bg-slate-100 dark:bg-slate-800/80 font-black text-xs text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                                                    <td colSpan={7} className="px-4 py-3 text-right border border-gray-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                                                        TOTALES ({clientesFiltrados.length} cuentas)
                                                    </td>
                                                    <td className="px-3.5 py-3 text-right border border-gray-200 dark:border-slate-700 font-mono text-emerald-700 dark:text-emerald-300">
                                                        {formatCurrency(totalCobrar)}
                                                    </td>
                                                    <td className="px-3.5 py-3 text-right border border-gray-200 dark:border-slate-700 font-mono text-rose-700 dark:text-rose-300">
                                                        {formatCurrency(totalSaldoVencido)}
                                                    </td>
                                                    <td className="px-3.5 py-3 text-center border border-gray-200 dark:border-slate-700 font-mono">
                                                        -
                                                    </td>
                                                    <td className="px-3.5 py-3 text-right border border-gray-200 dark:border-slate-700 font-mono text-slate-950 dark:text-white">
                                                        {formatCurrency(totalSaldo)}
                                                    </td>
                                                    <td className="px-3.5 py-3 text-center border border-gray-200 dark:border-slate-700">
                                                        -
                                                    </td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
