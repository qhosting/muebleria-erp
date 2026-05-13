'use client';

import { useState, useEffect } from 'react';
import { 
    Search, 
    FileText, 
    Calendar, 
    User, 
    Smartphone, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    Eye,
    Download,
    ExternalLink,
    Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function SolicitudesCreditoPage() {
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        fetchSolicitudes();
    }, [statusFilter]);

    const fetchSolicitudes = async () => {
        setLoading(true);
        try {
            const url = `/api/ventas/solicitudes?${statusFilter !== 'ALL' ? `status=${statusFilter}` : ''}&q=${searchTerm}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setSolicitudes(data);
            }
        } catch (error) {
            toast.error("Error al cargar solicitudes");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDIENTE': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pendiente</Badge>;
            case 'APROBADA': return <Badge className="bg-emerald-500/10 text-emerald-500 border-amber-500/20">Aprobada</Badge>;
            case 'RECHAZADA': return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20">Rechazada</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Solicitudes de Crédito</h1>
                        <p className="text-slate-500 text-sm">Gestiona los pre-registros y documentación de nuevos clientes.</p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Buscar por nombre o tel..." 
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchSolicitudes()}
                            />
                        </div>
                        <Button variant="outline" className="gap-2" onClick={fetchSolicitudes}>
                            <Filter className="w-4 h-4" />
                            <span>Filtrar</span>
                        </Button>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {['ALL', 'PENDIENTE', 'APROBADA', 'RECHAZADA'].map((s) => (
                        <Button 
                            key={s}
                            variant={statusFilter === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(s)}
                            className="rounded-full px-4"
                        >
                            {s === 'ALL' ? 'Todos' : s}
                        </Button>
                    ))}
                </div>

                <Card className="border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-slate-700">Cliente / Fecha</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Contacto</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Vendedor</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Score / Contpaqi</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Status</th>
                                    <th className="px-6 py-4 font-bold text-slate-700 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-6 py-8 h-16 bg-slate-50/50"></td>
                                        </tr>
                                    ))
                                ) : solicitudes.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                                            No se encontraron solicitudes.
                                        </td>
                                    </tr>
                                ) : (
                                    solicitudes.map((sol) => (
                                        <tr key={sol.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{sol.nombreCompleto}</span>
                                                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(sol.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="flex items-center gap-1 text-slate-600">
                                                        <Smartphone className="w-3 h-3" />
                                                        {sol.telefono}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 truncate max-w-[150px]">{sol.direccion}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="secondary" className="font-medium">
                                                    {sol.vendedor?.name || 'Sistema'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-xs font-bold ${sol.scoreBuro <= 3 ? 'text-emerald-600' : sol.scoreBuro <= 6 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                        Score: {sol.scoreBuro}
                                                    </span>
                                                    {sol.contpaqiCodigo && (
                                                        <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-100 w-fit">
                                                            CP: {sol.contpaqiCodigo}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(sol.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" title="Ver documentación">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" title="Aprobar" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
