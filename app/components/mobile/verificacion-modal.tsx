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
    AlertCircle
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
    const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
    const [detalles, setDetalles] = useState("");
    const [colorCasa, setColorCasa] = useState("");
    const [viviendaConfirmada, setViviendaConfirmada] = useState(true);
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [fotos, setFotos] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFecha(new Date().toISOString().split("T")[0]);
            setDetalles("");
            setColorCasa("");
            setFotos([]);
            
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
                    toast.error("No se pudo obtener la ubicación GPS precisa.");
                }
            };
            getUbicacion();
        }
    }, [isOpen]);

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
                fecha: new Date(fecha).toISOString(),
                detallesExtra: {
                    comentario: detalles,
                    colorCasa,
                    viviendaConfirmada,
                    latitud: coords?.lat,
                    longitud: coords?.lng,
                    fotos: fotos.length, // Enviamos el conteo, las fotos base64 irían a un storage aparte o en JSON si son pequeñas
                    // Por ahora las incluimos en el JSON para el MVP
                    evidencia: fotos 
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

                    {/* CAPTURA DE FOTOS */}
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-1">Evidencia Fotográfica</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {fotos.map((foto, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 group">
                                    <img src={foto} className="w-full h-full object-cover" alt="Evidencia" />
                                    <button 
                                        type="button"
                                        onClick={() => removeFoto(idx)}
                                        className="absolute top-1 right-1 bg-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-white" />
                                    </button>
                                </div>
                            ))}
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center gap-1 active:bg-slate-800 transition-colors"
                            >
                                <Camera className="w-6 h-6 text-orange-500" />
                                <span className="text-[8px] font-bold text-slate-500 uppercase">Tomar Foto</span>
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

                    {/* STATUS GPS */}
                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                        coords ? 'bg-blue-600/10 border-blue-600/20 text-blue-400' : 'bg-amber-600/10 border-amber-600/20 text-amber-500'
                    }`}>
                        <MapPin className="w-4 h-4" />
                        <p className="text-[10px] font-bold uppercase tracking-tight">
                            {coords ? `Ubicación GPS fijada (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : "Obteniendo coordenadas GPS..."}
                        </p>
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
