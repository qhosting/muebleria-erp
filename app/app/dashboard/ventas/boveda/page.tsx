'use client';

import { useState, useEffect } from 'react';
import { 
    Search, 
    FileText, 
    User, 
    ShieldCheck, 
    AlertCircle,
    Loader2,
    Database,
    Fingerprint,
    UploadCloud,
    UserPlus,
    Clock,
    Plus,
    Edit3,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DigitalizadorModal } from '@/components/ventas/digitalizador-modal';
import { useSession } from 'next-auth/react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function BovedaDigitalPage() {
    const { data: session } = useSession();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    
    // Estados para el modal del digitalizador
    const [showDigitalizador, setShowDigitalizador] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<any>(null);
    const [recentResults, setRecentResults] = useState<any[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(false);
    
    // Filtros
    const [filterVendedor, setFilterVendedor] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // Estados para el modal de nuevo expediente
    const [isCreating, setIsCreating] = useState(false);
    const [newClient, setNewClient] = useState({
        nombre: '',
        curp: '',
        codigo: '',
        contrato: ''
    });

    // Edición de CURP
    const [isEditingCurp, setIsEditingCurp] = useState(false);
    const [curpToEdit, setCurpToEdit] = useState<any>(null);
    const [newCurpVal, setNewCurpVal] = useState('');
    const [updatingCurp, setUpdatingCurp] = useState(false);

    useEffect(() => {
        fetchRecent();
    }, []);

    const fetchRecent = async () => {
        setLoadingRecent(true);
        try {
            const res = await fetch('/api/ventas/boveda/list?mine=true');
            if (res.ok) {
                const data = await res.json();
                setRecentResults(data);
            }
        } catch (error) {
            console.error('Error al cargar recientes:', error);
        } finally {
            setLoadingRecent(false);
        }
    };

    const handleCreateExpediente = () => {
        if (!newClient.nombre) {
            toast.error("El nombre es obligatorio");
            return;
        }
        setSelectedCliente({
            nombreCompleto: newClient.nombre.toUpperCase(),
            curp: newClient.curp.toUpperCase(),
            codigoCliente: newClient.codigo.toUpperCase(),
            numContrato: newClient.contrato.toUpperCase()
        });
        setIsCreating(false);
        setShowDigitalizador(true);
    };

    const handleUpdateCurp = async () => {
        if (!newCurpVal || newCurpVal.length < 18) {
            toast.error("CURP inválido");
            return;
        }

        setUpdatingCurp(true);
        try {
            const response = await fetch('/api/ventas/boveda/update-curp', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentCurp: curpToEdit.curp,
                    currentNombre: curpToEdit.nombreCompleto,
                    newCurp: newCurpVal
                })
            });

            if (response.ok) {
                toast.success("CURP actualizado correctamente");
                setIsEditingCurp(false);
                setNewCurpVal('');
                // Refrescar resultados
                if (searchTerm) handleSearch();
                else fetchRecent();
            } else {
                toast.error("Error al actualizar CURP");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setUpdatingCurp(false);
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchTerm || searchTerm.length < 3) {
            toast.error('Ingresa al menos 3 caracteres para buscar');
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('search', searchTerm);
            if (filterVendedor === 'mine') params.append('mine', 'true');
            if (filterStatus) params.append('status', filterStatus);

            const res = await fetch(`/api/ventas/boveda/list?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data);
            }
        } catch (error) {
            console.error('Error al buscar en la bóveda:', error);
            toast.error('Error al realizar la búsqueda');
        } finally {
            setLoading(false);
        }
    };

    // Función para abrir el digitalizador con los datos del cliente encontrado
    const openVaultForCliente = (cliente: any) => {
        setSelectedCliente({
            nombreCompleto: cliente.nombreCompleto || 'Cliente Sin Nombre',
            curp: cliente.curp,
            codigoCliente: cliente.codigoCliente,
            numContrato: cliente.folioContrato
        });
        setShowDigitalizador(true);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Encabezado eliminado como se solicitó */}

                <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-white">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Search className="h-5 w-5 text-blue-500" />
                            Buscar en el Archivo Digital
                        </CardTitle>
                        <CardDescription>
                            Busca por Nombre, CURP o Código de Cliente para acceder a su expediente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Ej: MARIO PEREZ o CURP..." 
                                    className="pl-10 h-12 text-lg border-slate-200 focus:ring-blue-500 rounded-xl"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            {/* Filtros solicitados */}
                            <div className="flex gap-2">
                                <select 
                                    className="h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={filterVendedor}
                                    onChange={(e) => setFilterVendedor(e.target.value)}
                                >
                                    <option value="">Todos los Vendedores</option>
                                    <option value="mine">Mis Registros</option>
                                </select>
                                <select 
                                    className="h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="">Cualquier Estado</option>
                                    <option value="PENDIENTE">Pendientes</option>
                                    <option value="VALIDADO">Validados</option>
                                    <option value="RECHAZADO">Rechazados</option>
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={loading} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md">
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'BUSCAR'}
                                </Button>
                                <Button 
                                    type="button"
                                    onClick={() => setIsCreating(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6 h-12 shadow-md flex items-center gap-2"
                                >
                                    <Plus className="h-5 w-5" />
                                    NUEVO
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(loading || loadingRecent) && (
                        <div className="col-span-full py-20 text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Buscando expedientes seguros...</p>
                        </div>
                    )}

                    {!loading && !loadingRecent && (searchTerm ? results : recentResults).length > 0 && (
                        <>
                            {!searchTerm && (
                                <div className="col-span-full flex items-center gap-2 mb-2 px-1">
                                    <Clock className="h-5 w-5 text-emerald-500" />
                                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Registros Recientes</h2>
                                </div>
                            )}
                            {(searchTerm ? results : recentResults).map((res: any, idx: number) => (
                                <Card key={idx} className="hover:shadow-md transition-all border-slate-200 overflow-hidden group cursor-pointer" onClick={() => openVaultForCliente(res)}>
                                    <div className="h-2 bg-blue-500 w-0 group-hover:w-full transition-all duration-300" />
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Fingerprint className="h-6 w-6" />
                                            </div>
                                            <Badge variant="outline" className={`${res.recent ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                {res.recent ? 'RECIENTE' : 'SISTEMA'}
                                            </Badge>
                                            {['admin', 'jefe_ventas', 'gestor_cobranza'].includes((session?.user as any)?.role) && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCurpToEdit(res);
                                                        setNewCurpVal(res.curp || '');
                                                        setIsEditingCurp(true);
                                                    }}
                                                >
                                                    <Edit3 className="h-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-slate-900 text-lg mb-1 uppercase">
                                            {res.nombreCompleto || 'N/A'}
                                        </h3>
                                        <div className="space-y-2 mb-6">
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <ShieldCheck className="h-4 w-4" />
                                                <span className="font-mono">{res.curp || 'SIN CURP'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <User className="h-4 w-4" />
                                                <span>Folio: {res.folioContrato || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <Button 
                                            className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-6 flex items-center justify-center gap-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openVaultForCliente(res);
                                            }}
                                        >
                                            <FileText className="h-5 w-5" />
                                            ABRIR BÓVEDA DIGITAL
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </>
                    )}

                    {!loading && !loadingRecent && searchTerm && results.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900">No se encontraron expedientes</h3>
                            <p className="text-slate-500">Prueba con otros términos o registra un nuevo contrato para generar la bóveda.</p>
                            <Button 
                                variant="outline"
                                onClick={() => {
                                    setNewClient({ ...newClient, nombre: searchTerm });
                                    setIsCreating(true);
                                }}
                                className="mt-4 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                            >
                                Crear Nuevo Expediente
                            </Button>
                        </div>
                    )}

                    {!loading && !loadingRecent && !searchTerm && recentResults.length === 0 && (
                         <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <UploadCloud className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium max-w-xs mx-auto">
                                No hay registros recientes. Ingresa el nombre o CURP de un cliente para acceder a sus documentos.
                            </p>
                         </div>
                    )}
                </div>

                {/* DIALOG DE NUEVO EXPEDIENTE */}
                <Dialog open={isCreating} onOpenChange={setIsCreating}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-emerald-600" />
                                Nuevo Expediente Digital
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre Completo</Label>
                                <Input 
                                    id="name" 
                                    className="uppercase"
                                    placeholder="EJ. MARIO PÉREZ" 
                                    value={newClient.nombre}
                                    onChange={(e) => setNewClient({...newClient, nombre: e.target.value.toUpperCase()})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="contrato">Folio Contrato</Label>
                                    <Input 
                                        id="contrato" 
                                        className="uppercase"
                                        placeholder="C-0001" 
                                        value={newClient.contrato}
                                        onChange={(e) => setNewClient({...newClient, contrato: e.target.value.toUpperCase()})}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="codigo">Código Cliente</Label>
                                    <Input 
                                        id="codigo" 
                                        className="uppercase"
                                        placeholder="12345" 
                                        value={newClient.codigo}
                                        onChange={(e) => setNewClient({...newClient, codigo: e.target.value.toUpperCase()})}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="curp">CURP (Opcional)</Label>
                                <Input 
                                    id="curp" 
                                    className="uppercase font-mono"
                                    placeholder="CURP..." 
                                    value={newClient.curp}
                                    onChange={(e) => setNewClient({...newClient, curp: e.target.value.toUpperCase()})}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateExpediente}>
                                INICIAR CARGA DE DOCUMENTOS
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* DIALOG DE EDICIÓN DE CURP */}
                <Dialog open={isEditingCurp} onOpenChange={setIsEditingCurp}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Edit3 className="h-5 w-5 text-blue-600" />
                                Actualizar CURP del Expediente
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Cliente</p>
                                <p className="text-sm font-bold text-slate-700 uppercase">{curpToEdit?.nombreCompleto}</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="new-curp">Nuevo CURP</Label>
                                <Input 
                                    id="new-curp" 
                                    className="uppercase font-mono text-lg tracking-widest h-12"
                                    placeholder="ABCD123456HDF..." 
                                    maxLength={18}
                                    value={newCurpVal}
                                    onChange={(e) => setNewCurpVal(e.target.value.toUpperCase())}
                                />
                                <p className="text-[10px] text-slate-400 italic">
                                    Esto actualizará todos los documentos asociados a este nombre y CURP previo.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-12 rounded-xl" 
                                onClick={handleUpdateCurp}
                                disabled={updatingCurp}
                            >
                                {updatingCurp ? <Loader2 className="h-5 w-5 animate-spin" /> : 'ACTUALIZAR CURP'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* MODAL DEL DIGITALIZADOR */}
                {selectedCliente && (
                    <DigitalizadorModal 
                        open={showDigitalizador}
                        onOpenChange={setShowDigitalizador}
                        cliente={selectedCliente}
                        isAdmin={['admin', 'jefe_ventas', 'gestor_cobranza'].includes((session?.user as any)?.role)}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
