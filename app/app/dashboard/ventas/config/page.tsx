"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User, Users, Target, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function BudgetConfigPage() {
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [presupuestos, setPresupuestos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [nombreP, setNombreP] = useState("");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);
  const [selectedVendedor, setSelectedVendedor] = useState("");
  const [selectedEquipo, setSelectedEquipo] = useState("");
  const [metaMonto, setMetaMonto] = useState("");
  const [metaPiezas, setMetaPiezas] = useState("");
  const [metaLeads, setMetaLeads] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resVend, resEq, resPres] = await Promise.all([
        fetch("/api/usuarios?role=vendedor"),
        fetch("/api/ventas/equipos"),
        fetch(`/api/ventas/presupuestos`)
      ]);
      
      if (resVend.ok) setVendedores(await resVend.json());
      if (resEq.ok) setEquipos(await resEq.json());
      if (resPres.ok) setPresupuestos(await resPres.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if ((!selectedVendedor && !selectedEquipo) || !metaMonto || !metaPiezas) {
      toast.error("Complete todos los campos");
      return;
    }

    try {
      const res = await fetch("/api/ventas/presupuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendedorId: selectedVendedor || null,
          equipoId: selectedEquipo || null,
          fechaInicio: new Date(fechaInicio).toISOString(),
          fechaFin: new Date(fechaFin).toISOString(),
          nombre: nombreP,
          metaMonto: parseFloat(metaMonto),
          metaPiezas: parseInt(metaPiezas),
          metaLeads: parseInt(metaLeads || "0")
        })
      });

      if (res.ok) {
        toast.success("Presupuesto asignado");
        fetchData();
        setMetaMonto("");
        setMetaPiezas("");
        setMetaLeads("");
        setNombreP("");
      }
    } catch (e) {
      toast.error("Error al guardar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta meta?")) return;
    try {
      const res = await fetch(`/api/ventas/presupuestos?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Meta eliminada");
        fetchData();
      }
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Configuración de Presupuestos</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Formulario de Asignación */}
          <Card className="md:col-span-1 shadow-sm">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="h-5 w-5" /> Asignar Meta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-500">Nombre del Periodo</label>
                 <Input placeholder="Ej. Meta Marzo" value={nombreP} onChange={e => setNombreP(e.target.value)} />
               </div>

               <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">Desde</label>
                    <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">Hasta</label>
                    <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                  </div>
               </div>
               <div>
                  <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Tipo de Meta</label>
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    <Button 
                      variant={(selectedVendedor || (!selectedVendedor && !selectedEquipo)) ? "default" : "ghost"} 
                      size="sm" className="flex-1"
                      onClick={() => {setSelectedEquipo(""); setSelectedVendedor(vendedores[0]?.id || "")}}
                    >
                      Individual
                    </Button>
                    <Button 
                      variant={selectedEquipo ? "default" : "ghost"} 
                      size="sm" className="flex-1"
                      onClick={() => {setSelectedVendedor(""); setSelectedEquipo(equipos[0]?.id || "")}}
                    >
                      Por Equipo
                    </Button>
                  </div>
               </div>

               {selectedVendedor && (
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500">Seleccionar Vendedor</label>
                   <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                     <SelectTrigger><SelectValue placeholder="Vendedor" /></SelectTrigger>
                     <SelectContent>
                       {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
               )}

               {selectedEquipo && (
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-gray-500">Seleccionar Equipo</label>
                   <Select value={selectedEquipo} onValueChange={setSelectedEquipo}>
                     <SelectTrigger><SelectValue placeholder="Equipo" /></SelectTrigger>
                     <SelectContent>
                       {equipos.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                     </SelectContent>
                   </Select>
                 </div>
               )}

               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-500">Meta en Monto ($)</label>
                 <Input type="number" placeholder="Ej. 100000" value={metaMonto} onChange={e => setMetaMonto(e.target.value)} />
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-500">Meta en Piezas (Unidades)</label>
                 <Input type="number" placeholder="Ej. 50" value={metaPiezas} onChange={e => setMetaPiezas(e.target.value)} />
               </div>

               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-500">Meta en Leads (Prospectos)</label>
                 <Input type="number" placeholder="Ej. 20" value={metaLeads} onChange={e => setMetaLeads(e.target.value)} />
               </div>

               <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
                 <Save className="h-4 w-4 mr-2" /> Guardar Meta
               </Button>
            </CardContent>
          </Card>

          {/* Listado de Presupuestos */}
          <Card className="md:col-span-2 shadow-sm">
             <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="h-5 w-5" /> Metas Establecidas</CardTitle></CardHeader>
             <CardContent>
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Meta / Periodo</TableHead>
                     <TableHead>Asignado a</TableHead>
                     <TableHead>Tipo</TableHead>
                     <TableHead className="text-right">Monto</TableHead>
                     <TableHead className="text-center">Piezas</TableHead>
                     <TableHead className="text-center">Leads</TableHead>
                     <TableHead className="text-right">Acciones</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {presupuestos.map((p, i) => (
                     <TableRow key={i}>
                       <TableCell>
                         <div className="font-bold text-gray-900">{p.nombre || 'Sin nombre'}</div>
                         <div className="text-[10px] text-gray-500">{new Date(p.fechaInicio).toLocaleDateString()} - {new Date(p.fechaFin).toLocaleDateString()}</div>
                       </TableCell>
                       <TableCell className="font-medium text-blue-700">
                         {p.vendedor?.name || p.equipo?.nombre}
                       </TableCell>
                       <TableCell>
                         <Badge variant="outline">{p.vendedor ? <User className="h-3 w-3 mr-1" /> : <Users className="h-3 w-3 mr-1" />} {p.vendedor ? "Vendedor" : "Equipo"}</Badge>
                       </TableCell>
                       <TableCell className="text-right font-bold">{formatCurrency(p.metaMonto)}</TableCell>
                       <TableCell className="text-center">{p.metaPiezas}</TableCell>
                       <TableCell className="text-center font-semibold text-green-700">{p.metaLeads || 0}</TableCell>
                       <TableCell className="text-right">
                         <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(p.id)}>
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                   {presupuestos.length === 0 && (
                     <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-10">No hay metas asignadas.</TableCell></TableRow>
                   )}
                 </TableBody>
               </Table>
             </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
