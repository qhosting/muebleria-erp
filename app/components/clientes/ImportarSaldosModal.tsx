
'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportarSaldosModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ImportarSaldosModal({
    open,
    onOpenChange,
    onSuccess
}: ImportarSaldosModalProps) {
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [result, setResult] = useState<{
        success: number;
        failed: number;
        errors: { row: number; error: string }[];
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                setSelectedFile(file);
                setResult(null);
            } else {
                toast.error('Por favor seleccione un archivo Excel (.xlsx)');
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const importSaldos = async () => {
        if (!selectedFile) return;

        setImporting(true);
        setProgress(0);
        const errors: { row: number; error: string }[] = [];
        let successCount = 0;
        let failedCount = 0;

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        throw new Error('El archivo está vacío');
                    }

                    for (let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        const rowNum = i + 2;
                        setProgress(((i + 1) / jsonData.length) * 100);

                        // Intentar detectar columnas (Codigo/CodigoCliente y Pago/Saldo/SaldoActual)
                        const codigo = row.Codigo || row.codigoCliente || row.CODIGO;
                        const saldo = row.SaldoActual !== undefined ? row.SaldoActual : (row.Pagar !== undefined ? row.Pagar : row.SALDO);

                        if (!codigo) {
                            errors.push({ row: rowNum, error: 'Falta columna de Código de Cliente' });
                            failedCount++;
                            continue;
                        }

                        if (saldo === undefined) {
                            errors.push({ row: rowNum, error: 'Falta columna de Saldo' });
                            failedCount++;
                            continue;
                        }

                        try {
                            const response = await fetch('/api/clientes/bulk-update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    codigoCliente: codigo.toString().trim(),
                                    updateData: { saldoActual: parseFloat(saldo) }
                                }),
                            });

                            if (response.ok) {
                                successCount++;
                            } else {
                                const err = await response.json();
                                errors.push({ row: rowNum, error: err.error || 'Error al actualizar' });
                                failedCount++;
                            }
                        } catch (err) {
                            errors.push({ row: rowNum, error: 'Error de conexión' });
                            failedCount++;
                        }
                    }

                    setResult({ success: successCount, failed: failedCount, errors });
                    if (successCount > 0) {
                        toast.success(`${successCount} saldos actualizados`);
                        onSuccess();
                    }
                } catch (error: any) {
                    toast.error(error.message || 'Error al procesar archivo');
                } finally {
                    setImporting(false);
                }
            };
            reader.readAsBinaryString(selectedFile);
        } catch (error) {
            setImporting(false);
            toast.error('Error al leer el archivo');
        }
    };

    const handleClose = () => {
        if (!importing) {
            setSelectedFile(null);
            setResult(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Actualizar Saldos Masivamente
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Seleccionar archivo SALDOS_DP.xlsx o SALDOS_DQ.xlsx</Label>
                        <Input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileSelect}
                            disabled={importing}
                            ref={fileInputRef}
                        />
                    </div>

                    {importing && (
                        <div className="space-y-2">
                            <Progress value={progress} />
                            <p className="text-xs text-center text-gray-500">Procesando... {progress.toFixed(0)}%</p>
                        </div>
                    )}

                    {result && (
                        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                            <p className="text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" /> Actualizados: {result.success}
                            </p>
                            {result.failed > 0 && (
                                <p className="text-red-500 flex items-center gap-1">
                                    <AlertTriangle className="h-4 w-4" /> Fallidos: {result.failed}
                                </p>
                            )}
                            {result.errors.length > 0 && (
                                <div className="mt-2 max-h-32 overflow-y-auto border-t pt-2">
                                    {result.errors.slice(0, 10).map((e, i) => (
                                        <p key={i} className="text-[10px] text-gray-500">Fila {e.row}: {e.error}</p>
                                    ))}
                                    {result.errors.length > 10 && <p className="text-[10px] text-gray-400">... y {result.errors.length - 10} más</p>}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleClose} disabled={importing}>
                            Cerrar
                        </Button>
                        {selectedFile && !result && (
                            <Button onClick={importSaldos} disabled={importing}>
                                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                Actualizar Saldos
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
