"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calculator, Users as UsersIcon, Calendar as CalendarIcon, DollarSign, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export default function CuadrePage() {
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [resumen, setResumen] = useState<any[]>([]);
    const [totalGeneral, setTotalGeneral] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCuadre();
    }, [date]);

    const fetchCuadre = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tesoreria/cuadre?date=${date}`);
            if (res.ok) {
                const data = await res.json();
                setResumen(data.resumen);
                setTotalGeneral(data.totalGeneral);
            }
        } catch (error) {
            console.error("Error al obtener cuadre", error);
        } finally {
            setLoading(false);
        }
    };

    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
                            <Calculator className="mr-3 h-8 w-8 text-blue-600" />
                            Cuadre de Efectivo
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Verifica y controla el efectivo recaudado diariamente por los gestores.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="date"
                                value={date}
                                max={todayStr}
                                onChange={(e) => setDate(e.target.value)}
                                className="pl-9 cursor-pointer"
                            />
                        </div>
                        <Button variant="outline" className="hidden border-gray-200">
                            <Download className="w-4 h-4 mr-2" />
                            Excel
                        </Button>
                    </div>
                </div>

                {/* Tarjetas de Resumen Global */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/10">
                            <CardTitle className="text-sm font-medium text-blue-100">Caja Consolidada</CardTitle>
                            <DollarSign className="h-5 w-5 text-blue-100" />
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-4xl font-bold">{formatCurrency(totalGeneral)}</div>
                            <p className="text-sm text-blue-100 mt-1 opacity-90">Total recopilado de todos los gestores</p>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Gestores Activos Hoy</CardTitle>
                            <UsersIcon className="h-5 w-5 text-gray-400" />
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-gray-900">{resumen.length}</div>
                            <p className="text-sm text-gray-500 mt-1">Con cobranza registrada en el día</p>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Total Transacciones</CardTitle>
                            <Calculator className="h-5 w-5 text-gray-400" />
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-gray-900">
                                {resumen.reduce((acc, curr) => acc + curr.cantidadPagos, 0)}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Recibos procesados</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabla Detallada */}
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                        <CardTitle className="text-lg text-gray-700">Desglose por Gestor</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle text-gray-600">
                                <thead className="bg-white border-b border-gray-100 font-medium text-gray-500">
                                    <tr>
                                        <th scope="col" className="px-6 py-4">Gestor / Cobrador</th>
                                        <th scope="col" className="px-6 py-4 text-center">Código</th>
                                        <th scope="col" className="px-6 py-4 text-center">Pagos Registrados</th>
                                        <th scope="col" className="px-6 py-4 text-right">Efectivo por Entregar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                                Cargando detalle de cuadre...
                                            </td>
                                        </tr>
                                    ) : resumen.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-16 text-center">
                                                <Calculator className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500 font-medium">No hay ingresos registrados en esta fecha</p>
                                                <p className="text-sm text-gray-400 mt-1">Intenta seleccionando una fecha anterior</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        resumen.map((r, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs uppercase">
                                                        {r.nombre.substring(0, 2)}
                                                    </div>
                                                    {r.nombre}
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono">
                                                    <Badge variant="outline" className="bg-gray-50">{r.codigoGestor}</Badge>
                                                </td>
                                                <td className="px-6 py-4 text-center font-medium">
                                                    {r.cantidadPagos} recibos
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-lg text-gray-900">{formatCurrency(r.totalCobrado)}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Footer Totalizador */}
                        {!loading && resumen.length > 0 && (
                            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-between items-center rounded-b-lg">
                                <span className="font-medium text-gray-600 uppercase text-xs tracking-wider">Gran Total Entregado</span>
                                <span className="text-2xl font-black text-blue-700">{formatCurrency(totalGeneral)}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
