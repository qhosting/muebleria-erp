
'use client';

import { useState, useEffect } from 'react';
import { 
    X, 
    Upload, 
    Check, 
    AlertTriangle, 
    FileText, 
    Image as ImageIcon,
    Loader2,
    CheckCircle2,
    XCircle,
    Download,
    Eye,
    Clock,
    Trash2,
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import Image from 'next/image';

interface Documento {
    id: string;
    tipoDocumento: string;
    url: string;
    status: string;
    motivoRechazo?: string;
    nombreCliente?: string;
    clienteCurp?: string;
    codigoCliente?: string;
    folioContrato?: string;
    createdAt: string;
}

interface DigitalizadorModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cliente: {
        id?: string;
        nombreCompleto: string;
        curp?: string;
        codigoCliente?: string;
        numContrato?: string;
    };
    isAdmin?: boolean;
}

const TIPOS_DOCUMENTO = [
    { id: 'INE_FRONT', label: 'INE Frontal' },
    { id: 'INE_BACK', label: 'INE Trasera' },
    { id: 'DOMICILIO', label: 'Comprobante de Domicilio' },
    { id: 'INGRESOS', label: 'Comprobante de Ingresos' },
    { id: 'PROPIEDAD', label: 'Comprobante de Propiedad' },
    { id: 'OTRO', label: 'Otro Documento' }
];

