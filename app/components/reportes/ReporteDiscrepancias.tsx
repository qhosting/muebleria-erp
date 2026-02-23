
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { AlertTriangle, HelpCircle, FileX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReporteDiscrepanciasProps {
    data: any;
    loading: boolean;
}

export const ReporteDiscrepancias: React.FC<ReporteDiscrepanciasProps> = ({ data, loading }) => {
    if (loading) return <div className="text-center py-10">Analizando discrepancias...</div>;
    if (!data) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-amber-50 border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-amber-600 flex items-center justify-between">
                            Tickets sin Banco <FileX className="h-4 w-4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700">{data.resumen.totalTicketsSinBanco}</div>
                        <p className="text-[10px] text-amber-600">Suma total: {formatCurrency(data.resumen.montoTicketsSinBanco)}</p>
                    </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-red-600 flex items-center justify-between">
                            Abonos sin Ticket <Landmark className="h-4 w-4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">{data.resumen.totalBancosSinTicket}</div>
                        <p className="text-[10px] text-red-600">Suma total: {formatCurrency(data.resumen.montoBancosSinTicket)}</p>
                    </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-orange-600 flex items-center justify-between">
                            Pagos Huérfanos <AlertTriangle className="h-4 w-4" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700">{data.resumen.totalPagosBancariosHuefanos}</div>
                        <p className="text-[10px] text-orange-600">Suma total: {formatCurrency(data.resumen.montoPagosBancariosHuefanos)}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tickets sin Banco */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Tickets Pendientes de Recibo Bancario</CardTitle>
                        <CardDescription>Tickets creados que no han sido vinculados a un movimiento bancario</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[300px] overflow-y-auto">
                        <div className="space-y-2">
                            {data.ticketsSinBanco.length === 0 ? (
                                <p className="text-center text-muted-foreground text-xs py-10">Sin tickets pendientes</p>
                            ) : data.ticketsSinBanco.map((t: any) => (
                                <div key={t.id} className="p-2 border rounded flex justify-between items-center text-xs">
                                    <div>
                                        <p className="font-bold">{t.cliente?.nombreCompleto || 'Desconocido'}</p>
                                        <p className="text-[10px] text-muted-foreground">{t.folio} | {formatDate(new Date(t.creadoEn))}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-amber-600">{formatCurrency(t.monto)}</p>
                                        <p className="text-[10px] text-muted-foreground">{t.gestor?.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Bancos sin Ticket */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Movimientos Bancarios sin Ticket (Huéorfanos)</CardTitle>
                        <CardDescription>Dinero ingresado al banco que no tiene un responsable asignado</CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[300px] overflow-y-auto">
                        <div className="space-y-2">
                            {data.bancosSinTicket.length === 0 ? (
                                <p className="text-center text-muted-foreground text-xs py-10">Sin movimientos huérfanos</p>
                            ) : data.bancosSinTicket.map((b: any) => (
                                <div key={b.id} className="p-2 border rounded flex justify-between items-center text-xs bg-red-50/30">
                                    <div className="flex-1">
                                        <p className="font-bold uppercase line-clamp-1">{b.concepto || b.descripcionGeneral || 'S/C'}</p>
                                        <p className="text-[10px] text-muted-foreground">{b.bancoOrigen} | {formatDate(new Date(b.fechaOperacion))}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-600">{formatCurrency(b.abono)}</p>
                                        <Badge variant="outline" className="text-[9px] h-4">Banco</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const Landmark = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-landmark"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7 12 2" /></svg>
)
