'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Calendar, User, Clock, CheckCircle2, AlertCircle, Printer, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useBluetoothPrinter } from '@/hooks/use-bluetooth-printer';
import { PrinterConfigModal } from '@/components/mobile/printer-config-modal';

export default function MobileConveniosPage() {
    const { data: session } = useSession();
    const [convenios, setConvenios] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [showPrinterConfig, setShowPrinterConfig] = useState(false);
    const { isConnected: isPrinterConnected, printConvenio } = useBluetoothPrinter();

    useEffect(() => {
        fetchConvenios();
    }, []);

    const fetchConvenios = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/mobile/convenios');
            if (response.ok) {
                const data = await response.json();
                setConvenios(data.convenios || []);
            }
        } catch (error) {
            console.error('Error al cargar convenios:', error);
            toast.error('Error al cargar convenios');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async (convenio: any) => {
        if (!isPrinterConnected) {
            toast.error('Impresora no conectada');
            setShowPrinterConfig(true);
            return;
        }

        setPrintingId(convenio.id);
        try {
            const success = await printConvenio({
                ...convenio,
                gestor: {
                    name: convenio.gestor?.name || session?.user?.name || 'Cobrador'
                }
            });
            if (success) {
                toast.success('Convenio impreso correctamente');
            }
        } catch (error) {
            console.error('Error imprimiendo convenio:', error);
            toast.error('Error al imprimir convenio');
        } finally {
            setPrintingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium">Cargando convenios...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white">Mis Convenios</h2>
                    <p className="text-slate-400 text-sm">Seguimiento de compromisos de pago</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPrinterConfig(true)}
                    className={`h-10 w-10 p-0 rounded-full ${isPrinterConnected ? 'text-emerald-400' : 'text-slate-500'}`}
                >
                    <Settings className="w-5 h-5" />
                </Button>
            </div>

            {convenios.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-10 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
                        <Calendar className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-white font-bold">No tienes convenios activos</p>
                        <p className="text-slate-500 text-sm mt-1">Los compromisos que generes aparecerán aquí.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {convenios.map((c) => (
                        <Card key={c.id} className="bg-slate-900 border-slate-800 overflow-hidden rounded-2xl">
                            <div className={`h-1.5 w-full ${c.status === 'PENDIENTE' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg text-white font-bold truncate">
                                            {c.cliente.nombreCompleto}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Badge variant="outline" className="text-[10px] bg-slate-950 border-slate-700">
                                                {c.status}
                                            </Badge>
                                            <span>#{c.cliente.codigoCliente}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-emerald-400 font-black text-lg">
                                            {formatCurrency(c.monto)}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Fecha Compromiso</p>
                                        <div className="flex items-center gap-2 text-white">
                                            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                            <span className="text-xs font-bold">{formatDate(c.fecha)}</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Última Gestión</p>
                                        <div className="flex items-center gap-2 text-white">
                                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="text-xs font-bold">{formatDate(c.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                {c.comentario && (
                                    <div className="p-3 bg-slate-950/30 rounded-xl border border-slate-800 text-xs text-slate-400 italic">
                                        "{c.comentario}"
                                    </div>
                                )}

                                <div className="pt-2 flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                                            onClick={() => window.location.href = `/mobile/clientes?search=${c.cliente.id}`}
                                        >
                                            <User className="w-4 h-4 mr-2" />
                                            CLIENTE
                                        </Button>
                                        {c.status === 'PENDIENTE' && (
                                            <Button 
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                                onClick={() => window.location.href = `/mobile/clientes?cobrar=${c.cliente.id}`}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                COBRAR
                                            </Button>
                                        )}
                                    </div>
                                    <Button 
                                        variant="secondary"
                                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold"
                                        onClick={() => handlePrint(c)}
                                        disabled={printingId === c.id}
                                    >
                                        {printingId === c.id ? (
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Printer className="w-4 h-4 mr-2" />
                                        )}
                                        {printingId === c.id ? 'IMPRIMIENDO...' : 'REIMPRIMIR TICKET'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            <PrinterConfigModal
                isOpen={showPrinterConfig}
                onClose={() => setShowPrinterConfig(false)}
            />
        </div>
    );
}
