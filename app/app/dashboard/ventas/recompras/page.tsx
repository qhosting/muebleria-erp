'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Users, Zap, Search, Clock, CheckCircle2, 
    Bot, Phone, MessageSquare, ArrowUpRight,
    Star, ShoppingBag, Calendar, Sparkles,
    RefreshCw, ChevronRight, Gift, Trash2,
    MoreVertical,
    FileText
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { EstadoCuentaModal } from '@/components/clientes/EstadoCuentaModal';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RecompraLead {
    id: string;
    nombre: string;
    telefono: string | null;
    interes: string | null;
    estado: string;
    notes?: string | null; // Optional
    notas: string | null;
    createdAt: string;
    clienteId: string | null;
    codigoCliente?: string | null;
}

interface Prediccion {
    clienteId: string;
    nombre: string;
    telefono: string | null;
    saldoActual: number;
    pagosRestantes: number;
    fechaEstimada: string;
    productoActual: string;
    rating?: string;
}

export default function RecomprasPage() {
    const [leads, setLeads] = useState<RecompraLead[]>([]);
    const [predicciones, setPredicciones] = useState<Prediccion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('liquidados');
    const [validaciones, setValidaciones] = useState<Record<string, any>>({});
    const [validatingId, setValidatingId] = useState<string | null>(null);
    const [isValidatingAll, setIsValidatingAll] = useState(false);

    // Estado Cuenta Modal Trigger states
    const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
    const [selectedClienteNombre, setSelectedClienteNombre] = useState<string | null>(null);
    const [isEstadoCuentaOpen, setIsEstadoCuentaOpen] = useState(false);
    const [estadoCuentaTab, setEstadoCuentaTab] = useState<'movimientos' | 'amortizacion'>('movimientos');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Cargar leads de origen 'recompra'
            const resLeads = await fetch('/api/ventas/leads?origen=recompra&all=true');
            if (resLeads.ok) {
                const allLeads = await resLeads.json();
                setLeads(allLeads.filter((l: any) => l.origen === 'recompra'));
            }

            // Cargar predicciones IA
            const resPred = await fetch('/api/ventas/recompras/analisis?meses=2');
            if (resPred.ok) setPredicciones(await resPred.json());
            
        } catch (error) {
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const obtenerClasificacionYStatus = (validationData: any) => {
        if (!validationData || !validationData.clasificaciones) {
            return { rating: 'Sin clasificar', status: 'N/A' };
        }

        const clasifValues = Object.values(validationData.clasificaciones)
            .map((v: any) => v?.toString().trim())
            .filter((v: any) => v && v !== 'N/A' && v !== '') || [];

        const ratings = ['EXCELENTE', 'BUENO', 'REGULAR', 'MALO'];
        const statuses = ['PAGADO', 'CANCELADO', 'COBRANZA NORMAL', 'COBRANZA', 'MORA', 'ATRASADO', 'DEMANDADO', 'JURIDICO'];

        // Buscar rating en las clasificaciones
        let rating = clasifValues.find((v: any) => ratings.some(r => v.toUpperCase().includes(r)));
        if (!rating) {
            const c1 = validationData.clasificaciones.cNombreClasificacion1;
            if (c1 && c1 !== 'N/A' && c1 !== '') {
                rating = c1;
            }
        }

        // Buscar status en las clasificaciones
        let status = clasifValues.find((v: any) => statuses.some(s => v.toUpperCase().includes(s)));
        if (!status) {
            const c2 = validationData.clasificaciones.cNombreClasificacion2;
            if (c2 && c2 !== 'N/A' && c2 !== '') {
                status = c2;
            }
        }

        return {
            rating: rating || 'Sin clasificar',
            status: status || 'Normal'
        };
    };

    const validarClienteSilent = async (leadId: string) => {
        try {
            const res = await fetch('/api/ventas/recompras/validar-contpaqi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId })
            });
            if (res.ok) {
                const data = await res.json();
                setValidaciones((prev: Record<string, any>) => ({ ...prev, [leadId]: data }));
            }
        } catch (error) {
            console.error('Error in silent validation:', error);
        }
    };

    // Auto-validación en segundo plano al cargar leads
    useEffect(() => {
        if (leads.length > 0) {
            leads.forEach((lead: any) => {
                if (lead.codigoCliente && !validaciones[lead.id]) {
                    validarClienteSilent(lead.id);
                }
            });
        }
    }, [leads]);

    const sendWhatsApp = (telefono: string | null, nombre: string, tipo: 'felicitacion' | 'oferta') => {
        if (!telefono) {
            toast.error('El cliente no tiene teléfono registrado');
            return;
        }
        
        let mensaje = '';
        if (tipo === 'felicitacion') {
            mensaje = `¡Hola ${nombre}! 👋 Te saludamos de Muebles DASO. Queremos felicitarte por haber liquidado tu cuenta con nosotros. ✨ ¡Tu buen historial de pago te otorga beneficios exclusivos en tu próxima compra! 🎁 ¿Te gustaría conocer nuestras ofertas actuales?`;
        } else {
            mensaje = `¡Hola ${nombre}! 👋 Vimos que estás por terminar de pagar tu cuenta en Muebles DASO. 🥳 ¡Muchas felicidades! Como cliente distinguido, tenemos una preventa especial para ti en nuevos modelos de colchones y salas. 🛋️ ¿Te interesa que te enviemos el catálogo?`;
        }

        const url = `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    };

    const validarCliente = async (leadId: string) => {
        setValidatingId(leadId);
        try {
            const res = await fetch('/api/ventas/recompras/validar-contpaqi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId })
            });
            
            if (res.ok) {
                const data = await res.json();
                 setValidaciones((prev: Record<string, any>) => ({ ...prev, [leadId]: data }));
                toast.success('Clasificaciones obtenidas de Contpaqi');
            } else {
                const error = await res.json();
                toast.error(error.error || 'Error al validar con Contpaqi');
            }
        } catch (error) {
            toast.error('Error de conexión con el servidor');
        } finally {
            setValidatingId(null);
        }
    };

    const validarTodos = async () => {
        const leadsToValidate = filteredLeads.filter((l: any) => l.codigoCliente);
        if (leadsToValidate.length === 0) {
            toast.error('No hay clientes con código de Contpaqi para validar');
            return;
        }

        setIsValidatingAll(true);
        let successCount = 0;
        let errorCount = 0;

        toast.info(`Iniciando consulta de ${leadsToValidate.length} clientes en Contpaqi...`);

        for (let i = 0; i < leadsToValidate.length; i++) {
            const lead = leadsToValidate[i];
            try {
                const res = await fetch('/api/ventas/recompras/validar-contpaqi', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leadId: lead.id })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setValidaciones((prev: Record<string, any>) => ({ ...prev, [lead.id]: data }));
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
            }
        }

        setIsValidatingAll(false);
        toast.success(`Consulta finalizada. Exitosos: ${successCount}, Errores: ${errorCount}`);
    };

    const eliminarLead = async (leadId: string) => {
        if (!confirm('¿Está seguro de que desea eliminar este cliente de recompras?')) {
            return;
        }

        try {
            const res = await fetch(`/api/ventas/leads/${leadId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                toast.success('Cliente eliminado de recompras');
                 setLeads((prev: RecompraLead[]) => prev.filter((l: RecompraLead) => l.id !== leadId));
            } else {
                const error = await res.json();
                toast.error(error.error || 'Error al eliminar');
            }
        } catch (error) {
            toast.error('Error de conexión al eliminar');
        }
    };

    const filteredLeads = leads.filter((l: any) => 
        l.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.telefono && l.telefono.includes(searchTerm))
    );

    const filteredPreds = predicciones.filter((p: any) => 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header Premium */}
                <div className="bg-gradient-to-br from-purple-700 via-indigo-800 to-blue-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                        <Sparkles className="h-64 w-64" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl">
                                <ShoppingBag className="h-5 w-5 text-purple-200" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-widest text-purple-200">Módulo de Fidelización</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight mb-2">Programa de Recompras</h1>
                        <p className="text-indigo-100 max-w-2xl text-lg opacity-90">
                            Identifica clientes con excelente historial para ofrecerles nuevos productos y recompensar su puntualidad.
                        </p>
                    </div>
                </div>

                {/* Main Content */}
                <Tabs defaultValue="liquidados" className="w-full" onValueChange={(val: any) => setActiveTab(val)}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <TabsList className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 h-auto">
                            <TabsTrigger value="liquidados" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Liquidados
                            </TabsTrigger>
                            <TabsTrigger value="proximos" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                                <Sparkles className="h-4 w-4 mr-2" /> Próximos (IA)
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input 
                                    placeholder="Buscar cliente..." 
                                    className="pl-10 bg-white border-none shadow-sm rounded-xl h-11"
                                    value={searchTerm}
                                    onChange={(e: any) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {activeTab === 'liquidados' && (
                                <Button 
                                    variant="outline" 
                                    className="h-11 rounded-xl bg-white shadow-sm border-none gap-2 px-4 text-indigo-600 font-bold text-xs uppercase" 
                                    onClick={validarTodos}
                                    disabled={isValidatingAll || filteredLeads.length === 0}
                                >
                                    <RefreshCw className={`h-4 w-4 ${isValidatingAll ? 'animate-spin' : ''}`} />
                                    {isValidatingAll ? 'Validando...' : 'Consultar Contpaqi'}
                                </Button>
                            )}
                            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl bg-white shadow-sm border-none" onClick={fetchData}>
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>

                    {/* Tab: Liquidados */}
                    <TabsContent value="liquidados" className="m-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {loading ? (
                                [...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-3xl" />)
                            ) : filteredLeads.length === 0 ? (
                                <div className="col-span-full bg-white rounded-3xl p-20 text-center shadow-sm border border-dashed border-gray-200">
                                    <div className="bg-indigo-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Gift className="h-10 w-10 text-indigo-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">Sin clientes liquidados</h3>
                                    <p className="text-gray-500 mt-2">Los clientes que terminen su cuenta aparecerán aquí automáticamente.</p>
                                </div>
                            ) : (
                                filteredLeads.map((lead: any) => {
                                    const validation = validaciones[lead.id];
                                    const hasValidation = !!validation;
                                    const info = obtenerClasificacionYStatus(validation);

                                    // Determinar color de badge de calificación
                                    const ratingUpper = info.rating.toUpperCase();
                                    let ratingColorClass = 'bg-indigo-100 text-indigo-800'; // Default
                                    if (ratingUpper.includes('EXCELENTE')) ratingColorClass = 'bg-emerald-100 text-emerald-800 font-bold';
                                    else if (ratingUpper.includes('BUENO')) ratingColorClass = 'bg-green-100 text-green-800';
                                    else if (ratingUpper.includes('REGULAR')) ratingColorClass = 'bg-amber-100 text-amber-800';
                                    else if (ratingUpper.includes('MALO')) ratingColorClass = 'bg-red-100 text-red-800';

                                    // Determinar color de badge de estatus
                                    const statusUpper = info.status.toUpperCase();
                                    let statusColorClass = 'bg-slate-100 text-slate-800';
                                    if (statusUpper.includes('PAGADO')) statusColorClass = 'bg-blue-100 text-blue-800';
                                    else if (statusUpper.includes('COBRANZA NORMAL') || statusUpper.includes('COBRANZA') || statusUpper.includes('NORMAL')) statusColorClass = 'bg-sky-100 text-sky-800';
                                    else if (statusUpper.includes('CANCELADO')) statusColorClass = 'bg-gray-100 text-gray-800';
                                    else if (statusUpper.includes('ATRASADO') || statusUpper.includes('MORA')) statusColorClass = 'bg-orange-100 text-orange-800';
                                    else if (statusUpper.includes('DEMANDADO') || statusUpper.includes('JURIDICO')) statusColorClass = 'bg-rose-100 text-rose-800';

                                    return (
                                        <Card key={lead.id} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl bg-white overflow-hidden group">
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start">
                                                    <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg mb-4">
                                                        {lead.nombre.charAt(0)}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        {hasValidation ? (
                                                            <Badge className={`${ratingColorClass} hover:bg-opacity-80 border-none rounded-lg px-3 py-1`}>
                                                                {info.rating}
                                                            </Badge>
                                                        ) : validatingId === lead.id ? (
                                                            <Badge className="bg-gray-100 text-gray-400 border-none rounded-lg px-3 py-1 animate-pulse">
                                                                Validando...
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-none rounded-lg px-3 py-1">
                                                                Pendiente ⏳
                                                            </Badge>
                                                        )}

                                                        {lead.clienteId && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                                                        <MoreVertical className="h-4.5 w-4.5" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-white border border-slate-100 rounded-xl shadow-md p-1 min-w-[170px] z-20">
                                                                    <DropdownMenuItem 
                                                                        onClick={() => {
                                                                            setSelectedClienteId(lead.clienteId);
                                                                            setSelectedClienteNombre(lead.nombre);
                                                                            setEstadoCuentaTab('movimientos');
                                                                            setIsEstadoCuentaOpen(true);
                                                                        }}
                                                                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors"
                                                                    >
                                                                        <FileText className="h-4 w-4 text-blue-500" /> Estado de Cuenta
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem 
                                                                        onClick={() => {
                                                                            setSelectedClienteId(lead.clienteId);
                                                                            setSelectedClienteNombre(lead.nombre);
                                                                            setEstadoCuentaTab('amortizacion');
                                                                            setIsEstadoCuentaOpen(true);
                                                                        }}
                                                                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors"
                                                                    >
                                                                        <Calendar className="h-4 w-4 text-indigo-500" /> Tabla de Amortización
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                </div>
                                                <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                    {lead.nombre}
                                                </CardTitle>
                                                <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                                                    <span className="flex items-center gap-1.5">
                                                        <Phone className="h-3 w-3" /> {lead.telefono || 'Sin teléfono'}
                                                    </span>
                                                    {lead.codigoCliente && (
                                                        <Badge variant="outline" className="text-[10px] font-bold border-indigo-100 bg-indigo-50/30 text-indigo-600 rounded-md px-1.5 py-0.5">
                                                            Código: {lead.codigoCliente}
                                                        </Badge>
                                                    )}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="bg-indigo-50/50 p-4 rounded-2xl mb-3 border border-indigo-100/50">
                                                    <p className="text-sm text-indigo-900 font-medium line-clamp-2">
                                                        {lead.interes}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                                                        <Calendar className="h-3 w-3" /> Liquidado el {formatDate(lead.createdAt)}
                                                    </div>
                                                    {validation?.fechaPrimerPago && (
                                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                                                            <Calendar className="h-3 w-3" /> Primer Pago: {formatDate(validation.fechaPrimerPago)}
                                                        </div>
                                                    )}
                                                    {validation?.fechaUltimoPago && (
                                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                                                            <Calendar className="h-3 w-3" /> Último Pago: {formatDate(validation.fechaUltimoPago)}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Estatus Actual de Contpaqi */}
                                                <div className="flex items-center justify-between py-2 px-1 border-t border-gray-50 mb-3 mt-1">
                                                    <span className="text-xs text-gray-500 font-medium">Estatus Actual:</span>
                                                    {hasValidation ? (
                                                        <Badge className={`${statusColorClass} border-none rounded-lg px-2.5 py-0.5 text-xs font-bold`}>
                                                            {info.status}
                                                        </Badge>
                                                    ) : validatingId === lead.id ? (
                                                        <span className="text-xs text-gray-400 animate-pulse">Consultando Contpaqi...</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">No validado</span>
                                                    )}
                                                </div>
                                                
                                                {validation && (
                                                    <div className="space-y-3 mb-4">
                                                        {/* Alerta de Recompra Ya Realizada */}
                                                        {validation.recompraActiva && (
                                                            <div className="bg-green-50 p-3 rounded-2xl border border-green-100 flex items-start gap-3">
                                                                 <div className="bg-green-500 p-1.5 rounded-lg">
                                                                     <ShoppingBag className="h-3 w-3 text-white" />
                                                                 </div>
                                                                 <div>
                                                                     <p className="text-[10px] font-black text-green-600 uppercase tracking-wider">Ya tiene nueva cuenta</p>
                                                                     <p className="text-xs font-bold text-green-900 leading-tight">
                                                                         {validation.recompraActiva.descripcionProducto}
                                                                     </p>
                                                                     <p className="text-[9px] text-green-500 font-medium mt-0.5">
                                                                         Sincronizado: {validation.recompraActiva.codigoCliente}
                                                                     </p>
                                                                 </div>
                                                            </div>
                                                        )}

                                                        <div className="bg-indigo-50/30 p-3 rounded-2xl border border-dashed border-indigo-200">
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                <Sparkles className="h-3 w-3 text-indigo-500" />
                                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tight">Status Contpaqi</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {Object.values(validation.clasificaciones)
                                                                    .filter((v: any) => v !== 'N/A' && v !== '')
                                                                    .map((val: any, i: number) => {
                                                                        const isRating = ['BUENO', 'REGULAR', 'EXCELENTE'].some(r => val.toString().toUpperCase().includes(r));
                                                                        const isPayment = ['PAGADO', 'PAGAGO'].some(p => val.toString().toUpperCase().includes(p));
                                                                        
                                                                        return (
                                                                            <div 
                                                                                key={i} 
                                                                                className={`px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm ${
                                                                                    isRating ? 'bg-purple-100 text-purple-700' : 
                                                                                    isPayment ? 'bg-blue-100 text-blue-700' : 
                                                                                    'bg-white text-gray-500'
                                                                                }`}
                                                                            >
                                                                                {val}
                                                                            </div>
                                                                        );
                                                                    })
                                                                }
                                                                {Object.values(validation.clasificaciones).every((v: any) => v === 'N/A' || v === '') && (
                                                                    <span className="text-[10px] text-gray-400 italic">Sin clasificaciones asignadas</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="flex gap-2">
                                                    <Button 
                                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md gap-2"
                                                        onClick={() => sendWhatsApp(lead.telefono, lead.nombre, 'felicitacion')}
                                                    >
                                                        <MessageSquare className="h-4 w-4" /> Felicitar
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        className="rounded-xl border-indigo-100 hover:bg-indigo-50 px-3 h-10"
                                                        onClick={() => validarCliente(lead.id)}
                                                        disabled={validatingId === lead.id}
                                                    >
                                                        {validatingId === lead.id ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                                                        ) : (
                                                            <span className="text-indigo-600 font-bold text-xs uppercase">Validar</span>
                                                        )}
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        className="rounded-xl border-indigo-100 hover:bg-indigo-50" 
                                                        size="icon"
                                                        onClick={() => {
                                                            const query = lead.codigoCliente || lead.nombre;
                                                            window.location.href = `/dashboard/clientes?search=${encodeURIComponent(query)}`;
                                                        }}
                                                    >
                                                        <ChevronRight className="h-4 w-4 text-indigo-600" />
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        className="rounded-xl border-red-100 hover:bg-red-50" 
                                                        size="icon"
                                                        onClick={() => eliminarLead(lead.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    </TabsContent>

                    {/* Tab: Próximos (IA) */}
                    <TabsContent value="proximos" className="m-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {loading ? (
                                [...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-3xl" />)
                            ) : filteredPreds.length === 0 ? (
                                <div className="col-span-full bg-white rounded-3xl p-20 text-center shadow-sm">
                                    <Bot className="h-16 w-16 text-purple-200 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-gray-800">No hay predicciones cercanas</h3>
                                    <p className="text-gray-500 mt-2">La IA no detecta clientes liquidando en el corto plazo.</p>
                                </div>
                            ) : (
                                filteredPreds.map((pred: any) => (
                                    <Card key={pred.clienteId} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl bg-white overflow-hidden border-l-4 border-l-purple-500">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg mb-2">
                                                    {pred.nombre.charAt(0)}
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none rounded-lg font-bold">
                                                        {pred.pagosRestantes} pagos restantes
                                                    </Badge>

                                                    {pred.clienteId && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                                                    <MoreVertical className="h-4.5 w-4.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-white border border-slate-100 rounded-xl shadow-md p-1 min-w-[170px] z-20">
                                                                <DropdownMenuItem 
                                                                    onClick={() => {
                                                                        setSelectedClienteId(pred.clienteId);
                                                                        setSelectedClienteNombre(pred.nombre);
                                                                        setEstadoCuentaTab('movimientos');
                                                                        setIsEstadoCuentaOpen(true);
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors"
                                                                >
                                                                    <FileText className="h-4 w-4 text-blue-500" /> Estado de Cuenta
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem 
                                                                    onClick={() => {
                                                                        setSelectedClienteId(pred.clienteId);
                                                                        setSelectedClienteNombre(pred.nombre);
                                                                        setEstadoCuentaTab('amortizacion');
                                                                        setIsEstadoCuentaOpen(true);
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors"
                                                                >
                                                                    <Calendar className="h-4 w-4 text-indigo-500" /> Tabla de Amortización
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </div>
                                            <CardTitle className="text-lg font-bold">{pred.nombre}</CardTitle>
                                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 mb-1.5 font-medium">
                                                <Phone className="h-3 w-3" /> {pred.telefono || 'Sin teléfono'}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex -space-x-1">
                                                    {(() => {
                                                        const rating = pred.rating?.toUpperCase() || '';
                                                        let stars = 4;
                                                        let label = 'Excelente Pagador';
                                                        
                                                        if (rating.includes('EXCELENTE')) {
                                                            stars = 5;
                                                            label = 'Excelente Pagador';
                                                        } else if (rating.includes('BUENO')) {
                                                            stars = 4;
                                                            label = 'Buen Pagador';
                                                        } else if (rating.includes('REGULAR')) {
                                                            stars = 3;
                                                            label = 'Pagador Regular';
                                                        } else if (rating.includes('MALO')) {
                                                            stars = 2;
                                                            label = 'Pagador con Atrasos';
                                                        }
                                                        
                                                        return (
                                                            <>
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star key={i} className={`h-3 w-3 ${i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                                                                ))}
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter ml-1.5">{label}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3 mb-4">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500">Saldo pendiente:</span>
                                                    <span className="font-bold text-red-500">{formatCurrency(pred.saldoActual)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500">Producto actual:</span>
                                                    <span className="font-medium text-gray-700">{pred.productoActual}</span>
                                                </div>
                                                <div className="bg-purple-50 p-3 rounded-xl flex items-center gap-3">
                                                    <Clock className="h-4 w-4 text-purple-600" />
                                                    <div>
                                                        <p className="text-[10px] text-purple-400 font-bold uppercase">Estimado liquidación</p>
                                                        <p className="text-sm font-bold text-purple-900">{formatDate(pred.fechaEstimada)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <Button 
                                                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md gap-2"
                                                onClick={() => sendWhatsApp(pred.telefono, pred.nombre, 'oferta')}
                                            >
                                                <Zap className="h-4 w-4" /> Oferta Anticipada
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                             )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal de Estado de Cuenta Compartido y Amortización */}
            <EstadoCuentaModal 
                open={isEstadoCuentaOpen} 
                onOpenChange={setIsEstadoCuentaOpen} 
                clienteId={selectedClienteId} 
                clienteNombre={selectedClienteNombre} 
                initialTab={estadoCuentaTab}
            />
        </DashboardLayout>
    );
}
