"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark } from "lucide-react";

export default function BancosPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Estado de Cuenta Bancario</h1>
                <p className="text-muted-foreground">
                    Importación y visualización de movimientos bancarios base para conciliación.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Movimientos sin Emparejar</CardTitle>
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Listos para conciliar</p>
                    </CardContent>
                </Card>
            </div>

            {/* Contenido principal irá aquí */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Movimientos</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">Módulo en construcción...</p>
                </CardContent>
            </Card>
        </div>
    );
}
