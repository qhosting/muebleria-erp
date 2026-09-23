"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    UserCheck,
    Calendar,
    Save,
    Wifi,
    WifiOff,
    MapPin,
    CheckCircle2,
    Camera,
    Trash2,
    Home,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    Check,
    CheckSquare,
    Info,
    Tv,
    RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface VerificacionModalProps {
    cliente: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isOnline: boolean;
}

// Utilidad para comprimir imágenes de alta resolución a formato ligero JPEG de máx 1200px
const compressImage = (file: File, maxDimension = 1200, quality = 0.75): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(e.target?.result as string);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
                resolve(compressedBase64);
            };
            img.onerror = () => resolve(e.target?.result as string);
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export function VerificacionModal({ cliente, isOpen, onClose, onSuccess, isOnline }: VerificacionModalProps) {
    const { data: session } = useSession();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [compressingPhotos, setCompressingPhotos] = useState(false);
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [buscandoGps, setBuscandoGps] = useState(false);
    const [fotos, setFotos] = useState<string[]>([]);
    const [hasDraft, setHasDraft] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Formulario unificado de 35 campos basados en la ficha de auditoría
    const [form, setForm] = useState({
        contrato: "",
        codigoCliente: "",
        nombreCliente: "",
        direccion: "",
        refCalles: "",
        municipio: "",
        
        // Tipo de Casa
        tipoCasa: "CASA",
        casa2Plantas: false,
        condominioAbierto: false,
        condominioCerrado: false,
        
        // Servicios
        gas: true,
        luz: true,
        agua: true,
        telefono: true,
        terraceria: false,
        zona: "DENTRO DE ZONA",
        
        // Estructura y Vivienda
        vivienda: "EXCELENTE",
        material: true,
        madera: false,
        lamina: false,
        
        // Mobiliario y Equipamiento
        condicionMobiliario: "BUENO",
        computadora: false,
        sala: true,
        comedor: true,
        refrigerador: true,
        estufa: true,
        dvd: false,
        
        // Datos de Visita, Recomendación y Auditoría
        infoVecinos: "LO RECOMIENDA",
        observacion: "crédito sin inconveniente",
        enganche: "",
        plazo: "60",
        abono: "",
        diaPago: "LUNES",
        codigoGestor: "",
        fecha: ""
    });

    const initDefaultForm = () => {
        return {
            contrato: cliente?.numContrato || "",
            codigoCliente: cliente?.codigoCliente || cliente?.id?.slice(-8).toUpperCase() || "",
            nombreCliente: cliente?.nombreCompleto || cliente?.nombre || "",
            direccion: cliente?.direccionCompleta || cliente?.direccion || "",
            refCalles: "",
            municipio: cliente?.ciudad || "Márquez",
            
            tipoCasa: "CASA",
            casa2Plantas: false,
            condominioAbierto: false,
            condominioCerrado: false,
            
            gas: true,
            luz: true,
            agua: true,
            telefono: cliente?.telefono ? true : false,
            terraceria: false,
            zona: "DENTRO DE ZONA",
            
            vivienda: "BUENO",
            material: true,
            madera: false,
            lamina: false,
            
            condicionMobiliario: "BUENO",
            computadora: false,
            sala: true,
            comedor: true,
            refrigerador: true,
            estufa: true,
            dvd: false,
            
            infoVecinos: "LO RECOMIENDA",
            observacion: "crédito sin inconveniente",
            enganche: "",
            plazo: "60",
            abono: cliente?.montoAcordado ? String(cliente.montoAcordado) : "",
            diaPago: cliente?.diaPago || "LUNES",
            codigoGestor: (session?.user as any)?.codigoGestor || "",
            fecha: new Date().toISOString().split("T")[0]
        };
    };

    // Obtener ubicación GPS con alta precisión
    const getUbicacion = async () => {
        setBuscandoGps(true);
        try {
            const { obtenerUbicacionCobrador } = await import("@/lib/native/location");
            const pos = (await obtenerUbicacionCobrador(true, 7000)) as any;
            if (pos?.lat && pos?.lng) {
                setCoords({
                    lat: pos.lat,
                    lng: pos.lng
                });
                toast.success("Ubicación GPS obtenida con éxito");
                return;
            }
        } catch (error) {
            console.warn("Error de geolocalización en ubicación nativa:", error);
        }

        // Fallback a API nativa del navegador si no se obtuvo vía Capacitor
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (p) => {
                    setCoords({
                        lat: p.coords.latitude,
                        lng: p.coords.longitude
                    });
                    toast.success("Ubicación GPS fijada");
                },
                (e) => {
                    console.warn("Fallo GPS navegador:", e);
                    toast.error("No se pudo obtener la ubicación GPS");
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        }
        setBuscandoGps(false);
    };

    // Al abrir el modal, buscar borrador guardado en localStorage para no perder datos si la app se cerró al usar la cámara
    useEffect(() => {
        if (isOpen && cliente?.id) {
            const draftKey = `vd_draft_${cliente.id}`;
            const savedDraft = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;

            if (savedDraft) {
                try {
                    const parsed = JSON.parse(savedDraft);
                    if (parsed.form) setForm(parsed.form);
                    if (parsed.fotos && Array.isArray(parsed.fotos)) setFotos(parsed.fotos);
                    if (parsed.step) setStep(parsed.step);
                    if (parsed.coords) setCoords(parsed.coords);
                    setHasDraft(true);
                    toast.info("Borrador recuperado", {
                        description: "Se restauró la información capturada previamente."
                    });
                } catch (e) {
                    console.error("Error al restaurar borrador de verificación:", e);
                    setForm(initDefaultForm());
                    setFotos([]);
                    setStep(1);
                    setHasDraft(false);
                }
            } else {
                setForm(initDefaultForm());
                setFotos([]);
                setStep(1);
                setHasDraft(false);
            }
            
            getUbicacion();
        }
    }, [isOpen, cliente?.id, session]);

    // Guardar borrador reactivamente ante cualquier cambio de campo o foto
    useEffect(() => {
        if (isOpen && cliente?.id) {
            const draftKey = `vd_draft_${cliente.id}`;
            try {
                localStorage.setItem(draftKey, JSON.stringify({
                    form,
                    fotos,
                    step,
                    coords,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.warn("No se pudo guardar borrador local:", e);
            }
        }
    }, [form, fotos, step, coords, isOpen, cliente?.id]);

    const handleDiscardDraft = () => {
        if (!cliente?.id) return;
        if (confirm("¿Deseas descartar este borrador y reiniciar el formulario?")) {
            localStorage.removeItem(`vd_draft_${cliente.id}`);
            setForm(initDefaultForm());
            setFotos([]);
            setStep(1);
            setHasDraft(false);
            toast.info("Borrador descartado");
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setCompressingPhotos(true);
        try {
            const fileList = Array.from(files);
            const compressed = await Promise.all(
                fileList.map(file => compressImage(file, 1200, 0.75))
            );
            setFotos(prev => [...prev, ...compressed]);
            toast.success(`${compressed.length} foto(s) optimizada(s) para modo offline`);
        } catch (error) {
            console.error("Error al procesar imágenes:", error);
            toast.error("Error al procesar las fotografías");
        } finally {
            setCompressingPhotos(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const removeFoto = (index: number) => {
        setFotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleToggle = (field: string) => {
        setForm(prev => ({
            ...prev,
            [field]: !((prev as any)[field])
        }));
    };

    const handleSelectChange = (field: string, value: string) => {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleInputChange = (field: string, value: string) => {
        setForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (fotos.length === 0) {
            toast.error("Es obligatorio capturar al menos una foto de evidencia.");
            return;
        }

        setLoading(true);

        try {
            const fechaIso = form.fecha 
                ? (form.fecha.includes("T") ? form.fecha : `${form.fecha}T12:00:00.000Z`) 
                : new Date().toISOString();

            const verificacionData = {
                clienteId: cliente.id,
                gestorId: (session?.user as any)?.id || "unknown",
                fecha: fechaIso,
                detallesExtra: {
                    ...form,
                    fecha: form.fecha || new Date().toISOString().split("T")[0],
                    latitud: coords?.lat,
                    longitud: coords?.lng,
                    evidencia: fotos 
                }
            };

            let guardadoEnServidor = false;
            // 1. Envío directo al servidor si estamos conectados
            if (typeof navigator !== 'undefined' && navigator.onLine) {
                try {
                    const response = await fetch('/api/clientes/verificaciones', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(verificacionData)
                    });
                    if (response.ok) {
                        guardadoEnServidor = true;
                    }
                } catch (netErr) {
                    console.warn("Fallo envío directo a API, se respaldará en IndexedDB:", netErr);
                }
            }

            // 2. Guardar en almacenamiento IndexedDB local para respaldo offline
            try {
                const { syncService } = await import("@/lib/sync-service");
                const { db } = await import("@/lib/offline-db");
                if (guardadoEnServidor) {
                    try {
                        await db.verificaciones.add({
                            ...verificacionData,
                            localId: "sync_" + Date.now(),
                            syncStatus: 'synced',
                            createdOffline: false
                        });
                        await db.clientes.where('id').equals(verificacionData.clienteId).modify({
                            vdStatus: 'REALIZADA'
                        });
                    } catch (_) {}
                } else {
                    await syncService.addVerificacionOffline(verificacionData);
                }
            } catch (indexedErr) {
                console.warn("No se pudo persistir en IndexedDB:", indexedErr);
            }

            // Limpiar borrador ya que fue guardado exitosamente
            if (typeof window !== 'undefined' && cliente?.id) {
                localStorage.removeItem(`vd_draft_${cliente.id}`);
            }

            toast.success("Verificación domiciliaria guardada", {
                description: guardadoEnServidor
                    ? "Registrada exitosamente en el sistema."
                    : "Guardada offline. Se sincronizará en cuanto tengas señal."
            });
            
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error al registrar verificación:", error);
            toast.error("Error al registrar la verificación");
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">Paso 1: Datos de Cuenta y Ubicación</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Número Contrato</Label>
                                <Input 
                                    value={form.contrato} 
                                    onChange={(e) => handleInputChange("contrato", e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-10 text-xs rounded-lg text-white"
                                    placeholder="Contrato"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Código de Cliente</Label>
                                <Input 
                                    value={form.codigoCliente} 
                                    onChange={(e) => handleInputChange("codigoCliente", e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-10 text-xs rounded-lg text-white font-mono"
                                    placeholder="Código"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Nombre de Cliente</Label>
                            <Input 
                                value={form.nombreCliente} 
                                onChange={(e) => handleInputChange("nombreCliente", e.target.value)}
                                className="bg-slate-900 border-slate-800 h-10 text-xs rounded-lg text-white font-bold"
                                placeholder="Nombre completo"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Dirección</Label>
                            <Textarea 
                                value={form.direccion} 
                                onChange={(e) => handleInputChange("direccion", e.target.value)}
                                className="bg-slate-900 border-slate-800 text-xs rounded-lg text-white min-h-[50px] max-h-[80px]"
                                placeholder="Calle, número, colonia..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Referencia de Calles</Label>
                                <Input 
                                    value={form.refCalles} 
                                    onChange={(e) => handleInputChange("refCalles", e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-10 text-xs rounded-lg text-white"
                                    placeholder="Entre qué calles"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Municipio</Label>
                                <Input 
                                    value={form.municipio} 
                                    onChange={(e) => handleInputChange("municipio", e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-10 text-xs rounded-lg text-white"
                                    placeholder="Municipio"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">Paso 2: Vivienda y Servicios</span>
                        </div>
                        {/* TIPO DE CASA */}
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Tipo de Vivienda</Label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {["CASA", "VECINDAD", "DEPARTAMENTO"].map((tipo) => (
                                    <button
                                        key={tipo}
                                        type="button"
                                        onClick={() => handleSelectChange("tipoCasa", tipo)}
                                        className={`h-9 rounded-lg text-[10px] font-black uppercase transition-all ${
                                            form.tipoCasa === tipo 
                                            ? 'bg-orange-600 text-white shadow-md' 
                                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                                        }`}
                                    >
                                        {tipo}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* DETALLE TIPO CASA */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            {[
                                { field: "casa2Plantas", label: "2 Plantas" },
                                { field: "condominioAbierto", label: "Condo. Abierto" },
                                { field: "condominioCerrado", label: "Condo. Cerrado" }
                            ].map((item) => (
                                <button
                                    key={item.field}
                                    type="button"
                                    onClick={() => handleToggle(item.field)}
                                    className={`min-h-[42px] px-1 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase transition-all flex flex-col sm:flex-row items-center justify-center gap-1 text-center ${
                                        (form as any)[item.field]
                                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-black' 
                                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                                    }`}
                                >
                                    {(form as any)[item.field] ? <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" /> : <Home className="w-3.5 h-3.5 flex-shrink-0" />}
                                    <span className="leading-tight">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* SERVICIOS BÁSICOS */}
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Servicios Activos</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { field: "gas", label: "Gas" },
                                    { field: "luz", label: "Luz" },
                                    { field: "agua", label: "Agua" },
                                    { field: "telefono", label: "Teléfono" },
                                    { field: "terraceria", label: "Terracería" }
                                ].map((item) => (
                                    <button
                                        key={item.field}
                                        type="button"
                                        onClick={() => handleToggle(item.field)}
                                        className={`h-9 rounded-lg text-[9px] font-bold uppercase transition-all ${
                                            (form as any)[item.field]
                                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-black' 
                                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                                        }`}
                                    >
                                        {(form as any)[item.field] ? `✓ ${item.label}` : item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ZONA DE COBRANZA */}
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Zona de Cobertura</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {["DENTRO DE ZONA", "FUERA DE ZONA"].map((z) => (
                                    <button
                                        key={z}
                                        type="button"
                                        onClick={() => handleSelectChange("zona", z)}
                                        className={`h-9 rounded-lg text-[10px] font-black uppercase transition-all ${
                                            form.zona === z 
                                            ? 'bg-blue-600 text-white shadow-md' 
                                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                                        }`}
                                    >
                                        {z}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">Paso 3: Estructura y Equipamiento</span>
                        </div>
                        {/* CALIFICACIONES */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Estado Vivienda</Label>
                                <Select value={form.vivienda} onValueChange={(val) => handleSelectChange("vivienda", val)}>
                                    <SelectTrigger className="h-10 text-xs bg-slate-900 border-slate-800 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="EXCELENTE">EXCELENTE</SelectItem>
                                        <SelectItem value="BUENO">BUENO</SelectItem>
                                        <SelectItem value="REGULAR">REGULAR</SelectItem>
                                        <SelectItem value="MALO">MALO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Condición Mobiliario</Label>
                                <Select value={form.condicionMobiliario} onValueChange={(val) => handleSelectChange("condicionMobiliario", val)}>
                                    <SelectTrigger className="h-10 text-xs bg-slate-900 border-slate-800 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                        <SelectItem value="EXCELENTE">EXCELENTE</SelectItem>
                                        <SelectItem value="BUENO">BUENO</SelectItem>
                                        <SelectItem value="REGULAR">REGULAR</SelectItem>
                                        <SelectItem value="MALO">MALO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* ESTRUCTURA */}
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Materiales Estructura</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { field: "material", label: "Cocreto/Mat." },
                                    { field: "madera", label: "Madera" },
                                    { field: "lamina", label: "Lámina" }
                                ].map((item) => (
                                    <button
                                        key={item.field}
                                        type="button"
                                        onClick={() => handleToggle(item.field)}
                                        className={`h-9 rounded-lg text-[9px] font-bold uppercase transition-all ${
                                            (form as any)[item.field]
                                            ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30 font-black' 
                                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                                        }`}
                                    >
                                        {(form as any)[item.field] ? `✓ ${item.label}` : item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* EQUIPOS */}
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Mobiliario / Electrodomésticos</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { field: "computadora", label: "Computadora" },
                                    { field: "sala", label: "Sala" },
                                    { field: "comedor", label: "Comedor" },
                                    { field: "refrigerador", label: "Refrigerador" },
                                    { field: "estufa", label: "Estufa" },
                                    { field: "dvd", label: "DVD" }
                                ].map((item) => (
                                    <button
                                        key={item.field}
                                        type="button"
                                        onClick={() => handleToggle(item.field)}
                                        className={`h-9 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                                            (form as any)[item.field]
                                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black' 
                                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                                        }`}
                                    >
                                        <Tv className="w-3 h-3" />
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">Paso 4: Auditoría y Evidencia</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Recomendación Vecinal</Label>
                                <Select value={form.infoVecinos} onValueChange={(val) => handleSelectChange("infoVecinos", val)}>
                                    <SelectTrigger className="h-10 text-xs bg-slate-900 border-slate-800 text-white font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-white font-bold">
                                        <SelectItem value="LO RECOMIENDA">LO RECOMIENDA</SelectItem>
                                        <SelectItem value="NO LO RECOMIENDA">NO LO RECOMIENDA</SelectItem>
                                        <SelectItem value="NEUTRAL">DUDOSO / NEUTRAL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Día de Pago</Label>
                                <Input 
                                    value={form.diaPago} 
                                    onChange={(e) => handleInputChange("diaPago", e.target.value.toUpperCase())}
                                    className="bg-slate-900 border-slate-800 h-10 text-xs rounded-lg text-white font-bold"
                                    placeholder="LUNES"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Enganche</Label>
                                <Input 
                                    value={form.enganche} 
                                    onChange={(e) => handleInputChange("enganche", e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-10 text-xs rounded-lg text-white"
                                    placeholder="Enganche"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Plazo (Semanas)</Label>
                                <Input 
                                    value={form.plazo} 
                                    onChange={(e) => handleInputChange("plazo", e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-10 text-xs rounded-lg text-white"
                                    placeholder="60"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Abono</Label>
                                <Input 
                                    value={form.abono} 
                                    onChange={(e) => handleInputChange("abono", e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-10 text-xs rounded-lg text-white font-bold"
                                    placeholder="Abono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Código Gestor</Label>
                                <Input 
                                    value={form.codigoGestor} 
                                    onChange={(e) => handleInputChange("codigoGestor", e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-10 text-xs rounded-lg text-white font-mono"
                                    placeholder="Gestor"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase text-slate-400">Fecha de Visita</Label>
                                <Input 
                                    type="date"
                                    value={form.fecha} 
                                    onChange={(e) => handleInputChange("fecha", e.target.value)}
                                    className="bg-slate-900 border-slate-800 h-10 text-xs rounded-lg text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase text-slate-400">Observaciones Generales</Label>
                            <Textarea 
                                value={form.observacion} 
                                onChange={(e) => handleInputChange("observacion", e.target.value)}
                                className="bg-slate-900 border-slate-800 text-xs rounded-lg text-white min-h-[50px] max-h-[80px]"
                                placeholder="Observaciones..."
                            />
                        </div>

                        {/* CAPTURA DE FOTOS */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[9px] font-black uppercase text-slate-400">
                                    Captura de Fachada / Evidencia ({fotos.length} tomadas)
                                </Label>
                                {compressingPhotos && (
                                    <span className="text-[10px] text-orange-400 font-bold animate-pulse">
                                        Optimizando fotos...
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {fotos.map((foto, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 group shadow-sm">
                                        <img src={foto} className="w-full h-full object-cover" alt="Evidencia" />
                                        <button 
                                            type="button"
                                            onClick={() => removeFoto(idx)}
                                            className="absolute top-1 right-1 bg-red-600 p-1 rounded-md shadow-md active:scale-95 transition-all"
                                        >
                                            <Trash2 className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    type="button"
                                    disabled={compressingPhotos}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`aspect-square rounded-xl border-2 border-dashed border-orange-500/40 bg-orange-950/20 flex flex-col items-center justify-center gap-0.5 active:bg-orange-950/40 transition-colors ${compressingPhotos ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Camera className="w-5 h-5 text-orange-500" />
                                    <span className="text-[8px] font-bold text-orange-400 uppercase">
                                        {compressingPhotos ? "Procesando" : "Tomar Foto"}
                                    </span>
                                </button>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="image/*" 
                                capture="environment" 
                                multiple 
                                className="hidden" 
                            />
                        </div>

                        {/* WIDGET GPS EN PASO 4 */}
                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 ${
                            coords ? 'bg-emerald-600/10 border-emerald-600/30 text-emerald-400' : 'bg-amber-600/10 border-amber-600/30 text-amber-400'
                        }`}>
                            <div className="flex items-center gap-2 min-w-0">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-tight leading-none truncate">
                                        {coords ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Esperando coordenadas GPS..."}
                                    </p>
                                    <p className="text-[8px] text-slate-400 mt-0.5 truncate">
                                        {coords ? "Geolocalización fijada con precisión" : "Activa ubicación para georeferenciar"}
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={buscandoGps}
                                onClick={getUbicacion}
                                className="h-7 text-[9px] font-bold uppercase border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 flex-shrink-0 gap-1"
                            >
                                <RefreshCw className={`w-3 h-3 ${buscandoGps ? 'animate-spin text-orange-400' : ''}`} />
                                {buscandoGps ? "Buscando..." : "GPS"}
                            </Button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[100vw] sm:w-[94vw] max-w-lg h-[100dvh] sm:h-auto sm:max-h-[92vh] max-h-[100dvh] p-0 border-none sm:border sm:border-slate-800 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl bg-slate-950 flex flex-col gap-0 text-white [&>button]:text-white [&>button]:bg-black/30 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:top-3 [&>button]:right-3 z-50">
                {/* 1. HEADER FIJO */}
                <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 text-white flex-none shadow-md relative pr-12">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="border-white/30 text-white bg-white/10 backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider">
                                VD - Modo Cobrador
                            </Badge>
                            {hasDraft && (
                                <Badge className="bg-emerald-500 text-white text-[9px] font-black uppercase shadow-sm">
                                    Borrador Activo
                                </Badge>
                            )}
                        </div>
                        {hasDraft && (
                            <button
                                type="button"
                                onClick={handleDiscardDraft}
                                className="text-[10px] underline text-orange-100 hover:text-white font-medium mr-2"
                            >
                                Descartar borrador
                            </button>
                        )}
                    </div>
                    
                    <DialogTitle className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        Ficha de Verificación Domiciliaria
                    </DialogTitle>
                    
                    {/* Barra de progreso de 4 pasos */}
                    <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-orange-100">
                            <span>{step === 1 ? '1. Cuenta y Ubicación' : step === 2 ? '2. Vivienda y Servicios' : step === 3 ? '3. Mobiliario' : '4. Auditoría y Evidencia'}</span>
                            <span>Paso {step} de 4</span>
                        </div>
                        <div className="w-full bg-orange-950/40 h-2 rounded-full overflow-hidden border border-orange-500/20">
                            <div 
                                className="bg-white h-full transition-all duration-300 rounded-full shadow-sm"
                                style={{ width: `${(step / 4) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. BARRA DE CLIENTE RESUMEN */}
                <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between flex-none gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-orange-500/20 text-orange-400 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0">
                            {(cliente.nombreCompleto || cliente.nombre || "C").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-white truncate leading-tight">
                                {cliente.nombreCompleto || cliente.nombre || "Cliente"}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate leading-none mt-0.5">
                                {cliente.codigoCliente ? `Cod: ${cliente.codigoCliente} • ` : ''}{cliente.direccion || cliente.direccionCompleta || "Sin dirección"}
                            </p>
                        </div>
                    </div>
                    {coords && (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> GPS OK
                        </span>
                    )}
                </div>

                {/* 3. CONTENIDO CON SCROLL SUAVE */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
                    {renderStep()}
                </div>

                {/* 4. FOOTER FIJO CON BOTONES DE NAVEGACIÓN */}
                <div className="flex-none p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-2 pb-safe-bottom">
                    {step > 1 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep(prev => prev - 1)}
                            className="h-12 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-xs uppercase px-4 rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" /> Atrás
                        </Button>
                    )}
                    {step < 4 ? (
                        <Button
                            type="button"
                            onClick={() => setStep(prev => prev + 1)}
                            className="flex-1 h-12 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-orange-950/30"
                        >
                            Continuar <ArrowRight className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            disabled={loading}
                            onClick={handleSubmit}
                            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-950/30"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? "GUARDANDO..." : "COMPLETAR VD"}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
