
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, UserPlus, Phone, MapPin, Tag, DollarSign, Save, Loader2, Sparkles, Navigation } from "lucide-react";
import { toast } from "sonner";

interface LeadModalProps {
  onSuccess?: () => void;
}

export function LeadModal({ onSuccess }: LeadModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    direccionArea: "",
    interes: "",
    montoEstimado: "",
    origen: "cambaceo",
    notas: ""
  });

  const handleSubmit = async () => {
    if (!form.nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ventas/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success("¡Prospecto registrado con éxito!");
        setOpen(false);
        setForm({
          nombre: "",
          telefono: "",
          direccionArea: "",
          interes: "",
          montoEstimado: "",
          origen: "cambaceo",
          notas: ""
        });
        if (onSuccess) onSuccess();
      } else {
        toast.error("Hubo un problema al guardar el lead");
      }
    } catch (error) {
      toast.error("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-500 h-12 rounded-2xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 border-b-4 border-emerald-800 active:border-b-0 transition-all">
          <UserPlus className="h-5 w-5" />
          Nueva Prospección
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95%] w-[420px] p-0 overflow-hidden bg-slate-950 border-slate-800 rounded-3xl">
        <DialogHeader className="p-6 bg-gradient-to-r from-emerald-600/20 to-sky-600/20 border-b border-slate-800">
          <DialogTitle className="text-white flex items-center gap-3 text-xl">
             <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
                <Sparkles className="h-5 w-5 text-white" />
             </div>
             Capturar Prospecto
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto pb-10 custom-scrollbar">
          {/* SECCION NOMBRE */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.1em] ml-1">Información Personal</label>
            <div className="relative">
              <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
              <Input 
                className="pl-12 h-14 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus:ring-emerald-500/50" 
                placeholder="Nombre completo del cliente"
                value={form.nombre}
                onChange={(e) => setForm({...form, nombre: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.1em] ml-1">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  className="pl-12 h-14 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-600" 
                  placeholder="10 dígitos"
                  value={form.telefono}
                  onChange={(e) => setForm({...form, telefono: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.1em] ml-1">Ubicación</label>
              <div className="relative">
                <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  className="pl-12 h-14 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-600" 
                  placeholder="Zona/Área"
                  value={form.direccionArea}
                  onChange={(e) => setForm({...form, direccionArea: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-800/50 my-2" />

          {/* SECCION INTERES */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.1em] ml-1">Interés Comercial</label>
            <div className="relative">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
              <Input 
                className="pl-12 h-14 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-600" 
                placeholder="¿Qué producto busca?"
                value={form.interes}
                onChange={(e) => setForm({...form, interes: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.1em] ml-1">Presupuesto</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                <Input 
                  type="number"
                  className="pl-12 h-14 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-600" 
                  placeholder="0.00"
                  value={form.montoEstimado}
                  onChange={(e) => setForm({...form, montoEstimado: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.1em] ml-1">Canal de Origen</label>
              <Select value={form.origen} onValueChange={(val) => setForm({...form, origen: val})}>
                <SelectTrigger className="h-14 rounded-2xl bg-slate-900 border-slate-800 text-white focus:ring-emerald-500/50">
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="cambaceo">Cambaceo (Campo)</SelectItem>
                  <SelectItem value="facebook">Redes Sociales</SelectItem>
                  <SelectItem value="referido">Recomendación</SelectItem>
                  <SelectItem value="oficina">En Sucursal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.1em] ml-1">Observaciones</label>
            <Textarea 
              className="rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 min-h-[100px] p-4" 
              placeholder="Añade detalles relevantes del prospecto..."
              value={form.notas}
              onChange={(e) => setForm({...form, notas: e.target.value})}
            />
          </div>

          <div className="pt-4">
            <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-500 h-16 rounded-2xl flex items-center justify-center gap-3 text-lg font-bold shadow-xl shadow-emerald-900/20 active:scale-95 transition-all disabled:opacity-50"
                disabled={loading}
                onClick={handleSubmit}
            >
                {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    <>
                        <Save className="h-6 w-6" />
                        GUARDAR PROSPECTO
                    </>
                )}
            </Button>
            <p className="text-center text-[10px] text-slate-600 mt-4 font-mono uppercase tracking-tighter">
                Sincronización segura con Vertex Cloud
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
