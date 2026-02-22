"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    UserCheck,
    Calendar,
    Save,
    Wifi,
    WifiOff,
    MapPin,
    CheckCircle2,
    AlertCircle,
    FileText
} from "lucide-react";
import { OfflineCliente } from "@/lib/offline-db";
import { toast } from "sonner";

interface VerificacionModalProps {
    cliente: OfflineCliente;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isOnline: boolean;
}

export function VerificacionModal({ cliente, isOpen, onClose, onSuccess, isOnline }: VerificacionModalProps) {
    const { data: session } = useSession();
    const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
    const [detalles, setDetalles] = useState("");
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState<{ lat: string, lng: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFecha(new Date().toISOString().split("T")[0]);
            setDetalles("");

            // Intentar obtener ubicación
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    setCoords({
                        lat: pos.coords.latitude.toString(),
                        lng: pos.coords.longitude.toString()
                    });
                }, (err) => console.warn("Error de geolocalización:", err));
            }
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fecha) {
            toast.error("Seleccione la fecha de verificación");
            return;
        }

        setLoading(true);

        try {
            const verificacionData = {
                clienteId: cliente.id,
                fecha: new Date(fecha).toISOString(),
                detallesExtra: {
                    comentario: detalles,
                    referencia_ubicacion: "Ubicación confirmada en campo",
                    estatus_domicilio: "Habitado",
                    latitud: coords?.lat,
                    longitud: coords?.lng
                }
            };

            if (isOnline) {
                const response = await fetch("/api/clientes/verificaciones", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(verificacionData)
                });

                if (!response.ok) throw new Error("Error al registrar verificación");
                toast.success("Verificación guardada correctamente");
            } else {
                toast.error("La carga de verificaciones requiere conexión actualmente");
                setLoading(false);
                return;
            }

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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 border-none rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="border-white/30 text-white bg-white/10 backdrop-blur-sm">
                            {isOnline ? <><Wifi className="w-3 h-3 mr-1" /> CONECTADO</> : <><WifiOff className="w-3 h-3 mr-1" /> DESCONECTADO</>}
                        </Badge>
                        <UserCheck className="h-6 w-6 opacity-50" />
                    </div>
                    <DialogTitle className="text-2xl font-bold">Verificación de Domicilio</DialogTitle>
                    <DialogDescription className="text-green-100 font-light">
                        Confirma que has visitado y validado el domicilio del cliente.
                    </DialogDescription>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-green-50/50 rounded-2xl border border-green-100">
                            <div className="bg-green-100 p-2 rounded-lg">
                                <MapPin className="h-5 w-5 text-green-700" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs uppercase font-bold text-green-800 tracking-wider">Dirección a Validar</p>
                                <p className="text-sm font-medium text-gray-700 truncate">{cliente.direccion}</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold uppercase text-gray-400 ml-1">Fecha de Visita</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="h-12 pl-9 border-gray-100 bg-gray-50 rounded-xl focus:bg-white transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 flex-1">
                            <Label className="text-[11px] font-bold uppercase text-gray-400 ml-1">Detalles de la Verificación</Label>
                            <Textarea
                                value={detalles}
                                onChange={(e) => setDetalles(e.target.value)}
                                placeholder="Escribe lo que observaste (color de casa, entre qué calles, si fue atendido por el cliente...)"
                                className="resize-none border-gray-100 bg-gray-50 rounded-xl min-h-[140px] focus:bg-white transition-all text-sm leading-relaxed"
                            />
                        </div>

                        <div className="flex items-start gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5" />
                            <p className="text-[10px] text-blue-700 leading-tight">
                                Al confirmar, se guardará tu geolocalización actual (si está permitida) y se marcará el registro como verificado por <strong>{session?.user?.name}</strong>.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-14 bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-100 font-bold text-lg"
                        >
                            {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                            Finalizar Verificación
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                            className="h-12 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-xl border-none shadow-none font-bold"
                        >
                            Volver
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
