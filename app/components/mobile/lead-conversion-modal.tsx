"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Home, MapPin, Phone, CreditCard, Save, ChevronRight, Info, DollarSign, ChevronLeft, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

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
    nombre: lead?.nombre || "",
    telefono: lead?.telefono || "",
    calle: "",
    numeroExterior: "",
    colonia: "",
    codigoPostal: "",
    ciudad: "",
    referenciaDireccion: "",
    tipoPropiedad: "PROPIA",
    ingresosMensuales: "",
    scoreBuro: "0",
    productoInteres: lead?.interes || "",
    pagoSemanalSugerido: ""
  });

  const handleConvert = async () => {
    if (!form.calle || !form.colonia) {
      toast.error("La dirección es obligatoria");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/ventas/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success("¡Cliente registrado! Se ha enviado para validación.");
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
      <DialogContent className="max-w-[95%] w-[420px] p-0 overflow-hidden bg-slate-950 border-slate-800 rounded-3xl">
        <DialogHeader className="p-6 bg-gradient-to-r from-blue-600/20 to-emerald-600/20 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20">
                <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div>
                <DialogTitle className="text-xl text-white">Convertir a Cliente</DialogTitle>
                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mt-0.5">Formalización en Campo</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[65dvh] overflow-y-auto pb-10 custom-scrollbar">
            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-start gap-4">
                        <div className="bg-blue-500/10 p-2 rounded-lg">
                            <Info className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prospecto</p>
                            <p className="text-sm font-bold text-slate-200">{lead.nombre}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{lead.telefono} • <span className="text-blue-400 font-bold">{lead.interes || "Sin producto"}</span></p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Ubicación del Domicilio</h3>
                        
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-400 ml-1">Calle y Número</Label>
                            <div className="relative">
                                <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                <Input 
                                    className="h-14 pl-12 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-700" 
                                    placeholder="Ej. Av. Juarez 123"
                                    value={form.calle}
                                    onChange={(e) => setForm({...form, calle: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-400 ml-1">Colonia</Label>
                                <Input 
                                    className="h-14 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-700" 
                                    placeholder="Colonia"
                                    value={form.colonia}
                                    onChange={(e) => setForm({...form, colonia: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-400 ml-1">C.P.</Label>
                                <Input 
                                    className="h-14 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-700" 
                                    placeholder="45600"
                                    value={form.codigoPostal}
                                    onChange={(e) => setForm({...form, codigoPostal: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-slate-400 ml-1">Referencias</Label>
                            <Input 
                                className="h-14 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-700" 
                                placeholder="Color de casa, entre calles..."
                                value={form.referenciaDireccion}
                                onChange={(e) => setForm({...form, referenciaDireccion: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <Button 
                            variant="outline" 
                            className="flex-1 h-16 rounded-2xl text-slate-400 border-slate-800 hover:bg-slate-900 font-bold active:scale-95 transition-all bg-transparent" 
                            onClick={() => onOpenChange(false)}
                        >
                            CANCELAR
                        </Button>
                        <Button 
                            className="flex-[2] h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2" 
                            onClick={() => setStep(2)}
                        >
                            SIGUIENTE
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Perfil y Propuesta</h3>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-400 ml-1">Tipo de Residencia</Label>
                            <Select value={form.tipoPropiedad} onValueChange={(v) => setForm({...form, tipoPropiedad: v})}>
                                <SelectTrigger className="h-14 rounded-2xl bg-slate-900 border-slate-800 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                    <SelectItem value="PROPIA">Propia</SelectItem>
                                    <SelectItem value="RENTADA">Rentada</SelectItem>
                                    <SelectItem value="FAMILIAR">Familiar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-slate-400 ml-1">Ingresos Estimados</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                                <Input 
                                    type="number"
                                    className="h-14 pl-12 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-700 font-bold" 
                                    placeholder="0.00"
                                    value={form.ingresosMensuales}
                                    onChange={(e) => setForm({...form, ingresosMensuales: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/50 space-y-4">
                        <div className="bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/20">
                             <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-emerald-500" />
                                <Label className="text-[10px] text-emerald-500 uppercase font-black tracking-widest">Plan de Pago Sugerido</Label>
                             </div>
                             <div className="flex items-center gap-3">
                                <div className="text-3xl font-black text-white">$</div>
                                <Input 
                                    type="number"
                                    className="bg-transparent border-none text-4xl font-black text-emerald-400 focus-visible:ring-0 p-0 h-auto w-full"
                                    placeholder="0"
                                    value={form.pagoSemanalSugerido}
                                    onChange={(e) => setForm({...form, pagoSemanalSugerido: e.target.value})}
                                />
                                <div className="text-xs font-bold text-slate-500 uppercase">/ Sem</div>
                             </div>
                        </div>
                    </div>

                    <div className="flex gap-2.5 mt-6">
                        <Button 
                            variant="ghost" 
                            className="flex-1 h-16 rounded-2xl text-slate-400 font-bold hover:bg-slate-900 text-[10px] px-1" 
                            onClick={() => setStep(1)}
                        >
                            <ChevronLeft className="h-3 w-3 mr-0.5 inline-block" />
                            ATRÁS
                        </Button>
                        <Button 
                            variant="outline" 
                            className="flex-1 h-16 rounded-2xl text-slate-500 border-slate-800 hover:bg-slate-900 font-bold text-[10px] px-1 bg-transparent active:scale-95 transition-all" 
                            onClick={() => onOpenChange(false)}
                        >
                            CANCELAR
                        </Button>
                        <Button 
                            className="flex-[2] h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-xs px-1"
                            disabled={loading}
                            onClick={handleConvert}
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    CONVERTIR
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
