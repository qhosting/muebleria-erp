"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCcw } from "lucide-react";

export default function ConciliadorPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Conciliador Inteligente</h1>
                <p className="text-muted-foreground">
                    Emparejamiento automático y manual entre Tickets y Movimientos de Banco.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Emparejados (Hoy)</CardTitle>
                        <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Éxito en conciliación</p>
                    </CardContent>
                </Card>
            </div>

            {/* Contenido principal irá aquí */}
            <Card>
                <CardHeader>
                    <CardTitle>Sugerencias del Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">Módulo en construcción...</p>
                </CardContent>
            </Card>
        </div>
    );
}
