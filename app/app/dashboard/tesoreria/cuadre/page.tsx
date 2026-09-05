'use client';

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
    Calculator, Users as UsersIcon, Calendar as CalendarIcon, 
    DollarSign, Search, AlertCircle, CheckCircle2, 
    FileSpreadsheet, RefreshCw, Layers, Building2, Receipt,
    Bot, Banknote, Smartphone, Globe
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

            // Hoja 1: Resumen Global Consolidado
            const globalRows = (data.tablas?.global || []).map((g: any) => ({
                'Gestor / Cobrador': g.nombre,
                'Código': g.codigoGestor,
                'Recibos BOT': g.botRecibos,
                'Monto BOT': g.botMonto,
                'Recibos Cobranza Gestor': g.cobranzaRecibos,
                'Monto Cobranza Gestor': g.cobranzaMonto,
                'Recibos Bancos Gestor': g.bancosGestorRecibos,
                'Monto Bancos Gestor': g.bancosGestorMonto,
                'Recibos Totales': g.totalRecibos,
                'Total Consolidado': g.totalMonto
            }));
            const wsGlobal = XLSX.utils.json_to_sheet(globalRows);
            XLSX.utils.book_append_sheet(wb, wsGlobal, 'Global Consolidado');

            // Hoja 2: BANCOS BOT
            const botRows = (data.tablas?.bancosBot || []).map((g: any) => ({
                'Gestor / Cobrador': g.nombre,
                'Código': g.codigoGestor,
                'Cantidad Recibos BOT': g.cantidadPagos,
                'Total Recaudado BOT': g.totalCobrado
            }));
            const wsBot = XLSX.utils.json_to_sheet(botRows);
            XLSX.utils.book_append_sheet(wb, wsBot, 'BANCOS BOT');

            // Hoja 3: COBRANZA GESTOR
            const cobranzaRows = (data.tablas?.cobranzaGestor || []).map((g: any) => ({
                'Gestor / Cobrador': g.nombre,
                'Código': g.codigoGestor,
                'Cantidad Recibos Efectivo': g.cantidadPagos,
                'Total Recaudado Efectivo': g.totalCobrado
            }));
            const wsCobranza = XLSX.utils.json_to_sheet(cobranzaRows);
            XLSX.utils.book_append_sheet(wb, wsCobranza, 'COBRANZA GESTOR');

            // Hoja 4: BANCOS GESTOR
            const bancosGestorRows = (data.tablas?.bancosGestor || []).map((g: any) => ({
                'Gestor / Cobrador': g.nombre,
                'Código': g.codigoGestor,
                'Cantidad Recibos Manual': g.cantidadPagos,
                'Total Recaudado Manual': g.totalCobrado
            }));
            const wsBancosGestor = XLSX.utils.json_to_sheet(bancosGestorRows);
            XLSX.utils.book_append_sheet(wb, wsBancosGestor, 'BANCOS GESTOR');

            // Hoja 5: Resumen Bancos DQ y DP (BANCOS BOT)
            const resumenRows: any[] = [
                { 'Concepto': 'Caja Consolidada Total (Global)', 'Monto': data.totales?.totalGeneral || data.totalGeneral || 0, 'Cuentas': '-' },
                { 'Concepto': '  » Total BANCOS BOT', 'Monto': data.totales?.totalBot || 0, 'Cuentas': '-' },
                { 'Concepto': '  » Total COBRANZA GESTOR (Efectivo)', 'Monto': data.totales?.totalCobranza || 0, 'Cuentas': '-' },
                { 'Concepto': '  » Total BANCOS GESTOR (Manual)', 'Monto': data.totales?.totalBancosGestor || 0, 'Cuentas': '-' },
                { 'Concepto': 'Abonos sin Asignar (Total Bancos)', 'Monto': data.otrasDiscrepancias?.abonosSinAsignar?.monto || 0, 'Cuentas': data.otrasDiscrepancias?.abonosSinAsignar?.ctas || 0 },
            ];

            // Desglose abonos sin asignar por banco
            Object.entries(data.otrasDiscrepancias?.abonosSinAsignar?.bancos || {}).forEach(([banco, info]: [string, any]) => {
                resumenRows.push({ 'Concepto': `  » Sin Asignar: ${banco}`, 'Monto': info.monto, 'Cuentas': info.ctas });
            });

            // Resumen DQ
            resumenRows.push(
                { 'Concepto': '--- RESUMEN DQ (BANCOS BOT) ---', 'Monto': '', 'Cuentas': '' },
                { 'Concepto': 'Total DQ Bancos (Actual + Anterior)', 'Monto': data.resumenDQ?.total?.monto || 0, 'Cuentas': data.resumenDQ?.total?.ctas || 0 },
                { 'Concepto': '  [DQ ACTUAL]', 'Monto': data.resumenDQ?.actual?.monto || 0, 'Cuentas': data.resumenDQ?.actual?.ctas || 0 }
            );
            Object.entries(data.resumenDQ?.actual?.bancos || {}).forEach(([banco, info]: [string, any]) => {
                resumenRows.push({ 'Concepto': `    » DQ Actual: ${banco}`, 'Monto': info.monto, 'Cuentas': info.ctas });
            });

            resumenRows.push(
                { 'Concepto': '  [DQ ANTERIOR]', 'Monto': data.resumenDQ?.anterior?.monto || 0, 'Cuentas': data.resumenDQ?.anterior?.ctas || 0 }
            );
            Object.entries(data.resumenDQ?.anterior?.bancos || {}).forEach(([banco, info]: [string, any]) => {
                resumenRows.push({ 'Concepto': `    » DQ Anterior: ${banco}`, 'Monto': info.monto, 'Cuentas': info.ctas });
            });

            resumenRows.push(
                { 'Concepto': 'Discrepancia DQ (Tickets sin conciliar)', 'Monto': data.resumenDQ?.discrepancia?.monto || 0, 'Cuentas': data.resumenDQ?.discrepancia?.ctas || 0 },
                { 'Concepto': '--- RESUMEN DP (BANCOS BOT) ---', 'Monto': '', 'Cuentas': '' },
                { 'Concepto': 'Total DP Bancos (Actual + Anterior)', 'Monto': data.resumenDP?.total?.monto || 0, 'Cuentas': data.resumenDP?.total?.ctas || 0 },
                { 'Concepto': '  [DP ACTUAL]', 'Monto': data.resumenDP?.actual?.monto || 0, 'Cuentas': data.resumenDP?.actual?.ctas || 0 }
            );
            Object.entries(data.resumenDP?.actual?.bancos || {}).forEach(([banco, info]: [string, any]) => {
                resumenRows.push({ 'Concepto': `    » DP Actual: ${banco}`, 'Monto': info.monto, 'Cuentas': info.ctas });
            });

            resumenRows.push(
                { 'Concepto': '  [DP ANTERIOR]', 'Monto': data.resumenDP?.anterior?.monto || 0, 'Cuentas': data.resumenDP?.anterior?.ctas || 0 }
            );
            Object.entries(data.resumenDP?.anterior?.bancos || {}).forEach(([banco, info]: [string, any]) => {
                resumenRows.push({ 'Concepto': `    » DP Anterior: ${banco}`, 'Monto': info.monto, 'Cuentas': info.ctas });
            });

            resumenRows.push(
                { 'Concepto': 'Discrepancia DP (Tickets sin conciliar)', 'Monto': data.resumenDP?.discrepancia?.monto || 0, 'Cuentas': data.resumenDP?.discrepancia?.ctas || 0 }
            );

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

    const getBancoParam = (bancoKey: string) => {
        if (bancoKey.includes('22001022837')) return '22001022837';
        if (bancoKey.includes('65505732541')) return '65505732541';
        if (bancoKey.includes('0330253963')) return '0330253963';
        return '';
    };

    const renderBancos = (bancos: any) => {
        const baseAccounts = [
            'SANTANDER · 22001022837',
            'SANTANDER · 65505732541',
            'BANORTE · 0330253963'
        ];
        
        const entries: [string, any][] = baseAccounts.map(key => [
            key, 
            bancos?.[key] || { ctas: 0, monto: 0 }
        ]);

        Object.entries(bancos || {}).forEach(([k, v]) => {
            if (!baseAccounts.includes(k)) {
                entries.push([k, v]);
            }
        });

        return entries.map(([banco, info]: [string, any]) => {
            const bancoParam = getBancoParam(banco);
            const ctas = info.ctas ?? 0;
            const monto = info.monto ?? 0;
            return (
                <div key={banco} className="flex justify-between items-center text-xs pl-4 py-0.5">
                    <a 
                        href={`/dashboard/tesoreria/bancos${bancoParam ? `?banco=${bancoParam}` : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        title="Ver movimientos en Tesorería / Bancos"
                    >
                        <span className={ctas > 0 ? "font-medium text-gray-700 dark:text-gray-300" : "text-gray-400"}>» {banco}:</span>
                    </a>
                    <span className="font-mono">
                        <span className={`mr-2 ${ctas > 0 ? "text-gray-600 dark:text-gray-400 font-semibold" : "text-gray-400"}`}>CTAS {ctas}</span>
                        <span className={monto > 0 ? "text-emerald-600 font-bold" : "text-gray-400"}>{formatCurrency(monto)}</span>
                    </span>
                </div>
            );
        });
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
                        {renderBancos(resumen.actual?.bancos)}
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
                        {renderBancos(resumen.anterior?.bancos)}
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

    // Render de tabla estándar para canales individuales
    const renderSimpleTable = (items: any[], emptyText: string, colorText: string) => {
        if (loading) {
            return (
                <div className="py-12 text-center text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Cargando datos...
                </div>
            );
        }
        if (!items || items.length === 0) {
            return (
                <div className="py-16 text-center">
                    <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">{emptyText}</p>
                </div>
            );
        }

        const totalRecibos = items.reduce((acc, curr) => acc + (curr.cantidadPagos || 0), 0);
        const totalCobrado = items.reduce((acc, curr) => acc + (curr.totalCobrado || 0), 0);

        return (
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
                        {items.map((r: any, idx: number) => (
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
                                    <span className={`font-black font-mono text-sm ${colorText}`}>{formatCurrency(r.totalCobrado)}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50/80 dark:bg-slate-800/80 border-t font-black text-xs">
                        <tr>
                            <td colSpan={2} className="px-6 py-3.5 text-gray-800 dark:text-white">TOTAL CANAL</td>
                            <td className="px-6 py-3.5 text-center font-mono text-gray-800 dark:text-white">{totalRecibos}</td>
                            <td className="px-6 py-3.5 text-right font-mono text-sm text-gray-900 dark:text-white">{formatCurrency(totalCobrado)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };

    // Render de tabla matriz para el Consolidado Global
    const renderGlobalTable = (items: any[]) => {
        if (loading) {
            return (
                <div className="py-12 text-center text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Cargando consolidado global...
                </div>
            );
        }
        if (!items || items.length === 0) {
            return (
                <div className="py-16 text-center">
                    <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No hay cobranza registrada en este rango</p>
                </div>
            );
        }

        const sumBot = items.reduce((acc, c) => acc + (c.botMonto || 0), 0);
        const sumCobranza = items.reduce((acc, c) => acc + (c.cobranzaMonto || 0), 0);
        const sumBancosGestor = items.reduce((acc, c) => acc + (c.bancosGestorMonto || 0), 0);
        const sumTotal = items.reduce((acc, c) => acc + (c.totalMonto || 0), 0);
        const sumRecibos = items.reduce((acc, c) => acc + (c.totalRecibos || 0), 0);

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left align-middle">
                    <thead className="bg-gray-100/50 dark:bg-slate-800/80 font-bold text-gray-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b">
                        <tr>
                            <th scope="col" className="px-5 py-3.5">Gestor / Cobrador</th>
                            <th scope="col" className="px-3 py-3.5 text-center">Código</th>
                            <th scope="col" className="px-4 py-3.5 text-right text-indigo-600 dark:text-indigo-400">🤖 BANCOS BOT</th>
                            <th scope="col" className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400">💵 COBRANZA GESTOR</th>
                            <th scope="col" className="px-4 py-3.5 text-right text-purple-600 dark:text-purple-400">📱 BANCOS GESTOR</th>
                            <th scope="col" className="px-3 py-3.5 text-center font-semibold">Recibos</th>
                            <th scope="col" className="px-5 py-3.5 text-right font-black bg-slate-100/60 dark:bg-slate-800/60">TOTAL CONSOLIDADO</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {items.map((r: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                                    <div className="h-6 w-6 rounded bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                                        {r.nombre.substring(0, 2).toUpperCase()}
                                    </div>
                                    {r.nombre}
                                </td>
                                <td className="px-3 py-3.5 text-center">
                                    <Badge variant="outline" className="font-mono text-[10px] py-0">{r.codigoGestor}</Badge>
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono">
                                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">{formatCurrency(r.botMonto || 0)}</span>
                                    <span className="text-[10px] text-gray-400 ml-1">({r.botRecibos})</span>
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono">
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(r.cobranzaMonto || 0)}</span>
                                    <span className="text-[10px] text-gray-400 ml-1">({r.cobranzaRecibos})</span>
                                </td>
                                <td className="px-4 py-3.5 text-right font-mono">
                                    <span className="font-semibold text-purple-700 dark:text-purple-300">{formatCurrency(r.bancosGestorMonto || 0)}</span>
                                    <span className="text-[10px] text-gray-400 ml-1">({r.bancosGestorRecibos})</span>
                                </td>
                                <td className="px-3 py-3.5 text-center font-mono font-medium text-gray-600 dark:text-gray-400">
                                    {r.totalRecibos}
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/40 text-sm">
                                    {formatCurrency(r.totalMonto)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 font-black text-xs">
                        <tr>
                            <td colSpan={2} className="px-5 py-3.5 text-gray-900 dark:text-white">TOTAL CONSOLIDADO</td>
                            <td className="px-4 py-3.5 text-right font-mono text-indigo-700 dark:text-indigo-300">{formatCurrency(sumBot)}</td>
                            <td className="px-4 py-3.5 text-right font-mono text-emerald-700 dark:text-emerald-300">{formatCurrency(sumCobranza)}</td>
                            <td className="px-4 py-3.5 text-right font-mono text-purple-700 dark:text-purple-300">{formatCurrency(sumBancosGestor)}</td>
                            <td className="px-3 py-3.5 text-center font-mono text-gray-800 dark:text-white">{sumRecibos}</td>
                            <td className="px-5 py-3.5 text-right font-mono text-sm text-slate-950 dark:text-white bg-slate-200/60 dark:bg-slate-900/60">
                                {formatCurrency(sumTotal)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
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
                                    Conciliación de cobranza desglosada por canal (BANCOS BOT, COBRANZA GESTOR y BANCOS GESTOR).
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

                {/* 4 Tarjetas KPI de Canales de Cobranza */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Tarjeta 1: BANCOS BOT */}
                    <Card className="shadow-sm border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <div className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                <Bot className="w-4 h-4" /> BANCOS BOT
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono border-indigo-200 text-indigo-700">
                                {(data?.tablas?.bancosBot || []).reduce((a: number, c: any) => a + (c.cantidadPagos || 0), 0)} recibos
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black font-mono text-indigo-700 dark:text-indigo-300">
                                {formatCurrency(data?.totales?.totalBot || 0)}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Procesado por Bot WhatsApp (Cotejado en Bancos)
                            </p>
                        </CardContent>
                    </Card>

                    {/* Tarjeta 2: COBRANZA GESTOR */}
                    <Card className="shadow-sm border-emerald-100 dark:border-emerald-950 bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <div className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <Banknote className="w-4 h-4" /> COBRANZA GESTOR
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono border-emerald-200 text-emerald-700">
                                {(data?.tablas?.cobranzaGestor || []).reduce((a: number, c: any) => a + (c.cantidadPagos || 0), 0)} recibos
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                                {formatCurrency(data?.totales?.totalCobranza || 0)}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Efectivo físico cobrado en ruta de campo
                            </p>
                        </CardContent>
                    </Card>

                    {/* Tarjeta 3: BANCOS GESTOR */}
                    <Card className="shadow-sm border-purple-100 dark:border-purple-950 bg-gradient-to-br from-purple-50/40 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <div className="text-xs font-bold uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                <Smartphone className="w-4 h-4" /> BANCOS GESTOR
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono border-purple-200 text-purple-700">
                                {(data?.tablas?.bancosGestor || []).reduce((a: number, c: any) => a + (c.cantidadPagos || 0), 0)} recibos
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black font-mono text-purple-700 dark:text-purple-300">
                                {formatCurrency(data?.totales?.totalBancosGestor || 0)}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Captura manual en app móvil (sin bot)
                            </p>
                        </CardContent>
                    </Card>

                    {/* Tarjeta 4: TOTAL CONSOLIDADO */}
                    <Card className="shadow-md border-slate-800 bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                            <div className="text-xs font-bold uppercase text-indigo-300 flex items-center gap-1.5">
                                <Globe className="w-4 h-4" /> TOTAL CONSOLIDADO
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono border-indigo-400/30 text-indigo-200">
                                {(data?.tablas?.global || []).reduce((a: number, c: any) => a + (c.totalRecibos || 0), 0)} recibos
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black font-mono text-white tracking-tight">
                                {formatCurrency(data?.totales?.totalGeneral || data?.totalGeneral || 0)}
                            </div>
                            <p className="text-[11px] text-indigo-200/80 mt-1">
                                Suma total de los 3 canales de recaudación
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Bank Reconciliation Row (DQ, DP y Abonos sin asignar) */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                    <SummaryCard title="Resumen Semanal DQ (BANCOS BOT)" resumen={data?.resumenDQ} />
                    <SummaryCard title="Resumen Semanal DP (BANCOS BOT)" resumen={data?.resumenDP} />

                    <Card className="shadow-md border-gray-100 dark:border-slate-800 flex flex-col h-full bg-indigo-50/20 dark:bg-slate-800/30">
                        <CardHeader className="pb-2 border-b bg-gray-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <CardTitle className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">Otras Discrepancias Bancarias</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 flex-1">
                            <div>
                                <div className="flex justify-between items-center text-sm font-medium mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">Abonos sin asignar (Total Bancos):</span>
                                    <span className={`font-bold font-mono ${(data?.otrasDiscrepancias?.abonosSinAsignar?.ctas ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {data?.otrasDiscrepancias?.abonosSinAsignar?.ctas ?? 0} (Suma: {formatCurrency(data?.otrasDiscrepancias?.abonosSinAsignar?.monto || 0)})
                                    </span>
                                </div>
                                {data?.otrasDiscrepancias?.abonosSinAsignar?.bancos && (
                                    <div className="pt-1">
                                        {renderBancos(data.otrasDiscrepancias.abonosSinAsignar.bancos)}
                                    </div>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-400 italic leading-relaxed border-t pt-2">
                                * Los abonos sin asignar corresponden a movimientos en Santander / Banorte no vinculados a ningún ticket del Bot.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Desglose Multitabla con Tabs */}
                <Card className="border-gray-200 dark:border-slate-800 shadow-lg">
                    <CardHeader className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">Desglose de Cobranza por Canal y Gestor</CardTitle>
                            <CardDescription className="text-xs text-gray-400 mt-0.5">Consulta individual de BANCOS BOT, COBRANZA GESTOR, BANCOS GESTOR o la Matriz Global</CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExportarExcel}
                            disabled={loading || !data}
                            className="flex items-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold self-start sm:self-auto"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Excel (5 Hojas)
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <Tabs defaultValue="global" className="space-y-4">
                            <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
                                <TabsTrigger value="global" className="text-xs font-bold py-2 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>GLOBAL</span>
                                </TabsTrigger>
                                <TabsTrigger value="bancosBot" className="text-xs font-bold py-2 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>BANCOS BOT</span>
                                </TabsTrigger>
                                <TabsTrigger value="cobranzaGestor" className="text-xs font-bold py-2 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>COBRANZA GESTOR</span>
                                </TabsTrigger>
                                <TabsTrigger value="bancosGestor" className="text-xs font-bold py-2 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                    <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                                    <span>BANCOS GESTOR</span>
                                </TabsTrigger>
                            </TabsList>

                            {/* Tab 1: Global Consolidado */}
                            <TabsContent value="global" className="m-0 border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                {renderGlobalTable(data?.tablas?.global || [])}
                            </TabsContent>

                            {/* Tab 2: BANCOS BOT */}
                            <TabsContent value="bancosBot" className="m-0 border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                {renderSimpleTable(
                                    data?.tablas?.bancosBot || [], 
                                    "No hay cobros de BANCOS BOT registrados en este rango",
                                    "text-indigo-700 dark:text-indigo-300"
                                )}
                            </TabsContent>

                            {/* Tab 3: COBRANZA GESTOR */}
                            <TabsContent value="cobranzaGestor" className="m-0 border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                {renderSimpleTable(
                                    data?.tablas?.cobranzaGestor || [], 
                                    "No hay cobros en efectivo registrados en este rango",
                                    "text-emerald-700 dark:text-emerald-300"
                                )}
                            </TabsContent>

                            {/* Tab 4: BANCOS GESTOR */}
                            <TabsContent value="bancosGestor" className="m-0 border rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                {renderSimpleTable(
                                    data?.tablas?.bancosGestor || [], 
                                    "No hay cobros manuales de banco registrados en este rango",
                                    "text-purple-700 dark:text-purple-300"
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