export function DigitalizadorModal({ open, onOpenChange, cliente, isAdmin }: DigitalizadorModalProps) {
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [validatingAi, setValidatingAi] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            fetchDocumentos();
        }
    }, [open, cliente]);

    const fetchDocumentos = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (cliente.curp) params.append('curp', cliente.curp);
            if (cliente.codigoCliente) params.append('codigo', cliente.codigoCliente);
            if (cliente.numContrato) params.append('folio', cliente.numContrato);

            const response = await fetch(`/api/ventas/boveda/list?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setDocumentos(data);
            }
        } catch (error) {
            toast.error("Error al cargar documentos");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (tipo: string, file: File) => {
        setUploading(tipo);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tipoDocumento', tipo);
        if (cliente.curp) formData.append('clienteCurp', cliente.curp);
        if (cliente.codigoCliente) formData.append('codigoCliente', cliente.codigoCliente);
        if (cliente.numContrato) formData.append('folioContrato', cliente.numContrato);
        formData.append('nombreCliente', cliente.nombreCompleto);

        try {
            const response = await fetch('/api/ventas/boveda/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                toast.success("Archivo subido correctamente");
                fetchDocumentos();
            } else {
                toast.error("Error al subir archivo");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setUploading(null);
        }
    };

    const handleValidate = async (id: string, status: 'VALIDADO' | 'RECHAZADO') => {
        try {
            const response = await fetch('/api/ventas/boveda/validate', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status, motivoRechazo })
            });

            if (response.ok) {
                toast.success(status === 'VALIDADO' ? "Documento aprobado" : "Documento rechazado");
                setSelectedDoc(null);
                setMotivoRechazo('');
                fetchDocumentos();
            }
        } catch (error) {
            toast.error("Error al procesar validación");
        }
    };

    const handleValidateAI = async (id: string) => {
        setValidatingAi(id);
        try {
            const response = await fetch('/api/ventas/boveda/validate-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentoId: id })
            });
            
            const data = await response.json();
            if (response.ok) {
                if (data.isValid) {
                    toast.success("Auditoría IA: Documento Válido");
                } else {
                    toast.error("Auditoría IA: Documento detectado como falso/inválido");
                }
                setSelectedDoc(data.documento);
                fetchDocumentos();
            } else {
                toast.error(data.error || "Error al validar con IA");
            }
        } catch (error) {
            toast.error("Error de conexión con IA");
        } finally {
            setValidatingAi(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este documento de forma permanente?")) return;
        
        try {
            const response = await fetch(`/api/ventas/boveda/delete?id=${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success("Documento eliminado");
                setSelectedDoc(null);
                fetchDocumentos();
            } else {
                toast.error("Error al eliminar documento");
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'VALIDADO': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'RECHAZADO': return <XCircle className="w-4 h-4 text-rose-500" />;
            default: return <Clock className="w-4 h-4 text-amber-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'VALIDADO': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Validado</Badge>;
            case 'RECHAZADO': return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20">Rechazado</Badge>;
            default: return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pendiente</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] w-full h-[98vh] max-h-[98vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
                <DialogHeader className="p-6 border-b bg-slate-50">
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-600" />
                        Digitalizador de Documentos: <span className="text-slate-500 font-normal">{cliente.nombreCompleto}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Previsualización y Validación - Mover al principio en móvil si hay algo seleccionado */}
                    {selectedDoc && (
                        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 min-h-[400px] flex flex-col order-first md:order-last">
                            <div className="flex-1 flex flex-col space-y-4">
                                <div className="flex justify-between items-center text-white">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-sm">{TIPOS_DOCUMENTO.find(t => t.id === selectedDoc.tipoDocumento)?.label}</h4>
                                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">VISTA PREVIA</Badge>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                                
                                <div className="relative flex-1 bg-black rounded-xl overflow-hidden border border-slate-700 min-h-[500px] flex items-center justify-center">
                                    {selectedDoc.url.toLowerCase().endsWith('.pdf') ? (
                                        <iframe 
                                            src={selectedDoc.url} 
                                            className="w-full h-full border-0"
                                            title="PDF Preview"
                                        />
                                    ) : (
                                        <img 
                                            src={selectedDoc.url} 
                                            alt="Documento" 
                                            className="max-w-full max-h-full object-contain"
                                            onError={(e) => {
                                                console.error("Error al cargar imagen:", selectedDoc.url);
                                                (e.target as any).src = "https://placehold.co/600x400?text=Error+al+cargar+imagen";
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(selectedDoc.status)}
                                            <span className="text-white text-xs font-bold uppercase">{selectedDoc.status}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <a href={selectedDoc.url} target="_blank" rel="noopener noreferrer">
                                                <Button variant="outline" size="sm" className="h-8 gap-2 bg-slate-800 border-slate-700 text-white text-xs">
                                                    <Download className="w-3 h-3" />
                                                    Descargar
                                                </Button>
                                            </a>
                                            {isAdmin && (
                                                <Button 
                                                    variant="destructive" 
                                                    size="sm" 
                                                    className="h-8 gap-2"
                                                    onClick={() => handleDelete(selectedDoc.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    Eliminar
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {isAdmin && selectedDoc.status === 'PENDIENTE' && (
                                        <div className="space-y-3 pt-2 border-t border-slate-800">
                                            <div className="space-y-1.5">
                                                <Label className="text-slate-400 text-[10px] uppercase font-bold">Motivo (Solo si rechaza)</Label>
                                                <Input 
                                                    className="bg-slate-950 border-slate-800 text-white text-xs" 
                                                    placeholder="Ej: Imagen borrosa"
                                                    value={motivoRechazo}
                                                    onChange={(e) => setMotivoRechazo(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                <Button 
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold col-span-2 flex gap-2 items-center justify-center"
                                                    onClick={() => handleValidateAI(selectedDoc.id)}
                                                    disabled={validatingAi === selectedDoc.id}
                                                >
                                                    {validatingAi === selectedDoc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                                    {validatingAi === selectedDoc.id ? 'Analizando con IA...' : 'Auditar documento con IA'}
                                                </Button>
                                                <Button 
                                                    className="bg-emerald-600 hover:bg-emerald-500 font-bold"
                                                    onClick={() => handleValidate(selectedDoc.id, 'VALIDADO')}
                                                >
                                                    Aprobar Manual
                                                </Button>
                                                <Button 
                                                    variant="destructive" 
                                                    className="font-bold"
                                                    onClick={() => handleValidate(selectedDoc.id, 'RECHAZADO')}
                                                >
                                                    Rechazar Manual
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {selectedDoc.status === 'RECHAZADO' && (
                                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                            <p className="text-[10px] text-rose-400 uppercase font-bold mb-1">Motivo de Rechazo</p>
                                            <p className="text-xs text-rose-200">{selectedDoc.motivoRechazo || 'Sin motivo especificado'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lista de Tipos Requeridos */}
                    <div className={`space-y-4 ${selectedDoc ? 'hidden md:block' : ''}`}>
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider px-1">Documentación Requerida</h3>
                        <div className="space-y-2">
                            {TIPOS_DOCUMENTO.map((tipo) => {
                                const doc = documentos.find(d => d.tipoDocumento === tipo.id);
                                return (
                                    <div 
                                        key={tipo.id} 
                                        className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                                            doc ? 'bg-slate-50 border-slate-200' : 'bg-white border-dashed border-slate-300 hover:border-sky-400'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                {doc ? <Check className="w-5 h-5" /> : <ImageIcon className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{tipo.label}</p>
                                                {doc ? (
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {getStatusBadge(doc.status)}
                                                        <span className="text-[10px] text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Pendiente de subir</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-1">
                                            {doc && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-sky-600"
                                                    onClick={() => {
                                                        setSelectedDoc(doc);
                                                        // En móvil, hacer scroll hacia arriba para ver el visualizador
                                                        if (window.innerWidth < 768) {
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <label className={`cursor-pointer ${uploading === tipo.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*,application/pdf"
                                                    capture="environment"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleFileUpload(tipo.id, file);
                                                    }}
                                                />
                                                <div className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                                                    {uploading === tipo.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {!selectedDoc && (
                        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 flex flex-col items-center justify-center text-center space-y-4">
                            <ImageIcon className="w-12 h-12 text-slate-300" />
                            <div>
                                <p className="text-sm font-bold text-slate-400 uppercase">Sin selección</p>
                                <p className="text-xs text-slate-400">Pulsa en el icono del ojo para visualizar un documento ya subido.</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-slate-50">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
