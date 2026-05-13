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
    UploadCloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DigitalizadorModal } from '@/components/ventas/digitalizador-modal';
import { useSession } from 'next-auth/react';

export default function BovedaDigitalPage() {
    const { data: session } = useSession();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    
    // Estados para el modal del digitalizador
    const [showDigitalizador, setShowDigitalizador] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<any>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchTerm || searchTerm.length < 3) {
            toast.error('Ingresa al menos 3 caracteres para buscar');
            return;
        }

        setLoading(true);
        try {
            // Buscamos en la boveda agrupando por CURP
            const res = await fetch(`/api/ventas/boveda/list?search=${encodeURIComponent(searchTerm)}`);
            if (res.ok) {
                const data = await res.json();
                // La API list usualmente devuelve los documentos. 
                // Necesitamos agruparlos por cliente o simplemente permitir abrir el digitalizador por cliente encontrado
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
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Database className="h-8 w-8 text-blue-600" />
                        Bóveda Digital de Documentos
                    </h1>
                    <p className="text-gray-500">
                        Consulta y valida la documentación de clientes centralizada por CURP y Nombre.
                    </p>
                </div>

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
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Ej: MARIO PEREZ o CURP..." 
                                    className="pl-10 h-12 text-lg border-slate-200 focus:ring-blue-500 rounded-xl"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={loading} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md">
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'BUSCAR'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading && (
                        <div className="col-span-full py-20 text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Buscando en la base de datos segura...</p>
                        </div>
                    )}

                    {!loading && results.length > 0 && results.map((res: any, idx: number) => (
                        <Card key={idx} className="hover:shadow-md transition-all border-slate-200 overflow-hidden group">
                            <div className="h-2 bg-blue-500 w-0 group-hover:w-full transition-all duration-300" />
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Fingerprint className="h-6 w-6" />
                                    </div>
                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                                        EXPEDIENTE ACTIVO
                                    </Badge>
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg mb-1 uppercase">
                                    {res.nombreCompleto || 'N/A'}
                                </h3>
                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span className="font-mono">{res.curp}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <User className="h-4 w-4" />
                                        <span>Código: {res.codigoCliente || 'N/A'}</span>
                                    </div>
                                </div>
                                <Button 
                                    className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-6 flex items-center justify-center gap-2"
                                    onClick={() => openVaultForCliente(res)}
                                >
                                    <FileText className="h-5 w-5" />
                                    ABRIR BÓVEDA DIGITAL
                                </Button>
                            </CardContent>
                        </Card>
                    ))}

                    {!loading && searchTerm && results.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900">No se encontraron expedientes</h3>
                            <p className="text-slate-500">Prueba con otros términos o registra un nuevo contrato para generar la bóveda.</p>
                        </div>
                    )}

                    {!loading && !searchTerm && (
                         <div className="col-span-full py-20 text-center">
                            <UploadCloud className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium max-w-xs mx-auto">
                                Ingresa el nombre o CURP de un cliente para acceder a sus documentos digitalizados.
                            </p>
                         </div>
                    )}
                </div>

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
