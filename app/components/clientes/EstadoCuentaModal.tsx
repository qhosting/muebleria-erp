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

// Helper para obtener el nombre del concepto del documento de forma ultra-robusta
const getDocConceptName = (doc: any): string => {
    if (!doc) return 'Venta / Cargo';
    
    // 1. Si doc.concepto es un objeto, buscar propiedades dentro
    if (doc.concepto && typeof doc.concepto === 'object') {
        const nested = doc.concepto;
        const name = nested.nombre || nested.Nombre || nested.cNombre || 
                     nested.cNombreConcepto || nested.CNOMBRECONCEPTO || 
                     nested.nombreConcepto || nested.NombreConcepto || 
                     nested.cNombreClasificacion || nested.codigo || 
                     nested.cCodigoConcepto || nested.codigoConcepto ||
                     nested.cnombreconcepto;
        if (name) return String(name);
    }
    
    // 2. Buscar propiedades directas de nombre en todas sus variantes
    const directName = doc.CNOMBRECONCEPTO || 
                       doc.cNombreConcepto || 
                       doc.cnombreconcepto || 
                       doc.nombreConcepto || 
                       doc.NombreConcepto || 
                       doc.cNombreClasificacion || 
                       doc.conceptoNombre || 
                       doc.ConceptoNombre || 
                       doc.cNombre || 
                       doc.Nombre || 
                       doc.nombre;
                       
    if (directName) return String(directName);
    
    // 3. Buscar códigos de conceptos y resolver a nombres amigables si es posible
    const code = doc.codigoConcepto || 
                 doc.cCodigoConcepto || 
                 doc.cCodigo || 
                 doc.codigo || 
                 (typeof doc.concepto === 'string' || typeof doc.concepto === 'number' ? doc.concepto : null) || 
                 doc.Concepto ||
                 doc.CCODIGOCONCEPTO ||
                 doc.CIDCONCEPTO;
                 
    if (code) {
        const codeStr = String(code).trim().toUpperCase();
        
        // Mapeo de códigos de conceptos comunes en el ERP (Queretaro, Lerma, etc.)
        const codeMap: Record<string, string> = {
            '4': 'FACTURA QUERETARO',
            '5': 'FACTURA LERMA',
            '100': 'FACTURA GENERAL',
            '16': 'ABONO CLIENTE',
            '17': 'RECIBO DE PAGO',
            '18': 'NOTA DE CRÉDITO',
            '101': 'PAGO REGULAR',
            '102': 'PAGO MORATORIO'
        };
        
        if (codeMap[codeStr]) {
            return codeMap[codeStr];
        }
        
        // Si ya es una cadena larga de texto descriptivo, retornarla
        if (codeStr.length > 3 && isNaN(Number(codeStr))) {
            return String(code);
        }
        
        return `Concepto ${codeStr}`;
    }
    
    return 'Venta / Cargo';
};

