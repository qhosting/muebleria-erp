"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileUp, FileSpreadsheet, Download, Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";

interface ImportarCalendarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anio: string;
  onSuccess: () => void;
}

export function ImportarCalendarioModal({ open, onOpenChange, anio, onSuccess }: ImportarCalendarioModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    XLSX.writeFile(wb, `plantilla_calendario_${anio}.xlsx`);
    toast.success("Plantilla descargada");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        setSelectedFile(file);
      } else {
        toast.error("Formato no válido. Use Excel o CSV.");
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setProgress(10);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setProgress(40);

        const semanas = jsonData.map((row: any) => ({
          semana: row.Semana || row.semana || row.SEMANA,
          periodicidades: row["Periodicidades (separadas por coma)"] || row.periodicidades || row.PERIODICIDADES || ""
        })).filter(s => s.semana);

        if (semanas.length === 0) {
          toast.error("No se encontraron datos válidos");
          setImporting(false);
          return;
        }

        setProgress(60);

        const res = await fetch("/api/dashboard/calendario-cobranza/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anio, semanas })
        });

        if (res.ok) {
          const result = await res.json();
          setProgress(100);
          toast.success(`Se importaron ${result.count} semanas exitosamente`);
          onSuccess();
          onOpenChange(false);
          reset();
        } else {
          toast.error("Error al importar el calendario");
        }
        setImporting(false);
      };
      reader.readAsBinaryString(selectedFile);
    } catch (error) {
      console.error(error);
      toast.error("Error crítico al procesar el archivo");
      setImporting(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-blue-600" />
            Importar Calendario {anio}
          </DialogTitle>
          <DialogDescription>
            Carga masiva de semanas y periodicidades desde Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!importing ? (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-dashed border-2 h-20"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="bg-blue-50 p-2 rounded-full">
                    <Upload className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                    <p className="font-bold">{selectedFile ? selectedFile.name : "Seleccionar Archivo"}</p>
                    <p className="text-xs text-gray-500">Excel (.xlsx) o CSV</p>
                </div>
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileSelect} 
              />

              <div className="bg-gray-50 p-4 rounded-xl border space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Tips
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Use la plantilla oficial para evitar errores.</li>
                    <li>• Las periodicidades deben ir separadas por comas.</li>
                    <li>• Los nombres válidos son: diario, semanal, catorcenal, quincenal, mensual.</li>
                </ul>
                <Button variant="link" className="p-0 h-auto text-blue-600 text-xs" onClick={downloadTemplate}>
                    Descargar Plantilla
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-6 text-center">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto" />
                <p className="text-sm font-medium">Procesando archivo...</p>
                <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importing}>Cancelar</Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700" 
            disabled={!selectedFile || importing}
            onClick={handleImport}
          >
            {importing ? "Importando..." : "Iniciar Importación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
