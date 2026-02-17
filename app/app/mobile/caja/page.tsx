'use client';
import { Card, CardContent } from '@/components/ui/card';

export default function MobileCajaPage() {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Caja Diaria</h2>
            <div className="text-sm text-slate-400">Resumen de transacciones del día.</div>

            <Card className="bg-slate-900 border-slate-800 text-white">
                <CardContent className="p-8 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-3xl">
                        💰
                    </div>
                    <p className="text-slate-400">No hay movimientos registrados hoy.</p>
                </CardContent>
            </Card>
        </div>
    );
}
