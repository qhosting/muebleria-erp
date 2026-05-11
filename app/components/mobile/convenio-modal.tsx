"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Handshake,
    Calendar,
    Save,
    Wifi,
    WifiOff,
    DollarSign,
    MapPin,
    AlertCircle,
    Info
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface ConvenioModalProps {
    cliente: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isOnline: boolean;
}

const tiposConvenio = [
    { value: "reestructura", label: "Reestructura" },
    { value: "pago_parcial", label: "Pago Parcial" },
    { value: "liquidacion", label: "Liquidación" },
    { value: "promesa_pago", label: "Promesa Única" },
    { value: "otro", label: "Otro" }
];

export function ConvenioModal({ cliente, isOpen, onClose, onSuccess, isOnline }: ConvenioModalProps) {
    const { data: session } = useSession();
    const [tipoConvenio, setTipoConvenio] = useState<string>("promesa_pago");
    const [monto, setMonto] = useState("");
    const [fecha, setFecha] = useState("");
    const [comentario, setComentario] = useState("");
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
    const { isConnected: isPrinterConnected, printConvenio } = useBluetoothPrinter();
    const [savedConvenio, setSavedConvenio] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            setTipoConvenio("promesa_pago");
            setMonto(cliente.montoAcordado?.toString() || "");
            setFecha("");
            setComentario("");
            setSavedConvenio(null);

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    setCoords({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                });
            }
        }
    }, [isOpen, cliente]);

    const handlePrint = async (convenio: any) => {
        if (!isPrinterConnected) {
            toast.error("Impresora no conectada");
            return;
        }

        try {
            await printConvenio({
                ...convenio,
                cliente: {
                    nombreCompleto: cliente.nombreCompleto,
                    codigoCliente: cliente.codigoCliente
                },
                gestor: {
                    name: session?.user?.name
                }
            });
        } catch (error) {
            console.error("Error imprimiendo:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!monto || parseFloat(monto) <= 0) {
            toast.error("Ingrese un monto válido");
            return;
        }

        if (!fecha) {
            toast.error("Seleccione una fecha de compromiso");
            return;
        }

        setLoading(true);

        try {
            const convenioData = {
                clienteId: cliente.id,
                tipoConvenio,
                monto: parseFloat(monto),
                fecha: new Date(fecha).toISOString(),
                comentario: comentario.trim(),
                latitud: coords?.lat?.toString(),
                longitud: coords?.lng?.toString(),
            };

            const response = await fetch("/api/clientes/convenios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(convenioData)
            });

            if (!response.ok) throw new Error("Error al registrar convenio");
            
            const nuevoConvenio = await response.json();
            setSavedConvenio(nuevoConvenio);
            
            toast.success("Convenio registrado exitosamente");
            
            // Si la impresora está conectada, imprimir automáticamente o dar la opción
            if (isPrinterConnected) {
                await handlePrint(nuevoConvenio);
            }
            
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error al registrar el convenio");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto p-0 border-none rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl bg-slate-950">
                <div className="bg-purple-600 p-6 text-white sticky top-0 z-10 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="border-white/30 text-white bg-white/10 backdrop-blur-sm">
                            CONVENIO
                        </Badge>
                        <Handshake className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-2xl font-black">Convenio de Pago</DialogTitle>
                    <DialogDescription className="text-purple-100 font-medium">
                        Formaliza un compromiso de pago con el cliente.
                    </DialogDescription>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* INFO CLIENTE */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-500 font-bold">
                            {cliente.nombre.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Pendiente</p>
                            <p className="text-xl font-black text-white">{formatCurrency(cliente.saldo)}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tipo de Acuerdo</Label>
                            <Select value={tipoConvenio} onValueChange={setTipoConvenio}>
                                <SelectTrigger className="h-12 bg-slate-900 border-slate-800 text-white rounded-xl focus:ring-purple-500">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    {tiposConvenio.map((t) => (
                                        <SelectItem key={t.value} value={t.value} className="focus:bg-purple-600 focus:text-white">{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Monto del Pago</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
                                    <Input
                                        type="number"
                                        value={monto}
                                        onChange={(e) => setMonto(e.target.value)}
                                        className="h-12 pl-9 bg-slate-900 border-slate-800 text-white rounded-xl focus:ring-purple-500 font-bold"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Fecha Límite</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
                                    <Input
                                        type="date"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        className="h-12 pl-9 bg-slate-900 border-slate-800 text-white rounded-xl focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Detalles del Compromiso</Label>
                            <Textarea
                                value={comentario}
                                onChange={(e) => setComentario(e.target.value)}
                                placeholder="¿Con quién se hizo el trato? ¿Hay alguna condición especial?"
                                className="bg-slate-900 border-slate-800 text-white rounded-xl min-h-[100px] text-sm focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {/* STATUS GPS */}
                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                        coords ? 'bg-purple-600/10 border-purple-600/20 text-purple-400' : 'bg-amber-600/10 border-amber-600/20 text-amber-500'
                    }`}>
                        <MapPin className="w-4 h-4" />
                        <p className="text-[10px] font-bold uppercase tracking-tight">
                            {coords ? "Ubicación Georeferenciada" : "Fijando ubicación del acuerdo..."}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-14 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl shadow-lg shadow-purple-900/20 font-black text-base"
                        >
                            {loading ? "GUARDANDO..." : "REGISTRAR CONVENIO"}
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
