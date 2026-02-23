
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    DollarSign,
    Download,
    Filter,
    Clock,
    AlertCircle,
    BarChart2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface MorosidadReport {
    resumen: {
        totalClientes: number;
        totalSaldoVencido: number;
    };
    bloques: {
        [key: string]: { clientes: number; monto: number };
    };
    detalle: Array<{
        id: string;
        codigoCliente: string;
        nombreCompleto: string;
        saldoActual: number;
        saldoVencido: number;
        diasVencidos: number;
        periodicidad: string;
        cobradorAsignado?: { name: string };
    }>;
}

export default function MorosidadPage() {
    const { data: session } = useSession();
    const [reporte, setReporte] = useState<MorosidadReport | null>(null);
    const [cobradores, setCobradores] = useState<any[]>([]);
    const [selectedCobrador, setSelectedCobrador] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCobradores();
    }, []);

    useEffect(() => {
        fetchReporte();
    }, [selectedCobrador]);

    const fetchCobradores = async () => {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const users = await response.json();
                setCobradores(users.filter((u: any) => u.role === 'cobrador'));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchReporte = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedCobrador !== 'all') params.append('cobradorId', selectedCobrador);

            const response = await fetch(`/api/reportes/morosidad?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setReporte(data);
            } else {
                toast.error('Error al cargar reporte');
            }
        } catch (error) {
            toast.error('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const exportarCSV = () => {
        if (!reporte) return;
        const headers = ['Codigo', 'Cliente', 'Cobrador', 'Saldo Actual', 'Saldo Vencido', 'Dias Vencidos', 'Periodicidad'];
        const rows = reporte.detalle.map(c => [
            c.codigoCliente,
            c.nombreCompleto,
            c.cobradorAsignado?.name || 'N/A',
            c.saldoActual.toString(),
            c.saldoVencido.toString(),
            c.diasVencidos.toString(),
            c.periodicidad
        ]);

        const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-morosidad-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (!session) return null;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Reporte de Morosidad</h1>
                        <p className="text-gray-500">Antigüedad de saldos y bloques de vencimiento</p>
                    </div>
                    <Button onClick={exportarCSV} disabled={!reporte || loading}>
                        <Download className="h-4 w-4 mr-2" /> Exportar CSV
                    </Button>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Filter className="h-4 w-4" /> Filtros
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-xs">
                            <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos los cobradores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los cobradores</SelectItem>
                                    {cobradores.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="text-center py-20">Cargando datos...</div>
                ) : reporte && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card className="border-l-4 border-l-red-500">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-semibold uppercase text-gray-500">Total Vencido</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-600">
                                        {formatCurrency(reporte.resumen.totalSaldoVencido)}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{reporte.resumen.totalClientes} clientes con atraso</p>
                                </CardContent>
                            </Card>

                            {/* Bloques de Vencimiento */}
                            <Card className="md:col-span-1 lg:col-span-2">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-semibold uppercase text-gray-500">Bloques de Vencimiento (Días)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                                        {Object.entries(reporte.bloques).map(([label, data]) => (
                                            <div key={label} className="bg-gray-50 p-2 rounded-lg text-center border">
                                                <p className="text-[10px] font-bold text-gray-400">{label}</p>
                                                <p className="text-sm font-bold">{formatCurrency(data.monto)}</p>
                                                <p className="text-[9px] text-gray-500">{data.clientes} cl.</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Detalle de Clientes Morosos</CardTitle>
                                <CardDescription>Clientes ordenados por mayor antigüedad de vencimiento</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-gray-500">
                                                <th className="pb-2 font-medium">Cliente</th>
                                                <th className="pb-2 font-medium">Cobrador</th>
                                                <th className="pb-2 font-medium text-right">Saldo Actual</th>
                                                <th className="pb-2 font-medium text-right">Saldo Vencido</th>
                                                <th className="pb-2 font-medium text-center">Días</th>
                                                <th className="pb-2 font-medium">Estatus</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {reporte.detalle.map((c) => (
                                                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-3">
                                                        <p className="font-medium">{c.nombreCompleto}</p>
                                                        <p className="text-[10px] text-gray-400 font-mono">{c.codigoCliente}</p>
                                                    </td>
                                                    <td className="py-3 text-gray-600">{c.cobradorAsignado?.name || '---'}</td>
                                                    <td className="py-3 text-right">{formatCurrency(c.saldoActual)}</td>
                                                    <td className="py-3 text-right font-bold text-red-600">{formatCurrency(c.saldoVencido)}</td>
                                                    <td className="py-3 text-center">
                                                        <Badge variant={c.diasVencidos > 30 ? "destructive" : "warning"} className="text-[10px]">
                                                            {c.diasVencidos} d.
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3">
                                                        {c.diasVencidos > 60 ? (
                                                            <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                                                                <AlertCircle className="h-3 w-3" /> Crítico
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-amber-600 font-medium">En mora</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
