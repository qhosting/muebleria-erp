
'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Users, 
    MessageSquare, 
    Zap, 
    Filter, 
    Search, 
    Clock, 
    ExternalLink, 
    UserPlus,
    CheckCircle2,
    AlertCircle,
    Bot
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function LeadsPage() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLeads();
    }, [filter]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const url = filter === 'all' ? '/api/ventas/leads' : `/api/ventas/leads?intencion=${filter}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setLeads(data);
            }
        } catch (error) {
            console.error('Error fetching leads:', error);
            toast.error('Error al cargar los leads');
        } finally {
            setLoading(false);
        }
    };

    const getIntentBadge = (intent: string) => {
        switch (intent) {
            case 'VENTA': return <Badge className="bg-green-100 text-green-700 border-green-200">Venta</Badge>;
            case 'COBRANZA': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Cobranza</Badge>;
            case 'SOPORTE': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Soporte</Badge>;
            case 'HUMANO': return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Atención Humana</Badge>;
            case 'GENERAL': return <Badge variant="outline" className="text-gray-500">General</Badge>;
            default: return <Badge variant="outline">{intent}</Badge>;
        }
    };

    const getUrgencyBadge = (urgency: string) => {
        switch (urgency) {
            case 'ALTA': return <Badge className="bg-red-500 text-white">Alta</Badge>;
            case 'MEDIA': return <Badge className="bg-yellow-500 text-white">Media</Badge>;
            case 'BAJA': return <Badge className="bg-blue-500 text-white">Baja</Badge>;
            default: return null;
        }
    };

    const filteredLeads = leads.filter(lead => 
        lead.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.telefono && lead.telefono.includes(searchTerm)) ||
        (lead.resumenInterno && lead.resumenInterno.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-2xl text-white shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                        <Bot className="h-64 w-64" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                                <Zap className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-blue-100 italic">Módulo IA Sofia</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight">Gestión de Leads AI</h1>
                        <p className="text-blue-100 mt-2 max-w-2xl text-lg font-light">
                            Monitorea en tiempo real los prospectos detectados por Sofía en WhatsApp. 
                            Clasificación automática de intención y urgencia.
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Leads Hoy</p>
                                    <h3 className="text-3xl font-bold mt-1 text-gray-900">{leads.length}</h3>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Ventas Detectadas</p>
                                    <h3 className="text-3xl font-bold mt-1 text-green-600">
                                        {leads.filter(l => l.intencion === 'VENTA').length}
                                    </h3>
                                </div>
                                <div className="bg-green-50 p-3 rounded-xl">
                                    <Zap className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Urgencia Alta</p>
                                    <h3 className="text-3xl font-bold mt-1 text-red-600">
                                        {leads.filter(l => l.urgencia === 'ALTA').length}
                                    </h3>
                                </div>
                                <div className="bg-red-50 p-3 rounded-xl">
                                    <AlertCircle className="h-6 w-6 text-red-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Pendientes</p>
                                    <h3 className="text-3xl font-bold mt-1 text-orange-600">
                                        {leads.filter(l => l.estado === 'nuevo').length}
                                    </h3>
                                </div>
                                <div className="bg-orange-50 p-3 rounded-xl">
                                    <Clock className="h-6 w-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Buscar por nombre, teléfono o resumen..." 
                            className="pl-10 h-11 bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <Button 
                            variant={filter === 'all' ? 'default' : 'outline'} 
                            onClick={() => setFilter('all')}
                            className="rounded-full px-6 h-10 font-bold"
                        >
                            Todos
                        </Button>
                        <Button 
                            variant={filter === 'VENTA' ? 'default' : 'outline'} 
                            onClick={() => setFilter('VENTA')}
                            className="rounded-full px-6 h-10 font-bold border-green-200 text-green-700 hover:bg-green-50"
                        >
                            Ventas
                        </Button>
                        <Button 
                            variant={filter === 'COBRANZA' ? 'default' : 'outline'} 
                            onClick={() => setFilter('COBRANZA')}
                            className="rounded-full px-6 h-10 font-bold border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                            Cobranza
                        </Button>
                        <Button 
                            variant={filter === 'SOPORTE' ? 'default' : 'outline'} 
                            onClick={() => setFilter('SOPORTE')}
                            className="rounded-full px-6 h-10 font-bold border-purple-200 text-purple-700 hover:bg-purple-50"
                        >
                            Soporte
                        </Button>
                    </div>
                </div>

                {/* Leads List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {loading ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-500 font-medium">Cargando prospectos...</p>
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-2xl shadow-sm">
                            <MessageSquare className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900">No se encontraron leads</h3>
                            <p className="text-gray-500 mt-2">Los nuevos mensajes de WhatsApp aparecerán aquí automáticamente.</p>
                        </div>
                    ) : (
                        filteredLeads.map((lead) => (
                            <Card key={lead.id} className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-100">
                                                {lead.nombre.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    {lead.nombre}
                                                    {getUrgencyBadge(lead.urgencia)}
                                                </h3>
                                                <p className="text-sm text-gray-500 flex items-center gap-1 font-mono">
                                                    {lead.telefono}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {getIntentBadge(lead.intencion)}
                                            <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDate(lead.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Bot className="h-4 w-4 text-blue-600" />
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter">Resumen de Sofía</span>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed italic">
                                            "{lead.resumenInterno || 'Sin resumen disponible'}"
                                        </p>
                                    </div>

                                    {lead.datosExtraidos?.producto && (
                                        <div className="flex items-center gap-2 mb-4">
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 py-1">
                                                📦 {lead.datosExtraidos.producto}
                                            </Badge>
                                            {lead.datosExtraidos.presupuesto && (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 py-1">
                                                    💰 {lead.datosExtraidos.presupuesto}
                                                </Badge>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <div className="text-xs text-gray-400">
                                            Asignado a: <span className="font-bold text-gray-600">{lead.vendedor?.name || 'AI Sofía'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" className="text-blue-600 font-bold hover:bg-blue-50 rounded-lg">
                                                Ver Chat
                                            </Button>
                                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 font-bold px-4 rounded-lg shadow-lg shadow-blue-100">
                                                Atender
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
