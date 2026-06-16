"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, DollarSign, Package, Save, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface RegistrarVentaModalProps {
  onSuccess?: () => void;
}

export function RegistrarVentaModal({ onSuccess }: RegistrarVentaModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    contrato: "",
    montoVenta: "",
    piezas: "1",
  });

  const handleSubmit = async () => {
    if (!form.contrato) {
      toast.error("El número de contrato es obligatorio");
      return;
    }
    const parsedMonto = Number(form.montoVenta);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      toast.error("Ingresa un monto de venta válido mayor a cero");
      return;
    }
    const parsedPiezas = parseInt(form.piezas);
    if (isNaN(parsedPiezas) || parsedPiezas <= 0) {
      toast.error("La cantidad de piezas debe ser al menos 1");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ventas/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato: form.contrato,
          montoVenta: parsedMonto,
          piezas: parsedPiezas,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("¡Venta registrada con éxito!");
        setOpen(false);
        setForm({
          contrato: "",
          montoVenta: "",
          piezas: "1",
        });
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || "Hubo un problema al registrar la venta");
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
        <Button className="w-full bg-indigo-600 hover:bg-indigo-500 h-12 rounded-2xl shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 border-b-4 border-indigo-800 active:border-b-0 transition-all font-bold text-xs text-white">
          <Sparkles className="h-4 w-4" />
          Registrar Venta Directa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95%] w-[420px] p-0 overflow-hidden bg-slate-950 border-slate-800 rounded-3xl">
        <DialogHeader className="p-6 bg-gradient-to-r from-indigo-600/20 to-violet-600/20 border-b border-slate-800">
          <DialogTitle className="text-white flex items-center gap-3 text-xl font-bold">
            <div className="bg-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <FileText className="h-5 w-5 text-white" />
            </div>
            Registrar Venta
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5 max-h-[65dvh] overflow-y-auto pb-10 custom-scrollbar">
          {/* SECCION CONTRATO */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.1em] ml-1">
              Folio de Contrato Físico
            </Label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
              <Input
                className="pl-12 h-14 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-650 focus:ring-indigo-500/50"
                placeholder="Ej. 12345"
                value={form.contrato}
                onChange={(e) => setForm({ ...form, contrato: e.target.value })}
              />
            </div>
          </div>

          {/* SECCION MONTO Y PIEZAS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.1em] ml-1">
                Monto Venta ($)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                <Input
                  type="number"
                  className="pl-12 h-14 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-650"
                  placeholder="0.00"
                  value={form.montoVenta}
                  onChange={(e) => setForm({ ...form, montoVenta: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.1em] ml-1">
                Piezas
              </Label>
              <div className="relative">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                <Input
                  type="number"
                  min="1"
                  className="pl-12 h-14 rounded-2xl bg-slate-900 border-slate-800 text-white placeholder:text-slate-650"
                  placeholder="1"
                  value={form.piezas}
                  onChange={(e) => setForm({ ...form, piezas: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl text-[11px] text-slate-400 space-y-1">
            <p className="font-bold text-slate-300">Detalles del Registro:</p>
            <p>• La fecha del movimiento se establecerá automáticamente como **Hoy**.</p>
            <p>• El vendedor asignado será tu usuario actual.</p>
            <p>• La venta se registrará directamente en tu avance de metas.</p>
          </div>

          {/* BOTONES */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              type="button"
              className="flex-1 border-slate-800 hover:bg-slate-900 text-slate-400 h-16 rounded-2xl font-bold active:scale-95 transition-all bg-transparent"
              onClick={() => setOpen(false)}
            >
              CANCELAR
            </Button>
            <Button
              className="flex-[2] bg-indigo-600 hover:bg-indigo-500 h-16 rounded-2xl flex items-center justify-center gap-3 text-base font-bold shadow-xl shadow-indigo-900/20 active:scale-95 transition-all disabled:opacity-50 text-white"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              ) : (
                <>
                  <Save className="h-6 w-6 text-white" />
                  REGISTRAR
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
