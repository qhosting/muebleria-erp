'use client';

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Calculator, Users as UsersIcon, Calendar as CalendarIcon, 
    DollarSign, Download, Search, AlertCircle, CheckCircle2, 
    FileSpreadsheet, RefreshCw, Layers, Building2, Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

export default function CuadrePage() {
    const [dateStart, setDateStart] = useState<string>(() => {
        const d = new Date();
        const sab = new Date(d);
        sab.setDate(d.getDate() - ((d.getDay() + 1) % 7)); // Último Sábado
        return sab.toISOString().split('T')[0];
    });
    const [dateEnd, setDateEnd] = useState<string>(() => {
        const d = new Date();
        const sab = new Date(d);
        sab.setDate(d.getDate() - ((d.getDay() + 1) % 7));
        const vie = new Date(sab);
        vie.setDate(sab.getDate() + 6); // Viernes de la semana
        return vie.toISOString().split('T')[0];
    });
    const [selectedGestor, setSelectedGestor] = useState<string>("all");
    const [gestoresList, setGestoresList] = useState<any[]>([]);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [finalizing, setFinalizing] = useState(false);

    useEffect(() => {
        fetchCobradores();
    }, []);

    useEffect(() => {
        fetchCuadre();
    }, [dateStart, dateEnd, selectedGestor]);

    const setSemanaActual = () => {
        const d = new Date();
        const sab = new Date(d);
        sab.setDate(d.getDate() - ((d.getDay() + 1) % 7));
        const vie = new Date(sab);
        vie.setDate(sab.getDate() + 6);
        setDateStart(sab.toISOString().split('T')[0]);
        setDateEnd(vie.toISOString().split('T')[0]);
    };

    const setSemanaAnterior = () => {
        const d = new Date();
        const sab = new Date(d);
        sab.setDate(d.getDate() - ((d.getDay() + 1) % 7) - 7);
        const vie = new Date(sab);
        vie.setDate(sab.getDate() + 6);
        setDateStart(sab.toISOString().split('T')[0]);
        setDateEnd(vie.toISOString().split('T')[0]);
    };

    const setMesActual = () => {
        const d = new Date();
        const primerDia = new Date(d.getFullYear(), d.getMonth(), 1);
        const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        setDateStart(primerDia.toISOString().split('T')[0]);
        setDateEnd(ultimoDia.toISOString().split('T')[0]);
    };

    const fetchCobradores = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const users = await res.json();
                const cobradores = users.filter((u: any) => 
                    u.role === 'cobrador' || 
                    u.role === 'gestor_cobranza' || 
                    u.codigoGestor
                );
                setGestoresList(cobradores);
            }
        } catch (error) {
            console.warn('No se pudo cargar la lista de cobradores', error);
        }
    };

    const fetchCuadre = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                desde: dateStart,
                hasta: dateEnd,
                cobradorId: selectedGestor
            });
            const res = await fetch(`/api/tesoreria/cuadre?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                setData(result);
            } else {
                toast.error("Error al cargar datos de cuadre");
            }
        } catch (error) {
            console.error("Error al obtener cuadre", error);
            toast.error("Error de conexión al cargar cuadre");
        } finally {
            setLoading(false);
        }
    };

    const handleFinalizarCuadre = async () => {
        if (!confirm("¿Estás seguro de finalizar el cuadre? Esto reactivará a todos los clientes con saldo pendiente para la siguiente ruta de cobranza.")) return;
        
        setFinalizing(true);
        try {
            const res = await fetch('/api/tesoreria/cuadre', { method: 'POST' });
            if (res.ok) {
                const result = await res.json();
                toast.success(`Cuadre finalizado. ${result.reactivados} clientes reactivados.`);
                fetchCuadre();
            } else {
                const err = await res.json();
                throw new Error(err.error || "Error al finalizar");
            }
        } catch (error: any) {
            toast.error(error.message || "No se pudo finalizar el cuadre");
        } finally {
            setFinalizing(false);
        }
    };

    const handleExportarExcel = () => {
        if (!data) {
            toast.error("No hay datos disponibles para exportar");
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // Hoja 1: Desglose por Gestor
            const gestoresData = (data.gestores || []).map((g: any) => ({
                'Gestor / Cobrador': g.nombre,
                'Código': g.codigoGestor,
                'Cantidad Recibos': g.cantidadPagos,
                'Total Recaudado': g.totalCobrado
            }));
            const wsGestores = XLSX.utils.json_to_sheet(gestoresData);
            XLSX.utils.book_append_sheet(wb, wsGestores, 'Desglose Gestores');

            // Hoja 2: Resumen Bancos DQ y DP
            const resumenRows = [
                { 'Concepto': 'Caja Consolidada Total', 'Monto': data.totalGeneral || 0, 'Cuentas': '-' },
                { 'Concepto': 'Abonos sin Asignar (Bancos)', 'Monto': data.otrasDiscrepancias?.abonosSinAsignar?.monto || 0, 'Cuentas': data.otrasDiscrepancias?.abonosSinAsignar?.ctas || 0 },
                { 'Concepto': 'Total DQ Bancos', 'Monto': data.resumenDQ?.total?.monto || 0, 'Cuentas': data.resumenDQ?.total?.ctas || 0 },
                { 'Concepto': 'Discrepancia DQ', 'Monto': data.resumenDQ?.discrepancia?.monto || 0, 'Cuentas': data.resumenDQ?.discrepancia?.ctas || 0 },
                { 'Concepto': 'Total DP Bancos', 'Monto': data.resumenDP?.total?.monto || 0, 'Cuentas': data.resumenDP?.total?.ctas || 0 },
                { 'Concepto': 'Discrepancia DP', 'Monto': data.resumenDP?.discrepancia?.monto || 0, 'Cuentas': data.resumenDP?.discrepancia?.ctas || 0 },
            ];
            const wsResumen = XLSX.utils.json_to_sheet(resumenRows);
            XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Bancario');

            const fileName = `Cuadre_Caja_${dateStart}_al_${dateEnd}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success(`Archivo Excel exportado: ${fileName}`);
        } catch (error) {
            console.error("Error al exportar Excel:", error);
            toast.error("Error al generar el archivo Excel");
        }
    };

    const SummaryCard = ({ title, resumen }: { title: string, resumen: any }) => {
        if (!resumen) return null;

        return (
            <Card className="shadow-md border-gray-100 dark:border-slate-800 h-full">
                <CardHeader className="pb-2 border-b bg-gray-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <CardTitle className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">{title}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {/* Actual Section */}
                    <div>
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="font-semibold text-gray-600 dark:text-gray-400">ACTUAL:</span>
                            <span className="font-mono">
                                <span className="text-gray-400 mr-2">CTAS {resumen.actual?.ctas ?? 0}</span>
                                <span className="text-emerald-600 font-bold">{formatCurrency(resumen.actual?.monto ?? 0)}</span>
                            </span>
                        </div>
                        {Object.entries(resumen.actual?.bancos || {}).map(([banco, info]: [string, any]) => (
                            <div key={banco} className="flex justify-between items-center text-xs text-gray-500 pl-4 py-0.5">
                                <span>» {banco}:</span>
                                <span className="font-mono">
                                    <span className="mr-2 text-gray-400">CTAS {info.ctas}</span>
                                    <span>{formatCurrency(info.monto)}</span>
                                </span>
                            </div>
                        ))}
                    </div>

                    <Separator className="opacity-50" />

                    {/* Anterior Section */}
                    <div>
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="font-semibold text-gray-600 dark:text-gray-400">ANTERIOR:</span>
                            <span className="font-mono">
                                <span className="text-gray-400 mr-2">CTAS {resumen.anterior?.ctas ?? 0}</span>
                                <span className="text-emerald-600 font-bold">{formatCurrency(resumen.anterior?.monto ?? 0)}</span>
                            </span>
                        </div>
                        {Object.entries(resumen.anterior?.bancos || {}).map(([banco, info]: [string, any]) => (
                            <div key={banco} className="flex justify-between items-center text-xs text-gray-500 pl-4 py-0.5">
                                <span>» {banco}:</span>
                                <span className="font-mono">
                                    <span className="mr-2 text-gray-400">CTAS {info.ctas}</span>
                                    <span>{formatCurrency(info.monto)}</span>
                                </span>
                            </div>
                        ))}
                    </div>

                    <Separator className="h-0.5 bg-gray-900 dark:bg-slate-700" />

                    {/* Totals */}
                    <div className="flex justify-between items-center text-base font-black">
                        <span className="text-gray-900 dark:text-white">TOTAL {title.includes('DQ') ? 'DQ' : 'DP'}:</span>
                        <span className="font-mono">
                            <span className="text-gray-400 mr-3 text-sm font-medium">CTAS {resumen.total?.ctas ?? 0}</span>
                            <span>{formatCurrency(resumen.total?.monto ?? 0)}</span>
                        </span>
                    </div>

                    {/* Discrepancies */}
                    <div className="pt-2">
                        <div className={`flex justify-between items-center text-sm font-bold ${(resumen.discrepancia?.monto ?? 0) !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            <span>Discrepancia:</span>
                            <span className="font-mono">
                                <span className="mr-2">CTAS {resumen.discrepancia?.ctas ?? 0}</span>
                                <span>{formatCurrency(resumen.discrepancia?.monto ?? 0)}</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-rose-500 mt-1">
                            <span>Tickets sin conciliar:</span>
                            <span className="font-semibold font-mono">
                                {resumen.ticketsSinConciliar?.ctas ?? 0} (Suma: {formatCurrency(resumen.ticketsSinConciliar?.monto ?? 0)})
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
                {/* Header with Filters */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <Calculator className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Cuadre y Arqueo Semanal de Caja
                                </h1>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Conciliación de cobranza en ruta, abonos bancarios (DQ / DP) y finalización de corte semanal.
                                </p>
                            </div>
                        </div>

                        {/* Botones de acceso rápido */}
                        <div className="flex items-center gap-1.5">
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={setSemanaActual}>
                                Semana Actual
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={setSemanaAnterior}>
                                Semana Anterior
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={setMesActual}>
                                Mes Completo
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-bold uppercase text-gray-500">Gestor / Cobrador</label>
                            <Select value={selectedGestor} onValueChange={setSelectedGestor}>
                                <SelectTrigger className="w-full h-9 text-xs">
                                    <SelectValue placeholder="-- Todos los Gestores --" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">-- Todos los Gestores --</SelectItem>
                                    {gestoresList.map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.codigoGestor ? `${g.codigoGestor} - ${g.name}` : g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-bold uppercase text-gray-500">Fecha Inicio</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="pl-10 h-9 text-xs" />
                            </div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-bold uppercase text-gray-500">Fecha Fin</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="pl-10 h-9 text-xs" />
                            </div>
                        </div>
                        <Button onClick={fetchCuadre} variant="outline" className="lg:w-32 h-9 text-xs font-semibold gap-1.5">
                            <Search className="w-4 h-4" />
                            Filtrar
                        </Button>
                        <Button 
                            onClick={handleFinalizarCuadre} 
                            disabled={finalizing}
                            className="lg:w-48 h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none"
                        >
                            {finalizing ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Finalizar Cuadre
                        </Button>
                    </div>
                </div>

                {/* Main Summary Row */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                    <SummaryCard title="Resumen Semanal DQ (Bancos)" resumen={data?.resumenDQ} />
                    <SummaryCard title="Resumen Semanal DP (Bancos)" resumen={data?.resumenDP} />

                    <Card className="shadow-md border-gray-100 dark:border-slate-800 flex flex-col h-full bg-indigo-50/20 dark:bg-slate-800/30">
                        <CardHeader className="pb-2 border-b bg-gray-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <CardTitle className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">Otras Discrepancias</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 flex-1">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-gray-600 dark:text-gray-400">Abonos sin asignar (Banco):</span>
                                <span className={`font-bold font-mono ${(data?.otrasDiscrepancias?.abonosSinAsignar?.ctas ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {data?.otrasDiscrepancias?.abonosSinAsignar?.ctas ?? 0} (Suma: {formatCurrency(data?.otrasDiscrepancias?.abonosSinAsignar?.monto || 0)})
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-400 italic leading-relaxed border-t pt-2">
                                * Los abonos sin asignar corresponden a movimientos bancarios en Santander / Banorte no vinculados a ningún ticket de cliente.
                            </p>

                            <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-xl">
                                <div className="text-xs uppercase font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5" /> Caja Consolidada
                                </div>
                                <div className="text-3xl font-black font-mono tracking-tight">{formatCurrency(data?.totalGeneral || 0)}</div>
                                <div className="text-[10px] mt-2 text-indigo-200/80">Total efectivo y banco recaudado en el rango</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Gestores Table */}
                <Card className="border-gray-200 dark:border-slate-800 shadow-lg">
                    <CardHeader className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 pb-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">Desglose por Gestor de Cobranza</CardTitle>
                            <CardDescription className="text-xs text-gray-400 mt-0.5">Recaudación detallada por cada cobrador o gestor asignado</CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExportarExcel}
                            disabled={loading || !data?.gestores?.length}
                            className="flex items-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Excel
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left align-middle">
                                <thead className="bg-gray-100/50 dark:bg-slate-800/80 font-bold text-gray-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b">
                                    <tr>
                                        <th scope="col" className="px-6 py-3.5">Gestor / Cobrador</th>
                                        <th scope="col" className="px-6 py-3.5 text-center">Código Gestor</th>
                                        <th scope="col" className="px-6 py-3.5 text-center">Recibos Emitidos</th>
                                        <th scope="col" className="px-6 py-3.5 text-right font-bold">Total Cobrado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                                                Cargando detalle de cuadre...
                                            </td>
                                        </tr>
                                    ) : (data?.gestores || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-16 text-center">
                                                <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-400 font-medium">No hay cobranza registrada en este rango</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        data.gestores.map((r: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-3.5 font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                                    <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                                                        {r.nombre.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    {r.nombre}
                                                </td>
                                                <td className="px-6 py-3.5 text-center">
                                                    <Badge variant="outline" className="font-mono text-[10px] py-0">{r.codigoGestor}</Badge>
                                                </td>
                                                <td className="px-6 py-3.5 text-center font-medium font-mono">
                                                    {r.cantidadPagos}
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <span className="font-black font-mono text-indigo-700 dark:text-indigo-300 text-sm">{formatCurrency(r.totalCobrado)}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
