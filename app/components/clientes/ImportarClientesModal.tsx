
'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, Download, FileText, Loader2, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

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
                  return p;
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
    // ... (keep existing parseCSV code)
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
      { key: 'direccionCompleta', label: 'Dirección' },
      { key: 'descripcionProducto', label: 'Producto' },
      { key: 'diaPago', label: 'Día de Pago' },
      { key: 'montoPago', label: 'Monto de Pago' },
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

    // Validate montoPago
    const montoPago = parseFloat(row.montoPago);
    if (isNaN(montoPago) || montoPago <= 0) {
      return `Fila ${rowNum}: 'Monto de Pago' debe ser un número mayor a 0. Valor encontrado: ${row.montoPago}`;
    }

    // Validate periodicidad
    const periodicidadValida = ['diario', 'semanal', 'catorcenal', 'quincenal', 'mensual'];
    const periodicidad = row.periodicidad?.toLowerCase().trim();
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

  const importClientes = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setProgress(0);

    try {
      let data: any[] = [];
      let parseErrors: any[] = [];

      if (selectedFile.name.endsWith('.csv')) {
        const text = await selectedFile.text();
        const result = parseCSV(text);
        data = result.data;
        parseErrors = result.errors;
      } else {
        const result = await parseXLSX(selectedFile);
        data = result.data;
        parseErrors = result.errors;
      }

      if (data.length === 0 && parseErrors.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo');
      }

      const result: ImportResult = {
        success: 0,
        created: 0,
        updated: 0,
        errors: [...parseErrors], // Incluir errores de parsing iniciales
        total: data.length + parseErrors.length
      };

      const createdClientsForWelcome: any[] = [];

      // Procesar solo las filas válidas
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        setProgress((i / data.length) * 100);

        const validationError = validateRow(row, i, data);
        if (validationError) {
          // Usar el índice original del archivo si existe (para ser precisos con el usuario)
          const rowNum = row._originalRowIndex || (i + 2);
          result.errors.push({ row: rowNum, error: validationError });
          continue;
        }

        try {
          // Normalizar fecha para enviar al servidor
          let normalizedFecha = row.fechaVenta || new Date().toISOString().split('T')[0];
          if (row.fechaVenta) {
            const dateParts = row.fechaVenta.split(/[-/]/);
            if (dateParts.length === 3) {
              const d1 = parseInt(dateParts[0]);
              const d2 = parseInt(dateParts[1]);
              const d3 = parseInt(dateParts[2]);

              if (d1 <= 31 && d3 > 31) { // Formato DD/MM/YYYY -> Convertir a YYYY-MM-DD
                normalizedFecha = `${d3}-${String(d2).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
              } else if (d1 > 31) { // Formato YYYY/MM/DD -> Convertir a YYYY-MM-DD
                normalizedFecha = `${d1}-${String(d2).padStart(2, '0')}-${String(d3).padStart(2, '0')}`;
              }
            }
          }

          const clienteData = {
            codigoCliente: row.codigoCliente?.trim() || null,
            nombreCompleto: row.nombreCompleto,
            telefono: row.telefono || null,
            vendedor: row.vendedor || null,
            codigoGestor: row.codigoGestor?.trim() || null,
            direccionCompleta: row.direccionCompleta,
            descripcionProducto: row.descripcionProducto,
            diaPago: row.diaPago,
            montoPago: parseFloat(row.montoPago),
            periodicidad: row.periodicidad,
            saldoActual: row.saldoActual ? parseFloat(row.saldoActual) : parseFloat(row.montoPago),
            fechaVenta: normalizedFecha,
            importe1: row.importe1 ? parseFloat(row.importe1) : null,
            importe2: row.importe2 ? parseFloat(row.importe2) : null,
            importe3: row.importe3 ? parseFloat(row.importe3) : null,
            importe4: row.importe4 ? parseFloat(row.importe4) : null,
          };

          // Si tiene codigoCliente, verificar si existe para decidir crear o actualizar
          let shouldUpdate = false;
          if (clienteData.codigoCliente) {
            // Verificar si el cliente existe
            const checkResponse = await fetch(`/api/clientes?search=${clienteData.codigoCliente}&limit=1`);
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              const existingClient = checkData.clientes?.find(
                (c: any) => c.codigoCliente === clienteData.codigoCliente
              );
              shouldUpdate = !!existingClient;
            }
          }

          let response;
          if (shouldUpdate && clienteData.codigoCliente) {
            // Actualizar cliente existente
            response = await fetch('/api/clientes/bulk-update', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                codigoCliente: clienteData.codigoCliente,
                updateData: clienteData,
              }),
            });

            if (response.ok) {
              result.success++;
              result.updated++;
            } else {
              const errorData = await response.json();
              result.errors.push({
                row: row._originalRowIndex || (i + 2),
                error: `Error al actualizar: ${errorData.error || 'Error desconocido'}`
              });
            }
          } else {
            // Crear nuevo cliente
            response = await fetch('/api/clientes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(clienteData),
            });

            if (response.ok) {
              const newClient = await response.json();
              result.success++;
              result.created++;
              if (isWelcomeMode) {
                createdClientsForWelcome.push(newClient);
              }
            } else {
              const errorData = await response.json();
              result.errors.push({
                row: row._originalRowIndex || (i + 2),
                error: `Error al crear: ${errorData.error || 'Error desconocido'}`
              });
            }
          }
        } catch (error) {
          result.errors.push({
            row: row._originalRowIndex || (i + 2),
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      setProgress(100);
      setResult(result);

      if (result.success > 0) {
        toast.success(`${result.success} clientes importados exitosamente`);
        onSuccess();

        // Enviar mensajes de bienvenida si está en modo bienvenida y hay clientes creados
        if (isWelcomeMode && createdClientsForWelcome.length > 0) {
          toast.info(`Iniciando envío de ${createdClientsForWelcome.length} mensajes de bienvenida...`);
          try {
            const welcomeResponse = await fetch('/api/whatsapp/welcome', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientes: createdClientsForWelcome })
            });

            if (welcomeResponse.ok) {
              const welcomeData = await welcomeResponse.json();
              toast.success(`${welcomeData.sent} mensajes de bienvenida enviados correctamente.`);
            } else {
              const welcomeError = await welcomeResponse.json();
              toast.error(`Error enviando mensajes: ${welcomeError.error}`);
            }
          } catch (error) {
            console.error('Error al enviar mensajes de bienvenida:', error);
            toast.error('Ocurrió un error al enviar los mensajes de bienvenida');
          }
        }
      }

      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} registros con errores`);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>{isWelcomeMode ? 'Importar Nuevas (con Bienvenida)' : 'Importar Clientes'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>1. Descargar Plantilla</span>
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Descarga la plantilla Excel/CSV con el formato correcto para importar/actualizar clientes.
              <span className="block mt-1 font-medium">
                💡 El sistema detecta automáticamente si debe crear o actualizar según el código de cliente.
              </span>
            </p>
            <Button
              onClick={downloadTemplate}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Descargar Plantilla
            </Button>
          </div>

          {/* File Upload Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2 flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>2. Seleccionar Archivo</span>
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Selecciona el archivo Excel (.xlsx) o CSV con los datos de clientes a importar.
            </p>
            <div className="space-y-2">
              <Label htmlFor="file-upload">Archivo Excel o CSV</Label>
              <Input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                disabled={importing}
              />
              {selectedFile && (
                <p className="text-sm text-green-600 flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Archivo seleccionado: {selectedFile.name}</span>
                </p>
              )}
            </div>
          </div>

          {/* Import Progress */}
          {importing && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Importando Clientes...</h3>
              <Progress value={progress} className="mb-2" />
              <p className="text-sm text-gray-600">
                {progress.toFixed(0)}% completado
              </p>
            </div>
          )}

          {/* Import Results */}
          {result && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Resultados de la Importación</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{result.success} clientes procesados exitosamente</span>
                </div>

                {result.created > 0 && (
                  <div className="flex items-center space-x-2 text-blue-600 text-sm">
                    <span className="ml-6">→ {result.created} clientes creados</span>
                  </div>
                )}

                {result.updated > 0 && (
                  <div className="flex items-center space-x-2 text-purple-600 text-sm">
                    <span className="ml-6">→ {result.updated} clientes actualizados</span>
                  </div>
                )}

                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{result.errors.length} registros con errores/advertencias:</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {result.errors.map((error, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertDescription className="text-xs">
                            {error.error}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={importing}
            >
              {result ? 'Cerrar' : 'Cancelar'}
            </Button>

            {selectedFile && !result && (
              <Button
                onClick={importClientes}
                disabled={importing}
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isWelcomeMode ? 'Importar y Enviar Bienvenida' : 'Importar Clientes'}
              </Button>
            )}

            {result && (
              <Button onClick={resetModal} variant="outline">
                Nueva Importación
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
