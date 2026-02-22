"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export default function CuadrePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Cuadre de Efectivo</h1>
                <p className="text-muted-foreground">
                    Gestión y cierre de caja de cobradores y ventas.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Totales (Hoy)</CardTitle>
                        <Calculator className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$0.00</div>
                        <p className="text-xs text-muted-foreground">Esperando confirmación...</p>
                    </CardContent>
                </Card>
            </div>

            {/* Contenido principal irá aquí */}
            <Card>
                <CardHeader>
                    <CardTitle>Cierres Activos</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">Módulo en construcción...</p>
                </CardContent>
            </Card>
        </div>
    );
}
