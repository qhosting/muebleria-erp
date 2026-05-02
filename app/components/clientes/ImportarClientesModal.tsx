
'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Upload, 
  Download, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  FileSpreadsheet, 
  Trash2, 
  Info, 
  FileUp,
  History,
  XCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ImportarClientesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isWelcomeMode?: boolean;
}

interface ImportResult {
  success: number;
  created: number;
  updated: number;
  deleted?: number;
  deletedClientes?: any[];
  errors: { row: number; error: string }[];
  total: number;
}

export function ImportarClientesModal({
  open,
  onOpenChange,
  onSuccess,
  isWelcomeMode = false
}: ImportarClientesModalProps) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cleanupEnabled, setCleanupEnabled] = useState(false);

  const downloadTemplate = () => {
    setLoading(true);

    // Crear CSV template
    const headers = [
      'codigoCliente',
      'nombreCompleto',
      'telefono',
      'vendedor',
      'codigoGestor',
      'direccionCompleta',
      'descripcionProducto',
      'diaPago',
      'montoPago',
      'periodicidad',
      'saldoActual',
      'fechaVenta',
      'importe1',
      'importe2',
      'importe3',
      'importe4'
    ];

    const sampleData = [
      'CLI25090949',
      'Juan Pérez García',
      '555-0123',
      'Carlos López',
      'G001',
      'Calle Principal #123, Col. Centro',
      'Sala 3 piezas color café',
      '1',
      '250.00',
      'semanal',
      '2500.00',
      '2024-01-15',
      '500.00',
      '750.00',
      '1000.00',
      '250.00'
    ];

    const instructions = [
      '# INSTRUCCIONES PARA IMPORTAR CLIENTES',
      '# 1. Llene los datos en las filas siguientes',
      '# 2. codigoCliente: Opcional. Si se deja vacío, se generará automáticamente. Ejemplo: CLI25090949',
      '# 3. codigoGestor: Opcional. Código del gestor/cobrador asignado. Si existe un cobrador con este código, se asignará automáticamente',
      '# 4. diaPago: 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado, 7=Domingo',
      '# 5. periodicidad: diario, semanal, catorcenal, quincenal, mensual',
      '# 6. fechaVenta: formato AAAA-MM-DD o DD/MM/AAAA',
      '# 7. Los campos nombreCompleto, direccionCompleta, descripcionProducto, diaPago, montoPago y periodicidad son obligatorios',
      '# 8. PARA CREAR NUEVOS CLIENTES: Deje codigoCliente vacío o use uno nuevo',
      '# 9. PARA ACTUALIZAR CLIENTES EXISTENTES: Use el mismo codigoCliente del cliente que desea actualizar',
      '# 10. El sistema detecta automáticamente si debe crear o actualizar según el codigoCliente',
      '# 11. Elimine estas líneas de instrucciones antes de importar',
      ''
    ];

    const csvContent = [
      ...instructions,
      headers.join(','),
      sampleData.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_clientes.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setLoading(false);
    toast.success('Plantilla descargada exitosamente');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls');

      if (isCSV || isExcel) {
        setSelectedFile(file);
        setResult(null);
      } else {
        toast.error('Por favor seleccione un archivo Excel (.xlsx) o CSV válido');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const parseXLSX = async (file: File): Promise<{ data: any[], errors: any[] }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary', cellDates: true, cellNF: false, cellText: false });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          // Mapeo de formato Legacy DQ a Formato Interno
          const mappedData = jsonData.map((row: any, index: number) => {
            // Si detectamos las columnas del formato DQ.xlsx, aplicamos el mapeo
            if (row.RazonSocial || row.Codigo || row.PagoSugerido) {
              const diaMap: Record<string, string> = {
                'LUNES': '1', 'MARTES': '2', 'MIERCOLES': '3',
                'JUEVES': '4', 'VIERNES': '5', 'SABADO': '6', 'DOMINGO': '7'
              };

              // Construir dirección completa
              const direccionParts = [
                row.Calle,
                row.NumeroExterior ? `#${row.NumeroExterior}` : '',
                row.NumeroInterior ? `Int ${row.NumeroInterior}` : '',
                row.Colonia,
                row.Municipio,
                row.Estado,
                row.CodigoPostal ? `CP ${row.CodigoPostal}` : ''
              ].filter(Boolean);

              return {
                codigoCliente: row.Codigo?.toString() || null,
                nombreCompleto: row.RazonSocial || "",
                telefono: row.Telefono1?.toString() || row.Telefono2?.toString() || null,
                vendedor: row.Vendedor || null,
                codigoGestor: row.Gestor || null,
                direccionCompleta: direccionParts.join(', '),
                descripcionProducto: row.Producto || "Importación Legacy",
                diaPago: diaMap[row.DiaCobro?.toString().toUpperCase()] || '1',
                montoPago: parseFloat(row.PagoSugerido) || 0,
                periodicidad: (() => {
                  const p = row.PeriodoPago?.toString().toLowerCase().trim() || 'semanal';
                  if (p.includes('catorce')) return 'catorcenal';
                  if (p.includes('quince')) return 'quincenal';
                  if (p.includes('sema')) return 'semanal';
                  if (p.includes('mensu')) return 'mensual';
                  if (p.includes('diar')) return 'diario';
                  if (p.includes('ninguna')) return 'semanal';
                  return 'semanal'; // Default fallback for any other unrecognized value
                })(),
                saldoActual: parseFloat(row.SaldoActual) || 0,
                fechaVenta: row.FechaContrato ? (row.FechaContrato instanceof Date ? row.FechaContrato.toISOString().split('T')[0] : row.FechaContrato.toString()) : null,
                importe4: parseFloat(row.Pagar) || null,
                diasVencidos: parseInt(row.DiasVencidos) || 0,
                saldoVencido: parseFloat(row.SaldoVencido) || 0,
                _originalRowIndex: index + 2
              };
            }
            return { ...row, _originalRowIndex: index + 2 };
          });

          resolve({ data: mappedData, errors: [] });
        } catch (error) {
          resolve({ data: [], errors: [{ row: 0, error: 'Error al procesar archivo Excel' }] });
        }
      };
      reader.readAsBinaryString(file);
    });
  };

  const parseCSV = (text: string): { data: any[], errors: any[] } => {
    // Normalizar saltos de línea y filtrar líneas vacías
    const lines = text.replace(/\r\n/g, '\n').split('\n');

    // Filtrar líneas vacías o comentarios, pero manteniendo el índice original para reportar errores correctamente
    const activeLines = lines.map((line, index) => ({ content: line.trim(), index: index + 1 }))
      .filter(item => item.content && !item.content.startsWith('#'));

    if (activeLines.length < 2) return { data: [], errors: [{ row: 0, error: 'El archivo no contiene suficientes datos (falta cabecera o filas)' }] };

    // Función robusta para separar por comas respetando comillas
    const splitCSVLine = (line: string) => {
      const result = [];
      let start = 0;
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuotes = !inQuotes;
        } else if (line[i] === ',' && !inQuotes) {
          let value = line.substring(start, i).trim();
          // Remover comillas si existen
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1).replace(/""/g, '"');
          }
          result.push(value);
          start = i + 1;
        }
      }

      // Agregar el último valor
      let lastValue = line.substring(start).trim();
      if (lastValue.startsWith('"') && lastValue.endsWith('"')) {
        lastValue = lastValue.substring(1, lastValue.length - 1).replace(/""/g, '"');
      }
      result.push(lastValue);

      return result;
    };

    // Parsear headers usando la nueva función (la primera línea activa es header)
    const headerLine = activeLines[0];
    const headers = splitCSVLine(headerLine.content);
    const data = [];
    const errors = [];

    for (let i = 1; i < activeLines.length; i++) {
      const lineObj = activeLines[i];
      const values = splitCSVLine(lineObj.content);

      // Validar que la fila tenga la cantidad correcta de columnas
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          // Limpiar caracteres invisibles del header
          const cleanHeader = header.replace(/^\ufeff/, '').trim();
          row[cleanHeader] = values[index];
        });
        // Adjuntamos el número de fila original para referencia
        row._originalRowIndex = lineObj.index;
        data.push(row);
      } else {
        errors.push({
          row: lineObj.index,
          error: `Error de formato: La fila tiene ${values.length} columnas, se esperaban ${headers.length}. Verifique comas faltantes o sobran.`
        });
      }
    }

    return { data, errors };
  };


  const validateRow = (row: any, index: number, allRows: any[] = []): string | null => {
    const rowNum = row._originalRowIndex || (index + 2);

    // Check required fields with specific messages
    const requiredFields = [
      { key: 'nombreCompleto', label: 'Nombre Completo' },
      { key: 'descripcionProducto', label: 'Producto' },
      { key: 'diaPago', label: 'Día de Pago' },
      { key: 'periodicidad', label: 'Periodicidad' },
    ];

    for (const field of requiredFields) {
      if (!row[field.key]) {
        return `Fila ${rowNum}: El campo '${field.label}' es obligatorio.`;
      }
    }

    // Validate diaPago
    const diaPago = parseInt(row.diaPago);
    if (isNaN(diaPago) || diaPago < 1 || diaPago > 7) {
      return `Fila ${rowNum}: 'Día de Pago' debe ser un número entre 1 (Lunes) y 7 (Domingo). Valor encontrado: ${row.diaPago}`;
    }

    // Validate montoPago (only if present)
    if (row.montoPago) {
      const montoPago = parseFloat(row.montoPago);
      if (isNaN(montoPago) || montoPago < 0) {
        return `Fila ${rowNum}: 'Monto de Pago' debe ser un número mayor o igual a 0. Valor encontrado: ${row.montoPago}`;
      }
    }

    // Validate periodicidad
    const periodicidadValida = ['diario', 'semanal', 'catorcenal', 'quincenal', 'mensual'];
    let periodicidad = row.periodicidad?.toLowerCase().trim();
    
    // Handle (Ninguna) or empty
    if (!periodicidad || periodicidad.includes('ninguna')) {
      row.periodicidad = 'semanal'; // Auto-fix
      periodicidad = 'semanal';
    }

    if (!periodicidadValida.includes(periodicidad)) {
      return `Fila ${rowNum}: 'Periodicidad' inválida (${row.periodicidad}). Valores permitidos: ${periodicidadValida.join(', ')}`;
    }

    // Validar fechaVenta (si existe)
    if (row.fechaVenta) {
      // Validar que no sea un código de cliente accidentalmente
      const isLikelyCode = typeof row.fechaVenta === 'string' && /^[A-Z]{2}\d+/i.test(row.fechaVenta);

      const dateParts = typeof row.fechaVenta === 'string' ? row.fechaVenta.split(/[-/]/) : [];
      let isValidDate = false;

      if (isLikelyCode) {
        isValidDate = false;
      } else {
        // Intentar validar formatos comunes
        const date = new Date(row.fechaVenta);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
          isValidDate = true;
        } else if (dateParts.length === 3) {
          // Intentar manejar DD/MM/YYYY o YYYY/MM/DD
          const d1 = parseInt(dateParts[0]);
          const d2 = parseInt(dateParts[1]);
          const d3 = parseInt(dateParts[2]);

          if (d1 > 1900 && d3 <= 31) { // Asumir YYYY/MM/DD
            const d = new Date(d1, d2 - 1, d3);
            isValidDate = !isNaN(d.getTime());
          } else if (d1 <= 31 && d3 > 1900) { // Asumir DD/MM/YYYY
            const d = new Date(d3, d2 - 1, d1);
            isValidDate = !isNaN(d.getTime());
          }
        }
      }

      if (!isValidDate) {
        return `Fila ${rowNum}: El formato de 'Fecha de Venta' (valor: "${row.fechaVenta}") es inválido. Asegúrese de que la columna "FechaContrato" contenga una fecha (AAAA-MM-DD o DD/MM/AAAA) y no el código del cliente.`;
      }
    }

    return null;
  };

  const downloadCleanupReport = () => {
    if (!result?.deletedClientes || result.deletedClientes.length === 0) return;

    const headers = [
      'Código Cliente',
      'Nombre Completo',
      'Saldo Actual',
      'Monto Pago',
      'Días Vencidos',
      'Saldo Vencido',
      'Cobrador',
      'Fecha Inactivación'
    ];

    const data = result.deletedClientes.map(c => [
      c.codigoCliente,
      c.nombreCompleto,
      c.saldoActual,
      c.montoPago,
      c.diasVencidos,
      c.saldoVencido,
      c.cobrador || 'N/A',
      c.fechaInactivacion
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes Depurados");
    
    XLSX.writeFile(wb, `reporte_depuracion_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Reporte de depuración descargado');
  };

  const importClientes = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setProgress(0);

    try {
      let data: any[] = [];
      let parseErrors: any[] = [];

      if (selectedFile.name.endsWith('.csv')) {
        const text = await selectedFile.text();
        const parseResult = parseCSV(text);
        data = parseResult.data;
        parseErrors = parseResult.errors;
      } else {
        const parseResult = await parseXLSX(selectedFile);
        data = parseResult.data;
        parseErrors = parseResult.errors;
      }

      if (data.length === 0 && parseErrors.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo');
      }

      const importResult: ImportResult = {
        success: 0,
        created: 0,
        updated: 0,
        errors: [...parseErrors],
        total: data.length + parseErrors.length
      };

      // Validar filas antes de enviar
      const validRows = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const validationError = validateRow(row, i, data);
        if (validationError) {
          importResult.errors.push({ 
            row: row._originalRowIndex || (i + 2), 
            error: validationError 
          });
        } else {
          // Normalizar datos para el backend
          let normalizedFecha = row.fechaVenta || new Date().toISOString().split('T')[0];
          if (row.fechaVenta && typeof row.fechaVenta === 'string') {
            const dateParts = row.fechaVenta.split(/[-/]/);
            if (dateParts.length === 3) {
              const d1 = parseInt(dateParts[0]);
              const d2 = parseInt(dateParts[1]);
              const d3 = parseInt(dateParts[2]);
              if (d1 <= 31 && d3 > 31) { // DD/MM/YYYY
                normalizedFecha = `${d3}-${String(d2).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
              } else if (d1 > 31) { // YYYY/MM/DD
                normalizedFecha = `${d1}-${String(d2).padStart(2, '0')}-${String(d3).padStart(2, '0')}`;
              }
            }
          }

          validRows.push({
            ...row,
            codigoCliente: row.codigoCliente?.trim() || null,
            fechaVenta: normalizedFecha,
            montoPago: row.montoPago ? parseFloat(row.montoPago) : 0,
            saldoActual: row.saldoActual ? parseFloat(row.saldoActual) : (row.montoPago ? parseFloat(row.montoPago) : 0),
            importe1: row.importe1 ? parseFloat(row.importe1) : null,
            importe2: row.importe2 ? parseFloat(row.importe2) : null,
            importe3: row.importe3 ? parseFloat(row.importe3) : null,
            importe4: row.importe4 ? parseFloat(row.importe4) : null,
          });
        }
      }

      setProgress(30);

      // Enviar a la API de importación masiva
      const response = await fetch('/api/clientes/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientes: validRows,
          enableCleanup: cleanupEnabled
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en el servidor: ${errorText}`);
      }

      const backendResult = await response.json();
      
      importResult.success = backendResult.created || 0;
      importResult.created = backendResult.created || 0;
      importResult.updated = backendResult.updated || 0; 
      importResult.success = backendResult.created || 0;
      importResult.created = backendResult.created || 0;
      importResult.deleted = backendResult.deleted || 0;
      importResult.deletedClientes = backendResult.deletedClientes || [];

      setProgress(100);
      setResult(importResult);

      if (importResult.success > 0 || (importResult.deleted && importResult.deleted > 0)) {
        toast.success(`Proceso completado exitosamente`);
        onSuccess();

        if (isWelcomeMode && backendResult.created > 0) {
           toast.info(`Se han importado ${backendResult.created} clientes.`);
        }
      }

      if (importResult.errors.length > 0) {
        toast.warning(`${importResult.errors.length} registros con errores`);
      }

    } catch (error) {
      console.error('Error importing:', error);
      toast.error(error instanceof Error ? error.message : 'Error al importar archivo');
    } finally {
      setImporting(false);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (!importing) {
      resetModal();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        {/* Header con gradiente premium */}
        <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3 text-2xl font-bold">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileUp className="h-6 w-6 text-white" />
              </div>
              <span>{isWelcomeMode ? 'Importación con Bienvenida' : 'Importar Clientes'}</span>
            </DialogTitle>
            <p className="text-indigo-100 mt-1 opacity-90">
              Carga masiva de clientes desde Excel o CSV con validación inteligente.
            </p>
          </DialogHeader>
        </div>

        <div className="p-8 bg-slate-50/50">
          <AnimatePresence mode="wait">
            {!importing && !result ? (
              <motion.div 
                key="setup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                {/* Columna Izquierda: Instrucciones */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Download className="h-5 w-5 text-indigo-500" />
                      1. Preparación
                    </h3>
                    
                    <div className="space-y-4 text-sm text-slate-600 mb-6">
                      <div className="flex gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <p>
                          Descarga la plantilla oficial. El sistema detecta automáticamente si debe **crear o actualizar** según el código.
                        </p>
                      </div>
                      
                      <ul className="space-y-2 ml-1">
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                          Formatos aceptados: .xlsx, .csv
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                          Periodicidad: semanal, quincenal, etc.
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                          Fechas: AAAA-MM-DD o DD/MM/AAAA
                        </li>
                      </ul>
                    </div>

                    <Button
                      onClick={downloadTemplate}
                      disabled={loading}
                      className="w-full bg-white hover:bg-slate-50 text-indigo-600 border-2 border-indigo-100 hover:border-indigo-200 shadow-none py-6 rounded-xl transition-all duration-300 group"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                      )}
                      Descargar Plantilla Excel
                    </Button>
                  </div>
                </div>

                {/* Columna Derecha: Carga */}
                <div className="space-y-6">
                  <div className={cn(
                    "bg-white p-6 rounded-2xl shadow-sm border-2 transition-all duration-300",
                    selectedFile ? "border-indigo-200 bg-indigo-50/10" : "border-slate-100"
                  )}>
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Upload className="h-5 w-5 text-indigo-500" />
                      2. Carga de Archivo
                    </h3>

                    <div className="space-y-4">
                      <div 
                        className={cn(
                          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group",
                          selectedFile ? "border-indigo-300 bg-white" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Input
                          id="file-upload"
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileSelect}
                        />
                        
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "p-3 rounded-full mb-3 transition-colors",
                            selectedFile ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                          )}>
                            {selectedFile ? <FileText className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
                          </div>
                          <p className="text-sm font-medium text-slate-700">
                            {selectedFile ? selectedFile.name : "Selecciona o arrastra el archivo"}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Tamaño máx. 10MB
                          </p>
                        </div>
                      </div>

                      {selectedFile && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-2 space-y-4"
                        >
                          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-100 rounded-lg">
                                  <Trash2 className="h-4 w-4 text-amber-700" />
                                </div>
                                <div>
                                  <Label htmlFor="cleanup-switch" className="text-amber-900 font-bold cursor-pointer">
                                    Depuración Inteligente
                                  </Label>
                                  <p className="text-[10px] text-amber-700 opacity-80 uppercase tracking-wider font-semibold">
                                    Solo códigos DQ/DP
                                  </p>
                                </div>
                              </div>
                              <Switch 
                                id="cleanup-switch" 
                                checked={cleanupEnabled}
                                onCheckedChange={setCleanupEnabled}
                                className="data-[state=checked]:bg-amber-600"
                              />
                            </div>
                            
                            {cleanupEnabled && (
                              <p className="text-xs text-amber-800 leading-relaxed bg-white/50 p-2 rounded-lg border border-amber-200/50">
                                Los clientes DQ/DP que **no estén** en este archivo serán marcados como inactivos automáticamente.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : importing ? (
              <motion.div 
                key="importing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 flex flex-col items-center justify-center space-y-6"
              >
                <div className="relative">
                  <div className="h-24 w-24 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-indigo-600">{progress.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-800">Procesando Importación</h3>
                  <p className="text-slate-500 max-w-xs mx-auto mt-2 text-sm leading-relaxed">
                    Estamos validando tus datos y sincronizando con el servidor. Por favor no cierres esta ventana.
                  </p>
                </div>
                <Progress value={progress} className="w-full max-w-md h-2 bg-slate-100 overflow-hidden" />
              </motion.div>
            ) : result ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Resumen de Resultados */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100 text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-700">{result.success}</div>
                    <div className="text-xs text-green-600 uppercase font-bold tracking-wider">Éxito Total</div>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-center">
                    <div className="h-8 w-8 text-blue-600 mx-auto mb-2 flex items-center justify-center font-bold text-xl">+</div>
                    <div className="text-2xl font-bold text-blue-700">{result.created}</div>
                    <div className="text-xs text-blue-600 uppercase font-bold tracking-wider">Creados</div>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 text-center">
                    <History className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-700">{result.updated}</div>
                    <div className="text-xs text-purple-600 uppercase font-bold tracking-wider">Actualizados</div>
                  </div>
                </div>

                {/* Sección de Depuración */}
                {result.deleted ? result.deleted > 0 && (
                  <div className="bg-slate-900 text-white p-6 rounded-2xl flex items-center justify-between overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Trash2 className="h-24 w-24" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                        <Trash2 className="h-4 w-4" />
                        Depuración Completada
                      </div>
                      <p className="text-slate-400 text-sm max-w-md">
                        Se han inactivado **{result.deleted}** clientes que ya no estaban en el archivo maestro.
                      </p>
                    </div>
                    <Button 
                      onClick={downloadCleanupReport}
                      variant="secondary"
                      className="relative z-10 bg-white hover:bg-slate-100 text-slate-900 border-none font-bold"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Reporte XLS
                    </Button>
                  </div>
                ) : null}

                {/* Listado de Errores Mejorado */}
                {result.errors.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden">
                    <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {result.errors.length} Registros con Observaciones
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 font-semibold">Fila</th>
                            <th className="px-4 py-2 font-semibold">Error / Observación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {result.errors.map((error, index) => (
                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 text-slate-400 font-mono">#{error.row}</td>
                              <td className="px-4 py-3 text-orange-800 flex items-start gap-2">
                                <XCircle className="h-4 w-4 mt-0.5 text-orange-400 flex-shrink-0" />
                                <span>{error.error}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Footer de Acciones */}
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100">
            <div className="text-xs text-slate-400 italic">
              {result ? 'Proceso finalizado' : importing ? 'Importando...' : 'Listo para procesar'}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={importing}
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium px-6 py-5 rounded-xl"
              >
                {result ? 'Cerrar' : 'Cancelar'}
              </Button>

              {selectedFile && !result && !importing && (
                <Button
                  onClick={importClientes}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-5 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  {isWelcomeMode ? 'Iniciar y Enviar Bienvenida' : 'Iniciar Importación'}
                </Button>
              )}

              {result && (
                <Button 
                  onClick={resetModal} 
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-8 py-5 rounded-xl transition-all"
                >
                  Nueva Importación
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
