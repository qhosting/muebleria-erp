"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Handshake,
    Calendar,
    Save,
    Wifi,
    WifiOff,
    DollarSign,
    User,
    MapPin,
    ClipboardList
} from "lucide-react";
import { OfflineCliente } from "@/lib/offline-db";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface ConvenioModalProps {
    cliente: OfflineCliente;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isOnline: boolean;
}

const tiposConvenio = [
    { value: "reestructura", label: "Reestructura de Deuda" },
    { value: "pago_parcial", label: "Pago Parcial Acordado" },
    { value: "liquidacion", label: "Liquidación con Descuento" },
    { value: "promesa_pago", label: "Promesa de Pago Único" },
    { value: "otro", label: "Otro Acuerdo" }
];

export function ConvenioModal({ cliente, isOpen, onClose, onSuccess, isOnline }: ConvenioModalProps) {
    const { data: session } = useSession();
    const [tipoConvenio, setTipoConvenio] = useState<string>("promesa_pago");
    const [monto, setMonto] = useState("");
    const [fecha, setFecha] = useState("");
    const [comentario, setComentario] = useState("");
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState<{ lat: string, lng: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setTipoConvenio("promesa_pago");
            setMonto(cliente.montoAcordado.toString());
            setFecha("");
            setComentario("");

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
    }, [isOpen, cliente.montoAcordado]);

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
                latitud: coords?.lat,
                longitud: coords?.lng,
            };

            if (isOnline) {
                const response = await fetch("/api/clientes/convenios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(convenioData)
                });

                if (!response.ok) throw new Error("Error al registrar convenio");
                toast.success("Convenio registrado exitosamente");
            } else {
                // En un escenario real, añadiríamos esto a la cola de sincronización de IndexedDB
                // Por ahora, como es una nueva funcionalidad, notificamos
                toast.error("La carga de convenios requiere conexión actualmente");
                setLoading(false);
                return;
            }

            onSuccess();
            onClose();
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
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 border-none rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="border-white/30 text-white bg-white/10 backdrop-blur-sm">
                            {isOnline ? <><Wifi className="w-3 h-3 mr-1" /> ONLINE</> : <><WifiOff className="w-3 h-3 mr-1" /> OFFLINE</>}
                        </Badge>
                        <Handshake className="h-6 w-6 opacity-50" />
                    </div>
                    <DialogTitle className="text-2xl font-bold">Convenio de Pago</DialogTitle>
                    <DialogDescription className="text-blue-100 font-light">
                        Registra un nuevo acuerdo de pago con el cliente.
                    </DialogDescription>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
                    <Card className="border-dashed bg-gray-50/50">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                    {cliente.nombreCompleto.substring(0, 1)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 leading-none">{cliente.nombreCompleto}</h4>
                                    <span className="text-xs text-gray-500 font-mono">{cliente.id.slice(-8)}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                <span className="text-xs text-gray-400 uppercase font-bold tracking-tighter">Saldo Pendiente</span>
                                <span className="font-black text-red-600">{formatCurrency(cliente.saldoPendiente)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold uppercase text-gray-400 ml-1">Modalidad del Acuerdo</Label>
                            <Select value={tipoConvenio} onValueChange={setTipoConvenio}>
                                <SelectTrigger className="h-12 border-gray-100 bg-gray-50 rounded-xl focus:bg-white transition-all">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {tiposConvenio.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold uppercase text-gray-400 ml-1">Monto Acordado</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="number"
                                        value={monto}
                                        onChange={(e) => setMonto(e.target.value)}
                                        className="h-12 pl-9 border-gray-100 bg-gray-50 rounded-xl focus:bg-white text-lg font-bold"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold uppercase text-gray-400 ml-1">Fecha Compromiso</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="date"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        className="h-12 pl-9 border-gray-100 bg-gray-50 rounded-xl focus:bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold uppercase text-gray-400 ml-1">Observaciones / Comprobación</Label>
                            <Textarea
                                value={comentario}
                                onChange={(e) => setComentario(e.target.value)}
                                placeholder="Detalles del acuerdo, testigos o justificación..."
                                className="resize-none border-gray-100 bg-gray-50 rounded-xl min-h-[100px] focus:bg-white transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-14 bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-100 font-bold text-lg"
                        >
                            {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                            Confirmar Convenio
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={loading}
                            className="h-12 text-gray-400 font-medium hover:text-red-500 hover:bg-red-50 rounded-xl"
                        >
                            Cancelar
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
