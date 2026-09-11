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
    Bot, Banknote, Smartphone, Globe, Eye, Filter,
    AlertTriangle, ArrowRight, ExternalLink, ShieldAlert, Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

    // Estado para Auditoría General ContPAQi vs ERP
    const [auditoriaData, setAuditoriaData] = useState<any>(null);
    const [loadingAuditoria, setLoadingAuditoria] = useState(false);
    const [filtroAuditoria, setFiltroAuditoria] = useState<'todos' | 'diferencias'>('todos');
    const [searchGestorAuditoria, setSearchGestorAuditoria] = useState('');
    const [selectedFilaDetalle, setSelectedFilaDetalle] = useState<any>(null);
    const [modalTab, setModalTab] = useState<'discrepancias' | 'erp' | 'contpaqi' | 'coincidentes'>('discrepancias');

    useEffect(() => {
        fetchCobradores();
    }, []);

    useEffect(() => {
        fetchCuadre();
        fetchAuditoria();
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

    const fetchAuditoria = async (start = dateStart, end = dateEnd) => {
        setLoadingAuditoria(true);
        try {
            const params = new URLSearchParams({ desde: start, hasta: end });
            const res = await fetch(`/api/tesoreria/cuadre/auditoria?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                setAuditoriaData(result);
            } else {
                console.warn("No se pudo cargar auditoría ContPAQi");
            }
        } catch (error) {
            console.error("Error al cargar auditoría ContPAQi", error);
        } finally {
            setLoadingAuditoria(false);
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

            // Hoja 6: Auditoría General ContPAQi vs ERP
            if (auditoriaData?.filas && auditoriaData.filas.length > 0) {
                const auditoriaRows = auditoriaData.filas.map((f: any) => ({
                    'Gestor': f.gestor,
                    'Nombre Gestor': f.nombreGestor,
                    'Empresa': f.empresa,
                    'Recibos ERP': f.erpCantidad,
                    'Total ERP ($)': f.erpTotal,
                    'Docs ContPAQi': f.contpaqiCantidad,
                    'Total ContPAQi ($)': f.contpaqiTotal,
                    'Diferencia ($)': f.diferencia,
                    'Estado': f.estado
                }));
                const wsAuditoria = XLSX.utils.json_to_sheet(auditoriaRows);
                XLSX.utils.book_append_sheet(wb, wsAuditoria, 'Auditoría ContPAQi');
            }

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

    // Render de tabla para Auditoría General ContPAQi vs ERP
    const renderAuditoriaContpaqiTable = () => {
        if (loadingAuditoria) {
            return (
                <div className="py-16 text-center text-gray-400">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-600" />
                    <p className="font-semibold text-sm text-gray-700 dark:text-gray-200">Consultando documentos en ContPAQi Comercial...</p>
                    <p className="text-xs text-gray-400 mt-1">Comparando pagos de ERP contra Concepto 101 (DP) y 102 (DQ)</p>
                </div>
            );
        }

        if (!auditoriaData || !auditoriaData.filas || auditoriaData.filas.length === 0) {
            return (
                <div className="py-16 text-center">
                    <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No se encontraron movimientos para el rango seleccionado</p>
                    <Button variant="outline" size="sm" onClick={() => fetchAuditoria()} className="mt-3 text-xs">
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reintentar Consulta
                    </Button>
                </div>
            );
        }

        const res = auditoriaData.resumen;
        const filasFiltradas = auditoriaData.filas.filter((f: any) => {
            if (filtroAuditoria === 'diferencias' && f.estado === 'CUADRADO') return false;
            if (searchGestorAuditoria.trim()) {
                const q = searchGestorAuditoria.toLowerCase();
                return f.gestor.toLowerCase().includes(q) || f.nombreGestor.toLowerCase().includes(q) || f.empresa.toLowerCase().includes(q);
            }
            return true;
        });

        return (
            <div className="space-y-4">
                {/* Header KPI de Auditoría */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Auditoría General en Vivo</span>
                                <Badge className={res?.cuadrado ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/30"}>
                                    {res?.cuadrado ? "✅ 100% CUADRADO" : `❌ ${res?.filasConDiferencia} DISCREPANCIAS`}
                                </Badge>
                            </div>
                            <h3 className="text-lg font-bold">
                                {formatCurrency(res?.granTotalERP || 0)} <span className="text-xs font-normal text-indigo-200">ERP ({res?.granCantERP} abonos)</span>
                                <span className="mx-2 text-indigo-400">vs</span>
                                {formatCurrency(res?.granTotalCP || 0)} <span className="text-xs font-normal text-indigo-200">ContPAQi ({res?.granCantCP} docs)</span>
                            </h3>
                            <div className="flex flex-wrap gap-4 text-xs text-indigo-200/90 pt-1">
                                <span><strong>Empresa DP:</strong> ERP {formatCurrency(res?.porEmpresa?.DP?.erpTotal || 0)} vs CP {formatCurrency(res?.porEmpresa?.DP?.contpaqiTotal || 0)} (Dif: {formatCurrency(res?.porEmpresa?.DP?.diferencia || 0)})</span>
                                <span><strong>Empresa DQ:</strong> ERP {formatCurrency(res?.porEmpresa?.DQ?.erpTotal || 0)} vs CP {formatCurrency(res?.porEmpresa?.DQ?.contpaqiTotal || 0)} (Dif: {formatCurrency(res?.porEmpresa?.DQ?.diferencia || 0)})</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start md:self-auto">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => fetchAuditoria()}
                                disabled={loadingAuditoria}
                                className="h-8 text-xs font-semibold gap-1.5"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loadingAuditoria ? 'animate-spin' : ''}`} />
                                Actualizar ContPAQi
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Nota Contable aclaratoria de Moratorios */}
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                        <span className="font-bold">Regla Contable de Cobranza:</span> Esta auditoría compara los abonos a cuota regular contra los conceptos <strong>101 (DP)</strong> y <strong>102 (DQ)</strong> de ContPAQi Comercial. Los <strong>intereses moratorios</strong> se procesan por separado en ContPAQi mediante su concepto independiente (<code>PC INTERES MORATORIO</code> con Nota de Cargo) y no forman parte de este corte de abonos a capital.
                    </div>
                </div>

                {/* Filtros de la Tabla */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                        <div className="relative w-64">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                            <Input
                                placeholder="Filtrar por gestor o código..."
                                value={searchGestorAuditoria}
                                onChange={(e) => setSearchGestorAuditoria(e.target.value)}
                                className="h-8 text-xs pl-8"
                            />
                        </div>
                        {searchGestorAuditoria && (
                            <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => setSearchGestorAuditoria('')}>
                                Limpiar
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant={filtroAuditoria === 'todos' ? 'default' : 'outline'}
                            onClick={() => setFiltroAuditoria('todos')}
                            className="h-7 text-xs"
                        >
                            Todos ({auditoriaData.filas.length})
                        </Button>
                        <Button
                            size="sm"
                            variant={filtroAuditoria === 'diferencias' ? 'destructive' : 'outline'}
                            onClick={() => setFiltroAuditoria('diferencias')}
                            className="h-7 text-xs"
                        >
                            <AlertCircle className="w-3.5 h-3.5 mr-1" />
                            Solo Diferencias ({res?.filasConDiferencia || 0})
                        </Button>
                    </div>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-xs text-left align-middle">
                        <thead className="bg-gray-100/70 dark:bg-slate-800 font-bold text-gray-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b">
                            <tr>
                                <th className="px-5 py-3.5">Gestor / Cobrador</th>
                                <th className="px-3 py-3.5 text-center">Empresa</th>
                                <th className="px-4 py-3.5 text-right text-indigo-700 dark:text-indigo-400">Recibos ERP</th>
                                <th className="px-4 py-3.5 text-right text-indigo-700 dark:text-indigo-400">Total ERP</th>
                                <th className="px-4 py-3.5 text-right text-emerald-700 dark:text-emerald-400">Docs ContPAQi</th>
                                <th className="px-4 py-3.5 text-right text-emerald-700 dark:text-emerald-400">Total ContPAQi</th>
                                <th className="px-4 py-3.5 text-right">Diferencia</th>
                                <th className="px-3 py-3.5 text-center">Estado</th>
                                <th className="px-3 py-3.5 text-center">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {filasFiltradas.map((f: any, idx: number) => {
                                const isCuadrado = f.estado === 'CUADRADO';
                                return (
                                    <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!isCuadrado ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}`}>
                                        <td className="px-5 py-3 font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                                            <div className="h-6 w-6 rounded bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                                                {f.gestor.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <span>{f.gestor}</span>
                                                {f.nombreGestor && f.nombreGestor !== f.gestor && (
                                                    <span className="block text-[10px] font-normal text-gray-400">{f.nombreGestor}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Badge variant="outline" className={`font-mono text-[10px] py-0 ${f.empresa === 'DP' ? 'border-sky-300 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30' : 'border-purple-300 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30'}`}>
                                                {f.empresa}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300 font-medium">
                                            {f.erpCantidad}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300">
                                            {formatCurrency(f.erpTotal)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300 font-medium">
                                            {f.contpaqiCantidad}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                            {formatCurrency(f.contpaqiTotal)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-black">
                                            <span className={isCuadrado ? 'text-emerald-600' : 'text-rose-600 font-black text-sm'}>
                                                {formatCurrency(f.diferencia)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Badge className={`text-[10px] py-0.5 font-bold ${isCuadrado ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300'}`}>
                                                {isCuadrado ? '✅ CUADRADO' : `❌ DIF ${formatCurrency(f.diferencia)}`}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0"
                                                onClick={() => {
                                                    setSelectedFilaDetalle(f);
                                                    setModalTab(f.estado === 'CUADRADO' ? 'erp' : 'discrepancias');
                                                }}
                                                title="Ver recibos y documentos de este gestor"
                                            >
                                                <Eye className="w-3.5 h-3.5 text-gray-500 hover:text-indigo-600" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 font-black text-xs">
                            <tr>
                                <td colSpan={2} className="px-5 py-3 text-gray-900 dark:text-white">TOTAL CONSOLIDADO</td>
                                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">{res?.granCantERP || 0}</td>
                                <td className="px-4 py-3 text-right font-mono text-indigo-700 dark:text-indigo-300 font-black">{formatCurrency(res?.granTotalERP || 0)}</td>
                                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">{res?.granCantCP || 0}</td>
                                <td className="px-4 py-3 text-right font-mono text-emerald-700 dark:text-emerald-300 font-black">{formatCurrency(res?.granTotalCP || 0)}</td>
                                <td className="px-4 py-3 text-right font-mono font-black text-sm">
                                    <span className={res?.cuadrado ? 'text-emerald-600' : 'text-rose-600'}>
                                        {formatCurrency(res?.granDiferencia || 0)}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <Badge className={res?.cuadrado ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}>
                                        {res?.cuadrado ? '✅ 100% OK' : '❌ DESCUADRE'}
                                    </Badge>
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {res?.contpaqiDirectos?.cantidad > 0 && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
                        ℹ️ <strong>Capturas Directas en ContPAQi (sin ERP):</strong> Se detectaron {res.contpaqiDirectos.cantidad} documentos por un total de {formatCurrency(res.contpaqiDirectos.total)} registrados en ContPAQi por gestores de oficina/directos que no operan en el ERP (excluidos de este cuadre de ruta).
                    </div>
                )}
            </div>
        );
    };

    // Render de pestaña centralizada de Discrepancias
    const renderDiscrepanciasTab = () => {
        if (loading || loadingAuditoria) {
            return (
                <div className="py-16 text-center text-gray-400">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-rose-600" />
                    <p className="font-semibold text-sm text-gray-700 dark:text-gray-200">Analizando discrepancias comerciales y bancarias...</p>
                    <p className="text-xs text-gray-400 mt-1">Cruzando movimientos de ERP, ContPAQi Comercial y Bancos</p>
                </div>
            );
        }

        const gestoresConDiferencia = auditoriaData?.filas?.filter((f: any) => f.estado !== 'CUADRADO') || [];
        const ticketsDQ = data?.resumenDQ?.ticketsSinConciliarItems || [];
        const ticketsDP = data?.resumenDP?.ticketsSinConciliarItems || [];
        const allTicketsSinConciliar = [...ticketsDQ, ...ticketsDP];
        const abonosSinAsignar = data?.otrasDiscrepancias?.abonosSinAsignar?.items || [];

        const totalIncidentes = gestoresConDiferencia.length + (allTicketsSinConciliar.length > 0 ? 1 : 0) + (abonosSinAsignar.length > 0 ? 1 : 0);

        return (
            <div className="space-y-6">
                {/* Resumen Superior de Estado de Discrepancias */}
                <div className={`p-4 rounded-xl border ${totalIncidentes === 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${totalIncidentes === 0 ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600'}`}>
                                {totalIncidentes === 0 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {totalIncidentes === 0 
                                        ? "Auditoría en Orden: 0 Discrepancias Detectadas" 
                                        : `Atención Requerida: ${gestoresConDiferencia.length} Descuadres de Gestores y ${allTicketsSinConciliar.length + abonosSinAsignar.length} Incidentes Bancarios`}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {totalIncidentes === 0 
                                        ? "Todos los cobros de ERP están registrados con exactitud en ContPAQi y los depósitos bancarios están conciliados."
                                        : "A continuación se desglosan con precisión los códigos de cliente, folios y montos que difieren entre los sistemas."}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={`text-xs px-2.5 py-1 ${gestoresConDiferencia.length > 0 ? 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40' : 'border-emerald-300 text-emerald-700 bg-emerald-50'}`}>
                                👨‍💼 Gestores Descuadrados: {gestoresConDiferencia.length}
                            </Badge>
                            <Badge variant="outline" className={`text-xs px-2.5 py-1 ${allTicketsSinConciliar.length > 0 ? 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40' : 'border-emerald-300 text-emerald-700 bg-emerald-50'}`}>
                                🤖 Tickets sin Banco: {allTicketsSinConciliar.length}
                            </Badge>
                            <Badge variant="outline" className={`text-xs px-2.5 py-1 ${abonosSinAsignar.length > 0 ? 'border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40' : 'border-emerald-300 text-emerald-700 bg-emerald-50'}`}>
                                🏦 Abonos sin Asignar: {abonosSinAsignar.length}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* BLOQUE 1: DISCREPANCIAS ERP VS CONTPAQI POR GESTOR */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-600" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                                1. Códigos con Discrepancia: ERP vs ContPAQi Comercial
                            </h4>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                            {gestoresConDiferencia.length} gestores con diferencia en este periodo
                        </span>
                    </div>

                    {gestoresConDiferencia.length === 0 ? (
                        <div className="p-6 text-center border rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">¡Conciliación Comercial Perfecta!</p>
                            <p className="text-xs text-gray-400 mt-0.5">Todos los recibos de los gestores en el ERP coinciden al 100% con los conceptos 101 y 102 en ContPAQi Comercial.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {gestoresConDiferencia.map((f: any, idx: number) => {
                                const disc = f.discrepancias || {};
                                const soloERP = disc.soloEnERP || [];
                                const soloCP = disc.soloEnContPAQi || [];
                                const difMonto = disc.diferenciasMonto || [];

                                return (
                                    <div key={idx} className="border border-rose-200 dark:border-rose-900/60 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                                        {/* Header del Gestor */}
                                        <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                                                    {f.gestor.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm text-gray-900 dark:text-white">{f.gestor}</span>
                                                        <Badge variant="outline" className={`text-[10px] py-0 ${f.empresa === 'DP' ? 'border-sky-300 text-sky-700' : 'border-purple-300 text-purple-700'}`}>
                                                            {f.empresa}
                                                        </Badge>
                                                        {f.nombreGestor && f.nombreGestor !== f.gestor && (
                                                            <span className="text-xs text-gray-500">({f.nombreGestor})</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        ERP: <strong className="text-indigo-700 font-mono">{formatCurrency(f.erpTotal)}</strong> ({f.erpCantidad} recibos) vs 
                                                        ContPAQi: <strong className="text-emerald-700 font-mono">{formatCurrency(f.contpaqiTotal)}</strong> ({f.contpaqiCantidad} docs)
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 self-end sm:self-auto">
                                                <div className="text-right">
                                                    <div className="text-[10px] uppercase font-bold text-gray-400">Diferencia Neta</div>
                                                    <div className="text-sm font-black font-mono text-rose-600">
                                                        {formatCurrency(f.diferencia)}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedFilaDetalle(f);
                                                        setModalTab('discrepancias');
                                                    }}
                                                    className="h-8 text-xs gap-1.5 border-rose-300 hover:bg-rose-100 text-rose-800 dark:text-rose-300"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Inspeccionar Códigos
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Detalle Inmediato de Códigos Causantes */}
                                        <div className="p-4 space-y-4">
                                            {/* Subsección: Falta en ContPAQi */}
                                            {soloERP.length > 0 && (
                                                <div className="border border-rose-100 dark:border-rose-900/40 rounded-lg p-3 bg-rose-50/20 dark:bg-rose-950/10 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                                                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                                            Cobrados en ERP que FALTAN en ContPAQi ({soloERP.length} cliente{soloERP.length > 1 ? 's' : ''}):
                                                        </span>
                                                        <span className="text-xs font-bold font-mono text-rose-700">
                                                            Suma: {formatCurrency(soloERP.reduce((acc: number, c: any) => acc + c.totalERP, 0))}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                                                        {soloERP.map((item: any, i: number) => (
                                                            <div key={i} className="p-2 rounded border bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-900/50 flex justify-between items-center text-xs">
                                                                <div>
                                                                    <div className="font-mono font-bold text-rose-600">{item.cliente}</div>
                                                                    <div className="text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[170px]" title={item.nombreCliente}>
                                                                        {item.nombreCliente}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        Folio: {item.pagos?.[0]?.folioTicket || item.pagos?.[0]?.concepto || 'Sin folio'}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-mono font-bold text-gray-900 dark:text-white">
                                                                        {formatCurrency(item.totalERP)}
                                                                    </div>
                                                                    <Badge variant="outline" className="text-[9px] py-0 border-rose-300 text-rose-600">
                                                                        No en CP
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subsección: Falta en ERP */}
                                            {soloCP.length > 0 && (
                                                <div className="border border-amber-100 dark:border-amber-900/40 rounded-lg p-3 bg-amber-50/20 dark:bg-amber-950/10 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                                                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                                            Capturados en ContPAQi que FALTAN en ERP ({soloCP.length} cliente{soloCP.length > 1 ? 's' : ''}):
                                                        </span>
                                                        <span className="text-xs font-bold font-mono text-amber-800">
                                                            Suma: {formatCurrency(soloCP.reduce((acc: number, c: any) => acc + c.totalContpaqi, 0))}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                                                        {soloCP.map((item: any, i: number) => (
                                                            <div key={i} className="p-2 rounded border bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-900/50 flex justify-between items-center text-xs">
                                                                <div>
                                                                    <div className="font-mono font-bold text-amber-700">{item.cliente}</div>
                                                                    <div className="text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[170px]" title={item.razonSocial}>
                                                                        {item.razonSocial}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        Folio CP: {item.docs?.[0]?.folio || item.docs?.[0]?.id}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-mono font-bold text-gray-900 dark:text-white">
                                                                        {formatCurrency(item.totalContpaqi)}
                                                                    </div>
                                                                    <Badge variant="outline" className="text-[9px] py-0 border-amber-300 text-amber-700">
                                                                        No en ERP
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subsección: Diferencias en Importe */}
                                            {difMonto.length > 0 && (
                                                <div className="border border-orange-100 dark:border-orange-900/40 rounded-lg p-3 bg-orange-50/20 dark:bg-orange-950/10 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-orange-800 dark:text-orange-400 flex items-center gap-1.5">
                                                            <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                                                            Mismo cliente pero con IMPORTE DIFERENTE ({difMonto.length} caso{difMonto.length > 1 ? 's' : ''}):
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                                                        {difMonto.map((item: any, i: number) => (
                                                            <div key={i} className="p-2 rounded border bg-white dark:bg-slate-800 border-orange-200 dark:border-orange-900/50 flex justify-between items-center text-xs">
                                                                <div>
                                                                    <div className="font-mono font-bold text-orange-700">{item.cliente}</div>
                                                                    <div className="text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[170px]">
                                                                        {item.nombreCliente}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        ERP: {formatCurrency(item.totalERP)} | CP: {formatCurrency(item.totalContpaqi)}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-mono font-bold text-orange-600">
                                                                        Dif: {formatCurrency(item.diferencia)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* BLOQUE 2: TICKETS DEL BOT SIN CONCILIAR */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-indigo-600" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                                2. Tickets WhatsApp sin Depósito Bancario Emparejado (BANCOS BOT)
                            </h4>
                        </div>
                        <Badge variant="outline" className={`text-xs ${allTicketsSinConciliar.length > 0 ? 'border-amber-400 text-amber-700 bg-amber-50' : 'border-emerald-400 text-emerald-700 bg-emerald-50'}`}>
                            {allTicketsSinConciliar.length} tickets pendientes
                        </Badge>
                    </div>

                    {allTicketsSinConciliar.length === 0 ? (
                        <div className="p-5 text-center border rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No hay tickets del Bot pendientes de conciliar con bancos.</p>
                        </div>
                    ) : (
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-xs text-left align-middle">
                                <thead className="bg-gray-100/70 dark:bg-slate-800 font-bold text-gray-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b">
                                    <tr>
                                        <th className="px-4 py-2.5">Folio Ticket</th>
                                        <th className="px-3 py-2.5 text-center">Empresa</th>
                                        <th className="px-4 py-2.5">Cliente</th>
                                        <th className="px-4 py-2.5">Gestor</th>
                                        <th className="px-4 py-2.5">Fecha</th>
                                        <th className="px-4 py-2.5 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {allTicketsSinConciliar.map((t: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-2 font-mono font-bold text-indigo-600">
                                                {t.folio || `#${t.id}`}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <Badge variant="outline" className="font-mono text-[9px] py-0">{t.empresa}</Badge>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="font-mono font-semibold text-gray-800 dark:text-gray-200">{t.clienteCodigo}</div>
                                                <div className="text-[10px] text-gray-400 truncate max-w-[200px]">{t.clienteNombre}</div>
                                            </td>
                                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{t.gestor}</td>
                                            <td className="px-4 py-2 text-gray-400">{t.fecha ? new Date(t.fecha).toISOString().slice(0, 10) : '-'}</td>
                                            <td className="px-4 py-2 text-right font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(t.monto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* BLOQUE 3: ABONOS BANCARIOS SIN ASIGNAR */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-purple-600" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                                3. Depósitos en Bancos no Asignados a Ningún Ticket
                            </h4>
                        </div>
                        <Badge variant="outline" className={`text-xs ${abonosSinAsignar.length > 0 ? 'border-purple-400 text-purple-700 bg-purple-50' : 'border-emerald-400 text-emerald-700 bg-emerald-50'}`}>
                            {abonosSinAsignar.length} depósitos huérfanos
                        </Badge>
                    </div>

                    {abonosSinAsignar.length === 0 ? (
                        <div className="p-5 text-center border rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No se encontraron abonos bancarios sin identificar.</p>
                        </div>
                    ) : (
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-xs text-left align-middle">
                                <thead className="bg-gray-100/70 dark:bg-slate-800 font-bold text-gray-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b">
                                    <tr>
                                        <th className="px-4 py-2.5">Fecha Operación</th>
                                        <th className="px-4 py-2.5">Banco / Cuenta</th>
                                        <th className="px-4 py-2.5">Concepto / Descripción</th>
                                        <th className="px-4 py-2.5">Referencia</th>
                                        <th className="px-4 py-2.5 text-right">Monto Abono</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {abonosSinAsignar.map((a: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-2 text-gray-500">{a.fecha ? new Date(a.fecha).toISOString().slice(0, 10) : '-'}</td>
                                            <td className="px-4 py-2 font-mono">
                                                <span className="font-bold text-gray-800 dark:text-gray-200">{a.banco}</span>
                                                <span className="text-[10px] text-gray-400 ml-1">({a.cuenta})</span>
                                            </td>
                                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{a.concepto || '-'}</td>
                                            <td className="px-4 py-2 font-mono text-gray-400">{a.referencia || '-'}</td>
                                            <td className="px-4 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(a.abono)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
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
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Exportar Excel (6 Hojas)
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <Tabs defaultValue="global" className="space-y-4">
                            <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
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
                                <TabsTrigger value="auditoriaContpaqi" className="text-xs font-bold py-2 gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                                    <span>AUDITORÍA CONTPAQI</span>
                                    {auditoriaData?.resumen && (
                                        <Badge variant="outline" className={`text-[9px] py-0 px-1 font-mono ${auditoriaData.resumen.cuadrado ? 'border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'border-rose-400 text-rose-600 bg-rose-50 dark:bg-rose-950/30'}`}>
                                            {auditoriaData.resumen.cuadrado ? '100%' : `${auditoriaData.resumen.filasConDiferencia} dif`}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="discrepancias" className="text-xs font-bold py-2 gap-1.5 data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>DISCREPANCIAS</span>
                                    {((auditoriaData?.resumen?.filasConDiferencia || 0) + ((data?.resumenDQ?.ticketsSinConciliar?.ctas || 0) > 0 ? 1 : 0) + ((data?.resumenDP?.ticketsSinConciliar?.ctas || 0) > 0 ? 1 : 0) + ((data?.otrasDiscrepancias?.abonosSinAsignar?.ctas || 0) > 0 ? 1 : 0)) > 0 ? (
                                        <Badge className="text-[9px] py-0 px-1.5 bg-rose-700 text-white font-mono border-0">
                                            {(auditoriaData?.resumen?.filasConDiferencia || 0) + ((data?.resumenDQ?.ticketsSinConciliar?.ctas || 0) > 0 ? 1 : 0) + ((data?.resumenDP?.ticketsSinConciliar?.ctas || 0) > 0 ? 1 : 0) + ((data?.otrasDiscrepancias?.abonosSinAsignar?.ctas || 0) > 0 ? 1 : 0)}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-400 text-emerald-600 bg-emerald-50 font-mono">
                                            0
                                        </Badge>
                                    )}
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

                            {/* Tab 5: AUDITORÍA GENERAL CONTPAQI VS ERP */}
                            <TabsContent value="auditoriaContpaqi" className="m-0 border rounded-xl overflow-hidden bg-white dark:bg-slate-900 p-4">
                                {renderAuditoriaContpaqiTable()}
                            </TabsContent>

                            {/* Tab 6: DISCREPANCIAS CENTRALIZADAS */}
                            <TabsContent value="discrepancias" className="m-0 border rounded-xl overflow-hidden bg-white dark:bg-slate-900 p-4">
                                {renderDiscrepanciasTab()}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Modal de Detalle de Documentos para Gestor Seleccionado */}
                {selectedFilaDetalle && (
                    <Dialog open={!!selectedFilaDetalle} onOpenChange={(open) => !open && setSelectedFilaDetalle(null)}>
                        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-base">
                                    <span>Detalle de Cobranza: <strong>{selectedFilaDetalle.gestor}</strong> ({selectedFilaDetalle.empresa})</span>
                                    <Badge className={selectedFilaDetalle.estado === 'CUADRADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>
                                        {selectedFilaDetalle.estado}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    {selectedFilaDetalle.erpCantidad} recibos en ERP ({formatCurrency(selectedFilaDetalle.erpTotal)}) vs {selectedFilaDetalle.contpaqiCantidad} documentos en ContPAQi ({formatCurrency(selectedFilaDetalle.contpaqiTotal)})
                                    {selectedFilaDetalle.diferencia !== 0 && (
                                        <span className="font-bold text-rose-600 ml-2">Diferencia: {formatCurrency(selectedFilaDetalle.diferencia)}</span>
                                    )}
                                </DialogDescription>
                            </DialogHeader>

                            {/* Selector de sub-tabs en el modal */}
                            <div className="flex flex-wrap gap-1.5 border-b pb-2 pt-1">
                                <Button
                                    size="sm"
                                    variant={modalTab === 'discrepancias' ? 'default' : 'outline'}
                                    onClick={() => setModalTab('discrepancias')}
                                    className={`h-7 text-xs ${modalTab === 'discrepancias' && (selectedFilaDetalle.discrepancias?.totalDiscrepancias || 0) > 0 ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}`}
                                >
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Solo Discrepancias ({selectedFilaDetalle.discrepancias?.totalDiscrepancias || 0})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={modalTab === 'erp' ? 'default' : 'outline'}
                                    onClick={() => setModalTab('erp')}
                                    className="h-7 text-xs"
                                >
                                    Recibos ERP ({selectedFilaDetalle.pagosERP?.length || 0})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={modalTab === 'contpaqi' ? 'default' : 'outline'}
                                    onClick={() => setModalTab('contpaqi')}
                                    className="h-7 text-xs"
                                >
                                    Docs ContPAQi ({selectedFilaDetalle.docsContpaqi?.length || 0})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={modalTab === 'coincidentes' ? 'default' : 'outline'}
                                    onClick={() => setModalTab('coincidentes')}
                                    className="h-7 text-xs"
                                >
                                    <Check className="w-3 h-3 mr-1 text-emerald-600" />
                                    Coincidentes ({selectedFilaDetalle.discrepancias?.coincidentes?.length || 0})
                                </Button>
                            </div>

                            {/* Contenido de pestaña Discrepancias */}
                            {modalTab === 'discrepancias' && (
                                <div className="space-y-3 pt-2">
                                    {(selectedFilaDetalle.discrepancias?.totalDiscrepancias || 0) === 0 ? (
                                        <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                                            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                            <p className="font-bold text-sm text-emerald-800 dark:text-emerald-200">¡Sin discrepancias!</p>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">Todos los cobros de {selectedFilaDetalle.gestor} coinciden exactamente con ContPAQi Comercial.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Solo en ERP */}
                                            {(selectedFilaDetalle.discrepancias?.soloEnERP || []).length > 0 && (
                                                <div className="border border-rose-200 dark:border-rose-900 rounded-lg p-3 bg-rose-50/30 dark:bg-rose-950/20 space-y-2">
                                                    <div className="flex justify-between items-center text-xs font-bold text-rose-700 dark:text-rose-300">
                                                        <span>🔴 FALTAN EN CONTPAQI (Cobrados en ERP pero no capturados en ContPAQi)</span>
                                                        <Badge variant="outline" className="border-rose-400 text-rose-600 bg-white">
                                                            {selectedFilaDetalle.discrepancias.soloEnERP.length} cliente(s)
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                                                        {selectedFilaDetalle.discrepancias.soloEnERP.map((item: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center p-2 rounded bg-white dark:bg-slate-800 border border-rose-100 dark:border-rose-900/50">
                                                                <div>
                                                                    <span className="font-mono font-bold text-rose-600 mr-2">{item.cliente}</span>
                                                                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.nombreCliente}</span>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        {item.pagos?.length} pago(s) ERP | Folio: {item.pagos?.[0]?.folioTicket || item.pagos?.[0]?.concepto || 'Sin folio'}
                                                                    </div>
                                                                </div>
                                                                <span className="font-mono font-bold text-rose-600">{formatCurrency(item.totalERP)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Solo en ContPAQi */}
                                            {(selectedFilaDetalle.discrepancias?.soloEnContPAQi || []).length > 0 && (
                                                <div className="border border-amber-200 dark:border-amber-900 rounded-lg p-3 bg-amber-50/30 dark:bg-amber-950/20 space-y-2">
                                                    <div className="flex justify-between items-center text-xs font-bold text-amber-800 dark:text-amber-300">
                                                        <span>🟡 FALTAN EN ERP (Capturados en ContPAQi pero no registrados en ERP)</span>
                                                        <Badge variant="outline" className="border-amber-400 text-amber-700 bg-white">
                                                            {selectedFilaDetalle.discrepancias.soloEnContPAQi.length} documento(s)
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                                                        {selectedFilaDetalle.discrepancias.soloEnContPAQi.map((item: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center p-2 rounded bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-900/50">
                                                                <div>
                                                                    <span className="font-mono font-bold text-amber-700 mr-2">{item.cliente}</span>
                                                                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.razonSocial}</span>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        Folio ContPAQi: {item.docs?.[0]?.folio || item.docs?.[0]?.id}
                                                                    </div>
                                                                </div>
                                                                <span className="font-mono font-bold text-amber-700">{formatCurrency(item.totalContpaqi)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Diferencias en Monto */}
                                            {(selectedFilaDetalle.discrepancias?.diferenciasMonto || []).length > 0 && (
                                                <div className="border border-orange-200 dark:border-orange-900 rounded-lg p-3 bg-orange-50/30 dark:bg-orange-950/20 space-y-2">
                                                    <div className="flex justify-between items-center text-xs font-bold text-orange-800 dark:text-orange-300">
                                                        <span>🟠 DIFERENCIA DE IMPORTE (Mismo cliente con montos dispares)</span>
                                                        <Badge variant="outline" className="border-orange-400 text-orange-700 bg-white">
                                                            {selectedFilaDetalle.discrepancias.diferenciasMonto.length} cliente(s)
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                                                        {selectedFilaDetalle.discrepancias.diferenciasMonto.map((item: any, i: number) => (
                                                            <div key={i} className="flex justify-between items-center p-2 rounded bg-white dark:bg-slate-800 border border-orange-100 dark:border-orange-900/50">
                                                                <div>
                                                                    <span className="font-mono font-bold text-orange-700 mr-2">{item.cliente}</span>
                                                                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.nombreCliente}</span>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        ERP: {formatCurrency(item.totalERP)} ({item.cantidadERP} pagos) | CP: {formatCurrency(item.totalContpaqi)} ({item.cantidadContpaqi} docs)
                                                                    </div>
                                                                </div>
                                                                <div className="text-right font-mono font-bold text-orange-600">
                                                                    Dif: {formatCurrency(item.diferencia)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Contenido pestaña ERP */}
                            {modalTab === 'erp' && (
                                <div className="border rounded-lg p-3 space-y-2 pt-2">
                                    <div className="flex justify-between items-center border-b pb-2">
                                        <span className="font-bold text-xs text-indigo-700 dark:text-indigo-400">Recibos ERP ({selectedFilaDetalle.pagosERP?.length || 0})</span>
                                        <span className="font-mono text-xs font-bold text-indigo-700">{formatCurrency(selectedFilaDetalle.erpTotal)}</span>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto space-y-1.5 text-xs">
                                        {(selectedFilaDetalle.pagosERP || []).map((p: any) => (
                                            <div key={p.id} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-800 border">
                                                <div>
                                                    <div className="font-mono font-bold text-gray-800 dark:text-gray-200">{p.cliente}</div>
                                                    <div className="text-[10px] text-gray-500 truncate max-w-[280px]">{p.nombreCliente}</div>
                                                    <div className="text-[10px] text-gray-400">{p.fecha ? new Date(p.fecha).toISOString().slice(0, 10) : ''} | {p.folioTicket || p.concepto || 'Sin folio'}</div>
                                                </div>
                                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-300">{formatCurrency(p.monto)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Contenido pestaña ContPAQi */}
                            {modalTab === 'contpaqi' && (
                                <div className="border rounded-lg p-3 space-y-2 pt-2">
                                    <div className="flex justify-between items-center border-b pb-2">
                                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">Documentos ContPAQi ({selectedFilaDetalle.docsContpaqi?.length || 0})</span>
                                        <span className="font-mono text-xs font-bold text-emerald-700">{formatCurrency(selectedFilaDetalle.contpaqiTotal)}</span>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto space-y-1.5 text-xs">
                                        {(selectedFilaDetalle.docsContpaqi || []).map((d: any) => (
                                            <div key={d.id} className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-800 border">
                                                <div>
                                                    <div className="font-mono font-bold text-gray-800 dark:text-gray-200">Folio: {d.folio}</div>
                                                    <div className="text-[10px] text-gray-500 truncate max-w-[280px]">{d.cliente} - {d.razonSocial}</div>
                                                    <div className="text-[10px] text-gray-400">{d.fecha ? new Date(d.fecha).toISOString().slice(0, 10) : ''} | Doc #{d.id}</div>
                                                </div>
                                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-300">{formatCurrency(d.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Contenido pestaña Coincidentes */}
                            {modalTab === 'coincidentes' && (
                                <div className="border rounded-lg p-3 space-y-2 pt-2">
                                    <div className="flex justify-between items-center border-b pb-2">
                                        <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">Clientes Coincidentes ({selectedFilaDetalle.discrepancias?.coincidentes?.length || 0})</span>
                                        <span className="text-xs text-gray-400">Cuadrados al 100%</span>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto space-y-1.5 text-xs">
                                        {(selectedFilaDetalle.discrepancias?.coincidentes || []).map((c: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center p-2 rounded bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                                                <div>
                                                    <span className="font-mono font-bold text-gray-900 dark:text-white mr-2">{c.cliente}</span>
                                                    <span className="text-[10px] text-gray-400">({c.cantidadERP} recibos en ERP = {c.cantidadContpaqi} docs en ContPAQi)</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-emerald-600">{formatCurrency(c.total)}</span>
                                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </DashboardLayout>
    );
}
