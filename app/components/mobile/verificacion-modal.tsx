"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    UserCheck,
    Calendar,
    Save,
    Wifi,
    WifiOff,
    MapPin,
    CheckCircle2,
    Camera,
    Image as ImageIcon,
    Trash2,
    Home,
    AlertCircle,
    RefreshCw,
    Loader2
} from "lucide-react";
import { toast } from "sonner";

interface VerificacionModalProps {
    cliente: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isOnline: boolean;
}

interface DocumentSlotProps {
    label: string;
    value: string | null;
    inputRef: React.RefObject<HTMLInputElement>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDelete: () => void;
}

function DocumentSlot({ label, value, inputRef, onFileChange, onDelete }: DocumentSlotProps) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-300">{label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                    {value ? "✓ Capturado con éxito" : "⚠ Pendiente de capturar"}
                </p>
            </div>
            {value ? (
                <div className="flex items-center gap-2">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700">
                        <img src={value} className="w-full h-full object-cover" alt={label} />
                    </div>
                    <button 
                        type="button"
                        onClick={onDelete}
                        className="bg-red-500/10 text-red-500 hover:bg-red-500/20 p-2.5 rounded-xl border border-red-500/20 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div>
                    <button 
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="bg-orange-600/10 text-orange-400 hover:bg-orange-600/20 px-4 py-2.5 rounded-xl border border-orange-500/20 font-bold text-xs uppercase transition-colors flex items-center gap-1.5"
                    >
                        <Camera className="w-4 h-4" />
                        Capturar
                    </button>
                    <input 
                        type="file" 
                        ref={inputRef} 
                        onChange={onFileChange} 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                    />
                </div>
            )}
        </div>
    );
}

