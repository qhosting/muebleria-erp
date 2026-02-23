
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Users, DollarSign, Landmark } from 'lucide-react';

interface ResumenGestoresProps {
    data: any[];
    loading: boolean;
}

export const ResumenGestores: React.FC<ResumenGestoresProps> = ({ data, loading }) => {
    if (loading) return <div className="text-center py-10">Cargando resumen de rendimiento...</div>;

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    Rendimiento por Canal (Banco vs Gestor)
                </CardTitle>
                <CardDescription>Comparativa de captación bancaria frente a cobranza física</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-muted-foreground">
                                <th className="pb-2 font-medium">Gestor</th>
                                <th className="pb-2 font-medium text-center">Ctas. Banco</th>
                                <th className="pb-2 font-medium text-center">Ctas. Gestor</th>
                                <th className="pb-2 font-medium text-right">Monto Banco</th>
                                <th className="pb-2 font-medium text-right">Monto Gestor</th>
                                <th className="pb-2 font-medium text-right">Suma Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map((row, i) => (
                                <tr key={i} className="hover:bg-accent/50 transition-colors">
                                    <td className="py-3 font-medium">
                                        {row.gestor}
                                        <span className="block text-[10px] text-muted-foreground">{row.codigo}</span>
                                    </td>
                                    <td className="py-3 text-center">{row.ctas_banco}</td>
                                    <td className="py-3 text-center">{row.ctas_gestor}</td>
                                    <td className="py-3 text-right text-emerald-600 font-semibold">{formatCurrency(row.monto_banco)}</td>
                                    <td className="py-3 text-right text-blue-600 font-semibold">{formatCurrency(row.monto_gestor)}</td>
                                    <td className="py-3 text-right font-bold">{formatCurrency(row.total_monto)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t bg-muted/20 font-bold">
                            <tr>
                                <td className="py-3">TOTALES</td>
                                <td className="py-3 text-center">{data.reduce((s, r) => s + Number(r.ctas_banco), 0)}</td>
                                <td className="py-3 text-center">{data.reduce((s, r) => s + Number(r.ctas_gestor), 0)}</td>
                                <td className="py-3 text-right">{formatCurrency(data.reduce((s, r) => s + Number(r.monto_banco), 0))}</td>
                                <td className="py-3 text-right">{formatCurrency(data.reduce((s, r) => s + Number(r.monto_gestor), 0))}</td>
                                <td className="py-3 text-right text-blue-700">{formatCurrency(data.reduce((s, r) => s + Number(r.total_monto), 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};
