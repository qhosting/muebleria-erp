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
    Filter,
    XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from 'lucide-react';
import { DigitalizadorModal } from '@/components/ventas/digitalizador-modal';
import { useSession } from 'next-auth/react';

export default function SolicitudesCreditoPage() {
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    
    // Estados para el digitalizador
    const [showDigitalizador, setShowDigitalizador] = useState(false);
    const [selectedForDocs, setSelectedForDocs] = useState<any>(null);
    const { data: session } = useSession();
    const isAdmin = ['admin', 'gestor_cobranza', 'jefe_ventas'].includes((session?.user as any)?.role as string);

    const [newSolicitud, setNewSolicitud] = useState({
        nombreCompleto: '',
        telefono: '',
        direccion: '',
        productoInteres: '',
        montoSolicitado: '',
        plazoSemanas: '24',
        tipoPropiedad: 'PROPIA',
        profesion: '',
        scoreBuro: '0',
        contpaqiCodigo: ''
    });

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

    const handleCreate = async () => {
        if (!newSolicitud.nombreCompleto || !newSolicitud.telefono) {
            toast.error("Nombre y teléfono son obligatorios");
            return;
        }

        setCreateLoading(true);
        try {
            const formData = new FormData();
            Object.entries(newSolicitud).forEach(([key, value]) => formData.append(key, value));
            
            const response = await fetch('/api/ventas/solicitudes/crear', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                toast.success("Solicitud creada exitosamente");
                setShowCreateModal(false);
                setNewSolicitud({
                    nombreCompleto: '',
                    telefono: '',
                    direccion: '',
                    productoInteres: '',
                    montoSolicitado: '',
                    plazoSemanas: '24',
                    tipoPropiedad: 'PROPIA',
                    profesion: '',
                    scoreBuro: '0',
                    contpaqiCodigo: ''
                });
                fetchSolicitudes();
            } else {
                toast.error("Error al crear solicitud");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            const response = await fetch('/api/ventas/solicitudes/status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });

            if (response.ok) {
                toast.success(`Solicitud ${status.toLowerCase()} correctamente`);
                fetchSolicitudes();
            } else {
                toast.error("Error al actualizar estado");
            }
        } catch (error) {
            toast.error("Error de conexión");
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
                        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20">
                                    <Plus className="w-4 h-4" />
                                    <span>Nueva Solicitud</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Nueva Solicitud de Crédito</DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4 py-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label>Nombre Completo</Label>
                                        <Input 
                                            placeholder="Nombre del prospecto" 
                                            value={newSolicitud.nombreCompleto}
                                            onChange={(e) => setNewSolicitud({...newSolicitud, nombreCompleto: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Teléfono</Label>
                                        <Input 
                                            placeholder="10 dígitos" 
                                            value={newSolicitud.telefono}
                                            onChange={(e) => setNewSolicitud({...newSolicitud, telefono: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Producto de Interés</Label>
                                        <Input 
                                            placeholder="Ej: Comedor" 
                                            value={newSolicitud.productoInteres}
                                            onChange={(e) => setNewSolicitud({...newSolicitud, productoInteres: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Monto Estimado ($)</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="0.00" 
                                            value={newSolicitud.montoSolicitado}
                                            onChange={(e) => setNewSolicitud({...newSolicitud, montoSolicitado: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Plazo (Semanas)</Label>
                                        <select 
                                            className="w-full h-10 px-3 border rounded-md text-sm"
                                            value={newSolicitud.plazoSemanas}
                                            onChange={(e) => setNewSolicitud({...newSolicitud, plazoSemanas: e.target.value})}
                                        >
                                            <option value="12">12 Semanas</option>
                                            <option value="24">24 Semanas</option>
                                            <option value="36">36 Semanas</option>
                                            <option value="48">48 Semanas</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label>Dirección</Label>
                                        <Input 
                                            placeholder="Calle, número, colonia..." 
                                            value={newSolicitud.direccion}
                                            onChange={(e) => setNewSolicitud({...newSolicitud, direccion: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Score de Buró (0-10)</Label>
                                        <Input 
                                            type="number" 
                                            max="10" 
                                            min="0"
                                            value={newSolicitud.scoreBuro}
                                            onChange={(e) => setNewSolicitud({...newSolicitud, scoreBuro: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Código Contpaqi (Si ya existe)</Label>
                                        <Input 
                                            placeholder="Ej: C001" 
                                            value={newSolicitud.contpaqiCodigo}
                                            onChange={(e) => setNewSolicitud({...newSolicitud, contpaqiCodigo: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                                    <Button 
                                        onClick={handleCreate} 
                                        disabled={createLoading}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        {createLoading ? 'Creando...' : 'Crear Solicitud'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
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
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        title="Ver documentación"
                                                        onClick={() => {
                                                            setSelectedForDocs({
                                                                nombreCompleto: sol.nombreCompleto,
                                                                curp: sol.curp,
                                                                codigoCliente: sol.contpaqiCodigo,
                                                                numContrato: sol.folio
                                                            });
                                                            setShowDigitalizador(true);
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        title="Aprobar" 
                                                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => handleUpdateStatus(sol.id, 'APROBADA')}
                                                     >
                                                         <CheckCircle2 className="w-4 h-4" />
                                                     </Button>
                                                     <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        title="Rechazar" 
                                                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                        onClick={() => handleUpdateStatus(sol.id, 'RECHAZADA')}
                                                     >
                                                         <XCircle className="w-4 h-4" />
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

                {selectedForDocs && (
                    <DigitalizadorModal 
                        open={showDigitalizador}
                        onOpenChange={setShowDigitalizador}
                        cliente={selectedForDocs}
                        isAdmin={isAdmin}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
