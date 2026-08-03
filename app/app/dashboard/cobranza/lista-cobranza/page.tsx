"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Filter, FileText, Users, Phone, MapPin, Search, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import * as XLSX from "xlsx";

interface User {
    id: string;
    name: string;
    codigoGestor?: string;
}

interface Cliente {
    id: string;
    codigoCliente: string;
    nombreCompleto: string;
    direccionCompleta: string;
    telefono?: string;
    diaPago: string;
    periodicidad: string;
    montoPago: number;
    saldoActual: number;
    numContrato?: string;
    fechaVenta?: string;
    vendedor?: string;
    descripcionProducto?: string;
    importe1?: number;
    importe2?: number;
}

export default function ListaCobranzaPage() {
    const { data: session } = useSession();
    const [cobradores, setCobradores] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCobradores, setLoadingCobradores] = useState(true);

    // Filtros/Formulario
    const [selectedCobrador, setSelectedCobrador] = useState<string>("");
    const [semana, setSemana] = useState<string>(() => {
        const d = new Date();
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const days = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        return Math.ceil((d.getDay() + 1 + days) / 7).toString();
    });

    // Resultados
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [calendario, setCalendario] = useState<any>(null);
    const [busqueda, setBusqueda] = useState<string>("");
    const [searched, setSearched] = useState<boolean>(false);

    const userRole = (session?.user as any)?.role;

    useEffect(() => {
        fetchCobradores();
    }, []);

    const fetchCobradores = async () => {
        try {
            setLoadingCobradores(true);
            const res = await fetch("/api/users");
            if (res.ok) {
                const users = await res.json();
                const gestores = users.filter((u: any) => u.role === "cobrador");
                setCobradores(gestores);
                
                // Si hay cobradores, seleccionar el primero por defecto
                if (gestores.length > 0) {
                    setSelectedCobrador(gestores[0].id);
                }
            }
        } catch (error) {
            console.error("Error al cargar cobradores:", error);
            toast.error("Error al cargar la lista de cobradores");
        } finally {
            setLoadingCobradores(false);
        }
    };

    const handleBuscar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCobrador) {
            toast.error("Por favor selecciona un gestor");
            return;
        }
        if (!semana) {
            toast.error("Por favor ingresa una semana");
            return;
        }

        setLoading(true);
        setSearched(true);
        try {
            const params = new URLSearchParams({
                cobradorId: selectedCobrador,
                semana: semana,
                anio: new Date().getFullYear().toString()
            });

            const res = await fetch(`/api/reportes/lista-cobranza?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setClientes(data.clientes || []);
                setCalendario(data.calendario || null);
            } else {
                const err = await res.json();
                toast.error(err.error || "Error al buscar la lista");
            }
        } catch (error) {
            console.error("Error al buscar lista de cobranza:", error);
            toast.error("Error de red al consultar la lista");
        } finally {
            setLoading(false);
        }
    };

    const getSelectedCobradorName = () => {
        const cobrador = cobradores.find(c => c.id === selectedCobrador);
        return cobrador ? (cobrador.codigoGestor || cobrador.name) : "Gestor";
    };

    const exportarExcel = () => {
        if (clientes.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        const cobradorName = getSelectedCobradorName();
        
        const dataToExport = clientes.map(c => ({
            "Contrato": c.numContrato || "-",
            "Código Cliente": c.codigoCliente || "-",
            "Nombre Completo": c.nombreCompleto || "-",
            "Dirección": c.direccionCompleta || "-",
            "Teléfono": c.telefono || "-",
            "Día Pago": c.diaPago || "-",
            "Periodicidad": c.periodicidad || "-",
            "Producto": c.descripcionProducto || "-",
            "Fecha Venta": c.fechaVenta ? new Date(c.fechaVenta).toLocaleDateString("es-MX") : "-",
            "Vendedor": c.vendedor || "-",
            "Precio Contado": c.importe1 || 0,
            "Vendido En": c.importe2 || 0,
            "Monto Pago": c.montoPago || 0,
            "Saldo Actual": c.saldoActual || 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Lista de Cobranza");

        // Formatear ancho de columnas para mejor visualización
        worksheet['!cols'] = [
            { wch: 15 }, // Contrato
            { wch: 15 }, // Código Cliente
            { wch: 30 }, // Nombre Completo
            { wch: 40 }, // Dirección
            { wch: 15 }, // Teléfono
            { wch: 12 }, // Día Pago
            { wch: 15 }, // Periodicidad
            { wch: 25 }, // Producto
            { wch: 15 }, // Fecha Venta
            { wch: 20 }, // Vendedor
            { wch: 15 }, // Precio Contado
            { wch: 15 }, // Vendido En
            { wch: 15 }, // Monto Pago
            { wch: 15 }  // Saldo Actual
        ];

        XLSX.writeFile(workbook, `ListaCobranza-${cobradorName}-Semana${semana}.xlsx`);
        toast.success("Lista de cobranza exportada en Excel (.xlsx) exitosamente");
    };

    const clientesFiltrados = clientes.filter(c => 
        c.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.codigoCliente.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.direccionCompleta.toLowerCase().includes(busqueda.toLowerCase())
    );

    const totalCobrar = clientesFiltrados.reduce((acc, curr) => acc + curr.montoPago, 0);
    const totalSaldo = clientesFiltrados.reduce((acc, curr) => acc + curr.saldoActual, 0);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Encabezado */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
                            <FileText className="mr-3 h-8 w-8 text-blue-600" />
                            Generar Lista por Gestor
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Genera la lista de cuentas activas a visitar por gestor según la programación semanal.
                        </p>
                    </div>
                    {clientes.length > 0 && (
                        <Button onClick={exportarExcel} className="w-full sm:w-auto">
                            <Download className="mr-2 h-4 w-4" /> Exportar a Excel
                        </Button>
                    )}
                </div>

                {/* Formulario de Filtro */}
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Filter className="h-4 w-4" /> Parámetros de Lista
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleBuscar} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="gestor">Gestor / Cobrador</Label>
                                <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                                    <SelectTrigger id="gestor" disabled={loadingCobradores}>
                                        <SelectValue placeholder={loadingCobradores ? "Cargando..." : "Selecciona un gestor"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cobradores.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name} {c.codigoGestor ? `(${c.codigoGestor})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="semana">Semana (1 - 52)</Label>
                                <Input
                                    id="semana"
                                    type="number"
                                    min="1"
                                    max="52"
                                    value={semana}
                                    onChange={(e) => setSemana(e.target.value)}
                                    placeholder="Ej. 28"
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Buscando..." : "Buscar"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Detalles del Calendario Activo si existe */}
                {calendario && (
                    <Card className="border-blue-100 bg-blue-50/20">
                        <CardContent className="py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-blue-800">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                <span className="font-semibold">Período de Semana {calendario.semana}:</span>
                                <span>
                                    {new Date(calendario.fechaInicio).toLocaleDateString("es-MX")} al{" "}
                                    {new Date(calendario.fechaFin).toLocaleDateString("es-MX")}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Periodicidades Activas:</span>
                                <div className="flex gap-1">
                                    {(calendario.periodicidadesActivas as string[]).map(p => (
                                        <Badge key={p} variant="secondary" className="text-[10px] uppercase bg-blue-100/80 text-blue-900 border-none">
                                            {p}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tabla de Resultados */}
                {searched && (
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-b">
                            <div>
                                <CardTitle className="text-lg">Clientes en Ruta ({clientesFiltrados.length})</CardTitle>
                                <CardDescription>
                                    Cuentas asignadas a {getSelectedCobradorName()} que corresponden a esta semana.
                                </CardDescription>
                            </div>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    type="search"
                                    placeholder="Buscar cliente, código..."
                                    className="pl-8"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left align-middle text-gray-600 border-collapse">
                                    <thead className="bg-[#1e293b] text-white text-[11px] font-semibold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 text-center border border-slate-700">Contrato</th>
                                            <th className="px-4 py-3 text-center border border-slate-700">Código</th>
                                            <th className="px-4 py-3 border border-slate-700">Cliente</th>
                                            <th className="px-4 py-3 border border-slate-700">Dirección</th>
                                            <th className="px-4 py-3 border border-slate-700">Teléfono</th>
                                            <th className="px-4 py-3 text-center border border-slate-700">Día Cobro</th>
                                            <th className="px-4 py-3 text-center border border-slate-700">Periodicidad</th>
                                            <th className="px-4 py-3 border border-slate-700">Producto</th>
                                            <th className="px-4 py-3 text-center border border-slate-700">Fecha Venta</th>
                                            <th className="px-4 py-3 border border-slate-700">Vendedor</th>
                                            <th className="px-4 py-3 text-right border border-slate-700">P. Contado</th>
                                            <th className="px-4 py-3 text-right border border-slate-700">Vendido En</th>
                                            <th className="px-4 py-3 text-right border border-slate-700">Abono Semanal</th>
                                            <th className="px-4 py-3 text-right border border-slate-700">Saldo Actual</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={14} className="py-8 text-center text-gray-500 text-xs">
                                                    Cargando clientes de la ruta...
                                                </td>
                                            </tr>
                                        ) : clientesFiltrados.length === 0 ? (
                                            <tr>
                                                <td colSpan={14} className="py-12 text-center text-gray-500 text-xs">
                                                    No se encontraron clientes asignados para este gestor en la semana elegida.
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                                {clientesFiltrados.map((c) => (
                                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors text-xs">
                                                        <td className="px-4 py-2 text-center font-semibold font-mono text-gray-900 border border-gray-200">
                                                            {c.numContrato || "-"}
                                                        </td>
                                                        <td className="px-4 py-2 text-center font-bold font-mono text-gray-900 border border-gray-200">
                                                            {c.codigoCliente}
                                                        </td>
                                                        <td className="px-4 py-2 font-medium text-gray-900 border border-gray-200 whitespace-nowrap">
                                                            {c.nombreCompleto}
                                                        </td>
                                                        <td className="px-4 py-2 border border-gray-200 max-w-xs truncate" title={c.direccionCompleta}>
                                                            <div className="flex items-center gap-1.5">
                                                                <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                                                                <span className="truncate">{c.direccionCompleta}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 border border-gray-200">
                                                            {c.telefono ? (
                                                                <a href={`tel:${c.telefono}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                                                                    <Phone className="h-3 w-3" />
                                                                    <span>{c.telefono}</span>
                                                                </a>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-center border border-gray-200 font-medium">
                                                            {c.diaPago}
                                                        </td>
                                                        <td className="px-4 py-2 text-center border border-gray-200 uppercase">
                                                            <Badge variant="outline" className="text-[10px]">
                                                                {c.periodicidad}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-2 border border-gray-200 max-w-xs truncate" title={c.descripcionProducto}>
                                                            {c.descripcionProducto || "-"}
                                                        </td>
                                                        <td className="px-4 py-2 text-center border border-gray-200 whitespace-nowrap">
                                                            {c.fechaVenta ? new Date(c.fechaVenta).toLocaleDateString("es-MX") : "-"}
                                                        </td>
                                                        <td className="px-4 py-2 border border-gray-200 text-center">
                                                            {c.vendedor || "-"}
                                                        </td>
                                                        <td className="px-4 py-2 text-right border border-gray-200">
                                                            {c.importe1 ? formatCurrency(c.importe1) : "$0.00"}
                                                        </td>
                                                        <td className="px-4 py-2 text-right border border-gray-200">
                                                            {c.importe2 ? formatCurrency(c.importe2) : "$0.00"}
                                                        </td>
                                                        <td className="px-4 py-2 text-right border border-gray-200 font-semibold text-gray-900">
                                                            {formatCurrency(c.montoPago)}
                                                        </td>
                                                        <td className="px-4 py-2 text-right border border-gray-200 text-gray-950 font-bold">
                                                            {formatCurrency(c.saldoActual)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Fila de Totales */}
                                                <tr className="bg-slate-50 font-bold text-xs text-slate-900 border-t-2 border-slate-300">
                                                    <td colSpan={12} className="px-4 py-3 text-right border border-gray-200">
                                                        Total General
                                                    </td>
                                                    <td className="px-4 py-3 text-right border border-gray-200">
                                                        {formatCurrency(totalCobrar)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right border border-gray-200">
                                                        {formatCurrency(totalSaldo)}
                                                    </td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
