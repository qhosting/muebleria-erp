"use client";

import { useState } from 'react';
import { 
    Search, 
    FileText, 
    User, 
    ShieldCheck, 
    AlertCircle,
    Loader2,
    Database,
    Fingerprint,
    ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DigitalizadorModal } from '@/components/ventas/digitalizador-modal';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function MobileBovedaPage() {
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
            toast.error('Ingresa al menos 3 caracteres');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/ventas/boveda/list?search=${encodeURIComponent(searchTerm)}`);
            if (res.ok) {
                const data = await res.json();
                setResults(data);
                if (data.length === 0) toast.info("No se encontraron expedientes");
            }
        } catch (error) {
            console.error('Error al buscar en la bóveda:', error);
            toast.error('Error al buscar');
        } finally {
            setLoading(false);
        }
    };

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
        <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
            {/* Header */}
            <div className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Link href="/mobile/home" className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6 text-slate-400" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                            <Database className="w-5 h-5 text-blue-400" />
                        </div>
                        <h1 className="font-bold text-lg">Bóveda Digital</h1>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <Input 
                        placeholder="Nombre, CURP o Código..." 
                        className="pl-12 h-14 bg-slate-900 border-slate-800 rounded-2xl text-lg focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit" className="hidden">Buscar</button>
                </form>

                {/* Results Section */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="py-20 text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Buscando expedientes...</p>
                        </div>
                    ) : results.length > 0 ? (
                        results.map((res: any, idx: number) => (
                            <div 
                                key={idx} 
                                className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg active:scale-[0.98] transition-transform"
                                onClick={() => openVaultForCliente(res)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <Fingerprint className="h-6 w-6" />
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                                        ACTIVO
                                    </Badge>
                                </div>
                                
                                <div>
                                    <h3 className="font-bold text-slate-100 text-lg uppercase leading-tight">
                                        {res.nombreCompleto || 'N/A'}
                                    </h3>
                                    <div className="space-y-1 mt-2">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            <span className="font-mono">{res.curp || 'SIN CURP'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <User className="h-3.5 w-3.5" />
                                            <span>Código: {res.codigoCliente || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-xl flex items-center justify-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    ABRIR EXPEDIENTE
                                </Button>
                            </div>
                        ))
                    ) : searchTerm ? (
                        <div className="py-20 text-center">
                            <AlertCircle className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-400">Sin resultados</h3>
                            <p className="text-slate-600 text-sm">No encontramos expedientes para "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="py-20 text-center space-y-4">
                            <Database className="h-16 w-16 text-slate-800 mx-auto opacity-20" />
                            <p className="text-slate-500 text-sm max-w-[200px] mx-auto">
                                Ingresa datos para buscar en el archivo digital centralizado.
                            </p>
                        </div>
                    )}
                </div>
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
    );
}
