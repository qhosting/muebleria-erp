
'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Users, MessageSquare, Zap, Search, Clock, UserPlus,
    CheckCircle2, AlertCircle, Bot, Phone, ArrowRight,
    XCircle, Trash2, RefreshCw, Send, ChevronDown, Eye
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Lead {
    id: string;
    nombre: string;
    telefono: string | null;
    direccionArea: string | null;
    interes: string | null;
    montoEstimado: number | null;
    estado: string;
    origen: string;
    intencion: string | null;
    urgencia: string | null;
    resumenInterno: string | null;
    respuestaIA: string | null;
    datosExtraidos: any;
    notas: string | null;
    vendedorId: string | null;
    vendedor: { id: string; name: string } | null;
    createdAt: string;
}

interface ChatMessage {
    id: string;
    rol: string;
    mensaje: string;
    createdAt: string;
}

const ESTADOS = [
    { value: 'nuevo', label: 'Nuevo', color: 'bg-blue-100 text-blue-700' },
    { value: 'contactado', label: 'Contactado', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'negociacion', label: 'Negociación', color: 'bg-purple-100 text-purple-700' },
    { value: 'convertido', label: 'Convertido', color: 'bg-green-100 text-green-700' },
    { value: 'descartado', label: 'Descartado', color: 'bg-gray-100 text-gray-500' },
];

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [estadoFilter, setEstadoFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [chatOpen, setChatOpen] = useState(false);
    const [chatLeadId, setChatLeadId] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatLeadName, setChatLeadName] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [newLead, setNewLead] = useState({ nombre: '', telefono: '', interes: '', notas: '', origen: 'oficina' });
    const [saving, setSaving] = useState(false);
    const [blacklist, setBlacklist] = useState<string[]>([]);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.set('intencion', filter);
            params.set('all', 'true');
            const response = await fetch(`/api/ventas/leads?${params}`);
            if (response.ok) setLeads(await response.json());
        } catch (error) {
            toast.error('Error al cargar los leads');
        } finally {
            setLoading(false);
        }
    }, [filter]);

    const fetchBlacklist = useCallback(async () => {
        try {
            const res = await fetch('/api/ventas/leads/blacklist');
            if (res.ok) {
                const data = await res.json();
                setBlacklist(data.blacklist || []);
            }
        } catch (error) {
            console.error('Error al cargar la lista negra:', error);
        }
    }, []);

    useEffect(() => { 
        fetchLeads(); 
        fetchBlacklist();
    }, [fetchLeads, fetchBlacklist]);

    useEffect(() => {
        fetch('/api/users').then(r => r.ok ? r.json() : []).then(users => {
            setVendedores(users.filter((u: any) => ['vendedor', 'jefe_ventas', 'admin', 'gestor_cobranza'].includes(u.role) && u.isActive));
        }).catch(() => {});
    }, []);

    const toggleBlacklist = async (phone: string | null) => {
        if (!phone) {
            toast.error('El prospecto no tiene número de teléfono asignado');
            return;
        }
        try {
            const res = await fetch('/api/ventas/leads/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });
            if (res.ok) {
                const data = await res.json();
                setBlacklist(data.blacklist || []);
                if (data.blacklisted) {
                    toast.success('IA desactivada para este contacto (Lista Negra)');
                } else {
                    toast.success('IA reactivada para este contacto');
                }
            } else {
                toast.error('Error al actualizar la lista negra');
            }
        } catch {
            toast.error('Error de red al actualizar la lista negra');
        }
    };

    // --- Actions ---
    const updateLeadState = async (leadId: string, estado: string) => {
        try {
            const res = await fetch(`/api/ventas/leads/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado })
            });
            if (res.ok) {
                const updated = await res.json();
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updated } : l));
                toast.success(`Prospecto marcado como "${ESTADOS.find(e => e.value === estado)?.label}"`);
            }
        } catch { toast.error('Error al actualizar el prospecto'); }
    };

    const assignVendedor = async (leadId: string, vendedorId: string) => {
        try {
            const res = await fetch(`/api/ventas/leads/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vendedorId: vendedorId === 'none' ? null : vendedorId })
            });
            if (res.ok) {
                const updated = await res.json();
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updated } : l));
                toast.success('Vendedor asignado correctamente');
            }
        } catch { toast.error('Error al asignar vendedor'); }
    };

    const eliminarLead = async (leadId: string) => {
        if (!confirm('¿Eliminar este prospecto permanentemente?')) return;
        try {
            const res = await fetch(`/api/ventas/leads/${leadId}`, { method: 'DELETE' });
            if (res.ok) {
                setLeads(prev => prev.filter(l => l.id !== leadId));
                toast.success('Prospecto eliminado');
            }
        } catch { toast.error('Error al eliminar prospecto'); }
    };

    const openChat = async (lead: Lead) => {
        setChatLeadId(lead.id);
        setChatLeadName(lead.nombre);
        setChatOpen(true);
        setChatLoading(true);
        try {
            const res = await fetch(`/api/ventas/leads/${lead.id}`);
            if (res.ok) {
                const data = await res.json();
                setChatMessages(data.chats || []);
            }
        } catch { toast.error('Error al cargar conversación'); }
        finally { setChatLoading(false); }
    };

    const createNewLead = async () => {
        if (!newLead.nombre.trim()) { toast.error('El nombre es requerido'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/ventas/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newLead, estado: 'nuevo' })
            });
            if (res.ok) {
                toast.success('Prospecto creado exitosamente');
                setCreateOpen(false);
                setNewLead({ nombre: '', telefono: '', interes: '', notas: '', origen: 'oficina' });
                fetchLeads();
            }
        } catch { toast.error('Error al crear prospecto'); }
        finally { setSaving(false); }
    };

    // --- Filters ---
    const filteredLeads = leads.filter(lead => {
        const matchSearch = !searchTerm ||
            lead.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (lead.telefono && lead.telefono.includes(searchTerm)) ||
            (lead.resumenInterno && lead.resumenInterno.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchEstado = estadoFilter === 'all' || lead.estado === estadoFilter;
        return matchSearch && matchEstado;
    });

    // --- Badge Helpers ---
    const getIntentBadge = (intent: string | null) => {
        const labels: Record<string, string> = { VENTA: 'Venta', COBRANZA: 'Cobranza', SOPORTE: 'Soporte', HUMANO: 'Atención Humana', GENERAL: 'General' };
        const map: Record<string, string> = {
            VENTA: 'bg-green-100 text-green-700', COBRANZA: 'bg-blue-100 text-blue-700',
            SOPORTE: 'bg-purple-100 text-purple-700', HUMANO: 'bg-orange-100 text-orange-700',
            GENERAL: 'bg-gray-100 text-gray-600'
        };
        return intent ? <Badge className={map[intent] || 'bg-gray-100'}>{labels[intent] || intent}</Badge> : null;
    };

    const getUrgencyDot = (u: string | null) => {
        if (u === 'ALTA') return <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block animate-pulse" title="Urgente" />;
        if (u === 'MEDIA') return <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 inline-block" title="Urgencia media" />;
        return null;
    };

    const getEstadoBadge = (estado: string) => {
        const e = ESTADOS.find(s => s.value === estado);
        return <Badge className={e?.color || 'bg-gray-100'}>{e?.label || estado}</Badge>;
    };

    const stats = {
        total: leads.length,
        ventas: leads.filter(l => l.intencion === 'VENTA').length,
        urgentes: leads.filter(l => l.urgencia === 'ALTA').length,
        nuevos: leads.filter(l => l.estado === 'nuevo').length,
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 lg:p-8 rounded-2xl text-white shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                        <Bot className="h-48 w-48" />
                    </div>
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="bg-white/20 p-2 rounded-lg"><Zap className="h-4 w-4" /></div>
                                <span className="text-xs font-bold uppercase tracking-widest text-blue-200">Módulo IA Sofía</span>
                            </div>
                            <h1 className="text-3xl font-extrabold tracking-tight">Gestión de Leads</h1>
                            <p className="text-blue-100 mt-1 text-sm">Prospectos detectados por IA y creados manualmente.</p>
                        </div>
                        <Button onClick={() => setCreateOpen(true)} className="bg-white text-blue-700 hover:bg-blue-50 font-bold gap-2 shadow-lg self-start whitespace-nowrap">
                            <UserPlus className="h-4 w-4" /> Nuevo Prospecto
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total', value: stats.total, icon: Users, color: 'blue' },
                        { label: 'Ventas', value: stats.ventas, icon: Zap, color: 'green' },
                        { label: 'Urgentes', value: stats.urgentes, icon: AlertCircle, color: 'red' },
                        { label: 'Nuevos', value: stats.nuevos, icon: Clock, color: 'orange' },
                    ].map(s => (
                        <Card key={s.label} className="border-none shadow-sm hover:shadow-md transition-all">
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500">{s.label}</p>
                                        <h3 className={`text-2xl font-bold mt-0.5 text-${s.color}-600`}>{s.value}</h3>
                                    </div>
                                    <div className={`bg-${s.color}-50 p-2.5 rounded-xl`}>
                                        <s.icon className={`h-5 w-5 text-${s.color}-600`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-white p-4 rounded-xl shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="Buscar por nombre, teléfono..." className="pl-10 bg-gray-50 border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                        {[{v:'all',l:'Todos'},{v:'VENTA',l:'Ventas'},{v:'COBRANZA',l:'Cobranza'},{v:'SOPORTE',l:'Soporte'},{v:'HUMANO',l:'Humano'}].map(f => (
                            <Button key={f.v} variant={filter === f.v ? 'default' : 'outline'} size="sm"
                                onClick={() => setFilter(f.v)} className="rounded-full text-xs whitespace-nowrap">
                                {f.l}
                            </Button>
                        ))}
                    </div>
                    <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                        <SelectTrigger className="w-[170px] bg-gray-50 border-none"><SelectValue placeholder="Filtrar estado" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={fetchLeads} title="Refrescar"><RefreshCw className="h-4 w-4" /></Button>
                </div>

                {/* Lead Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {loading ? (
                        [...Array(4)].map((_, i) => (
                            <Card key={i} className="border-none shadow-sm">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex gap-3"><Skeleton className="h-12 w-12 rounded-2xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div></div>
                                    <Skeleton className="h-16 w-full rounded-xl" />
                                    <div className="flex gap-2"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-20" /></div>
                                </CardContent>
                            </Card>
                        ))
                    ) : filteredLeads.length === 0 ? (
                        <div className="col-span-full py-16 text-center bg-white rounded-2xl shadow-sm">
                            <MessageSquare className="h-14 w-14 text-gray-200 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-gray-900">No se encontraron leads</h3>
                            <p className="text-gray-500 text-sm mt-1">Crea uno manualmente o espera nuevos mensajes de WhatsApp.</p>
                        </div>
                    ) : (
                        filteredLeads.map(lead => (
                            <Card key={lead.id} className="border-none shadow-sm hover:shadow-lg transition-all bg-white overflow-hidden group">
                                <div className="p-5">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-11 w-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md">
                                                {lead.nombre.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                    {lead.nombre} {getUrgencyDot(lead.urgencia)}
                                                </h3>
                                                {lead.telefono && (
                                                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                                        <Phone className="h-3 w-3" /> {lead.telefono}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {getIntentBadge(lead.intencion)}
                                            {getEstadoBadge(lead.estado)}
                                        </div>
                                    </div>

                                    {/* AI Summary */}
                                    {/* Resumen IA */}
                                    {lead.resumenInterno && (
                                        <div className="bg-slate-50 rounded-lg p-3 mb-3 border border-slate-100">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Bot className="h-3.5 w-3.5 text-blue-600" />
                                                <span className="text-[10px] font-bold text-blue-600 uppercase">Sofía</span>
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">"{lead.resumenInterno}"</p>
                                        </div>
                                    )}

                                    {/* Extracted data */}
                                    {(lead.datosExtraidos?.producto || lead.interes) && (
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {lead.datosExtraidos?.producto && <Badge variant="outline" className="text-[10px] bg-blue-50">📦 {lead.datosExtraidos.producto}</Badge>}
                                            {lead.interes && <Badge variant="outline" className="text-[10px] bg-green-50">💡 {lead.interes}</Badge>}
                                            {lead.datosExtraidos?.presupuesto && <Badge variant="outline" className="text-[10px] bg-amber-50">💰 {lead.datosExtraidos.presupuesto}</Badge>}
                                        </div>
                                    )}

                                    {/* Assignment */}
                                    <div className="flex items-center justify-between mb-3 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">Asignado a:</span>
                                            <Select defaultValue={lead.vendedorId || 'none'} onValueChange={v => assignVendedor(lead.id, v)}>
                                                <SelectTrigger className="h-7 text-xs border-none bg-gray-50 w-[140px]"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">AI Sofía</SelectItem>
                                                    {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> {formatDate(lead.createdAt)}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-3 border-t border-gray-50 flex-wrap">
                                        <Button variant="ghost" size="sm" className="text-blue-600 text-xs gap-1" onClick={() => openChat(lead)}>
                                            <Eye className="h-3.5 w-3.5" /> Ver Chat
                                        </Button>

                                        {lead.telefono && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className={`text-xs gap-1 ${
                                                    blacklist.includes(lead.telefono) 
                                                        ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
                                                        : 'text-slate-500 hover:text-slate-600 hover:bg-slate-50'
                                                }`} 
                                                onClick={() => toggleBlacklist(lead.telefono)}
                                                title={blacklist.includes(lead.telefono) ? "Activar IA para este lead" : "Desactivar IA para este lead"}
                                            >
                                                <Bot className={`h-3.5 w-3.5 ${blacklist.includes(lead.telefono) ? 'text-red-500 animate-pulse' : 'text-slate-500'}`} />
                                                {blacklist.includes(lead.telefono) ? 'IA Apagada' : 'IA Activa'}
                                            </Button>
                                        )}

                                        {lead.estado === 'nuevo' && (
                                            <Button variant="ghost" size="sm" className="text-yellow-600 text-xs gap-1" onClick={() => updateLeadState(lead.id, 'contactado')}>
                                                <ArrowRight className="h-3.5 w-3.5" /> Contactado
                                            </Button>
                                        )}
                                        {lead.estado === 'contactado' && (
                                            <Button variant="ghost" size="sm" className="text-purple-600 text-xs gap-1" onClick={() => updateLeadState(lead.id, 'negociacion')}>
                                                <ArrowRight className="h-3.5 w-3.5" /> Negociación
                                            </Button>
                                        )}
                                        {(lead.estado === 'negociacion' || lead.estado === 'contactado') && (
                                            <Button variant="ghost" size="sm" className="text-green-600 text-xs gap-1" onClick={() => updateLeadState(lead.id, 'convertido')}>
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Convertir
                                            </Button>
                                        )}
                                        {lead.estado !== 'descartado' && lead.estado !== 'convertido' && (
                                            <Button variant="ghost" size="sm" className="text-gray-400 text-xs gap-1 ml-auto" onClick={() => updateLeadState(lead.id, 'descartado')}>
                                                <XCircle className="h-3.5 w-3.5" /> Descartar
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 ml-auto" onClick={() => eliminarLead(lead.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Conversación */}
            <Dialog open={chatOpen} onOpenChange={setChatOpen}>
                <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-600" />
                            Conversación - {chatLeadName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-3 py-4 min-h-[300px]">
                        {chatLoading ? (
                            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-3/4" style={{ marginLeft: i % 2 === 0 ? 0 : 'auto' }} />)}</div>
                        ) : chatMessages.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No hay mensajes en este prospecto.</p>
                                <p className="text-xs mt-1">Las conversaciones de WhatsApp aparecerán aquí.</p>
                            </div>
                        ) : (
                            chatMessages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.rol === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                                        msg.rol === 'assistant'
                                            ? 'bg-blue-50 text-gray-800 rounded-bl-md'
                                            : 'bg-gray-800 text-white rounded-br-md'
                                    }`}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {msg.rol === 'assistant' ? <Bot className="h-3 w-3 text-blue-500" /> : <Phone className="h-3 w-3 opacity-60" />}
                                            <span className="text-[10px] font-bold opacity-60">{msg.rol === 'assistant' ? 'Sofía' : 'Cliente'}</span>
                                        </div>
                                        <p className="leading-relaxed">{msg.mensaje}</p>
                                        <p className="text-[9px] opacity-40 mt-1 text-right">{new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal Crear Prospecto */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-600" /> Nuevo Prospecto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Nombre del prospecto *</label>
                            <Input placeholder="Ej. Juan Pérez" value={newLead.nombre} onChange={e => setNewLead(p => ({ ...p, nombre: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Teléfono</label>
                            <Input placeholder="5551234567" value={newLead.telefono} onChange={e => setNewLead(p => ({ ...p, telefono: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Producto de interés</label>
                            <Input placeholder="Ej. Colchón King Size" value={newLead.interes} onChange={e => setNewLead(p => ({ ...p, interes: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Origen</label>
                            <Select value={newLead.origen} onValueChange={v => setNewLead(p => ({ ...p, origen: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="oficina">Oficina</SelectItem>
                                    <SelectItem value="cambaceo">Cambaceo</SelectItem>
                                    <SelectItem value="facebook">Facebook</SelectItem>
                                    <SelectItem value="referido">Referido</SelectItem>
                                    <SelectItem value="web">Web</SelectItem>
                                    <SelectItem value="otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500">Notas</label>
                            <Input placeholder="Notas adicionales" value={newLead.notas} onChange={e => setNewLead(p => ({ ...p, notas: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>  
                        <Button onClick={createNewLead} disabled={saving} className="bg-blue-600 hover:bg-blue-700 gap-2">
                            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Crear Prospecto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
