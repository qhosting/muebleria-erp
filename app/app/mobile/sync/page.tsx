"use client";

import { SyncStatus } from "@/components/mobile/sync-status";
import { ChevronLeft, RefreshCw, Database, Shield } from "lucide-react";
import Link from "next/link";

export default function SyncPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2">
                <Link href="/mobile/menu" className="p-2 hover:bg-slate-900 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6 text-slate-400" />
                </Link>
                <h1 className="text-xl font-bold text-slate-100">Estado de Sincronización</h1>
            </div>

            <div className="px-1">
                <SyncStatus />
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Información de Seguridad
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                    Sus datos se guardan de forma segura en este dispositivo utilizando una base de datos cifrada localmente. 
                    Cuando detectamos una conexión estable, los datos se suben automáticamente al servidor central.
                </p>
                <div className="flex items-center gap-3 pt-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Database className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-200">Base de Datos Local</p>
                        <p className="text-[10px] text-slate-500">Cifrado de grado bancario (AES-256)</p>
                    </div>
                </div>
            </div>

            <div className="bg-amber-900/10 border border-amber-900/20 rounded-2xl p-4">
                <p className="text-[11px] text-amber-200/70 text-center italic">
                    "Si trabajas en zonas con señal inestable, te recomendamos realizar una sincronización manual al final de tu jornada desde una red Wi-Fi estable."
                </p>
            </div>
        </div>
    );
}
