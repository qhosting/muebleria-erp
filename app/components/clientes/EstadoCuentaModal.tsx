'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
    FileText, Calendar, DollarSign, RefreshCw, 
    Printer, ArrowDownLeft, ArrowUpRight, Scale, AlertCircle
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

interface EstadoCuentaModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clienteId: string | null;
    clienteNombre: string | null;
}

export function EstadoCuentaModal({
    open,
    onOpenChange,
    clienteId,
    clienteNombre
}: EstadoCuentaModalProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    const fetchEstadoCuenta = async (force = false) => {
        if (!clienteId) return;
        setLoading(true);
        try {
            const url = `/api/clientes/${clienteId}/estado-cuenta${force ? '?refresh=true' : ''}`;
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const responseData = await res.json();
                setData(responseData);
            } else {
                const err = await res.json();
                toast.error(err.error || 'Error al obtener el estado de cuenta');
            }
        } catch (error) {
            toast.error('Error de conexión al obtener el estado de cuenta');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && clienteId) {
            fetchEstadoCuenta();
        } else {
            setData(null);
        }
    }, [open, clienteId]);

    const handlePrint = () => {
        window.print();
    };

    // Helper to safely extract documents list
    const getDocumentos = () => {
        if (!data?.estadoCuenta) return [];
        const ec = data.estadoCuenta;
        
        // El API wrapper puede devolver los documentos en diferentes propiedades
        const docs = ec.documentos || ec.items || ec.lista || ec.data || (Array.isArray(ec) ? ec : []);
        if (Array.isArray(docs)) return docs;
        
        // Si es un objeto, buscar cualquier propiedad que sea un arreglo
        const arrayProp = Object.values(ec).find(val => Array.isArray(val));
        return Array.isArray(arrayProp) ? arrayProp : [];
    };

    const documentos = getDocumentos();

    // Helper to extract global balance summary
    const getResumen = () => {
        if (!data?.estadoCuenta) return { balance: 0, limite: 0, vencido: 0 };
        const ec = data.estadoCuenta;
        return {
            balance: Number(ec.saldoActual || ec.cSaldoActual || ec.saldo || data.cliente?.saldoLocal || 0),
            limite: Number(ec.limiteCredito || ec.cLimiteCredito || ec.limite || 0),
            vencido: Number(ec.saldoVencido || ec.cSaldoVencido || ec.vencido || 0)
        };
    };

    const resumen = getResumen();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border-none shadow-2xl p-6 md:p-8 bg-white print:p-0 print:max-w-full print:max-h-full">
                <DialogHeader className="print:hidden">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-indigo-50 p-2.5 rounded-2xl">
                            <FileText className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black text-gray-900">Estado de Cuenta</DialogTitle>
                            <DialogDescription className="text-gray-500 font-medium">
                                Consulta en vivo detallada desde el sistema Contpaqi Comercial Premium
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Print Title Only */}
                <div className="hidden print:block mb-6">
                    <h1 className="text-3xl font-black tracking-tight mb-1 text-gray-900">Muebles DASO</h1>
                    <h2 className="text-xl font-bold text-indigo-700">Estado de Cuenta Oficial</h2>
                    <p className="text-xs text-gray-500 mt-1">Fecha de consulta: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                    <div className="border-b-2 border-indigo-100 my-4" />
                </div>

                {loading ? (
                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
                        </div>
                        <Skeleton className="h-64 rounded-3xl" />
                    </div>
                ) : !data ? (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No se pudieron cargar los datos de Contpaqi.</p>
                        <Button variant="outline" size="sm" onClick={() => fetchEstadoCuenta(true)} className="mt-4 rounded-xl border-slate-200">
                            <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* Info Header Client */}
                        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
                            <div className="absolute right-0 top-0 opacity-5 transform translate-x-1/4 -translate-y-1/4">
                                <FileText className="h-64 w-64 text-white" />
                            </div>
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full">Cliente Distinguido</span>
                                    <h3 className="text-2xl font-black mt-2">{clienteNombre || data.cliente?.nombre}</h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-indigo-200 font-medium">
                                        <Badge className="bg-indigo-600/30 text-indigo-200 border-none font-bold">
                                            Código: {data.cliente?.codigo}
                                        </Badge>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Estado de cuenta en vivo</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 print:hidden">
                                    <Button variant="secondary" size="icon" onClick={() => fetchEstadoCuenta(true)} className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white border-none">
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Button variant="secondary" onClick={handlePrint} className="rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md font-bold text-xs uppercase px-4 h-10">
                                        <Printer className="h-4 w-4" /> Imprimir
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Balance Summary Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-indigo-50/50 border border-indigo-100/50 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Saldo Pendiente</span>
                                    <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600">
                                        <DollarSign className="h-4 w-4" />
                                    </div>
                                </div>
                                <h4 className="text-2xl font-black text-indigo-950">{formatCurrency(resumen.balance)}</h4>
                                <p className="text-[10px] text-indigo-400 font-semibold mt-1">Deuda en sistema Contpaqi</p>
                            </div>

                            <div className="bg-rose-50/50 border border-rose-100/50 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-rose-600 font-bold uppercase tracking-wider">Saldo Vencido</span>
                                    <div className="bg-rose-100 p-1.5 rounded-lg text-rose-600">
                                        <Scale className="h-4 w-4" />
                                    </div>
                                </div>
                                <h4 className={`text-2xl font-black ${resumen.vencido > 0 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>{formatCurrency(resumen.vencido)}</h4>
                                <p className="text-[10px] text-rose-400 font-semibold mt-1">Importe con atraso reportado</p>
                            </div>

                            <div className="bg-emerald-50/50 border border-emerald-100/50 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Límite de Crédito</span>
                                    <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600">
                                        <ArrowUpRight className="h-4 w-4" />
                                    </div>
                                </div>
                                <h4 className="text-2xl font-black text-emerald-950">{resumen.limite > 0 ? formatCurrency(resumen.limite) : 'Sin límite'}</h4>
                                <p className="text-[10px] text-emerald-400 font-semibold mt-1">Crédito máximo autorizado</p>
                            </div>
                        </div>

                        {/* Documents Table */}
                        <div className="bg-white border border-slate-100 p-4 md:p-6 rounded-3xl shadow-sm">
                            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-500" /> Historial de Documentos y Movimientos
                            </h4>
                            
                            {documentos.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 rounded-2xl text-gray-500 font-medium">
                                    No se encontraron movimientos registrados en Contpaqi.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3.5">Fecha</th>
                                                <th className="px-4 py-3.5">Folio / Documento</th>
                                                <th className="px-4 py-3.5">Concepto</th>
                                                <th className="px-4 py-3.5 text-right">Total</th>
                                                <th className="px-4 py-3.5 text-right">Pendiente</th>
                                                <th className="px-4 py-3.5 text-center">Tipo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-gray-700 font-medium">
                                            {documentos.map((doc: any, i: number) => {
                                                // Safely parse properties with different possible formats (CamelCase or UPPERCASE)
                                                const date = doc.cFecha || doc.cfecha || doc.fecha || '';
                                                const series = doc.cSerie || doc.cserie || doc.serie || '';
                                                const folio = doc.cFolio || doc.cfolio || doc.folio || '';
                                                const docConcept = doc.cNombreConcepto || doc.cnombreconcepto || doc.concepto || doc.conceptoNombre || 'Venta / Cargo';
                                                const total = Number(doc.cTotal || doc.ctotal || doc.total || doc.importe || 0);
                                                const pending = Number(doc.cSaldo || doc.csaldo || doc.saldo || doc.pendiente || doc.cPendiente || 0);
                                                
                                                // Determine if payment (abono) or charge (cargo)
                                                const isPayment = docConcept.toUpperCase().includes('PAGO') || 
                                                                  docConcept.toUpperCase().includes('ABONO') || 
                                                                  docConcept.toUpperCase().includes('RECIBO') || 
                                                                  total < 0 || 
                                                                  (total > 0 && pending === 0 && docConcept.toLowerCase().includes('recibo'));

                                                return (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(date)}</td>
                                                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-bold">
                                                            {series ? `${series}-` : ''}{folio || `DOC-${i+1}`}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-900 text-xs max-w-[200px] truncate">{docConcept}</td>
                                                        <td className={`px-4 py-3 text-right text-xs font-bold ${isPayment ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                            {isPayment ? '-' : ''}{formatCurrency(Math.abs(total))}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-xs font-black text-slate-800">
                                                            {formatCurrency(pending)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {isPayment ? (
                                                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none rounded-lg text-[9px] font-bold px-2 py-0.5 gap-1">
                                                                    <ArrowDownLeft className="h-3 w-3" /> Abono
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-none rounded-lg text-[9px] font-bold px-2 py-0.5 gap-1">
                                                                    <ArrowUpRight className="h-3 w-3" /> Cargo
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Print Footer Only */}
                        <div className="hidden print:block text-center text-[10px] text-gray-400 mt-8 border-t pt-4">
                            Documento generado automáticamente por ERP Muebles DASO. Información en vivo sincronizada con Contpaqi Comercial Premium.
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