export function EstadoCuentaModal({
    open,
    onOpenChange,
    clienteId,
    clienteNombre
}: EstadoCuentaModalProps) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'movimientos' | 'amortizacion'>('movimientos');

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
            setActiveTab('movimientos');
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

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-slate-100 mb-6 print:hidden">
                            <button
                                onClick={() => setActiveTab('movimientos')}
                                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-300 ${
                                    activeTab === 'movimientos'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Historial de Movimientos
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('amortizacion')}
                                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all duration-300 ${
                                    activeTab === 'amortizacion'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Tabla de Amortización
                                </span>
                            </button>
                        </div>

                        {/* Documents Table Tab */}
                        <div className={`${activeTab === 'movimientos' ? 'block' : 'hidden'} print:block bg-white border border-slate-100 p-4 md:p-6 rounded-3xl shadow-sm`}>
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
                                                const date = doc.cFecha || doc.cfecha || doc.fecha || doc.CFECHA || '';
                                                const series = doc.cSerie || doc.cserie || doc.serie || doc.CSERIE || doc.CSERIEDOCUMENTO || '';
                                                const folio = doc.cFolio || doc.cfolio || doc.folio || doc.CFOLIO || doc.CFOLIOPRODUCTO || '';
                                                const docConcept = getDocConceptName(doc);
                                                const total = Number(doc.cTotal || doc.ctotal || doc.total || doc.importe || doc.CTOTAL || 0);
                                                const pending = Number(doc.cSaldo || doc.csaldo || doc.saldo || doc.pendiente || doc.cPendiente || doc.CSALDO || doc.CPENDIENTE || 0);
                                                
                                                const isPayment = docConcept.toUpperCase().includes('PAGO') || 
                                                                  docConcept.toUpperCase().includes('ABONO') || 
                                                                  docConcept.toUpperCase().includes('RECIBO') || 
                                                                  docConcept.toUpperCase().startsWith('PC') || 
                                                                  docConcept.toUpperCase().includes('PC ') || 
                                                                  total < 0 || 
                                                                  (total > 0 && pending === 0 && (docConcept.toLowerCase().includes('recibo') || docConcept.toUpperCase().startsWith('PC')));

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

                        {/* Amortization Table Tab */}
                        {(() => {
                            const cAmort = data?.cliente?.tablaAmortizacion || [];
                            const cuotasVencidas = cAmort.filter((c: any) => c.tipoVencimiento === 'vencido');
                            const cuotasAdelantadas = cAmort.filter((c: any) => c.tipoVencimiento === 'adelantado');
                            const totalAtraso = cuotasVencidas.reduce((sum: number, c: any) => sum + c.pendiente, 0);
                            const totalAdelantado = cuotasAdelantadas.reduce((sum: number, c: any) => sum + c.pagado, 0);
                            
                            let estatusCobro = 'Al Corriente';
                            let estatusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            
                            if (cuotasVencidas.length > 0) {
                                const periodicidadLabel = data?.cliente?.periodicidad === 'semanal' ? 'Semana(s)' : 
                                                          data?.cliente?.periodicidad === 'catorcenal' ? 'Catorcena(s)' :
                                                          data?.cliente?.periodicidad === 'quincenal' ? 'Quincena(s)' : 'Mes(es)';
                                estatusCobro = `${cuotasVencidas.length} ${periodicidadLabel} de Atraso`;
                                estatusColor = 'bg-red-50 text-red-700 border-red-200';
                            } else if (totalAdelantado > 0) {
                                estatusCobro = 'Adelantado / Al Día';
                                estatusColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                            }

                            const deudaFinanciada = Number(data?.cliente?.deudaFinanciada || 0);
                            const totalAbonosSubsecuentes = Number(data?.cliente?.totalAbonosSubsecuentes || 0);
                            const porcentajePagado = deudaFinanciada > 0 ? Math.min(100, Math.round((totalAbonosSubsecuentes / deudaFinanciada) * 100)) : 0;

                            return (
                                <div className={`${activeTab === 'amortizacion' ? 'block' : 'hidden'} print:block bg-white border border-slate-100 p-4 md:p-6 rounded-3xl shadow-sm space-y-6`}>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                <Calendar className="h-5 w-5 text-indigo-500" /> Tabla de Amortización y Plan de Pagos
                                            </h4>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">Conciliación de pagos distribuidos de forma secuencial por fecha de vencimiento</p>
                                        </div>
                                        <Badge className={`rounded-xl border font-bold text-xs uppercase px-3 py-1 flex items-center gap-1.5 self-start md:self-auto ${estatusColor}`}>
                                            <AlertCircle className="h-3.5 w-3.5" /> {estatusCobro}
                                        </Badge>
                                    </div>

                                    {/* Amortization Metrics Summary */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Monto Facturado</span>
                                            <span className="text-base font-black text-slate-800">{formatCurrency(data?.cliente?.montoFactura || 0)}</span>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Enganche / Pago Inicial</span>
                                            <span className="text-base font-black text-emerald-600">{formatCurrency(data?.cliente?.pagoInicial || 0)}</span>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Deuda Financiada</span>
                                            <span className="text-base font-black text-slate-800">{formatCurrency(deudaFinanciada)}</span>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Vencimiento Real (Atraso)</span>
                                            <span className={`text-base font-black ${totalAtraso > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(totalAtraso)}</span>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                                        <div className="flex justify-between text-xs text-slate-600 font-bold mb-1.5">
                                            <span>Progreso de Financiamiento</span>
                                            <span>{porcentajePagado}% Pagado</span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-2 shadow-inner">
                                            <div 
                                                className="bg-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                                                style={{ width: `${porcentajePagado}%` }} 
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                            <span>PAGADO SUBSECUENTE: {formatCurrency(totalAbonosSubsecuentes)}</span>
                                            <span>RESTANTE FINANCIADO: {formatCurrency(Math.max(0, deudaFinanciada - totalAbonosSubsecuentes))}</span>
                                        </div>
                                    </div>

                                    {/* Installments Table */}
                                    {cAmort.length === 0 ? (
                                        <div className="text-center py-10 bg-slate-50 rounded-2xl text-gray-500 font-medium">
                                            No se pudo generar el plan de pagos amortizado. Verifique la fecha de venta y el monto de pago del cliente.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-4 py-3"># Pago</th>
                                                        <th className="px-4 py-3">Vencimiento</th>
                                                        <th className="px-4 py-3 text-right">Cuota</th>
                                                        <th className="px-4 py-3 text-right">Abonado</th>
                                                        <th className="px-4 py-3 text-right">Pendiente</th>
                                                        <th className="px-4 py-3 text-center">Estado</th>
                                                        <th className="px-4 py-3 text-center">Cobranza</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-gray-700 font-medium">
                                                    {cAmort.map((cuota: any, idx: number) => {
                                                        const isSaldado = cuota.status === 'saldado';
                                                        const isParcial = cuota.status === 'parcial';
                                                        
                                                        let statusBadge = (
                                                            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none rounded-lg text-[9px] font-bold px-2 py-0.5">
                                                                Pendiente
                                                            </Badge>
                                                        );
                                                        if (isSaldado) {
                                                            statusBadge = (
                                                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none rounded-lg text-[9px] font-bold px-2 py-0.5">
                                                                    Saldado
                                                                </Badge>
                                                            );
                                                        } else if (isParcial) {
                                                            statusBadge = (
                                                                <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-none rounded-lg text-[9px] font-bold px-2 py-0.5">
                                                                    Abonado {formatCurrency(cuota.pagado)}
                                                                </Badge>
                                                            );
                                                        }

                                                        let cobranzaBadge = (
                                                            <Badge className="bg-slate-50 text-slate-500 hover:bg-slate-50 border-none rounded-lg text-[9px] font-semibold px-2 py-0.5">
                                                                A futuro
                                                            </Badge>
                                                        );
                                                        if (cuota.tipoVencimiento === 'vencido') {
                                                            cobranzaBadge = (
                                                                <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border-none rounded-lg text-[9px] font-bold px-2 py-0.5 flex items-center gap-1 justify-center max-w-[90px] mx-auto">
                                                                    <AlertCircle className="h-2.5 w-2.5" /> Atrasado
                                                                </Badge>
                                                            );
                                                        } else if (cuota.tipoVencimiento === 'adelantado') {
                                                            cobranzaBadge = (
                                                                <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none rounded-lg text-[9px] font-bold px-2 py-0.5 flex items-center gap-1 justify-center max-w-[90px] mx-auto">
                                                                    <ArrowUpRight className="h-2.5 w-2.5" /> Adelantado
                                                                </Badge>
                                                            );
                                                        } else if (cuota.tipoVencimiento === 'al_corriente') {
                                                            cobranzaBadge = (
                                                                <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-50 border-none rounded-lg text-[9px] font-bold px-2 py-0.5 flex items-center gap-1 justify-center max-w-[90px] mx-auto">
                                                                    Al Corriente
                                                                </Badge>
                                                            );
                                                        }

                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-4 py-2.5 text-xs font-bold text-slate-600">
                                                                    Pago {cuota.numPago} de {cAmort.length}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-slate-500 text-xs">
                                                                    {formatDate(cuota.fechaVencimiento)}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-900">
                                                                    {formatCurrency(cuota.monto)}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right text-xs font-bold text-emerald-600">
                                                                    {formatCurrency(cuota.pagado)}
                                                                </td>
                                                                <td className={`px-4 py-2.5 text-right text-xs font-black ${cuota.pendiente > 0 && cuota.tipoVencimiento === 'vencido' ? 'text-red-600' : 'text-slate-800'}`}>
                                                                    {formatCurrency(cuota.pendiente)}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    {statusBadge}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    {cobranzaBadge}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

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
