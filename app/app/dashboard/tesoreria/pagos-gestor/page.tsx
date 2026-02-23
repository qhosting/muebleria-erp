
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Search,
    FileDown,
    Printer,
    Wallet,
    Calendar,
    CheckCircle2,
    XCircle,
    Loader2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function PagosGestorPage() {
    const { data: session } = useSession();
    const [resumen, setResumen] = useState<any[]>([]);
    const [totales, setTotales] = useState<any>(null);
    const [pagos, setPagos] = useState<any[]>([]);
    const [cobradores, setCobradores] = useState<any[]>([]);
    const [loadingResumen, setLoadingResumen] = useState(true);
    const [loadingPagos, setLoadingPagos] = useState(false);

    // Filtros
    const [fechaDesde, setFechaDesde] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [fechaHasta, setFechaHasta] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedCobrador, setSelectedCobrador] = useState<string>('all');

    useEffect(() => {
        fetchResumen();
        fetchCobradores();
    }, []);

    const fetchResumen = async () => {
        setLoadingResumen(true);
        try {
            const res = await fetch(`/api/tesoreria/pagos-gestor?desde=${fechaDesde}&hasta=${fechaHasta}`);
            if (res.ok) {
                const data = await res.json();
                setResumen(data.resumen);
                setTotales(data.totales);
            }
        } catch (error) {
            toast.error('Error al cargar resumen');
        } finally {
            setLoadingResumen(false);
        }
    };

    const fetchCobradores = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setCobradores(data.filter((u: any) => u.role === 'cobrador'));
            }
        } catch (error) { }
    };

    const handleSearch = async () => {
        setLoadingPagos(true);
        try {
            // Primero actualizamos el resumen con el rango actual
            await fetchResumen();

            const params = new URLSearchParams({
                desde: fechaDesde,
                hasta: fechaHasta,
                cobradorId: selectedCobrador
            });
            const res = await fetch(`/api/tesoreria/pagos-gestor/reporte?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setPagos(data.pagos);
                toast.success(`Se encontraron ${data.pagos.length} pagos`);
            }
        } catch (error) {
            toast.error('Error al cargar reporte');
        } finally {
            setLoadingPagos(false);
        }
    };

    const toggleCierre = async (cobradorId: string, currentStatus: boolean, gestorName: string) => {
        const action = currentStatus ? 'abrir_caja' : 'cerrar_caja';
        const confirmMsg = currentStatus
            ? `¿Deseas volver a ABRIR la caja de ${gestorName}?`
            : `¿Deseas CERRAR la caja de ${gestorName}?`;

        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch('/api/tesoreria/pagos-gestor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cobradorId, action })
            });

            if (res.ok) {
                toast.success(currentStatus ? 'Caja abierta' : 'Caja cerrada');
                fetchResumen();
            } else {
                toast.error('Error al procesar acción');
            }
        } catch (error) {
            toast.error('Error de conexión');
        }
    };

    const exportarExcel = () => {
        if (pagos.length === 0) {
            toast.error('No hay datos para exportar. Haz clic en Buscar primero.');
            return;
        }

        const wb = XLSX.utils.book_new();

        // Hoja de Resumen
        const resumenWS = XLSX.utils.json_to_sheet(resumen.map(r => ({
            'Agente': r.gestor,
            'Cuentas': r.cuentas,
            'Total Monto': r.totalMonto,
            'Mora': r.totalMora,
            'Bancario': r.bancario,
            'Gestor': r.gestorMonto,
            'Estatus': r.conciliado ? 'Cerrado' : 'Abierto'
        })));
        XLSX.utils.book_append_sheet(wb, resumenWS, "Resumen");

        // Hoja de Detalle
        const detalleWS = XLSX.utils.json_to_sheet(pagos.map(p => ({
            'ID': p.id,
            'Fecha Pago': formatDate(new Date(p.fechaPago)),
            'Código Cliente': p.codigoCliente,
            'Nombre Cliente': p.nombreCliente,
            'Referencia': p.referencia,
            'Monto': p.monto,
            'Agente': p.agente,
            'Concepto': p.concepto,
            'Tipo': p.tipo
        })));
        XLSX.utils.book_append_sheet(wb, detalleWS, "Reporte Detallado");

        XLSX.writeFile(wb, `Reporte_Pagos_Gestor_${fechaDesde}_${fechaHasta}.xlsx`);
    };

    if (!session) return null;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Pagos Gestor (DQ)</h1>
                        <p className="text-gray-600">Resumen de cobranza y control de cierres por agente</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-2">
                            <Printer className="h-4 w-4" /> Imprimir
                        </Button>
                        <Button variant="default" onClick={exportarExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                            <FileDown className="h-4 w-4" /> Excel
                        </Button>
                    </div>
                </div>

                {/* Resumen por Agente */}
                <Card className="border-blue-100 shadow-sm overflow-hidden">
                    <CardHeader className="bg-blue-50/50 pb-3">
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                            <Users className="h-5 w-5" />
                            Resumen por Agente de Cobro
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/50">
                                    <TableHead className="w-[150px]">Agente</TableHead>
                                    <TableHead className="text-center">Cuentas</TableHead>
                                    <TableHead className="text-right">Total Monto</TableHead>
                                    <TableHead className="text-right">Total Moratorio</TableHead>
                                    <TableHead className="text-right">Monto BANCARIO</TableHead>
                                    <TableHead className="text-right">Monto GESTOR</TableHead>
                                    <TableHead className="text-center">Cierre</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingResumen ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                            Cargando resumen...
                                        </TableCell>
                                    </TableRow>
                                ) : resumen.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                                            No hay datos en el rango seleccionado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    resumen.map((r) => (
                                        <TableRow key={r.cobradorId} className="hover:bg-gray-50/50">
                                            <TableCell className="font-bold text-gray-900">{r.gestor}</TableCell>
                                            <TableCell className="text-center">{r.cuentas}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(r.totalMonto)}</TableCell>
                                            <TableCell className="text-right text-red-600">{formatCurrency(r.totalMora)}</TableCell>
                                            <TableCell className="text-right text-blue-600">{formatCurrency(r.bancario)}</TableCell>
                                            <TableCell className="text-right text-orange-600">{formatCurrency(r.gestorMonto)}</TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    size="sm"
                                                    variant={r.conciliado ? "destructive" : "success"}
                                                    className={`h-8 font-bold min-w-[120px] ${r.conciliado ? "" : "bg-green-600 hover:bg-green-700 text-white"}`}
                                                    onClick={() => toggleCierre(r.cobradorId, r.conciliado, r.gestor)}
                                                >
                                                    {r.conciliado ? (
                                                        <><XCircle className="h-3 w-3 mr-1" /> {r.gestor} (Cerrado)</>
                                                    ) : (
                                                        <><CheckCircle2 className="h-3 w-3 mr-1" /> {r.gestor}</>
                                                    )}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            {totales && (
                                <TableFooter>
                                    <TableRow className="bg-gray-100 font-bold">
                                        <TableCell>Total General</TableCell>
                                        <TableCell className="text-center">{totales.cuentas}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(totales.totalMonto)}</TableCell>
                                        <TableCell className="text-right text-red-600">{formatCurrency(totales.totalMora)}</TableCell>
                                        <TableCell className="text-right text-blue-600">{formatCurrency(totales.bancario)}</TableCell>
                                        <TableCell className="text-right text-orange-600">{formatCurrency(totales.gestorMonto)}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableFooter>
                            )}
                        </Table>
                    </CardContent>
                </Card>

                {/* Filtros */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            Reporte de Pagos (DQ)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Desde:</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="pl-10" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Hasta:</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="pl-10" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Agente de Cobro:</label>
                                <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        {cobradores.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.codigoGestor || c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleSearch} disabled={loadingPagos} className="bg-blue-600 hover:bg-blue-700">
                                {loadingPagos ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                Buscar
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla Detallada */}
                <Card className="shadow-sm p-0 overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-800 hover:bg-gray-800">
                                    <TableHead className="text-white">ID</TableHead>
                                    <TableHead className="text-white">Fecha Pago</TableHead>
                                    <TableHead className="text-white">Cód. Cliente</TableHead>
                                    <TableHead className="text-white">Nombre Cliente</TableHead>
                                    <TableHead className="text-white">Ref.</TableHead>
                                    <TableHead className="text-white text-right">Monto</TableHead>
                                    <TableHead className="text-white">Agente</TableHead>
                                    <TableHead className="text-white text-right">Mora</TableHead>
                                    <TableHead className="text-white">Tipo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pagos.map((p) => (
                                    <TableRow key={p.id} className="hover:bg-gray-50">
                                        <TableCell className="text-xs font-mono">{p.id.substring(0, 8)}</TableCell>
                                        <TableCell>{formatDate(new Date(p.fechaPago))}</TableCell>
                                        <TableCell className="font-bold">{p.codigoCliente}</TableCell>
                                        <TableCell className="text-xs">{p.nombreCliente}</TableCell>
                                        <TableCell className="text-xs">{p.referencia}</TableCell>
                                        <TableCell className="text-right font-bold text-green-700">{formatCurrency(p.monto)}</TableCell>
                                        <TableCell className="text-xs">{p.agente}</TableCell>
                                        <TableCell className="text-right text-red-600">{formatCurrency(p.mora)}</TableCell>
                                        <TableCell>
                                            <Badge variant={p.tipo === 'BANCARIO' ? 'default' : 'outline'} className={p.tipo === 'GESTOR' ? 'border-orange-200 text-orange-700' : ''}>
                                                {p.tipo}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {pagos.length === 0 && !loadingPagos && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-20 text-gray-400 italic">
                                            No has realizado ninguna búsqueda todavía.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
