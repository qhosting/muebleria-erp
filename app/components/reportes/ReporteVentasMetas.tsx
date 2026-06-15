import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Award, Calendar, DollarSign, Users } from 'lucide-react';

interface ReporteVentasMetasProps {
    data: any[];
    loading: boolean;
}

export const ReporteVentasMetas: React.FC<ReporteVentasMetasProps> = ({ data, loading }) => {
    if (loading) return <div className="text-center py-10">Cargando reporte de ventas y metas...</div>;

    if (!data || data.length === 0) {
        return (
            <Card className="w-full">
                <CardContent className="text-center py-12 text-gray-500">
                    No hay datos de metas o ventas registradas para este periodo.
                </CardContent>
            </Card>
        );
    }

    // Calcular Totales
    const totalPptoClientes = data.reduce((sum, r) => sum + (r.pptoClientes || 0), 0);
    const totalPptoMonto = data.reduce((sum, r) => sum + (r.pptoMonto || 0), 0);
    const totalLogroCl = data.reduce((sum, r) => sum + (r.logroCl || 0), 0);
    const totalLogroMonto = data.reduce((sum, r) => sum + (r.logroMonto || 0), 0);

    const totalPorcentajeCl = totalPptoClientes > 0 ? Math.round((totalLogroCl / totalPptoClientes) * 100) : 0;
    const totalPorcentajeMonto = totalPptoMonto > 0 ? Math.round((totalLogroMonto / totalPptoMonto) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Tarjetas de Resumen Rápido */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold text-green-900 flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-700" />
                            Presupuesto Total Monto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="text-2xl font-black text-green-800">{formatCurrency(totalPptoMonto)}</div>
                        <p className="text-xs text-green-700 mt-1">Suma del presupuesto de todos los asesores</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-indigo-700" />
                            Logro Total Ventas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="text-2xl font-black text-indigo-800">{formatCurrency(totalLogroMonto)}</div>
                        <p className="text-xs text-indigo-700 mt-1">
                            Avance general del {' '}
                            <span className="font-bold">{totalPorcentajeMonto}%</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-700" />
                            Clientes Logrados
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        <div className="text-2xl font-black text-purple-800">{totalLogroCl} / {totalPptoClientes}</div>
                        <p className="text-xs text-purple-700 mt-1">
                            Avance en cuentas del {' '}
                            <span className="font-bold">{totalPorcentajeCl}%</span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabla Principal Estilo Planilla */}
            <Card className="w-full overflow-hidden shadow-lg border-slate-200">
                <CardHeader className="bg-slate-50 border-b py-4">
                    <CardTitle className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                        <Award className="h-5 w-5 text-indigo-600" />
                        Tabla de Logro y Cumplimiento de Metas
                    </CardTitle>
                    <CardDescription>Visualización comparativa de presupuestos asignados vs reales alcanzados</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="text-sm uppercase tracking-wider font-bold">
                                    <th className="p-3 text-left bg-white text-slate-700 border-b">Asesor</th>
                                    <th className="p-3 text-center bg-green-800 text-white border-b border-green-700">Ppto Clientes</th>
                                    <th className="p-3 text-right bg-green-800 text-white border-b border-green-700">Ppto $</th>
                                    <th className="p-3 text-center bg-[#7D3C68] text-white border-b border-purple-800">Logro Cl</th>
                                    <th className="p-3 text-center bg-[#7D3C68] text-white border-b border-purple-800">% Avanzado</th>
                                    <th className="p-3 text-right bg-[#2D4255] text-white border-b border-slate-700">Logro $</th>
                                    <th className="p-3 text-center bg-[#2D4255] text-white border-b border-slate-700">% Avanzado</th>
                                    <th className="p-3 text-center bg-green-800 text-white border-b border-green-700">Dias Mes</th>
                                    <th className="p-3 text-center bg-[#85B6D9] text-slate-900 border-b border-sky-400">SM</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 bg-slate-900 text-white">
                                {data.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-800/80 transition-colors border-b border-slate-800">
                                        <td className="p-3 text-left font-extrabold text-white bg-slate-900 tracking-wide">
                                            {row.asesor}
                                        </td>
                                        <td className="p-3 text-center font-semibold text-slate-300">
                                            {row.pptoClientes}
                                        </td>
                                        <td className="p-3 text-right font-semibold text-slate-300">
                                            {formatCurrency(row.pptoMonto)}
                                        </td>
                                        <td className="p-3 text-center font-semibold text-slate-100">
                                            {row.logroCl}
                                        </td>
                                        <td className="p-3 text-center font-bold text-[#b4d455] bg-white/5 font-mono">
                                            {row.porcentajeCl}%
                                        </td>
                                        <td className="p-3 text-right font-bold text-white">
                                            {formatCurrency(row.logroMonto)}
                                        </td>
                                        <td className="p-3 text-center font-bold text-[#e67e22] bg-white/5 font-mono">
                                            {row.porcentajeMonto}%
                                        </td>
                                        <td className="p-3 text-center text-slate-300 font-semibold">
                                            {row.diasMes}
                                        </td>
                                        <td className="p-3 text-center text-slate-400">
                                            {row.sm || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-[#85B6D9] text-slate-900 font-black text-sm uppercase tracking-wide border-t-2 border-slate-900">
                                    <td className="p-3 text-left">Resumen Total</td>
                                    <td className="p-3 text-center">{totalPptoClientes}</td>
                                    <td className="p-3 text-right">{formatCurrency(totalPptoMonto)}</td>
                                    <td className="p-3 text-center">{totalLogroCl}</td>
                                    <td className="p-3 text-center font-mono">{totalPorcentajeCl}%</td>
                                    <td className="p-3 text-right">{formatCurrency(totalLogroMonto)}</td>
                                    <td className="p-3 text-center font-mono">{totalPorcentajeMonto}%</td>
                                    <td className="p-3 text-center">-</td>
                                    <td className="p-3 text-center">-</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
