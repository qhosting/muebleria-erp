"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, Clock, CheckCircle2, AlertCircle, PlayCircle, StopCircle, ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function CajaPage() {
    const [lastSession, setLastSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [montoInicial, setMontoInicial] = useState("");
    const [montoFinal, setMontoFinal] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchLastSession();
    }, []);

    const fetchLastSession = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/tesoreria/caja");
            if (res.ok) {
                const data = await res.json();
                setLastSession(data);
                if (data?.estatus === 'abierto') {
                    setMontoInicial(data.montoInicial.toString());
                }
            }
        } catch (error) {
            toast.error("Error al cargar estado de caja");
        } finally {
            setLoading(false);
        }
    };

    const handleAbrirCaja = async () => {
        if (!montoInicial || isNaN(parseFloat(montoInicial))) {
            toast.error("Ingresa un monto inicial válido");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/tesoreria/caja", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "abrir",
                    montoInicial: parseFloat(montoInicial)
                })
            });

            if (res.ok) {
                toast.success("Caja abierta correctamente");
                fetchLastSession();
            } else {
                const err = await res.json();
                toast.error(err.error || "Error al abrir caja");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCerrarCaja = async () => {
        if (!montoFinal || isNaN(parseFloat(montoFinal))) {
            toast.error("Ingresa el monto final recolectado");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/tesoreria/caja", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "cerrar",
                    montoFinal: parseFloat(montoFinal),
                    observaciones
                })
            });

            if (res.ok) {
                toast.success("Caja cerrada correctamente");
                fetchLastSession();
                setMontoFinal("");
                setObservaciones("");
            } else {
                const err = await res.json();
                toast.error(err.error || "Error al cerrar caja");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setSubmitting(false);
        }
    };

    const isCajaAbierta = lastSession?.estatus === 'abierto';

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center">
                        <Wallet className="mr-3 h-8 w-8 text-blue-600" />
                        Control de Caja Diaria
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Registra la apertura y el cierre de tu caja para el control de cobranza.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Estado Actual */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg">Estado Actual</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                {loading ? (
                                    <Clock className="h-12 w-12 text-gray-300 animate-pulse" />
                                ) : isCajaAbierta ? (
                                    <>
                                        <PlayCircle className="h-12 w-12 text-green-500 mb-2" />
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">ABIERTA</Badge>
                                        <p className="text-xs text-gray-500 mt-2">Desde {formatDate(lastSession.apertura)}</p>
                                    </>
                                ) : (
                                    <>
                                        <StopCircle className="h-12 w-12 text-gray-400 mb-2" />
                                        <Badge variant="secondary">CERRADA</Badge>
                                        <p className="text-xs text-gray-500 mt-2">Lista para iniciar día</p>
                                    </>
                                )}
                            </div>

                            {isCajaAbierta && (
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Monto Inicial</span>
                                        <span className="font-bold">{formatCurrency(lastSession.montoInicial)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Fecha</span>
                                        <span>{new Date(lastSession.fecha).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Acciones de Caja */}
                    <Card className="md:col-span-2">
                        {!isCajaAbierta ? (
                            <>
                                <CardHeader>
                                    <CardTitle>Apertura de Caja</CardTitle>
                                    <CardDescription>Indica con cuánto efectivo inicias tu recorrido hoy.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="montoInicial">Monto Inicial (Efectivo en mano)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                                            <Input
                                                id="montoInicial"
                                                type="number"
                                                placeholder="0.00"
                                                className="pl-8 text-lg font-bold"
                                                value={montoInicial}
                                                onChange={(e) => setMontoInicial(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                                        onClick={handleAbrirCaja}
                                        disabled={submitting || loading}
                                    >
                                        {submitting ? "Procesando..." : "Abrir Caja Ahora"}
                                    </Button>
                                </CardContent>
                            </>
                        ) : (
                            <>
                                <CardHeader>
                                    <CardTitle>Cierre de Caja</CardTitle>
                                    <CardDescription>Finaliza tu día registrando el total recolectado.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Monto Inicial</Label>
                                            <div className="p-3 bg-gray-50 rounded-lg font-bold border">
                                                {formatCurrency(lastSession.montoInicial)}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="montoFinal">Total Recolectado (Efectivo)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                                                <Input
                                                    id="montoFinal"
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="pl-8 text-lg font-bold border-blue-200 focus:border-blue-500"
                                                    value={montoFinal}
                                                    onChange={(e) => setMontoFinal(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="obs">Observaciones / Incidencias</Label>
                                        <Textarea
                                            id="obs"
                                            placeholder="Cualquier detalle relevante del día..."
                                            value={observaciones}
                                            onChange={(e) => setObservaciones(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        variant="destructive"
                                        className="w-full h-12 text-lg"
                                        onClick={handleCerrarCaja}
                                        disabled={submitting || loading}
                                    >
                                        {submitting ? "Procesando..." : "Realizar Cierre de Caja"}
                                    </Button>
                                </CardContent>
                            </>
                        )}
                    </Card>
                </div>

                {/* Historial Reciente */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-5 w-5 text-gray-400" /> Historial de Cierres Recientes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle">
                                <thead className="bg-gray-50 border-y text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3">Fecha</th>
                                        <th className="px-6 py-3">Apertura</th>
                                        <th className="px-6 py-3">Cierre</th>
                                        <th className="px-6 py-3 text-right">Inicial</th>
                                        <th className="px-6 py-3 text-right">Recolectado</th>
                                        <th className="px-6 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {lastSession && lastSession.estatus === 'cerrado' && (
                                        <tr>
                                            <td className="px-6 py-4">{new Date(lastSession.fecha).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-xs">{formatDate(lastSession.apertura)}</td>
                                            <td className="px-6 py-4 text-xs">{formatDate(lastSession.cierre)}</td>
                                            <td className="px-6 py-4 text-right">{formatCurrency(lastSession.montoInicial)}</td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(lastSession.totalCobrado || lastSession.montoFinal)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Finalizado</Badge>
                                            </td>
                                        </tr>
                                    )}
                                    {!lastSession && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No hay registros previos.</td>
                                        </tr>
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