export function VerificacionModal({ cliente, isOpen, onClose, onSuccess, isOnline }: VerificacionModalProps) {
    const { data: session } = useSession();
    const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
    const [detalles, setDetalles] = useState("");
    const [colorCasa, setColorCasa] = useState("");
    const [viviendaConfirmada, setViviendaConfirmada] = useState(true);
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [fetchingGps, setFetchingGps] = useState(false);

    // Slots obligatorios específicos
    const [contratoFront, setContratoFront] = useState<string | null>(null);
    const [contratoBack, setContratoBack] = useState<string | null>(null);
    const [fachada, setFachada] = useState<string | null>(null);

    const contratoFrontInputRef = useRef<HTMLInputElement>(null);
    const contratoBackInputRef = useRef<HTMLInputElement>(null);
    const fachadaInputRef = useRef<HTMLInputElement>(null);

    const getUbicacion = async () => {
        setFetchingGps(true);
        try {
            const { obtenerUbicacionCobrador } = await import("@/lib/native/location");
            const pos = (await obtenerUbicacionCobrador(true, 10000)) as any; // 10s timeout, alta precisión
            setCoords({
                lat: pos.lat,
                lng: pos.lng
            });
            toast.success("Ubicación GPS capturada con éxito");
        } catch (error) {
            console.warn("Error de geolocalización en verificación:", error);
            toast.error("No se pudo obtener la ubicación GPS precisa. Revisa los permisos.");
        } finally {
            setFetchingGps(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setFecha(new Date().toISOString().split("T")[0]);
            setDetalles("");
            setColorCasa("");
            setContratoFront(null);
            setContratoBack(null);
            setFachada(null);
            setCoords(null);
            
            // Intentar obtener ubicación GPS automáticamente al abrir
            getUbicacion();
        }
    }, [isOpen]);

    const handleFileChange = (slot: 'front' | 'back' | 'fachada', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                if (slot === 'front') setContratoFront(base64);
                else if (slot === 'back') setContratoBack(base64);
                else if (slot === 'fachada') setFachada(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeFoto = (slot: 'front' | 'back' | 'fachada') => {
        if (slot === 'front') setContratoFront(null);
        else if (slot === 'back') setContratoBack(null);
        else if (slot === 'fachada') setFachada(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contratoFront || !contratoBack || !fachada) {
            toast.error("Faltan documentos obligatorios.", {
                description: "Debes capturar Contrato Frontal, Contrato Atrás y Fachada de Domicilio."
            });
            return;
        }

        setLoading(true);

        try {
            const verificacionData = {
                clienteId: cliente.id,
                fecha: new Date(fecha).toISOString(),
                detallesExtra: {
                    comentario: detalles,
                    colorCasa,
                    viviendaConfirmada,
                    latitud: coords?.lat,
                    longitud: coords?.lng,
                    contratoFrontal: contratoFront,
                    contratoAtras: contratoBack,
                    fachadaDomicilio: fachada,
                    fotos: 3,
                    evidencia: [contratoFront, contratoBack, fachada]
                }
            };

            const response = await fetch("/api/clientes/verificaciones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(verificacionData)
            });

            if (!response.ok) throw new Error("Error al registrar verificación");
            
            toast.success("Verificación de Domicilio completada");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error al registrar la verificación");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto p-0 border-none rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl bg-slate-950">
                <div className="bg-orange-600 p-6 text-white sticky top-0 z-10 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="border-white/30 text-white bg-white/10 backdrop-blur-sm">
                            VD - CAMPO
                        </Badge>
                        <MapPin className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-black">Verificación Domiciliaria</DialogTitle>
                    <DialogDescription className="text-orange-100 font-medium">
                        Validación de residencia y entorno del cliente.
                    </DialogDescription>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* INFO CLIENTE */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500 font-bold">
                            {(cliente.nombreCompleto || cliente.nombre || "C").charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Cliente</p>
                            <p className="text-sm font-bold text-white truncate">{cliente.nombreCompleto || cliente.nombre || "Sin Nombre"}</p>
                            <p className="text-[10px] text-slate-400 truncate">{cliente.direccionCompleta || cliente.direccion || "Sin Dirección"}</p>
                        </div>
                    </div>

                    {/* CASILLAS OBLIGATORIAS DE DOCUMENTOS */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">
                            Documentación Requerida (Obligatoria)
                        </Label>

                        <div className="grid grid-cols-1 gap-3">
                            <DocumentSlot 
                                label="Contrato Frontal"
                                value={contratoFront}
                                inputRef={contratoFrontInputRef}
                                onFileChange={(e) => handleFileChange('front', e)}
                                onDelete={() => removeFoto('front')}
                            />

                            <DocumentSlot 
                                label="Contrato Atrás"
                                value={contratoBack}
                                inputRef={contratoBackInputRef}
                                onFileChange={(e) => handleFileChange('back', e)}
                                onDelete={() => removeFoto('back')}
                            />

                            <DocumentSlot 
                                label="Fachada Domicilio"
                                value={fachada}
                                inputRef={fachadaInputRef}
                                onFileChange={(e) => handleFileChange('fachada', e)}
                                onDelete={() => removeFoto('fachada')}
                            />
                        </div>
                    </div>

                    {/* CAMPOS DE VERIFICACIÓN */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Color de Casa</Label>
                            <Input 
                                value={colorCasa}
                                onChange={(e) => setColorCasa(e.target.value)}
                                className="h-12 bg-slate-900 border-slate-800 text-white rounded-xl"
                                placeholder="Ej. Blanca c/Verde"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Vivienda Confirmada</Label>
                            <button 
                                type="button"
                                onClick={() => setViviendaConfirmada(!viviendaConfirmada)}
                                className={`w-full h-12 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                                    viviendaConfirmada 
                                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' 
                                    : 'bg-rose-600/20 text-rose-400 border border-rose-600/30'
                                }`}
                            >
                                {viviendaConfirmada ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {viviendaConfirmada ? "HABITADA" : "DESHABITADA"}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Observaciones de Campo</Label>
                        <Textarea 
                            value={detalles}
                            onChange={(e) => setDetalles(e.target.value)}
                            className="bg-slate-900 border-slate-800 text-white rounded-xl min-h-[100px] text-sm"
                            placeholder="Detalles sobre el entorno, vecinos, etc..."
                        />
                    </div>

                    {/* GEOLOCALIZACIÓN Y BOTÓN GPS */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-wider ml-1">Geolocalización</Label>
                        <div className="flex gap-2">
                            <div className={`flex-1 p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                                coords ? 'bg-blue-600/10 border-blue-600/20 text-blue-400' : 'bg-amber-600/10 border-amber-600/20 text-amber-500'
                            }`}>
                                <MapPin className={`w-4 h-4 ${fetchingGps ? 'animate-bounce' : ''}`} />
                                <p className="text-[10px] font-bold uppercase tracking-tight">
                                    {coords ? `GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "Sin Ubicación GPS"}
                                </p>
                            </div>
                            <Button
                                type="button"
                                disabled={fetchingGps}
                                onClick={getUbicacion}
                                className="bg-sky-600 hover:bg-sky-500 text-white rounded-xl px-4 text-xs font-bold flex items-center gap-1.5 h-12"
                            >
                                {fetchingGps ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                GPS
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-14 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-900/20 font-black text-base"
                        >
                            {loading ? "GUARDANDO..." : "FINALIZAR VERIFICACIÓN"}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="text-slate-500 font-bold"
                        >
                            CANCELAR
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
