'use client';

import { useState, useEffect } from 'react';
import { Download, CheckCircle2, Calendar, FileText, User, CreditCard, Shield, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface ReceiptClientPageProps {
    ticketData: any;
    expiresAt: number;
}

export function ReceiptClientPage({ ticketData, expiresAt }: ReceiptClientPageProps) {
    const [downloading, setDownloading] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');

    // Formatear hora de expiración
    const horaVence = new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    useEffect(() => {
        const updateTimer = () => {
            const diff = expiresAt - Date.now();
            if (diff <= 0) {
                setTimeLeft('Expirado');
                window.location.reload(); // Recargar para mostrar vista de expirado
                return;
            }
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${minutes}m ${seconds}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    const handleDownloadPdf = async () => {
        setDownloading(true);
        try {
            const { generateReceiptPdf } = await import('@/lib/receipt-pdf');
            const doc = await generateReceiptPdf(ticketData);
            
            const pdfName = `Comprobante_${ticketData.cliente.nombreCompleto?.replace(/\s+/g, '_')}_${ticketData.numeroRecibo}.pdf`;
            doc.save(pdfName);
            
            toast.success('Comprobante descargado exitosamente');
        } catch (error) {
            console.error('Error al generar PDF:', error);
            toast.error('Error al descargar el comprobante PDF');
        } finally {
            setDownloading(false);
        }
    };

    const totalCobrado = ticketData.pago.monto + (ticketData.pago.interesMoratorio || 0) + (ticketData.pago.gastosCobranza || 0);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                
                {/* Encabezado Principal */}
                <div className="p-6 bg-emerald-600 flex flex-col items-center justify-center text-center text-white relative">
                    <div className="absolute top-4 right-4 bg-emerald-700/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold">
                        <Clock className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Expira en: {timeLeft}</span>
                    </div>

                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mb-3 border border-white/20">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-xl font-bold">{ticketData.empresa.nombre}</h1>
                    <p className="text-xs text-emerald-100 mt-1">Comprobante de Pago Oficial</p>
                    
                    <div className="mt-5 mb-2">
                        <p className="text-3xl font-black font-mono tracking-tight">{formatCurrency(totalCobrado)}</p>
                        <p className="text-[10px] text-emerald-200 uppercase font-bold tracking-wider mt-0.5">Total Recibido</p>
                    </div>
                </div>

                {/* Detalles del Pago */}
                <div className="p-6 space-y-6 flex-1">
                    
                    {/* Alerta de expiración */}
                    <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-3.5 flex gap-3 items-center">
                        <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <p className="text-[11px] text-slate-400 leading-normal">
                            Este enlace es temporal por seguridad. Vence a las <strong className="text-slate-200">{horaVence}</strong>. Guarda o descarga tu recibo en PDF para conservarlo permanentemente.
                        </p>
                    </div>

                    {/* Ficha Resumen */}
                    <div className="space-y-4">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Resumen del Abono</h2>
                        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl divide-y divide-slate-800/60 text-sm">
                            
                            <div className="p-3.5 flex justify-between items-center">
                                <span className="text-slate-400 text-xs flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-500" /> Cliente
                                </span>
                                <span className="font-bold text-slate-200 text-right max-w-[200px] truncate">
                                    {ticketData.cliente.nombreCompleto}
                                </span>
                            </div>

                            <div className="p-3.5 flex justify-between items-center">
                                <span className="text-slate-400 text-xs flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-500" /> Folio Recibo
                                </span>
                                <span className="font-mono font-bold text-slate-300">
                                    #{ticketData.numeroRecibo}
                                </span>
                            </div>

                            <div className="p-3.5 flex justify-between items-center">
                                <span className="text-slate-400 text-xs flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-slate-500" /> Método Pago
                                </span>
                                <span className="font-bold text-slate-300 capitalize">
                                    {ticketData.pago.metodoPago}
                                </span>
                            </div>

                            <div className="p-3.5 flex justify-between items-center">
                                <span className="text-slate-400 text-xs flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-500" /> Fecha y Hora
                                </span>
                                <span className="font-medium text-slate-300 text-xs">
                                    {new Date(ticketData.pago.fechaPago).toLocaleString('es-MX')}
                                </span>
                            </div>

                        </div>
                    </div>

                    {/* Estado de Cuenta */}
                    <div className="space-y-3">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Estado de Cuenta</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Saldo Anterior</p>
                                <p className="text-base font-bold font-mono text-slate-400">{formatCurrency(ticketData.saldos.anterior)}</p>
                            </div>
                            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Nuevo Saldo</p>
                                <p className="text-base font-black font-mono text-emerald-400">{formatCurrency(ticketData.saldos.nuevo)}</p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Botón de Acción Principal */}
                <div className="p-6 bg-slate-800/40 border-t border-slate-800 flex flex-col gap-3">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={downloading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <Download className="w-5 h-5" />
                        <span>{downloading ? 'Generando PDF...' : 'Descargar Recibo PDF Oficial'}</span>
                    </button>
                    <p className="text-[10px] text-slate-500 text-center font-medium">
                        VertexERP Muebles © 2026. Todos los derechos reservados.
                    </p>
                </div>

            </div>
        </div>
    );
}
