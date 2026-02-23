
'use client';

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Users as UsersIcon, Calendar as CalendarIcon, DollarSign, Download, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function CuadrePage() {
    const [dateStart, setDateStart] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - (d.getDay() + 1) % 7); // Last Saturday
        return d.toISOString().split('T')[0];
    });
    const [dateEnd, setDateEnd] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedGestor, setSelectedGestor] = useState<string>("all");
    const [gestoresList, setGestoresList] = useState<any[]>([]);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCobradores();
    }, []);

    useEffect(() => {
        fetchCuadre();
    }, [dateStart, dateEnd, selectedGestor]);

    const fetchCobradores = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const users = await res.json();
                setGestoresList(users.filter((u: any) => u.role === 'cobrador'));
            }
        } catch (error) { }
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
            }
        } catch (error) {
            console.error("Error al obtener cuadre", error);
            toast.error("Error al cargar datos de cuadre");
        } finally {
            setLoading(false);
        }
    };

    const SummaryCard = ({ title, resumen }: { title: string, resumen: any }) => {
        if (!resumen) return null;

        return (
            <Card className="shadow-md border-gray-100 h-full">
                <CardHeader className="pb-2 border-b bg-gray-50/50">
                    <CardTitle className="text-sm font-bold uppercase tracking-wide text-gray-700">{title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    {/* Actual Section */}
                    <div>
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="font-semibold text-gray-600">ACTUAL:</span>
                            <span className="font-mono">
                                <span className="text-gray-400 mr-2">CTAS {resumen.actual.ctas}</span>
                                <span className="text-green-600 font-bold">{formatCurrency(resumen.actual.monto)}</span>
                            </span>
                        </div>
                        {Object.entries(resumen.actual.bancos || {}).map(([banco, info]: [string, any]) => (
                            <div key={banco} className="flex justify-between items-center text-xs text-gray-500 pl-4 py-0.5">
                                <span>» {banco}:</span>
                                <span>
                                    <span className="mr-2">CTAS {info.ctas}</span>
                                    <span>{formatCurrency(info.monto)}</span>
                                </span>
                            </div>
                        ))}
                    </div>

                    <Separator className="opacity-50" />

                    {/* Anterior Section */}
                    <div>
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="font-semibold text-gray-600">ANTERIOR:</span>
                            <span className="font-mono">
                                <span className="text-gray-400 mr-2">CTAS {resumen.anterior.ctas}</span>
                                <span className="text-green-600 font-bold">{formatCurrency(resumen.anterior.monto)}</span>
                            </span>
                        </div>
                        {Object.entries(resumen.anterior.bancos || {}).map(([banco, info]: [string, any]) => (
                            <div key={banco} className="flex justify-between items-center text-xs text-gray-500 pl-4 py-0.5">
                                <span>» {banco}:</span>
                                <span>
                                    <span className="mr-2">CTAS {info.ctas}</span>
                                    <span>{formatCurrency(info.monto)}</span>
                                </span>
                            </div>
                        ))}
                    </div>

                    <Separator className="h-0.5 bg-gray-900" />

                    {/* Totals */}
                    <div className="flex justify-between items-center text-base font-black">
                        <span className="text-gray-900">TOTAL {title.includes('DQ') ? 'DQ' : 'DP'}:</span>
                        <span className="font-mono">
                            <span className="text-gray-400 mr-3 text-sm font-medium">CTAS {resumen.total.ctas}</span>
                            <span>{formatCurrency(resumen.total.monto)}</span>
                        </span>
                    </div>

                    {/* Discrepancies */}
                    <div className="pt-2">
                        <div className={`flex justify-between items-center text-sm font-bold ${resumen.discrepancia.monto !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                            <span>Discrepancia:</span>
                            <span className="font-mono">
                                <span className="mr-2">CTAS {resumen.discrepancia.ctas}</span>
                                <span>{formatCurrency(resumen.discrepancia.monto)}</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-red-500 mt-1">
                            <span>Tickets sin conciliar:</span>
                            <span className="font-semibold">
                                {resumen.ticketsSinConciliar.ctas} (Suma: {formatCurrency(resumen.ticketsSinConciliar.monto)})
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header with Filters */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-end gap-6">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-500">Gestor</label>
                            <Select value={selectedGestor} onValueChange={setSelectedGestor}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="-- Todos los Gestores --" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">-- Todos los Gestores --</SelectItem>
                                    {gestoresList.map(g => (
                                        <SelectItem key={g.id} value={g.id}>{g.codigoGestor || g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-500">Fecha Inicio</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="pl-10" />
                            </div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold uppercase text-gray-500">Fecha Fin</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="pl-10" />
                            </div>
                        </div>
                        <Button onClick={fetchCuadre} className="lg:w-32 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                            <Search className="w-4 h-4 mr-2" />
                            Filtrar
                        </Button>
                    </div>
                </div>

                {/* Main Summary Row */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                    <SummaryCard title="Resumen Semanal DQ (Bancos)" resumen={data?.resumenDQ} />
                    <SummaryCard title="Resumen Semanal DP (Bancos)" resumen={data?.resumenDP} />

                    <Card className="shadow-md border-gray-100 flex flex-col h-full bg-blue-50/30">
                        <CardHeader className="pb-2 border-b">
                            <CardTitle className="text-sm font-bold uppercase tracking-wide text-gray-700">Otras Discrepancias</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 flex-1">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-gray-600">Abonos sin asignar (Banco):</span>
                                <span className={`font-bold ${data?.otrasDiscrepancias.abonosSinAsignar.ctas > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {data?.otrasDiscrepancias.abonosSinAsignar.ctas} (Suma: {formatCurrency(data?.otrasDiscrepancias.abonosSinAsignar.monto || 0)})
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-400 italic leading-relaxed border-t pt-2">
                                * Los abonos sin asignar corresponden a depósitos bancarios no vinculados a ningún ticket.
                            </p>

                            <div className="mt-8 p-4 rounded-lg bg-indigo-600 text-white shadow-inner">
                                <div className="text-xs opacity-80 uppercase font-bold mb-1">Caja Consolidada</div>
                                <div className="text-3xl font-black">{formatCurrency(data?.totalGeneral || 0)}</div>
                                <div className="text-[10px] mt-2 opacity-70">Total efectivo y banco en el rango</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Gestores Table */}
                <Card className="border-gray-200 shadow-lg">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg text-gray-800">Desglose por Gestor</CardTitle>
                            <p className="text-xs text-gray-400 mt-1">Recaudación detallada por cada agente de cobro seleccionado</p>
                        </div>
                        <Button variant="outline" size="sm" className="hidden sm:flex border-gray-200">
                            <Download className="w-3 h-3 mr-2" /> Excel
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle">
                                <thead className="bg-gray-100/50 font-bold text-gray-600 uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th scope="col" className="px-6 py-4">Gestor / Cobrador</th>
                                        <th scope="col" className="px-6 py-4 text-center">Código</th>
                                        <th scope="col" className="px-6 py-4 text-center">Recibos</th>
                                        <th scope="col" className="px-6 py-4 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                                                Cargando detalle de cuadre...
                                            </td>
                                        </tr>
                                    ) : (data?.gestores || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-16 text-center">
                                                <AlertCircle className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                                                <p className="text-gray-400 font-medium">No hay cobranza registrada en este rango</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        data.gestores.map((r: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                                        {r.nombre.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    {r.nombre}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge variant="outline" className="font-mono text-[10px] py-0">{r.codigoGestor}</Badge>
                                                </td>
                                                <td className="px-6 py-4 text-center font-medium">
                                                    {r.cantidadPagos}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-black text-gray-900">{formatCurrency(r.totalCobrado)}</span>
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

function Loader2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
