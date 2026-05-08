
"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Copy, 
    FileText, 
    Image as ImageIcon,
    History,
    MoreVertical,
    Trash2
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function TicketQueuePage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTab, setCurrentTab] = useState("PENDIENTE");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isZoomed, setIsZoomed] = useState(false);

    useEffect(() => {
        fetchQueue();
    }, [currentTab]);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tesoreria/buzon?estado=${currentTab}`);
            if (res.ok) {
                const data = await res.json();
                setEntries(data);
            }
        } catch (error) {
            console.error("Error al obtener cola", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, accion: string) => {
        try {
            const res = await fetch("/api/tesoreria/buzon", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, accion })
            });

            if (res.ok) {
                toast.success(`Registro ${accion.toLowerCase()} exitosamente`);
                fetchQueue();
            } else {
                toast.error("Error al procesar acción");
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Cola de Comprobantes</h1>
                        <p className="text-muted-foreground mt-1">
                            Buzón de pre-validación de tickets recibidos por WhatsApp. Historial de 30 días.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchQueue} disabled={loading}>
                             <History className="mr-2 h-4 w-4" /> Actualizar
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="PENDIENTE" onValueChange={setCurrentTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                        <TabsTrigger value="PENDIENTE">Pendientes</TabsTrigger>
                        <TabsTrigger value="PROCESADO">Procesados</TabsTrigger>
                        <TabsTrigger value="DUPLICADO">Duplicados</TabsTrigger>
                        <TabsTrigger value="RECHAZADO">Rechazados</TabsTrigger>
                    </TabsList>

                    <TabsContent value={currentTab} className="mt-6">
                        <Card>
                            <CardHeader className="pb-3 border-b border-gray-100">
                                <CardTitle className="text-lg font-medium flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-amber-500" />
                                    Entradas en {currentTab}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left align-middle text-gray-600">
                                        <thead className="bg-gray-50/75 border-b border-gray-100 font-medium text-gray-700">
                                            <tr>
                                                <th scope="col" className="px-4 py-3">Fecha Recepción</th>
                                                <th scope="col" className="px-4 py-3">Teléfono</th>
                                                <th scope="col" className="px-4 py-3">Contrato / Cliente</th>
                                                <th scope="col" className="px-4 py-3 text-right">Monto</th>
                                                <th scope="col" className="px-4 py-3">Referencia</th>
                                                <th scope="col" className="px-4 py-3 text-center">Evidencia</th>
                                                <th scope="col" className="px-4 py-3 text-center">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                        Cargando buzón...
                                                    </td>
                                                </tr>
                                            ) : entries.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-12 text-center">
                                                        <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                        <p className="text-gray-500 font-medium">Buzón vacío</p>
                                                        <p className="text-sm text-gray-400 mt-1">No hay comprobantes con este estado.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                entries.map((entry) => (
                                                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-gray-900">{formatDate(entry.createdAt).split(' ')[0]}</span>
                                                                <span className="text-[10px] text-gray-400">{formatDate(entry.createdAt).split(' ')[1]}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs">
                                                            {entry.telefono}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Badge variant="outline" className={entry.contractId ? "border-blue-200 bg-blue-50 text-blue-700" : "border-red-200 bg-red-50 text-red-700"}>
                                                                {entry.contractId || "DESCONOCIDO"}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                            {formatCurrency(entry.monto || 0)}
                                                        </td>
                                                        <td className="px-4 py-3 truncate max-w-[150px]">
                                                            {entry.referencia || "N/A"}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Dialog onOpenChange={(open) => !open && setIsZoomed(false)}>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8">
                                                                        <ImageIcon className="h-4 w-4 text-blue-500" />
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-2xl">
                                                                    <DialogHeader>
                                                                        <DialogTitle>Evidencia de Pago</DialogTitle>
                                                                        <DialogDescription>
                                                                            Recibido de {entry.telefono} el {formatDate(entry.createdAt)}
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <div className="mt-4 flex flex-col items-center">
                                                                        {entry.base64Data ? (
                                                                            <div 
                                                                                className={`relative overflow-auto transition-all duration-300 ${isZoomed ? 'w-full h-[70vh] cursor-zoom-out bg-black/5' : 'max-h-[60vh] cursor-zoom-in'}`}
                                                                                onClick={() => setIsZoomed(!isZoomed)}
                                                                            >
                                                                                <img 
                                                                                    src={entry.base64Data.startsWith('data:') ? entry.base64Data : `data:image/jpeg;base64,${entry.base64Data}`} 
                                                                                    alt="Comprobante" 
                                                                                    className={`rounded-lg shadow-lg transition-transform duration-300 ${isZoomed ? 'scale-150 origin-top' : 'max-h-[60vh] object-contain'}`}
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-gray-500">Imagen no disponible</p>
                                                                        )}
                                                                        
                                                                        <div className="mt-6 w-full grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
                                                                            <div>
                                                                                <p className="text-[10px] uppercase text-gray-500 font-bold">Monto Extraído</p>
                                                                                <p className="text-lg font-bold">{formatCurrency(entry.monto || 0)}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[10px] uppercase text-gray-500 font-bold">Referencia/Folio</p>
                                                                                <p className="text-lg font-bold">{entry.referencia || 'N/A'}</p>
                                                                            </div>
                                                                            <div className="col-span-2">
                                                                                <p className="text-[10px] uppercase text-gray-500 font-bold">Hash Único (Anti-Duplicados)</p>
                                                                                <p className="text-[10px] font-mono break-all text-slate-400">{entry.hash}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {currentTab === 'PENDIENTE' && (
                                                                <div className="flex justify-center gap-1">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                                        onClick={() => handleAction(entry.id, 'RECHAZAR')}
                                                                    >
                                                                        <XCircle className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            {currentTab !== 'PENDIENTE' && (
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                                    {entry.estado}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
