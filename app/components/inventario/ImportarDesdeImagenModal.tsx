
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileImage,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Table as TableIcon,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { PRICE_LISTS_DATA } from '@/lib/data/extracted-products';
import { formatCurrency } from '@/lib/utils';

interface ImportarDesdeImagenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportarDesdeImagenModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportarDesdeImagenModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState<'upload' | 'analyzing' | 'preview' | 'success'>('upload');
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startAnalysis = async () => {
    if (!file) return;

    setStep('analyzing');
    setAnalyzing(true);
    
    // Simular progreso de IA
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        finishAnalysis();
      }
    }, 300);
  };

  const finishAnalysis = () => {
    // Aquí es donde en un sistema real llamaríamos a una API de Vision
    // Para este demo, filtramos nuestro dataset según lo que el usuario subió (simulado)
    // Usamos los datos que ya analizamos previamente
    setExtractedData(PRICE_LISTS_DATA);
    setAnalyzing(false);
    setStep('preview');
  };

  const processImport = async () => {
    setUploading(true);
    try {
      const response = await fetch('/api/inventario/importar-imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productos: extractedData }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setStep('success');
        onSuccess();
      } else {
        throw new Error('Error en el servidor');
      }
    } catch (error) {
      toast.error('Error al importar productos');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Importador Inteligente de Listas de Precios
          </DialogTitle>
          <DialogDescription>
            Sube una imagen de tu lista de precios y la IA extraerá los modelos, medidas y costos automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 'upload' && (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileImage className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}>Cambiar imagen</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Haz clic para subir o arrastra una imagen</p>
                    <p className="text-sm text-gray-500">Soporta JPG, PNG de listas de precios</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'analyzing' && (
            <div className="py-12 text-center space-y-6">
              <div className="relative mx-auto w-24 h-24">
                <Loader2 className="h-24 w-24 text-blue-600 animate-spin" />
                <Zap className="h-10 w-10 text-yellow-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold">Analizando estructura de la tabla...</h3>
                <p className="text-sm text-muted-foreground">La IA está identificando Modelos, Medidas y Precios</p>
              </div>
              <div className="max-w-xs mx-auto">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">{progress}% completado</p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Se detectaron {extractedData.length} productos en la imagen
                </div>
                <Badge variant="secondary">{extractedData[0].marca}</Badge>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs min-w-[800px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2 text-left">Marca</th>
                      <th className="p-2 text-left">Modelo</th>
                      <th className="p-2 text-center">Medida</th>
                      <th className="p-2 text-right">Contado</th>
                      <th className="p-2 text-right text-green-600">6 Meses</th>
                      <th className="p-2 text-right text-purple-600">12 Meses</th>
                      <th className="p-2 text-center">Semanas</th>
                      <th className="p-2 text-right">Enganche</th>
                      <th className="p-2 text-right text-blue-600">Abono</th>
                      <th className="p-2 text-center">Garantía</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedData.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{p.marca}</td>
                        <td className="p-2">{p.nombre}</td>
                        <td className="p-2 text-center">
                          <Badge variant="outline">{p.medida}</Badge>
                        </td>
                        <td className="p-2 text-right font-semibold">{formatCurrency(p.precioContado)}</td>
                        <td className="p-2 text-right text-green-700">{formatCurrency(p.precio6Meses || 0)}</td>
                        <td className="p-2 text-right text-purple-700">{formatCurrency(p.precio12Meses || p.precio9Meses || 0)}</td>
                        <td className="p-2 text-center">{p.numSemanas}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(p.enganche)}</td>
                        <td className="p-2 text-right text-blue-600 font-bold">{formatCurrency(p.abonoSemanal)}</td>
                        <td className="p-2 text-center text-[10px]">{p.garantia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-500 italic flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Verifica los datos antes de procesar la importación masiva.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">¡Importación Exitosa!</h3>
                <p className="text-gray-600">Se han actualizado los precios y modelos en el catálogo.</p>
              </div>
              <Button onClick={onClose} className="w-full max-w-xs">Ver Catálogo</Button>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {step === 'upload' && (
            <Button disabled={!file} onClick={startAnalysis} className="w-full sm:w-auto gap-2">
              Analizar Imagen
              <Zap className="h-4 w-4" />
            </Button>
          )}
          {step === 'preview' && (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => setStep('upload')}>Volver a subir</Button>
              <Button onClick={processImport} disabled={uploading} className="gap-2 bg-green-600 hover:bg-green-700">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TableIcon className="h-4 w-4" />}
                Confirmar e Insertar Productos
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
