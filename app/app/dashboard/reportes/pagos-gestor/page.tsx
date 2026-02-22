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
import { Download, Filter, Receipt, Users, Banknote, Building2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface User {
    id: string;
    name: string;
}

export default function PagosGestorPage() {
    const { data: session } = useSession();
    const [cobradores, setCobradores] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [selectedCobrador, setSelectedCobrador] = useState<string>("all");
    const [tipoFiltro, setTipoFiltro] = useState<string>("todos"); // 'todos', 'DQ', 'DP'

    const [fechaDesde, setFechaDesde] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 7);
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
        if (userRole === "admin" || userRole === "gestor_cobranza") {
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

    const exportarExcel = () => {
        if (detallado.length === 0) return;

        const prefijo = tipoFiltro === "DQ" ? "Prestamos-" : tipoFiltro === "DP" ? "Muebles-" : "General-";

        const csvContent = [
            [
                "ID", "Fecha de pago", "Fecha y Hora", "Código Cliente",
                "Nombre Cliente", "Referencia de pago", "Monto", "Agente",
                "Concepto", "Periodicidad", "Día Cobro", "Teléfono",
                "Moratorio", "Tipo"
            ],
            ...detallado.map(p => {
                // Formateo de fechas
                const fechaPagoSolo = new Date(p.fechaPago).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const fechaYHora = new Date(p.fechaPago).toISOString().replace("T", " ").substring(0, 19);

                // Referencia
                let referencia = p.numeroRecibo || p.ticket?.referencia || p.ticket?.folio || "PENDIENTE";

                // Moratorio (Solo si el tipoPago es explícitamente moratorio)
                const moratorioStr = p.tipoPago === "moratorio" ? formatCurrency(p.monto) : "$0.00";

                // Limpieza de campos problemáticos por las comas
                const nombreLimpio = `"${p.cliente?.nombreCompleto || "-"}"`;
                const conceptoLimpio = `"${p.concepto || "ABONO"}"`;

                return [
                    p.id,
                    fechaPagoSolo,
                    fechaYHora,
                    p.cliente?.codigoCliente || "-",
                    nombreLimpio,
                    `"${referencia}"`,
                    formatCurrency(p.monto),
                    p.cobrador?.name?.toUpperCase() || "SISTEMA",
                    conceptoLimpio,
                    p.cliente?.periodicidad?.toUpperCase() || "-",
                    p.cliente?.diaPago?.toUpperCase() || "-",
                    p.cliente?.telefono || "-",
                    moratorioStr,
                    p.metodoPago?.toUpperCase() || "EFECTIVO"
                ];
            })
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" }); // BOM for Excel UTF-8
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `PagosGestor-${prefijo}${fechaDesde}.csv`;
        a.click();
        toast.success("Descarga iniciada");
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Encabezado */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
                            <Receipt className="mr-3 h-8 w-8 text-blue-600" />
                            Pagos Gestor (DP / DQ)
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Desglose de cobranza separando Préstamos de Dinero (DQ) y Muebles (DP).
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
                            {(userRole === "admin" || userRole === "gestor_cobranza") && (
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
                                        <SelectItem value="DQ">Dinero / Préstamos (DQ)</SelectItem>
                                        <SelectItem value="DP">Muebles / Productos (DP)</SelectItem>
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
                            <CardTitle className="text-sm font-medium text-green-800">Préstamos Dinero (DQ)</CardTitle>
                            <Banknote className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700">{formatCurrency(resumen.totalDQ)}</div>
                            <div className="text-xs mt-1 text-green-600/80">{resumen.cantidadDQ} cobros registrados</div>
                        </CardContent>
                    </Card>

                    <Card className={`${tipoFiltro === 'DQ' ? 'opacity-50' : ''} border-blue-200 bg-blue-50/30`}>
                        <CardHeader className="pb-2 flex flex-row justify-between items-center">
                            <CardTitle className="text-sm font-medium text-blue-800">Ventas Muebles (DP)</CardTitle>
                            <Building2 className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700">{formatCurrency(resumen.totalDP)}</div>
                            <div className="text-xs mt-1 text-blue-600/80">{resumen.cantidadDP} cobros registrados</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabla Analítica */}
                <Card>
                    <CardHeader className="bg-gray-50 border-b">
                        <CardTitle className="text-lg text-gray-700">Explorador de Transacciones</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle text-gray-600">
                                <thead className="bg-white border-b border-gray-100 font-medium text-gray-500 uppercase text-xs tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Cobrador</th>
                                        <th className="px-6 py-4">Cliente (Cód / Nombre)</th>
                                        <th className="px-6 py-4">Estatus</th>
                                        <th className="px-6 py-4 text-right">Efectivo Abonado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={5} className="py-8 text-center">Cargando pagos...</td></tr>
                                    ) : detallado.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-gray-500">
                                                No se encontraron pagos con esos filtros en estas fechas.
                                            </td>
                                        </tr>
                                    ) : detallado.map((pago: any) => {
                                        const isDQ = pago.cliente?.codigoCliente?.startsWith('DQ');
                                        const isDP = pago.cliente?.codigoCliente?.startsWith('DP');

                                        return (
                                            <tr key={pago.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 whitespace-nowrap">{formatDate(pago.fechaPago).split(' ')[0]}</td>
                                                <td className="px-6 py-3 text-gray-900 font-medium">{pago.cobrador?.name || "-"}</td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={isDQ ? 'success' : isDP ? 'default' : 'outline'} className="font-mono shadow-sm">
                                                            {pago.cliente?.codigoCliente}
                                                        </Badge>
                                                        <span className="truncate max-w-[200px]" title={pago.cliente?.nombreCompleto}>
                                                            {pago.cliente?.nombreCompleto}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    {pago.estatus === "completado" ?
                                                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Ingresado</Badge> :
                                                        <Badge variant="secondary">Pendiente</Badge>
                                                    }
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className="font-bold text-gray-900">{formatCurrency(pago.monto)}</span>
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
