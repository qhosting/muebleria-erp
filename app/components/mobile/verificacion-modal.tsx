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
    Tv
} from "lucide-react";
import { toast } from "sonner";

interface VerificacionModalProps {
    cliente: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isOnline: boolean;
}

export function VerificacionModal({ cliente, isOpen, onClose, onSuccess, isOnline }: VerificacionModalProps) {
    const { data: session } = useSession();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [fotos, setFotos] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Formulario unificado de 35 campos basados en la ficha de auditoría
    const [form, setForm] = useState({
        contrato: "",
        codigoCliente: "",
        nombreCliente: "",
        direccion: "",
        refCalles: "",
        municipio: "",
        
        // Tipo de Casa (Switches representados por botones/Selectores de alta usabilidad táctil)
        tipoCasa: "CASA", // CASA, VECINDAD, DEPARTAMENTO
        casa2Plantas: false,
        condominioAbierto: false,
        condominioCerrado: false,
        
        // Servicios
        gas: true,
        luz: true,
        agua: true,
        telefono: true,
        terraceria: false,
        zona: "DENTRO DE ZONA", // DENTRO DE ZONA, FUERA DE ZONA
        
        // Estructura y Vivienda
        vivienda: "EXCELENTE", // EXCELENTE, BUENO, REGULAR, MALO
        material: true,
        madera: false,
        lamina: false,
        
        // Mobiliario y Equipamiento
        condicionMobiliario: "BUENO", // EXCELENTE, BUENO, REGULAR, MALO
        computadora: false,
        sala: true,
        comedor: true,
        refrigerador: true,
        estufa: true,
        dvd: false,
        
        // Datos de Visita, Recomendación y Auditoría
        infoVecinos: "LO RECOMIENDA", // LO RECOMIENDA, NO LO RECOMIENDA, NEUTRAL
        observacion: "crédito sin inconveniente",
        enganche: "",
        plazo: "60",
        abono: "",
        diaPago: "LUNES",
        codigoGestor: "",
        fecha: ""
    });

    useEffect(() => {
        if (isOpen && cliente) {
            setStep(1);
            setFotos([]);
            setForm({
                contrato: cliente.numContrato || "",
                codigoCliente: cliente.codigoCliente || cliente.id.slice(-8).toUpperCase(),
                nombreCliente: cliente.nombreCompleto || "",
                direccion: cliente.direccionCompleta || cliente.direccion || "",
                refCalles: "",
                municipio: cliente.ciudad || "Márquez",
                
                tipoCasa: "CASA",
                casa2Plantas: false,
                condominioAbierto: false,
                condominioCerrado: false,
                
                gas: true,
                luz: true,
                agua: true,
                telefono: cliente.telefono ? true : false,
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
                abono: cliente.montoAcordado ? String(cliente.montoAcordado) : "",
                diaPago: cliente.diaPago || "LUNES",
                codigoGestor: (session?.user as any)?.codigoGestor || "",
                fecha: new Date().toISOString().split("T")[0]
            });
            
            // Intentar obtener ubicación GPS con alta precisión
            const getUbicacion = async () => {
                try {
                    const { obtenerUbicacionCobrador } = await import("@/lib/native/location");
                    const pos = (await obtenerUbicacionCobrador(true, 5000)) as any;
                    setCoords({
                        lat: pos.lat,
                        lng: pos.lng
                    });
                } catch (error) {
                    console.warn("Error de geolocalización en verificación:", error);
                }
            };
            getUbicacion();
        }
    }, [isOpen, cliente, session]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFotos(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
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
            const verificacionData = {
                clienteId: cliente.id,
                gestorId: (session?.user as any)?.id || "unknown",
                fecha: new Date(form.fecha).toISOString(),
                detallesExtra: {
                    ...form,
                    latitud: coords?.lat,
                    longitud: coords?.lng,
                    evidencia: fotos 
                }
            };

            // Importar dinámicamente el servicio de sincronización para IndexedDB
            const { syncService } = await import("@/lib/sync-service");
            
            // Guardar offline primero de forma robusta (siempre)
            await syncService.addVerificacionOffline(verificacionData);
            
            // Siempre mostrar éxito tras guardar localmente
            toast.success("Verificación domiciliaria guardada", {
                description: isOnline && navigator.onLine
                    ? "Sincronizando con el servidor..."
                    : "Se sincronizará automáticamente cuando tengas señal."
            });
            
            // Si está conectado, intentar sincronizar de inmediato en background sin bloquear el UI
            if (isOnline && navigator.onLine) {
                const cobradorId = (session?.user as any)?.id;
                if (cobradorId) {
                    syncService.syncAll(cobradorId, false).catch(err => {
                        console.warn("Error en sincronización inmediata de verificación:", err);
                    });
                }
            }
            
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
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { field: "casa2Plantas", label: "2 Plantas" },
                                { field: "condominioAbierto", label: "Condo. Abierto" },
                                { field: "condominioCerrado", label: "Condo. Cerrado" }
                            ].map((item) => (
                                <button
                                    key={item.field}
                                    type="button"
                                    onClick={() => handleToggle(item.field)}
                                    className={`h-9 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                                        (form as any)[item.field]
                                        ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 font-black' 
                                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                                    }`}
                                >
                                    {(form as any)[item.field] ? <CheckSquare className="w-3.5 h-3.5" /> : <Home className="w-3.5 h-3.5" />}
                                    {item.label}
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
                            <Label className="text-[9px] font-black uppercase text-slate-400">Captura de Fachada / Evidencia ({fotos.length} tomadas)</Label>
                            <div className="grid grid-cols-4 gap-2">
                                {fotos.map((foto, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 group">
                                        <img src={foto} className="w-full h-full object-cover" alt="Evidencia" />
                                        <button 
                                            type="button"
                                            onClick={() => removeFoto(idx)}
                                            className="absolute top-0.5 right-0.5 bg-red-500/95 p-1 rounded-md"
                                        >
                                            <Trash2 className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center gap-0.5 active:bg-slate-800 transition-colors"
                                >
                                    <Camera className="w-5 h-5 text-orange-500" />
                                    <span className="text-[7px] font-bold text-slate-500 uppercase">Añadir</span>
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
                    </div>
                );
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto p-0 border-none rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl bg-slate-950">
                <div className="bg-orange-600 p-5 text-white sticky top-0 z-10 shadow-lg">
                    <div className="flex items-center justify-between mb-1.5">
                        <Badge variant="outline" className="border-white/30 text-white bg-white/10 backdrop-blur-sm text-[9px] font-bold uppercase tracking-wider">
                            VD - Campo
                        </Badge>
                        <MapPin className="h-5 w-5" />
                    </div>
                    <DialogTitle className="text-xl font-black">Ficha de Verificación Domiciliaria</DialogTitle>
                    <DialogDescription className="text-orange-100 font-medium text-[11px]">
                        Paso {step} de 4 • Captura obligatoria de auditoría domiciliaria.
                    </DialogDescription>
                </div>

                <div className="p-5 space-y-4">
                    {/* ENCABEZADO DE CLIENTE */}
                    <div className="bg-slate-900 border border-slate-800/80 p-3 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500 font-bold text-sm">
                            {(cliente.nombreCompleto || cliente.nombre || "C").charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Cliente en Proceso</p>
                            <p className="text-xs font-bold text-white truncate leading-tight">{cliente.nombreCompleto || cliente.nombre || "Sin Nombre"}</p>
                            <p className="text-[9px] text-slate-400 truncate leading-none mt-0.5">{cliente.direccion || "Sin Dirección"}</p>
                        </div>
                    </div>

                    {/* RENDER DEL PASO */}
                    {renderStep()}

                    {/* ESTATUS GPS */}
                    {step === 4 && (
                        <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                            coords ? 'bg-blue-600/10 border-blue-600/20 text-blue-400' : 'bg-amber-600/10 border-amber-600/20 text-amber-500'
                        }`}>
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <p className="text-[9px] font-bold uppercase tracking-tight leading-none">
                                {coords ? `GPS Fijado (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : "Esperando coordenadas GPS..."}
                            </p>
                        </div>
                    )}

                    {/* BOTONES DE NAVEGACIÓN */}
                    <div className="flex gap-2.5 pt-2">
                        {step > 1 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep(prev => prev - 1)}
                                className="h-12 border-slate-800 bg-slate-900 text-slate-300 font-bold text-xs uppercase px-4 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" /> Atrás
                            </Button>
                        )}
                        {step < 4 ? (
                            <Button
                                type="button"
                                onClick={() => setStep(prev => prev + 1)}
                                className="flex-1 h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-orange-950/20"
                            >
                                Continuar <ArrowRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                disabled={loading}
                                onClick={handleSubmit}
                                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-950/20"
                            >
                                <Save className="w-4 h-4" />
                                {loading ? "GUARDANDO..." : "COMPLETAR VD"}
                            </Button>
                        )}
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="w-full text-[10px] text-slate-500 hover:text-slate-400 font-black uppercase py-1"
                    >
                        CANCELAR Y SALIR
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
