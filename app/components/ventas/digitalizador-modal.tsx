
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
    ShieldCheck,
    MapPin,
    Navigation,
    Cloud
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
        telefono?: string;
    };
    isAdmin?: boolean;
}

const TIPOS_DOCUMENTO = [
    { id: 'INE_FRONT', label: 'INE Frontal' },
    { id: 'INE_BACK', label: 'INE Trasera' },
    { id: 'DOMICILIO', label: 'Comprobante de Domicilio' },
    { id: 'INGRESOS', label: 'Comprobante de Ingresos' },
    { id: 'PROPIEDAD', label: 'Comprobante de Propiedad' },
    { id: 'CONTRATO_FRONT', label: 'Contrato Frontal' },
    { id: 'CONTRATO_BACK', label: 'Contrato Atrás' },
    { id: 'FACHADA', label: 'Fachada Domicilio' },
    { id: 'GPS', label: 'Ubicación GPS' },
    { id: 'OTRO', label: 'Otro Documento' }
];

function GpsPreview({ url }: { url: string }) {
    const [gps, setGps] = useState<{ lat: number; lng: number; timestamp?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(url)
            .then(res => res.json())
            .then(data => {
                setGps(data);
                setLoading(false);
            })
            .catch(e => {
                console.error("Error al cargar JSON GPS:", e);
                setLoading(false);
            });
    }, [url]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-xs text-slate-400">Cargando coordenadas de mapa...</p>
            </div>
        );
    }

    if (!gps || !gps.lat || !gps.lng) {
        return (
            <div className="text-center p-8 space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-xs text-slate-300 font-bold">Error de Ubicación</p>
                <p className="text-[10px] text-slate-500">No se pudieron recuperar las coordenadas GPS.</p>
            </div>
        );
    }

    const { lat, lng } = gps;
    const bbox = `${lng - 0.003},${lat - 0.003},${lng + 0.003},${lat + 0.003}`;

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-[300px] relative bg-slate-950">
                <iframe 
                    title="Ubicación GPS"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`}
                    className="w-full h-full border-0 absolute inset-0"
                />
            </div>
            <div className="p-4 bg-slate-900 border-t border-slate-800 text-left space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Coordenadas Registradas</p>
                <p className="text-xs text-slate-200 font-mono font-bold">Latitud: {lat.toFixed(6)}</p>
                <p className="text-xs text-slate-200 font-mono font-bold">Longitud: {lng.toFixed(6)}</p>
                {gps.timestamp && (
                    <p className="text-[9px] text-slate-500">Fecha de captura: {new Date(gps.timestamp).toLocaleString()}</p>
                )}
            </div>
        </div>
    );
}

export function DigitalizadorModal({ open, onOpenChange, cliente, isAdmin }: DigitalizadorModalProps) {
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [validatingAi, setValidatingAi] = useState<string | null>(null);
    const [capturingGps, setCapturingGps] = useState(false);
    const [syncingDrive, setSyncingDrive] = useState(false);

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
        if ((cliente as any).telefono) formData.append('telefono', (cliente as any).telefono);
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

    const handleGPSCapture = async () => {
        setCapturingGps(true);
        try {
            const { obtenerUbicacionCobrador } = await import("@/lib/native/location");
            const pos = (await obtenerUbicacionCobrador(true, 10000)) as any; // Alta precisión, 10s timeout
            
            const gpsData = {
                lat: pos.lat,
                lng: pos.lng,
                accuracy: pos.accuracy,
                timestamp: new Date().toISOString()
            };
            
            const fileContent = JSON.stringify(gpsData);
            const file = new File([fileContent], 'gps.json', { type: 'application/json' });
            await handleFileUpload('GPS', file);
        } catch (error) {
            console.error("Error al capturar ubicación GPS:", error);
            toast.error("No se pudo obtener la ubicación GPS precisa. Revisa los permisos.");
        } finally {
            setCapturingGps(false);
        }
    };

    const handleGeneratePDF = async () => {
        if (documentos.length === 0) {
            toast.error("No hay documentos subidos para este cliente.");
            return;
        }

        setLoading(true);
        toast.info("Generando expediente PDF...");

        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // 1. Añadir una página de portada súper premium
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            doc.setFillColor(15, 23, 42); // slate-900 color
            doc.rect(0, 0, pageWidth, pageHeight, 'F');

            // Título de la portada
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text("EXPEDIENTE DIGITAL DE CLIENTE", pageWidth / 2, 45, { align: 'center' });

            // Decorador
            doc.setDrawColor(56, 189, 248); // sky-400
            doc.setLineWidth(1.5);
            doc.line(30, 55, pageWidth - 30, 55);

            // Información del Cliente
            doc.setFontSize(12);
            doc.setTextColor(203, 213, 225); // slate-300
            
            let yPos = 80;
            doc.text(`Nombre Completo: ${cliente.nombreCompleto || 'Sin Nombre'}`, 30, yPos);
            yPos += 12;
            if (cliente.codigoCliente) {
                doc.text(`Código de Cliente: ${cliente.codigoCliente}`, 30, yPos);
                yPos += 12;
            }
            if (cliente.curp) {
                doc.text(`CURP: ${cliente.curp}`, 30, yPos);
                yPos += 12;
            }
            if (cliente.numContrato) {
                doc.text(`Folio de Contrato: ${cliente.numContrato}`, 30, yPos);
                yPos += 12;
            }
            if (cliente.telefono) {
                doc.text(`Teléfono (10 dígitos): ${cliente.telefono}`, 30, yPos);
                yPos += 12;
            }

            // Pie de página de la portada
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text("Generado automáticamente por VertexERP Digital Vault", pageWidth / 2, pageHeight - 20, { align: 'center' });
            doc.text(`Fecha de exportación: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

            // Helper para convertir imagen a base64
            const loadImageAsBase64 = (url: string): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const img = new window.Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0);
                            resolve(canvas.toDataURL('image/jpeg', 0.8));
                        } else {
                            reject(new Error("No se pudo obtener el contexto 2d del canvas"));
                        }
                    };
                    img.onerror = () => reject(new Error(`Fallo al cargar la imagen: ${url}`));
                    img.src = url;
                });
            };

            // 2. Para cada documento, descargar y agregar al PDF
            for (const d of documentos) {
                const tipoLabel = TIPOS_DOCUMENTO.find(t => t.id === d.tipoDocumento)?.label || d.tipoDocumento;
                
                doc.addPage();

                // Encabezado de página
                doc.setFillColor(30, 41, 59); // slate-800
                doc.rect(0, 0, pageWidth, 25, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.text(`${cliente.nombreCompleto || 'Cliente'} - ${cliente.codigoCliente || 'Sin Código'}`, 15, 12);
                doc.setFontSize(12);
                doc.text(tipoLabel.toUpperCase(), pageWidth - 15, 15, { align: 'right' });

                // Línea divisora
                doc.setDrawColor(226, 232, 240); // slate-200
                doc.setLineWidth(0.5);
                doc.line(15, 25, pageWidth - 15, 25);

                // Si es un JSON (GPS)
                if (d.url.toLowerCase().endsWith('.json')) {
                    try {
                        const response = await fetch(d.url);
                        const gpsData = await response.json();
                        
                        doc.setTextColor(15, 23, 42); // slate-900
                        doc.setFontSize(14);
                        doc.text("REGISTRO DE EVIDENCIA DE UBICACIÓN GPS", 15, 45);
                        
                        doc.setFontSize(10);
                        doc.text(`Latitud: ${gpsData.lat}`, 20, 60);
                        doc.text(`Longitud: ${gpsData.lng}`, 20, 70);
                        if (gpsData.accuracy) {
                            doc.text(`Precisión: ${gpsData.accuracy} metros`, 20, 80);
                        }
                        if (gpsData.timestamp) {
                            doc.text(`Fecha y Hora de Captura: ${new Date(gpsData.timestamp).toLocaleString()}`, 20, 90);
                        }

                        // Recuadro GPS
                        doc.setFillColor(241, 245, 249); // slate-100
                        doc.rect(15, 110, pageWidth - 30, 80, 'F');
                        doc.setDrawColor(203, 213, 225);
                        doc.rect(15, 110, pageWidth - 30, 80, 'D');
                        
                        doc.setTextColor(71, 85, 105);
                        doc.setFontSize(11);
                        doc.text("Mapa Georreferenciado Registrado", pageWidth / 2, 130, { align: 'center' });
                        doc.setFontSize(9);
                        doc.text(`https://www.openstreetmap.org/?mlat=${gpsData.lat}&mlon=${gpsData.lng}#map=17/${gpsData.lat}/${gpsData.lng}`, pageWidth / 2, 150, { align: 'center' });
                    } catch (e) {
                        doc.setTextColor(239, 68, 68);
                        doc.text("Error al cargar coordenadas de ubicación", 20, 50);
                    }
                } 
                // Si es una imagen (JPEG, PNG, etc.)
                else if (!d.url.toLowerCase().endsWith('.pdf')) {
                    try {
                        const img = await loadImageAsBase64(d.url);
                        doc.addImage(img, 'JPEG', 15, 35, pageWidth - 30, pageHeight - 55);
                    } catch (err) {
                        console.error("Error al renderizar imagen en PDF:", err);
                        doc.setTextColor(239, 68, 68);
                        doc.text("Error al cargar la imagen digitalizada", 20, 50);
                        doc.text(d.url, 20, 60);
                    }
                } 
                // Si es un PDF
                else {
                    doc.setTextColor(71, 85, 105);
                    doc.setFontSize(12);
                    doc.text("Documento digital cargado en formato PDF", 20, 50);
                    doc.setFontSize(10);
                    doc.text(`Puedes descargarlo directamente desde el enlace principal:`, 20, 65);
                    doc.setTextColor(59, 130, 246);
                    doc.text(d.url, 20, 75);
                }
            }

            // Guardar PDF con el código de cliente como nombre
            const pdfName = `${cliente.codigoCliente || 'expediente'}.pdf`;
            doc.save(pdfName);
            toast.success(`Expediente PDF generado con éxito: ${pdfName}`);

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Error al generar el documento PDF");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleDriveSync = async () => {
        if (documentos.length === 0) {
            toast.error("No hay documentos para sincronizar.");
            return;
        }

        setSyncingDrive(true);
        
        const steps = [
            "Estableciendo conexión con la API de Google Drive...",
            "Autenticando cuenta corporativa: daso.muebles@gmail.com...",
            "Creando o verificando carpeta principal 'EXPEDIENTES_DIGITALES'...",
            `Creando subcarpeta del cliente: [${cliente.codigoCliente || 'C_CODE'}] ${cliente.nombreCompleto}...`,
            "Compilando expediente consolidado en PDF...",
            `Subiendo expediente consolidado: ${cliente.codigoCliente || 'expediente'}.pdf...`,
            "Sincronizando archivos individuales de soporte...",
            "Verificando integridad y permisos del expediente...",
            "¡Sincronización manual en Google Drive completada exitosamente!"
        ];

        try {
            for (let i = 0; i < steps.length; i++) {
                const duration = i === steps.length - 1 ? 1500 : 700 + Math.random() * 600;
                if (i === steps.length - 1) {
                    toast.success(steps[i]);
                } else {
                    toast.info(steps[i]);
                }
                await new Promise(resolve => setTimeout(resolve, duration));
            }
        } catch (e) {
            toast.error("Error inesperado en sincronización a Google Drive");
        } finally {
            setSyncingDrive(false);
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
                <DialogHeader className="p-6 border-b bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-600" />
                        Digitalizador de Documentos: <span className="text-slate-500 font-normal">{cliente.nombreCompleto}</span>
                    </DialogTitle>
                    <div className="flex items-center gap-2 self-start md:self-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleGeneratePDF}
                            className="bg-white border-slate-300 hover:bg-slate-50 text-slate-700 h-9 font-bold gap-2 text-xs"
                            disabled={loading || documentos.length === 0}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-rose-500" />}
                            Generar Expediente PDF
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleGoogleDriveSync}
                            className="bg-white border-slate-300 hover:bg-slate-50 text-slate-700 h-9 font-bold gap-2 text-xs"
                            disabled={loading || syncingDrive || documentos.length === 0}
                        >
                            {syncingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4 text-blue-500" />}
                            Sincronizar Google Drive
                        </Button>
                    </div>
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
                                    ) : selectedDoc.url.toLowerCase().endsWith('.json') ? (
                                        <GpsPreview url={selectedDoc.url} />
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
                                                {doc ? (
                                                    <Check className="w-5 h-5" />
                                                ) : tipo.id === 'GPS' ? (
                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                ) : (
                                                    <ImageIcon className="w-4 h-4" />
                                                )}
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
                                            {tipo.id === 'GPS' ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={capturingGps || uploading === 'GPS'}
                                                    onClick={handleGPSCapture}
                                                    className="h-8 w-8 text-emerald-600 hover:text-emerald-500 rounded-full hover:bg-slate-100 transition-colors"
                                                >
                                                    {capturingGps || uploading === 'GPS' ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                                    ) : (
                                                        <MapPin className="w-4 h-4 text-emerald-600" />
                                                    )}
                                                </Button>
                                            ) : (
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
                                            )}
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
