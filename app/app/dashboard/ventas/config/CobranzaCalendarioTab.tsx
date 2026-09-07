"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Save, CheckCircle2, FileUp, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { ImportarCalendarioModal } from "@/components/ventas/ImportarCalendarioModal";
import * as XLSX from "xlsx";
import { calcularRangoSemanaSabadoViernes, formatearFechaCortaMX } from "@/lib/calendario-cobranza-utils";

const PERIODICIDADES = [
  { id: "diario", label: "Diario" },
  { id: "semanal", label: "Semanal" },
  { id: "catorcenal", label: "Catorcenal" },
  { id: "quincenal", label: "Quincenal" },
  { id: "mensual", label: "Mensual" }
];

export function CobranzaCalendarioTab() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [calendarios, setCalendarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [semanaEdit, setSemanaEdit] = useState("37");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [selectedPeriodicidades, setSelectedPeriodicidades] = useState<string[]>(["diario", "semanal", "catorcenal", "quincenal", "mensual"]);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    fetchCalendarios();
    calculateDatesForWeek(parseInt(semanaEdit), parseInt(selectedYear));
  }, [selectedYear]);

  const fetchCalendarios = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/calendario-cobranza?anio=${selectedYear}`);
      if (res.ok) {
        setCalendarios(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const calculateDatesForWeek = (week: number, year: number) => {
    const rango = calcularRangoSemanaSabadoViernes(week, year);
    setFechaInicio(rango.inicioStr);
    setFechaFin(rango.finStr);
  };

  const handleSemanaChange = (val: string) => {
    setSemanaEdit(val);
    calculateDatesForWeek(parseInt(val), parseInt(selectedYear));
    
    // Check if we have config for this week already
    const existing = calendarios.find(c => c.semana.toString() === val);
    if (existing) {
        setSelectedPeriodicidades(existing.periodicidadesActivas || []);
    } else {
        setSelectedPeriodicidades(["diario", "semanal", "catorcenal", "quincenal", "mensual"]); // Default all
    }
  };

  const handlePeriodicidadToggle = (id: string) => {
    if (selectedPeriodicidades.includes(id)) {
        setSelectedPeriodicidades(prev => prev.filter(p => p !== id));
    } else {
        setSelectedPeriodicidades(prev => [...prev, id]);
    }
  };

  const handleSave = async () => {
    if (selectedPeriodicidades.length === 0) {
        toast.error("Seleccione al menos una periodicidad");
        return;
    }

    try {
      const res = await fetch("/api/dashboard/calendario-cobranza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anio: parseInt(selectedYear),
          semana: parseInt(semanaEdit),
          fechaInicio,
          fechaFin,
          periodicidadesActivas: selectedPeriodicidades
        })
      });

      if (res.ok) {
        toast.success("Calendario de semana guardado exitosamente");
        fetchCalendarios();
      } else {
        toast.error("Error al guardar calendario");
      }
    } catch (e) {
      toast.error("Error de red al guardar");
    }
  };

  const downloadTemplate = () => {
    const headers = ["Semana", "Periodicidades (separadas por coma)"];
    const sampleData = [
      ["1", "diario, semanal, catorcenal, quincenal, mensual"],
      ["2", "semanal, catorcenal"],
      ["3", "semanal, quincenal"]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Calendario");
    XLSX.writeFile(wb, `plantilla_calendario_${selectedYear}.xlsx`);
    toast.success("Plantilla descargada");
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Configuración Form */}
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5" /> Programar Semana
            </CardTitle>
            <CardDescription>
                Define qué tipos de cuentas se cobran en qué semanas del año. Las metas de los cobradores se proyectarán automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">Año</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
                            <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
                            <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">Semana (1-54)</label>
                    <Select value={semanaEdit} onValueChange={handleSemanaChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {Array.from({length: 54}, (_, i) => i + 1).map(s => (
                                <SelectItem key={s} value={s.toString()}>Semana {s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded-lg border">
                <div className="text-center">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Inicia</span>
                    <span className="text-sm font-medium">{fechaInicio}</span>
                </div>
                <div className="text-center border-l">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Termina</span>
                    <span className="text-sm font-medium">{fechaFin}</span>
                </div>
            </div>

            <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-gray-500 block">Periodicidades a Cobrar (Tipos de Cuentas RUTA)</label>
                <div className="space-y-2">
                    {PERIODICIDADES.map(p => (
                        <div key={p.id} className="flex items-center space-x-2 bg-white border p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => handlePeriodicidadToggle(p.id)}>
                            <Checkbox id={p.id} checked={selectedPeriodicidades.includes(p.id)} />
                            <label htmlFor={p.id} className="text-sm font-medium leading-none cursor-pointer">
                                {p.label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" /> Guardar Configuración de Semana
            </Button>
          </CardContent>
        </Card>

        {/* Listado de Semanas Programadas */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">Calendario Anual</CardTitle>
              <CardDescription>Visualización de semanas configuradas para el año {selectedYear}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Plantilla
              </Button>
              <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => setImportModalOpen(true)}>
                <FileUp className="h-4 w-4 mr-2" /> Importar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
                <div className="text-center py-10 text-gray-400">Cargando calendario...</div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Semana</TableHead>
                            <TableHead>Fechas</TableHead>
                            <TableHead>Periodicidades Activas</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {calendarios.map((cal, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-bold">Semana {cal.semana}</TableCell>
                                <TableCell className="text-xs font-semibold text-slate-700">
                                    {formatearFechaCortaMX(cal.fechaInicio)} - {formatearFechaCortaMX(cal.fechaFin)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {(cal.periodicidadesActivas || []).map((p: string) => (
                                            <Badge key={p} variant="secondary" className="text-[10px] uppercase">{p}</Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                </TableCell>
                            </TableRow>
                        ))}
                        {calendarios.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10 text-gray-400">
                                    No hay semanas configuradas para el año {selectedYear}. Todas las semanas cobrarán todas las periodicidades por defecto.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>

      </div>

      <ImportarCalendarioModal 
        open={importModalOpen} 
        onOpenChange={setImportModalOpen} 
        anio={selectedYear} 
        onSuccess={fetchCalendarios} 
      />
    </div>
  );
}
