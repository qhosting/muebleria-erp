"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Filter, Receipt, Users, Banknote, Building2, Search } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import * as XLSX from "xlsx";

interface User {
    id: string;
    name: string;
}

interface AgentSummary {
    cobradorId: string;
    agenteName: string;
    cuentas: number;
    totalMonto: number;
    totalMoratorio: number;
    montoBancario: number;
    montoGestor: number;
}

export default function PagosGestorPage() {
    const { data: session } = useSession();
    const [cobradores, setCobradores] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [selectedCobrador, setSelectedCobrador] = useState<string>("all");
    const [tipoFiltro, setTipoFiltro] = useState<string>("todos"); // 'todos', 'DQ', 'DP'
    const [searchTerm, setSearchTerm] = useState<string>("");

    const [fechaDesde, setFechaDesde] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split("T")[0]);

    // Data
    const [detallado, setDetallado] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>({
        totalMonto: 0, totalDP: 0, totalDQ: 0,
        totalCantidad: 0, cantidadDP: 0, cantidadDQ: 0
    });

    const userRole = (session?.user as any)?.role;

    useEffect(() => {
        if (userRole === "admin" || userRole === "gestor_cobranza" || userRole === "direccion") {
            fetchCobradores();
        }
    }, [userRole]);

    useEffect(() => {
        fetchReporte();
    }, [selectedCobrador, fechaDesde, fechaHasta, tipoFiltro]);

    const fetchCobradores = async () => {
        const res = await fetch("/api/users");
        if (res.ok) {
            const users = await res.json();
            setCobradores(users.filter((u: any) => u.role === "cobrador"));
        }
    };

    const fetchReporte = async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams({
                fechaDesde: fechaDesde + "T00:00:00.000Z",
                fechaHasta: fechaHasta + "T23:59:59.999Z",
                tipo: tipoFiltro
            });
            if (selectedCobrador !== "all") p.append("cobradorId", selectedCobrador);

            const res = await fetch(`/api/reportes/pagos-gestor?${p.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setResumen(data.resumen);
                setDetallado(data.detallado || []);
            }
        } catch (error) {
            toast.error("Error al cargar los pagos del gestor");
        } finally {
            setLoading(false);
        }
    };

    const getMoratorioVal = (p: any): number => {
        if (!p) return 0;
        const rawMora = p.interesMoratorio;
        const interesMora = typeof rawMora === 'object' && rawMora !== null
            ? parseFloat(rawMora.toString?.() || '0')
            : Number(rawMora || 0);

        if (!isNaN(interesMora) && interesMora > 0) return interesMora;
        if (p.tipoPago === 'moratorio') return Number(p.monto || 0);
        return 0;
    };

    const exportarExcel = () => {
        if (detallado.length === 0) return;

        const prefijo = tipoFiltro === "DQ" ? "ClientesDQ-" : tipoFiltro === "DP" ? "ClientesDP-" : "General-";

        const wb = XLSX.utils.book_new();

        // Hoja 1: Resumen Clientes DQ (si aplica)
        if (tipoFiltro === "todos" || tipoFiltro === "DQ") {
            const summaryDQ = getSummaryByPrefix('DQ');
            if (summaryDQ.length > 0) {
                const totalsDQ = calculateTotals(summaryDQ);
                const rowsDQ = [
                    ...summaryDQ.map(r => ({
                        "Agente": r.agenteName,
                        "Cuentas": r.cuentas,
                        "Total Monto": r.totalMonto,
                        "Total Moratorio": r.totalMoratorio,
                        "Monto BANCARIO": r.montoBancario,
                        "Monto GESTOR": r.montoGestor
                    })),
                    {
                        "Agente": "Total General",
                        "Cuentas": totalsDQ.cuentas,
                        "Total Monto": totalsDQ.totalMonto,
                        "Total Moratorio": totalsDQ.totalMoratorio,
                        "Monto BANCARIO": totalsDQ.montoBancario,
                        "Monto GESTOR": totalsDQ.montoGestor
                    }
                ];
                const wsDQ = XLSX.utils.json_to_sheet(rowsDQ);
                XLSX.utils.book_append_sheet(wb, wsDQ, "Resumen DQ");
            }
        }

        // Hoja 2: Resumen Clientes DP (si aplica)
        if (tipoFiltro === "todos" || tipoFiltro === "DP") {
            const summaryDP = getSummaryByPrefix('DP');
            if (summaryDP.length > 0) {
                const totalsDP = calculateTotals(summaryDP);
                const rowsDP = [
                    ...summaryDP.map(r => ({
                        "Agente": r.agenteName,
                        "Cuentas": r.cuentas,
                        "Total Monto": r.totalMonto,
                        "Total Moratorio": r.totalMoratorio,
                        "Monto BANCARIO": r.montoBancario,
                        "Monto GESTOR": r.montoGestor
                    })),
                    {
                        "Agente": "Total General",
                        "Cuentas": totalsDP.cuentas,
                        "Total Monto": totalsDP.totalMonto,
                        "Total Moratorio": totalsDP.totalMoratorio,
                        "Monto BANCARIO": totalsDP.montoBancario,
                        "Monto GESTOR": totalsDP.montoGestor
                    }
                ];
                const wsDP = XLSX.utils.json_to_sheet(rowsDP);
                XLSX.utils.book_append_sheet(wb, wsDP, "Resumen DP");
            }
        }

        // Hoja 3: Pagos Detallados
        const detalleData = detallado.map(p => {
            const fechaPagoSolo = formatDate(p.fechaPago);
            const fechaYHora = formatDateTime(p.fechaPago);

            const referencia = p.numeroRecibo || p.ticket?.referencia || p.ticket?.folio || "PENDIENTE";
            const moratorioVal = getMoratorioVal(p);

            return {
                "ID": p.id,
                "Fecha de pago": fechaPagoSolo,
                "Fecha y Hora": fechaYHora,
                "Código Cliente": p.cliente?.codigoCliente || "-",
                "Nombre Cliente": p.cliente?.nombreCompleto || "-",
                "Referencia de pago": referencia,
                "Monto": Number(p.monto) || 0,
                "Agente": (p.cobrador?.name || "SISTEMA").toUpperCase(),
                "Concepto": p.concepto || "ABONO",
                "Periodicidad": (p.cliente?.periodicidad || "-").toUpperCase(),
                "Día Cobro": (p.cliente?.diaPago || "-").toUpperCase(),
                "Teléfono": p.cliente?.telefono || "-",
                "Moratorio": moratorioVal,
                "Tipo": (p.metodoPago || "EFECTIVO").toUpperCase()
            };
        });

        const wsDetalle = XLSX.utils.json_to_sheet(detalleData);
        XLSX.utils.book_append_sheet(wb, wsDetalle, "Pagos Detallados");

        XLSX.writeFile(wb, `PagosGestor-${prefijo}${fechaDesde}.xlsx`);
        toast.success("Descarga de Excel iniciada");
    };

    const getSummaryByPrefix = (prefix: 'DP' | 'DQ'): AgentSummary[] => {
        const map: Record<string, AgentSummary> = {};

        detallado.forEach((pago) => {
            const codigo = pago.cliente?.codigoCliente || '';
            if (!codigo.toUpperCase().startsWith(prefix)) return;

            const cobradorId = pago.cobradorId || 'sistema';
            const agenteName = (pago.cobrador?.codigoGestor || pago.cobrador?.name || 'SISTEMA').toUpperCase();

            if (!map[cobradorId]) {
                map[cobradorId] = {
                    cobradorId,
                    agenteName,
                    cuentas: 0,
                    totalMonto: 0,
                    totalMoratorio: 0,
                    montoBancario: 0,
                    montoGestor: 0,
                };
            }

            const monto = Number(pago.monto);
            const isBancario = (() => {
                const m = (pago.metodoPago || '').toLowerCase();
                return m.includes('banc') || m.includes('bot') || m.includes('transf') || m.includes('depo');
            })();

            map[cobradorId].cuentas += 1;
            map[cobradorId].totalMonto += monto;

            const moratorioVal = getMoratorioVal(pago);
            map[cobradorId].totalMoratorio += moratorioVal;

            if (isBancario) {
                map[cobradorId].montoBancario += monto;
            } else {
                map[cobradorId].montoGestor += monto;
            }
        });

        return Object.values(map).sort((a, b) => a.agenteName.localeCompare(b.agenteName));
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Encabezado */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
                            <Receipt className="mr-3 h-8 w-8 text-blue-600" />
                            Pagos Gestor (Clientes DP / Clientes DQ)
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Desglose de cobranza separando Clientes DQ y Clientes DP.
                        </p>
                    </div>
                    <Button onClick={exportarExcel} disabled={loading || detallado.length === 0}>
                        <Download className="mr-2 h-4 w-4" /> Exportar a Excel
                    </Button>
                </div>

                {/* Filtros */}
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros de Búsqueda</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {(userRole === "admin" || userRole === "gestor_cobranza" || userRole === "direccion") && (
                                <div className="space-y-2">
                                    <Label>Cobrador / Gestor</Label>
                                    <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los cobradores</SelectItem>
                                            {cobradores.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Rubro (Categoría)</Label>
                                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos (Consolidado)</SelectItem>
                                        <SelectItem value="DQ">Clientes DQ</SelectItem>
                                        <SelectItem value="DP">Clientes DP</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Desde</Label>
                                <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Hasta</Label>
                                <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tarjetas Analíticas Superiores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-md">
                        <CardHeader className="pb-2 flex flex-row justify-between items-center">
                            <CardTitle className="text-sm font-medium text-gray-200">Total Global Obtenido</CardTitle>
                            <Users className="h-4 w-4 text-gray-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{formatCurrency(resumen.totalMonto)}</div>
                            <div className="text-xs mt-1 text-gray-400">En {resumen.totalCantidad} recibos/pagos capturados</div>
                        </CardContent>
                    </Card>

                    <Card className={`${tipoFiltro === 'DP' ? 'opacity-50' : ''} border-green-200 bg-green-50/30`}>
                        <CardHeader className="pb-2 flex flex-row justify-between items-center">
                            <CardTitle className="text-sm font-medium text-green-800">Clientes DQ</CardTitle>
                            <Banknote className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700">{formatCurrency(resumen.totalDQ)}</div>
                            <div className="text-xs mt-1 text-green-600/80">{resumen.cantidadDQ} cobros registrados</div>
                        </CardContent>
                    </Card>

                    <Card className={`${tipoFiltro === 'DQ' ? 'opacity-50' : ''} border-blue-200 bg-blue-50/30`}>
                        <CardHeader className="pb-2 flex flex-row justify-between items-center">
                            <CardTitle className="text-sm font-medium text-blue-800">Clientes DP</CardTitle>
                            <Building2 className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">{formatCurrency(resumen.totalDP)}</div>
                            <div className="text-xs mt-1 text-blue-600/80">{resumen.cantidadDP} cobros registrados</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tablas de Resumen por Agente (DP y DQ) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Tabla DQ */}
                    {(tipoFiltro === "todos" || tipoFiltro === "DQ") && (
                        <Card className={`shadow-sm border-gray-200 ${tipoFiltro !== "todos" ? "xl:col-span-2" : ""}`}>
                            <CardHeader className="bg-slate-50 border-b py-4">
                                <CardTitle className="text-lg text-slate-700 flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-emerald-600" />
                                    Resumen por Gestor - Clientes DQ
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ResumenAgenteTable data={getSummaryByPrefix('DQ')} />
                            </CardContent>
                        </Card>
                    )}

                    {/* Tabla DP */}
                    {(tipoFiltro === "todos" || tipoFiltro === "DP") && (
                        <Card className={`shadow-sm border-gray-200 ${tipoFiltro !== "todos" ? "xl:col-span-2" : ""}`}>
                            <CardHeader className="bg-slate-50 border-b py-4">
                                <CardTitle className="text-lg text-slate-700 flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    Resumen por Gestor - Clientes DP
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ResumenAgenteTable data={getSummaryByPrefix('DP')} />
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Tabla Analítica */}
                <Card>
                    <CardHeader className="bg-gray-50 border-b py-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base text-gray-800">Explorador de Transacciones</CardTitle>
                            <p className="text-xs text-gray-500 mt-0.5">Mostrando pagos ordenados del más reciente al más antiguo</p>
                        </div>
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Buscar por código (DQ/DP), cliente, folio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 text-xs bg-white"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle text-gray-600">
                                <thead className="bg-white border-b border-gray-100 font-medium text-gray-500 uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="px-3 py-4">ID</th>
                                        <th className="px-3 py-4">Fecha/Hora</th>
                                        <th className="px-3 py-4">Cód. Cliente</th>
                                        <th className="px-3 py-4">Nombre Cliente</th>
                                        <th className="px-3 py-4">Referencia</th>
                                        <th className="px-3 py-4 text-right">Monto</th>
                                        <th className="px-3 py-4">Agente</th>
                                        <th className="px-3 py-4">Concepto</th>
                                        <th className="px-3 py-4">Per.</th>
                                        <th className="px-3 py-4">Día</th>
                                        <th className="px-3 py-4">Teléfono</th>
                                        <th className="px-3 py-4 text-right">Moratorio</th>
                                        <th className="px-3 py-4">Tipo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={13} className="py-8 text-center">Cargando pagos...</td></tr>
                                    ) : detallado.filter((pago: any) => {
                                        if (!searchTerm.trim()) return true;
                                        const q = searchTerm.toLowerCase().trim();
                                        const cod = (pago.cliente?.codigoCliente || '').toLowerCase();
                                        const nom = (pago.cliente?.nombreCompleto || '').toLowerCase();
                                        const ref = (pago.numeroRecibo || pago.ticket?.referencia || pago.ticket?.folio || pago.ticket?.id || pago.ticket?.claveRastreo || '').toLowerCase();
                                        const id = (pago.id || '').toLowerCase();
                                        return cod.includes(q) || nom.includes(q) || ref.includes(q) || id.includes(q);
                                    }).length === 0 ? (
                                        <tr>
                                            <td colSpan={13} className="py-12 text-center text-gray-500">
                                                No se encontraron pagos que coincidan con la búsqueda.
                                            </td>
                                        </tr>
                                    ) : detallado.filter((pago: any) => {
                                        if (!searchTerm.trim()) return true;
                                        const q = searchTerm.toLowerCase().trim();
                                        const cod = (pago.cliente?.codigoCliente || '').toLowerCase();
                                        const nom = (pago.cliente?.nombreCompleto || '').toLowerCase();
                                        const ref = (pago.numeroRecibo || pago.ticket?.referencia || pago.ticket?.folio || pago.ticket?.id || pago.ticket?.claveRastreo || '').toLowerCase();
                                        const id = (pago.id || '').toLowerCase();
                                        return cod.includes(q) || nom.includes(q) || ref.includes(q) || id.includes(q);
                                    }).map((pago: any) => {
                                        const isDQ = pago.cliente?.codigoCliente?.startsWith('DQ');
                                        const isDP = pago.cliente?.codigoCliente?.startsWith('DP');

                                        // Formatear referencia similar al export
                                        const referencia = pago.numeroRecibo || pago.ticket?.referencia || pago.ticket?.folio || pago.ticket?.id || pago.ticket?.claveRastreo || "PENDIENTE";

                                        // Fecha y Hora formateada en Horario de México (CDMX)
                                        const fechaCompleta = formatDateTime(pago.fechaPago);

                                        return (
                                            <tr key={pago.id} className="hover:bg-gray-50 transition-colors text-[11px]">
                                                <td className="px-3 py-2 text-gray-400 font-mono">{pago.id.substring(0, 8)}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{fechaCompleta}</td>
                                                <td className="px-3 py-2">
                                                    <Badge variant={isDQ ? 'success' : isDP ? 'default' : 'outline'} className="font-mono text-[9px] px-1 py-0">
                                                        {pago.cliente?.codigoCliente}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[120px]" title={pago.cliente?.nombreCompleto}>
                                                    {pago.cliente?.nombreCompleto}
                                                </td>
                                                <td className="px-3 py-2 text-gray-500 truncate max-w-[100px]" title={referencia}>
                                                    {referencia}
                                                </td>
                                                <td className="px-3 py-2 text-right font-bold text-gray-900">
                                                    {formatCurrency(pago.monto)}
                                                </td>
                                                <td className="px-3 py-2 uppercase text-gray-600">{pago.cobrador?.name || "SISTEMA"}</td>
                                                <td className="px-3 py-2 truncate max-w-[80px]" title={pago.concepto || "ABONO"}>
                                                    {pago.concepto || "ABONO"}
                                                </td>
                                                <td className="px-3 py-2 uppercase text-[9px]">{pago.cliente?.periodicidad?.substring(0, 3) || "-"}</td>
                                                <td className="px-3 py-2 uppercase text-[9px]">{pago.cliente?.diaPago?.substring(0, 3) || "-"}</td>
                                                <td className="px-3 py-2 text-gray-500">{pago.cliente?.telefono || "-"}</td>
                                                <td className="px-3 py-2 text-right text-red-600 font-semibold">
                                                    {getMoratorioVal(pago) > 0 ? formatCurrency(getMoratorioVal(pago)) : "$0.00"}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Badge variant="outline" className="text-[9px] uppercase">
                                                        {pago.metodoPago || "EFECTIVO"}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </DashboardLayout>
    );
}

const calculateTotals = (summaries: AgentSummary[]) => {
    return summaries.reduce((acc, curr) => ({
        cuentas: acc.cuentas + curr.cuentas,
        totalMonto: acc.totalMonto + curr.totalMonto,
        totalMoratorio: acc.totalMoratorio + curr.totalMoratorio,
        montoBancario: acc.montoBancario + curr.montoBancario,
        montoGestor: acc.montoGestor + curr.montoGestor,
    }), {
        cuentas: 0,
        totalMonto: 0,
        totalMoratorio: 0,
        montoBancario: 0,
        montoGestor: 0,
    });
};

function ResumenAgenteTable({ data }: { data: AgentSummary[] }) {
    const totals = calculateTotals(data);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left align-middle text-slate-700 border-collapse">
                <thead className="bg-[#1e293b] text-white text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                        <th className="px-4 py-3 text-center border border-slate-700">Agente</th>
                        <th className="px-4 py-3 text-center border border-slate-700">Cuentas</th>
                        <th className="px-4 py-3 text-center border border-slate-700">Total Monto</th>
                        <th className="px-4 py-3 text-center border border-slate-700">Total Moratorio</th>
                        <th className="px-4 py-3 text-center border border-slate-700">Monto BANCARIO</th>
                        <th className="px-4 py-3 text-center border border-slate-700">Monto GESTOR</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                                No hay transacciones registradas en este período.
                            </td>
                        </tr>
                    ) : (
                        <>
                            {data.map((row) => (
                                <tr key={row.cobradorId} className="hover:bg-slate-50 transition-colors text-xs">
                                    <td className="px-4 py-2 text-center font-bold text-slate-900 border border-slate-200 font-mono">
                                        {row.agenteName}
                                    </td>
                                    <td className="px-4 py-2 text-center text-slate-800 border border-slate-200">
                                        {row.cuentas}
                                    </td>
                                    <td className="px-4 py-2 text-center text-slate-800 border border-slate-200 font-semibold text-slate-900">
                                        {formatCurrency(row.totalMonto)}
                                    </td>
                                    <td className="px-4 py-2 text-center text-slate-800 border border-slate-200">
                                        {formatCurrency(row.totalMoratorio)}
                                    </td>
                                    <td className="px-4 py-2 text-center text-slate-800 border border-slate-200">
                                        {formatCurrency(row.montoBancario)}
                                    </td>
                                    <td className="px-4 py-2 text-center text-slate-800 border border-slate-200">
                                        {formatCurrency(row.montoGestor)}
                                    </td>
                                </tr>
                            ))}
                            {/* Fila Total General */}
                            <tr className="bg-slate-50 font-bold text-xs text-slate-900 border-t-2 border-slate-300">
                                <td className="px-4 py-3 text-center border border-slate-200">
                                    Total General
                                </td>
                                <td className="px-4 py-3 text-center border border-slate-200">
                                    {totals.cuentas}
                                </td>
                                <td className="px-4 py-3 text-center border border-slate-200">
                                    {formatCurrency(totals.totalMonto)}
                                </td>
                                <td className="px-4 py-3 text-center border border-slate-200">
                                    {formatCurrency(totals.totalMoratorio)}
                                </td>
                                <td className="px-4 py-3 text-center border border-slate-200">
                                    {formatCurrency(totals.montoBancario)}
                                </td>
                                <td className="px-4 py-3 text-center border border-slate-200">
                                    {formatCurrency(totals.montoGestor)}
                                </td>
                            </tr>
                        </>
                    )}
                </tbody>
            </table>
        </div>
    );
}
