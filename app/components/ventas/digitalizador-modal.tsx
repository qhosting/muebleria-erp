
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
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    { id: 'OTRO', label: 'Otro Documento' },
    // Documentos del Aval
    { id: 'AVAL_INE_FRONT', label: 'Aval - INE Frontal' },
    { id: 'AVAL_INE_BACK', label: 'Aval - INE Trasera' },
    { id: 'AVAL_DOMICILIO', label: 'Aval - Comprobante de Domicilio' },
    { id: 'AVAL_INGRESOS', label: 'Aval - Comprobante de Ingresos' },
    { id: 'AVAL_PROPIEDAD', label: 'Aval - Comprobante de Propiedad' },
    { id: 'AVAL_OTRO', label: 'Aval - Otro Documento' }
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

    // Estados para la terminal de sincronización real con Google Drive
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncLogList, setSyncLogList] = useState<{ text: string; status: 'info' | 'success' | 'warning' | 'error' | 'working' }[]>([]);
    const [showSyncTerminal, setShowSyncTerminal] = useState(false);

    // Estados para el historial de cuentas vinculadas por CURP
    const [historialCuentas, setHistorialCuentas] = useState<any[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    const fetchHistorialCuentas = async () => {
        if (!cliente.curp) return;
        setLoadingHistorial(true);
        try {
            const response = await fetch(`/api/ventas/boveda/cliente-historial?curp=${cliente.curp}`);
            if (response.ok) {
                const data = await response.json();
                setHistorialCuentas(data);
            }
        } catch (error) {
            console.error("Error al cargar historial de cuentas:", error);
        } finally {
            setLoadingHistorial(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchDocumentos();
            fetchHistorialCuentas();
        } else {
            setHistorialCuentas([]);
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
        
        let fileToUpload = file;
        try {
            const { compressImage } = await import("@/lib/image-compressor");
            fileToUpload = await compressImage(file);
        } catch (err) {
            console.error("Error al comprimir imagen, subiendo original:", err);
        }

        const formData = new FormData();
        formData.append('file', fileToUpload);
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

    const generatePdfDocument = async (): Promise<any> => {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 1. PORTADA DOSSIER PREMIUM
        doc.setFillColor(15, 23, 42); // slate-900 color
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // marcos de líneas finas geométricas
        doc.setDrawColor(51, 65, 85); // slate-700
        doc.setLineWidth(0.3);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'D');
        doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'D');

        // elegante franja de acento en azul cielo
        doc.setFillColor(56, 189, 248); // sky-400
        doc.rect(12, 12, 4, pageHeight - 24, 'F');

        // elegante card panel central en color gris carbón oscuro (slate-800)
        doc.setFillColor(30, 41, 59); // slate-800
        doc.setDrawColor(56, 189, 248); // sky-400
        doc.setLineWidth(0.5);
        doc.rect(25, 60, pageWidth - 50, 120, 'FD');

        // Ornamentos geométricos en la portada
        doc.setDrawColor(71, 85, 105); // slate-600
        doc.setLineWidth(0.2);
        // Pequeñas cruces en las esquinas del panel card
        const crossSize = 3;
        const coords = [
            { x: 25, y: 60 },
            { x: pageWidth - 25, y: 60 },
            { x: 25, y: 180 },
            { x: pageWidth - 25, y: 180 }
        ];
        coords.forEach(c => {
            doc.line(c.x - crossSize, c.y, c.x + crossSize, c.y);
            doc.line(c.x, c.y - crossSize, c.x, c.y + crossSize);
        });

        // Títulos de la portada
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text("EXPEDIENTE DIGITAL DE CLIENTE", pageWidth / 2, 85, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(56, 189, 248); // sky-400
        doc.text("SISTEMA DE ARCHIVADO Y CONTROL DIGITAL (VERTEX ERP)", pageWidth / 2, 95, { align: 'center' });

        // Decorador
        doc.setDrawColor(56, 189, 248); // sky-400
        doc.setLineWidth(1);
        doc.line(45, 103, pageWidth - 45, 103);

        // Información del Cliente
        doc.setFontSize(11);
        doc.setTextColor(203, 213, 225); // slate-300
        doc.setFont('helvetica', 'normal');
        
        let yPos = 120;
        const printText = (label: string, value: string) => {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text(`${label}:`, 35, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(255, 255, 255);
            doc.text(value, 80, yPos);
            yPos += 10;
        };

        printText("Nombre Completo", cliente.nombreCompleto || 'Sin Nombre');
        if (cliente.codigoCliente) printText("Código de Cliente", cliente.codigoCliente);
        if (cliente.curp) printText("CURP", cliente.curp);
        if (cliente.numContrato) printText("Folio de Contrato", cliente.numContrato);
        if (cliente.telefono) printText("Teléfono", cliente.telefono);

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

        // Ordenar documentos para que primero aparezcan los del cliente y luego los del aval
        const docsCliente = documentos.filter(d => !d.tipoDocumento.startsWith('AVAL_'));
        const docsAval = documentos.filter(d => d.tipoDocumento.startsWith('AVAL_'));
        const sortedDocs = [...docsCliente, ...docsAval];

        let isFirstAval = true;

        // 2. Para cada documento, descargar y agregar al PDF
        for (const d of sortedDocs) {
            const isAval = d.tipoDocumento.startsWith('AVAL_');
            if (isAval && isFirstAval) {
                isFirstAval = false;
                doc.addPage();

                // PÁGINA DIVISORA AVAL PREMIUM
                doc.setFillColor(15, 23, 42); // slate-900 color
                doc.rect(0, 0, pageWidth, pageHeight, 'F');

                doc.setDrawColor(51, 65, 85); // slate-700
                doc.setLineWidth(0.3);
                doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'D');
                doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'D');

                doc.setFillColor(56, 189, 248); // sky-400
                doc.rect(12, 12, 4, pageHeight - 24, 'F');

                // elegante card panel central
                doc.setFillColor(30, 41, 59); // slate-800
                doc.setDrawColor(56, 189, 248); // sky-400
                doc.setLineWidth(0.5);
                doc.rect(25, 80, pageWidth - 50, 80, 'FD');

                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(20);
                doc.text("DOCUMENTACIÓN DEL AVAL", pageWidth / 2, 115, { align: 'center' });

                doc.setFontSize(10);
                doc.setTextColor(56, 189, 248); // sky-400
                doc.text("RESPALDOS DIGITALES Y COMPROBANTES VINCULADOS", pageWidth / 2, 125, { align: 'center' });

                doc.setDrawColor(56, 189, 248); // sky-400
                doc.setLineWidth(1);
                doc.line(45, 133, pageWidth - 45, 133);
            }

            const tipoLabel = TIPOS_DOCUMENTO.find(t => t.id === d.tipoDocumento)?.label || d.tipoDocumento;
            
            doc.addPage();

            // Encabezado de página
            doc.setFillColor(30, 41, 59); // slate-800
            doc.rect(0, 0, pageWidth, 25, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`${cliente.nombreCompleto || 'Cliente'} - ${cliente.codigoCliente || 'Sin Código'}`, 15, 12);
            doc.setFontSize(12);
            doc.setTextColor(56, 189, 248); // sky-400
            doc.text(tipoLabel.toUpperCase(), pageWidth - 15, 15, { align: 'right' });

            // Línea divisora
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setLineWidth(0.5);
            doc.line(15, 25, pageWidth - 15, 25);

            // Si es un JSON (GPS)
            if (d.url.toLowerCase().endsWith('.json')) {
                try {
                    const response = await fetch(`/api/ventas/boveda/view?id=${d.id}`);
                    const gpsData = await response.json();
                    
                    doc.setTextColor(15, 23, 42); // slate-900
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.text("REPORTE TÉCNICO DE GEORREFERENCIACIÓN GPS", 15, 40);

                    // Rejilla tipo blueprint para GPS (de fondo en el panel)
                    const panelY = 95;
                    const panelHeight = 110;

                    let mapLoaded = false;
                    try {
                        // Cargar el mapa estático de Yandex con un pin rojo y centrado en las coordenadas del GPS a través del proxy local (evita CORS)
                        const mapImg = await loadImageAsBase64(`/api/ventas/boveda/map-proxy?lng=${gpsData.lng}&lat=${gpsData.lat}`);
                        doc.addImage(mapImg, 'JPEG', 15, panelY, pageWidth - 30, panelHeight);
                        doc.setDrawColor(15, 23, 42); // slate-900 para borde elegante
                        doc.setLineWidth(0.5);
                        doc.rect(15, panelY, pageWidth - 30, panelHeight, 'D');
                        mapLoaded = true;
                    } catch (mapErr) {
                        console.warn("Fallo al cargar mapa estático, usando brújula blueprint:", mapErr);
                    }

                    if (!mapLoaded) {
                        doc.setFillColor(15, 23, 42); // slate-900 (fondo oscuro para blueprint)
                        doc.rect(15, panelY, pageWidth - 30, panelHeight, 'F');

                        // Dibujar rejilla técnica azul
                        doc.setDrawColor(30, 58, 138); // azul marino oscuro
                        doc.setLineWidth(0.15);
                        for (let x = 25; x < pageWidth - 15; x += 10) {
                            doc.line(x, panelY, x, panelY + panelHeight);
                        }
                        for (let y = panelY + 5; y < panelY + panelHeight; y += 10) {
                            doc.line(15, y, pageWidth - 15, y);
                        }

                        // Compás vectorizado estilizado (Brújula de agrimensura)
                        const cx = pageWidth / 2;
                        const cy = panelY + (panelHeight / 2);
                        doc.setDrawColor(56, 189, 248); // sky-400
                        doc.setLineWidth(0.25);
                        
                        // Círculos concéntricos
                        doc.circle(cx, cy, 8, 'D');
                        doc.circle(cx, cy, 20, 'D');
                        doc.circle(cx, cy, 32, 'D');

                        // Ejes direccionales
                        doc.setDrawColor(71, 85, 105); // slate-600
                        doc.line(cx - 45, cy, cx + 45, cy);
                        doc.line(cx, cy - 45, cx, cy + 45);

                        // Letras de brújula
                        doc.setTextColor(56, 189, 248); // sky-400
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(8);
                        doc.text("N", cx, cy - 36, { align: 'center' });
                        doc.text("S", cx, cy + 39, { align: 'center' });
                        doc.text("W", cx - 39, cy + 2, { align: 'center' });
                        doc.text("E", cx + 37, cy + 2, { align: 'center' });

                        // Aguja de la brújula apuntando al norte (triángulos rellenos)
                        doc.setFillColor(244, 63, 94); // rose-500 para el Norte
                        doc.triangle(cx, cy, cx - 3, cy, cx, cy - 25, 'FD');
                        doc.setFillColor(226, 232, 240); // slate-200 para el Sur
                        doc.triangle(cx, cy, cx + 3, cy, cx, cy + 25, 'FD');

                        // Pequeña decoración central
                        doc.setFillColor(15, 23, 42); // slate-900
                        doc.circle(cx, cy, 2, 'F');
                        doc.setDrawColor(56, 189, 248);
                        doc.circle(cx, cy, 2, 'D');
                    }

                    // Cuadro técnico de telemetría (Tabla técnica)
                    doc.setFillColor(248, 250, 252); // slate-50 (fondo claro para tabla)
                    doc.rect(15, 50, pageWidth - 30, 38, 'F');
                    doc.setDrawColor(203, 213, 225); // slate-300
                    doc.setLineWidth(0.3);
                    doc.rect(15, 50, pageWidth - 30, 38, 'D');

                    // Línea horizontal divisora interna de la tabla
                    doc.line(15, 62, pageWidth - 15, 62);
                    doc.line(15, 74, pageWidth - 15, 74);
                    doc.line(pageWidth / 2, 50, pageWidth / 2, 88); // línea vertical en el centro

                    const drawTableCell = (label: string, val: string, x: number, y: number) => {
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(8);
                        doc.setTextColor(100, 116, 139); // slate-500
                        doc.text(label.toUpperCase(), x, y);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(10);
                        doc.setTextColor(15, 23, 42); // slate-900
                        doc.text(val, x, y + 5);
                    };

                    drawTableCell("Latitud GPS", `${gpsData.lat.toFixed(7)}°`, 20, 54);
                    drawTableCell("Longitud GPS", `${gpsData.lng.toFixed(7)}°`, pageWidth / 2 + 5, 54);
                    drawTableCell("Precisión de Señal", gpsData.accuracy ? `± ${gpsData.accuracy.toFixed(1)} metros` : "N/D", 20, 66);
                    drawTableCell("Fecha y Hora", gpsData.timestamp ? new Date(gpsData.timestamp).toLocaleString() : "N/D", pageWidth / 2 + 5, 66);
                    drawTableCell("Proveedor de Geodatos", "OpenStreetMap Contributors", 20, 78);
                    drawTableCell("Sistema de Referencia", "WGS 84 (Estándar Global)", pageWidth / 2 + 5, 78);

                    // Nota al pie técnica
                    doc.setFontSize(8);
                    doc.setTextColor(148, 163, 184); // slate-400
                    doc.text("Nota: Este documento certifica la ubicación exacta del domicilio mediante captura satelital.", 15, panelY + panelHeight + 6);

                } catch (e) {
                    doc.setTextColor(239, 68, 68);
                    doc.text("Error al cargar coordenadas de ubicación", 20, 50);
                }
            } 
            // Si es una imagen
            else if (!d.url.toLowerCase().endsWith('.pdf')) {
                try {
                    const img = await loadImageAsBase64(`/api/ventas/boveda/view?id=${d.id}`);
                    // Para que la imagen encaje bien con margen, calculamos ancho y alto
                    const targetWidth = pageWidth - 30;
                    const targetHeight = pageHeight - 55;
                    doc.addImage(img, 'JPEG', 15, 35, targetWidth, targetHeight);
                } catch (err) {
                    console.error("Error al renderizar imagen en PDF:", err);
                    doc.setTextColor(239, 68, 68);
                    doc.setFont('helvetica', 'bold');
                    doc.text("Error al cargar la imagen digitalizada", 20, 50);
                    doc.setFont('helvetica', 'normal');
                    doc.text(d.url, 20, 60);
                }
            } 
            // Si es un PDF
            else {
                doc.setTextColor(71, 85, 105);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text("Documento digital cargado en formato PDF", 20, 50);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.text("Puedes descargarlo directamente desde el enlace principal:", 20, 65);
                doc.setTextColor(59, 130, 246);
                doc.text(d.url, 20, 75);
            }
        }

        return doc;
    };

    const handleGeneratePDF = async () => {
        if (documentos.length === 0) {
            toast.error("No hay documentos subidos para este cliente.");
            return;
        }

        setLoading(true);
        toast.info("Generando expediente PDF de alta fidelidad...");

        try {
            const doc = await generatePdfDocument();
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
        setShowSyncTerminal(true);
        setSyncProgress(5);
        setSyncLogList([
            { text: "Iniciando protocolo de sincronización Vertex v1.0.4...", status: 'info' }
        ]);

        const addLog = (text: string, status: 'info' | 'working' | 'success' | 'warning' | 'error') => {
            setSyncLogList(prev => [...prev, { text, status }]);
        };

        try {
            // Paso 1: Autenticación
            addLog("Solicitando token de acceso seguro a Google API...", 'working');
            const authRes = await fetch('/api/ventas/boveda/sync-drive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'auth' })
            });
            const authData = await authRes.json();

            if (!authRes.ok || !authData.success) {
                throw new Error(authData.error || "Fallo en la autenticación del servidor.");
            }

            const accessToken = authData.accessToken;
            addLog("[Google OAuth2] Conexión establecida. Token generado.", 'success');
            setSyncProgress(20);

            // Paso 2: Crear/detectar carpeta
            addLog(`Verificando o creando carpeta corporativa para: ${cliente.nombreCompleto}...`, 'working');
            const folderRes = await fetch('/api/ventas/boveda/sync-drive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create-folder',
                    accessToken,
                    nombreCliente: cliente.nombreCompleto,
                    codigoCliente: cliente.codigoCliente
                })
            });
            const folderData = await folderRes.json();

            if (!folderRes.ok || !folderData.success) {
                throw new Error(folderData.error || "No se pudo crear la carpeta del cliente en Drive.");
            }

            const folderId = folderData.folderId;
            addLog(`[Google Drive] Carpeta de cliente confirmada con ID: ${folderId.substring(0, 16)}...`, 'success');
            setSyncProgress(40);

            // Paso 3: Sincronizar archivos individuales
            addLog(`Sincronizando ${documentos.length} archivo(s) individual(es) de soporte...`, 'info');
            
            let uploadedCount = 0;
            for (const d of documentos) {
                const tipoLabel = TIPOS_DOCUMENTO.find(t => t.id === d.tipoDocumento)?.label || d.tipoDocumento;
                addLog(`Enviando ${tipoLabel}...`, 'working');

                const uploadFileRes = await fetch('/api/ventas/boveda/sync-drive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'upload-file',
                        accessToken,
                        folderId,
                        documentId: d.id,
                        codigoCliente: cliente.codigoCliente
                    })
                });
                const uploadFileData = await uploadFileRes.json();

                if (!uploadFileRes.ok || !uploadFileData.success) {
                    addLog(`Error al subir ${tipoLabel}: ${uploadFileData.error || 'Fallo desconocido'}`, 'warning');
                } else {
                    uploadedCount++;
                    addLog(`Sincronizado: ${tipoLabel} -> Enlace: ${uploadFileData.driveUrl.substring(0, 40)}...`, 'success');
                }

                // Incrementar progreso dinámicamente
                const progressStep = 40 + Math.floor((uploadedCount / documentos.length) * 35);
                setSyncProgress(progressStep);
            }

            // Paso 4: Generar y subir PDF consolidado
            addLog("Compilando expediente consolidado en PDF...", 'working');
            const pdfDoc = await generatePdfDocument();
            const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];
            addLog(`Dossier PDF compilado en memoria (${(pdfBase64.length * 0.75 / 1024).toFixed(1)} KB).`, 'success');
            setSyncProgress(85);

            addLog(`Subiendo expediente consolidado: EXPEDIENTE_${cliente.codigoCliente || 'CLIENTE'}.PDF...`, 'working');
            const uploadPdfRes = await fetch('/api/ventas/boveda/sync-drive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'upload-pdf',
                    accessToken,
                    folderId,
                    pdfBase64,
                    codigoCliente: cliente.codigoCliente
                })
            });
            const uploadPdfData = await uploadPdfRes.json();

            if (!uploadPdfRes.ok || !uploadPdfData.success) {
                throw new Error(uploadPdfData.error || "No se pudo cargar el expediente consolidado en PDF.");
            }

            addLog(`Expediente PDF consolidado cargado exitosamente en Google Drive.`, 'success');
            setSyncProgress(100);
            addLog("PROCESO COMPLETADO: Todos los archivos se han sincronizado con Google Drive.", 'success');
            toast.success("¡Sincronización con Google Drive completada!");

            // Recargar documentos para mostrar estado sincronizado
            fetchDocumentos();

        } catch (e: any) {
            console.error("Error sincronizando a Google Drive:", e);
            addLog(`ERROR CRÍTICO: ${e.message || 'Error inesperado'}`, 'error');
            toast.error(e.message || "Fallo en la sincronización a Google Drive");
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
                    <DialogDescription className="sr-only">
                        Digitaliza, valida y sincroniza los documentos de soporte de {cliente.nombreCompleto}.
                    </DialogDescription>
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
                                            src={`/api/ventas/boveda/view?id=${selectedDoc.id}`} 
                                            className="w-full h-full border-0"
                                            title="PDF Preview"
                                        />
                                    ) : selectedDoc.url.toLowerCase().endsWith('.json') ? (
                                        <GpsPreview url={`/api/ventas/boveda/view?id=${selectedDoc.id}`} />
                                    ) : (
                                        <img 
                                            src={`/api/ventas/boveda/view?id=${selectedDoc.id}`} 
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
                                            <a href={`/api/ventas/boveda/view?id=${selectedDoc.id}`} target="_blank" rel="noopener noreferrer">
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
                        
                        <Tabs defaultValue="cliente" className="w-full">
                            <TabsList className="grid grid-cols-2 mb-4 bg-slate-100 p-1 rounded-xl">
                                <TabsTrigger value="cliente" className="font-bold text-xs py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                                    Documentos Cliente
                                </TabsTrigger>
                                <TabsTrigger value="aval" className="font-bold text-xs py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
                                    Documentos Aval
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="cliente" className="space-y-2 focus-visible:outline-none focus-visible:ring-0">
                                {TIPOS_DOCUMENTO.filter(t => !t.id.startsWith('AVAL_')).map((tipo) => {
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
                            </TabsContent>

                            <TabsContent value="aval" className="space-y-2 focus-visible:outline-none focus-visible:ring-0">
                                {TIPOS_DOCUMENTO.filter(t => t.id.startsWith('AVAL_')).map((tipo) => {
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
                            </TabsContent>
                        </Tabs>
                    </div>

                    {!selectedDoc && (
                        <div className="flex flex-col space-y-6">
                            {/* Card de selección */}
                            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center space-y-2">
                                <ImageIcon className="w-8 h-8 text-slate-400" />
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase">Sin selección de documento</p>
                                    <p className="text-[11px] text-slate-400">Pulsa en el icono del ojo (<Eye className="w-3.5 h-3.5 inline text-sky-600 mx-0.5" />) para visualizar o validar un archivo.</p>
                                </div>
                            </div>

                            {/* Sección Premium: Historial de Cuentas Asociadas */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left flex flex-col space-y-4 shadow-xl">
                                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-white text-xs font-bold uppercase tracking-wider">Historial de Créditos del Cliente</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Búsqueda vinculada por CURP: <span className="font-mono text-slate-300 font-bold">{cliente.curp || 'Sin CURP'}</span></p>
                                    </div>
                                    <Badge variant="outline" className="bg-slate-950 text-sky-400 border-sky-500/20 text-[10px] uppercase font-bold tracking-tight">
                                        Vertex Ledger
                                    </Badge>
                                </div>

                                {loadingHistorial ? (
                                    <div className="flex flex-col items-center justify-center py-8 space-y-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
                                        <p className="text-[10px] text-slate-500">Consultando base de datos en tiempo real...</p>
                                    </div>
                                ) : !cliente.curp ? (
                                    <div className="text-center py-6">
                                        <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                        <p className="text-xs text-slate-400 font-bold">CURP no registrada</p>
                                        <p className="text-[10px] text-slate-500 mt-1 max-w-[250px] mx-auto">Registre la CURP del cliente en su perfil para indexar su historial de cuentas.</p>
                                    </div>
                                ) : historialCuentas.length === 0 ? (
                                    <p className="text-xs text-slate-500 text-center py-6">No se encontraron otras cuentas para esta CURP.</p>
                                ) : (
                                    <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                                        {historialCuentas.map((cta) => {
                                            const esActual = cta.codigoCliente === cliente.codigoCliente || cta.numContrato === cliente.numContrato;
                                            return (
                                                <div 
                                                    key={cta.id} 
                                                    className={`p-3.5 rounded-xl border transition-all ${
                                                        esActual 
                                                            ? 'bg-sky-950/20 border-sky-500/30 ring-1 ring-sky-500/10 shadow-inner' 
                                                            : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start gap-2 mb-2">
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-bold text-white font-mono">{cta.codigoCliente}</span>
                                                                {cta.numContrato && (
                                                                    <span className="text-[10px] text-slate-500 font-mono">({cta.numContrato})</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-tight">{cta.descripcionProducto || 'Sin descripción'}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {esActual && (
                                                                <Badge className="bg-sky-500/15 text-sky-400 border border-sky-400/20 text-[9px] uppercase font-black px-1.5 py-0">Actual</Badge>
                                                            )}
                                                            <Badge className={`text-[9px] uppercase font-bold px-1.5 py-0 ${
                                                                cta.statusCuenta === 'activo' 
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                            }`}>
                                                                {cta.statusCuenta === 'activo' ? 'Activo' : 'Inactivo'}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2 border-t border-slate-800/60 pt-2.5 text-[10px]">
                                                        <div>
                                                            <p className="text-slate-500 uppercase tracking-wider text-[8px] font-bold">Saldo Actual</p>
                                                            <p className="text-white font-bold font-mono mt-0.5">${parseFloat(cta.saldoActual).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500 uppercase tracking-wider text-[8px] font-bold">Monto Pago</p>
                                                            <p className="text-slate-200 font-mono mt-0.5">${parseFloat(cta.montoPago).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-[8px] text-slate-500 lowercase">{cta.periodicidad}</span></p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-slate-500 uppercase tracking-wider text-[8px] font-bold">Atraso / Días</p>
                                                            {cta.diasVencidos > 0 ? (
                                                                <p className="text-rose-400 font-bold font-mono mt-0.5">${parseFloat(cta.saldoVencido).toLocaleString('es-MX', { minimumFractionDigits: 2 })} <span className="text-[8px] font-bold">({cta.diasVencidos}d)</span></p>
                                                            ) : (
                                                                <p className="text-emerald-400 font-bold mt-0.5">Al Corriente</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-800/40 text-[9px] text-slate-500">
                                                        <span>Venta: {new Date(cta.fechaVenta).toLocaleDateString()}</span>
                                                        {cta.createdAt && (
                                                            <span>Ingreso: {new Date(cta.createdAt).toLocaleDateString()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-slate-50">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>

                {showSyncTerminal && (
                    <div className="absolute inset-0 bg-slate-950 z-[60] flex flex-col font-mono text-emerald-400 p-6 select-none animate-in fade-in zoom-in-95 duration-200">
                        {/* Terminal Header */}
                        <div className="flex items-center justify-between border-b border-emerald-950 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                                <span className="w-3 h-3 rounded-full bg-amber-500" />
                                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-xs text-emerald-500/80 font-bold ml-2 tracking-wider">VERTEX SYNC SHELL v1.0.4</span>
                            </div>
                            <div className="text-[10px] text-emerald-600 tracking-widest font-bold">
                                CONSOLA SEGURA // EXPORTANDO EXPEDIENTES
                            </div>
                        </div>

                        {/* Console logs */}
                        <div className="flex-1 overflow-y-auto space-y-2 p-4 bg-slate-900/50 border border-emerald-950/50 rounded-lg min-h-[300px]">
                            {syncLogList.map((log, index) => {
                                let prefix = ">>";
                                let colorClass = "text-emerald-400";
                                if (log.status === 'working') {
                                    prefix = "⟳";
                                    colorClass = "text-sky-400 animate-pulse";
                                } else if (log.status === 'success') {
                                    prefix = "✓";
                                    colorClass = "text-emerald-400 font-bold";
                                } else if (log.status === 'warning') {
                                    prefix = "⚠";
                                    colorClass = "text-amber-400 font-bold";
                                } else if (log.status === 'error') {
                                    prefix = "✗";
                                    colorClass = "text-rose-500 font-bold animate-pulse";
                                } else if (log.status === 'info') {
                                    prefix = "i";
                                    colorClass = "text-slate-400";
                                }
                                return (
                                    <div key={index} className={`text-xs flex items-start gap-2 ${colorClass}`}>
                                        <span className="select-none text-emerald-700">{prefix}</span>
                                        <span className="flex-1 whitespace-pre-wrap">{log.text}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Progress bar */}
                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-xs text-emerald-500/80">
                                <span className="font-bold uppercase tracking-widest">Estado de Transferencia:</span>
                                <span className="font-mono font-bold">{syncProgress}%</span>
                            </div>
                            <div className="h-3 w-full bg-slate-900 border border-emerald-950/80 rounded-full overflow-hidden p-0.5">
                                <div 
                                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(52,211,153,0.5)]" 
                                    style={{ width: `${syncProgress}%` }}
                                />
                            </div>
                        </div>

                        {/* Terminal Footer Actions */}
                        <div className="mt-6 border-t border-emerald-950 pt-4 flex justify-between items-center">
                            <span className="text-[10px] text-emerald-700">SESIÓN ENCRIPTADA DE EXPORTACIÓN</span>
                            <Button 
                                onClick={() => setShowSyncTerminal(false)}
                                className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900 hover:text-emerald-300 font-bold text-xs"
                                disabled={syncingDrive}
                            >
                                Regresar al Digitalizador
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
