"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Home, MapPin, Phone, CreditCard, Save, ChevronRight, Info, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface LeadConversionModalProps {
  lead: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LeadConversionModal({ lead, open, onOpenChange, onSuccess }: LeadConversionModalProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [form, setForm] = useState({
    // Datos Personales (vienen del lead)
    nombre: lead?.nombre || "",
    telefono: lead?.telefono || "",
    
    // Dirección Detallada
    calle: "",
    numeroExterior: "",
    colonia: "",
    codigoPostal: "",
    ciudad: "",
    referenciaDireccion: "",
    
    // Perfil de Crédito Básico
    tipoPropiedad: "PROPIA",
    ingresosMensuales: "",
    scoreBuro: "0",
    
    // Producto
    productoInteres: lead?.interes || "",
    pagoSemanalSugerido: ""
  });

  const handleConvert = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ventas/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success("Lead convertido a cliente. Enviado a aprobación.");
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || "Error al convertir lead");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-t-3xl sm:rounded-2xl">
        <DialogHeader className="p-6 bg-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
                <UserCheck className="h-6 w-6" />
            </div>
            <div>
                <DialogTitle className="text-xl">Convertir a Cliente</DialogTitle>
                <p className="text-blue-100 text-xs">Formalización de contrato en campo</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {step === 1 && (
                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                    <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 border border-blue-100">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-blue-900">Datos del Prospecto</p>
                            <p className="text-xs text-blue-700">{lead.nombre} • {lead.telefono}</p>
                            <p className="text-xs text-blue-700 mt-1">Interés: <span className="font-bold">{lead.interes || "No especificado"}</span></p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Dirección de Entrega</h3>
                        
                        <div className="space-y-2">
                            <Label className="text-xs">Calle y Número</Label>
                            <Input 
                                placeholder="Ej. Av. Juarez 123" 
                                className="h-12 rounded-xl bg-gray-50"
                                value={form.calle}
                                onChange={(e) => setForm({...form, calle: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs">Colonia</Label>
                                <Input 
                                    placeholder="Colonia" 
                                    className="h-12 rounded-xl bg-gray-50"
                                    value={form.colonia}
                                    onChange={(e) => setForm({...form, colonia: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Código Postal</Label>
                                <Input 
                                    placeholder="45600" 
                                    className="h-12 rounded-xl bg-gray-50"
                                    value={form.codigoPostal}
                                    onChange={(e) => setForm({...form, codigoPostal: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">Referencias de Ubicación</Label>
                            <Input 
                                placeholder="Entre calles, color de casa, etc." 
                                className="h-12 rounded-xl bg-gray-50"
                                value={form.referenciaDireccion}
                                onChange={(e) => setForm({...form, referenciaDireccion: e.target.value})}
                            />
                        </div>
                    </div>

                    <Button className="w-full h-12 bg-blue-600 rounded-xl mt-4" onClick={() => setStep(2)}>
                        Siguiente Paso
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Perfil de Crédito</h3>
                    
                    <div className="space-y-2">
                        <Label className="text-xs">Tipo de Propiedad</Label>
                        <Select value={form.tipoPropiedad} onValueChange={(v) => setForm({...form, tipoPropiedad: v})}>
                            <SelectTrigger className="h-12 rounded-xl bg-gray-50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PROPIA">Propia</SelectItem>
                                <SelectItem value="RENTADA">Rentada</SelectItem>
                                <SelectItem value="FAMILIAR">Familiar</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">Ingresos Mensuales Aprox.</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                            <Input 
                                type="number"
                                placeholder="0.00" 
                                className="h-12 pl-10 rounded-xl bg-gray-50"
                                value={form.ingresosMensuales}
                                onChange={(e) => setForm({...form, ingresosMensuales: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 space-y-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Propuesta Económica</h3>
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                             <Label className="text-[10px] text-emerald-700 uppercase font-black">Pago Semanal Estimado</Label>
                             <div className="flex items-center gap-3 mt-1">
                                <div className="text-2xl font-black text-emerald-900">$</div>
                                <Input 
                                    type="number"
                                    className="bg-transparent border-none text-2xl font-black text-emerald-900 focus-visible:ring-0 p-0 h-auto"
                                    placeholder="0"
                                    value={form.pagoSemanalSugerido}
                                    onChange={(e) => setForm({...form, pagoSemanalSugerido: e.target.value})}
                                />
                             </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(1)}>
                            Regresar
                        </Button>
                        <Button 
                            className="flex-[2] h-12 bg-gray-900 rounded-xl"
                            disabled={loading}
                            onClick={handleConvert}
                        >
                            {loading ? "Procesando..." : "Finalizar y Enviar"}
                            {!loading && <Save className="h-4 w-4 ml-2" />}
                        </Button>
                    </div>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
