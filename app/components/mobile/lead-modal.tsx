
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, UserPlus, Phone, MapPin, Tag, DollarSign, Save } from "lucide-react";
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
        toast.success("Lead registrado exitosamente");
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
        toast.error("Error al registrar lead");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl shadow-lg flex items-center justify-center gap-2">
          <UserPlus className="h-5 w-5" />
          Nueva Prospección (Field)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-t-2xl sm:rounded-2xl">
        <DialogHeader className="p-4 bg-emerald-50 border-b border-emerald-100/50">
          <DialogTitle className="text-emerald-900 flex items-center gap-2">
             <Briefcase className="h-5 w-5 text-emerald-600" />
             Registrar Nuevo Prospecto
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto pb-8">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500">Nombre del Prospecto</label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-200" 
                placeholder="Ej. Juan Pérez"
                value={form.nombre}
                onChange={(e) => setForm({...form, nombre: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-200" 
                  placeholder="3312345678"
                  value={form.telefono}
                  onChange={(e) => setForm({...form, telefono: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">Zona / Área</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-200" 
                  placeholder="Ej. El Salto"
                  value={form.direccionArea}
                  onChange={(e) => setForm({...form, direccionArea: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500">Producto de Interés</label>
            <div className="relative">
              <Tag className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-200" 
                placeholder="Ej. Sala 3-2-1"
                value={form.interes}
                onChange={(e) => setForm({...form, interes: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">Presupuesto Est.</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  type="number"
                  className="pl-10 h-12 rounded-xl bg-gray-50 border-gray-200" 
                  placeholder="0.00"
                  value={form.montoEstimado}
                  onChange={(e) => setForm({...form, montoEstimado: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500">Origen</label>
              <Select value={form.origen} onValueChange={(val) => setForm({...form, origen: val})}>
                <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cambaceo">Cambaceo (Campo)</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="referido">Referido</SelectItem>
                  <SelectItem value="oficina">Oficina</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500">Notas de Seguimiento</label>
            <Textarea 
              className="rounded-xl bg-gray-50 border-gray-200" 
              placeholder="Detalles sobre la visita o interés del cliente..."
              value={form.notas}
              onChange={(e) => setForm({...form, notas: e.target.value})}
            />
          </div>

          <Button 
            className="w-full bg-gray-900 h-12 rounded-xl flex items-center justify-center gap-2 mt-4"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? "Guardando..." : "Registrar Prospecto"}
            {!loading && <Save className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
