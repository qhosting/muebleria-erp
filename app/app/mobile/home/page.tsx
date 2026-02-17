'use client';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Users, DollarSign } from 'lucide-react';

export default function MobileHomePage() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Bienvenido</h2>
                <p className="text-slate-400">Selecciona una acción para comenzar.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Link href="/mobile/clientes" className="block">
                    <Card className="bg-slate-900 border-slate-800 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer">
                        <CardContent className="flex flex-col items-center justify-center p-6 gap-3 text-center h-32">
                            <div className="p-3 bg-emerald-500/10 rounded-full">
                                <Users className="w-6 h-6 text-emerald-500" />
                            </div>
                            <span className="font-semibold text-white text-sm">Ver Clientes</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/mobile/caja" className="block">
                    <Card className="bg-slate-900 border-slate-800 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer">
                        <CardContent className="flex flex-col items-center justify-center p-6 gap-3 text-center h-32">
                            <div className="p-3 bg-amber-500/10 rounded-full">
                                <DollarSign className="w-6 h-6 text-amber-500" />
                            </div>
                            <span className="font-semibold text-white text-sm">Caja Diaria</span>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Resumen rápido (Placeholder) */}
            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                    <CardTitle className="text-sm font-medium text-slate-400 mb-2">Resumen de Hoy</CardTitle>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">$ 0.00</span>
                        <span className="text-xs text-emerald-500 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            +0% vs ayer
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">0 cobros realizados hoy</div>
                </CardContent>
            </Card>
        </div>
    );
}
