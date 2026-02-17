"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ImportedCliente {
    nombreCompleto: string;
    codigoCliente?: string;
    telefono?: string;
    direccionCompleta: string;
    diaPago: string;
    montoPago: number;
    saldoActual: number;
    estatus?: "valido" | "error";
    errorMsg?: string;
}

export default function ImportClientesPage() {
    const [file, setFile] = useState<File | null>(null);
    const [data, setData] = useState<ImportedCliente[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setLoading(true);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = XLSX.utils.sheet_to_json(ws);

                const parsedData: ImportedCliente[] = jsonData.map((row: any) => ({
                    nombreCompleto: row["Nombre"] || row["Cliente"] || "",
                    codigoCliente: row["Codigo"] || "",
                    telefono: row["Telefono"]?.toString() || "",
                    direccionCompleta: row["Direccion"] || "",
                    diaPago: row["DiaPago"]?.toString() || "1",
                    montoPago: Number(row["MontoPago"] || row["PagoSemanal"] || 0),
                    saldoActual: Number(row["Saldo"] || row["Deuda"] || 0),
                    estatus: "valido"
                }));

                // Validación básica
                const validatedData = parsedData.map(c => {
                    if (!c.nombreCompleto || !c.montoPago || !c.saldoActual) {
                        return { ...c, estatus: "error", errorMsg: "Faltan datos obligatorios" };
                    }
                    return c;
                });

                // @ts-ignore
                setData(validatedData);
            } catch (error) {
                console.error("Error al leer archivo:", error);
                toast.error("Error al leer el archivo Excel");
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(selectedFile);
    };

    const handleSave = async () => {
        if (data.length === 0) return;

        setUploading(true);
        setProgress(0);

        const validData = data.filter(d => d.estatus === "valido");
        const total = validData.length;
        let processed = 0;
        let successCount = 0;
        let failCount = 0;

        // Procesamos en lotes de 10 para no saturar
        const batchSize = 10;
        for (let i = 0; i < total; i += batchSize) {
            const batch = validData.slice(i, i + batchSize);

            try {
                const response = await fetch("/api/clientes/importar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ clientes: batch }),
                });

                if (response.ok) {
                    const res = await response.json();
                    successCount += res.created;
                    failCount += res.failed;
                } else {
                    failCount += batch.length;
                }
            } catch (error) {
                failCount += batch.length;
                console.error("Error en lote:", error);
            }

            processed += batch.length;
            setProgress(Math.round((processed / total) * 100));
        }

        setUploading(false);
        toast.success(`Importación finalizada: ${successCount} creados, ${failCount} fallidos`);

        // Limpiar
        if (successCount > 0) {
            setTimeout(() => {
                setFile(null);
                setData([]);
                setProgress(0);
            }, 2000);
        }
    };

    return (
        <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Importación Masiva de Clientes</h1>
                    <p className="text-muted-foreground">Carga tus clientes desde un archivo Excel (.xlsx, .csv)</p>
                </div>
                <Button variant="outline" onClick={() => window.open('/plantilla_clientes.csv')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Descargar Plantilla
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Cargar Archivo</CardTitle>
                    <CardDescription>
                        El archivo debe contener las columnas: Nombre, Telefono, Direccion, DiaPago (1-7), MontoPago, Saldo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-3 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Excel (.xlsx) o CSV</p>
                            </div>
                            <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    </div>

                    {file && (
                        <div className="mt-4 flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
                            <div className="flex items-center space-x-2">
                                <FileSpreadsheet className="text-emerald-600 h-5 w-5" />
                                <span className="font-medium text-sm">{file.name}</span>
                                <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setFile(null); setData([]); }}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {data.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Vista Previa ({data.length} registros)</CardTitle>
                            <div className="flex space-x-2">
                                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                                    <span>{data.filter(d => d.estatus === "valido").length} válidos</span>
                                </div>
                                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                    <AlertCircle className="h-4 w-4 text-rose-500" />
                                    <span>{data.filter(d => d.estatus !== "valido").length} errores</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[400px] overflow-auto border rounded-md mb-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Dirección</TableHead>
                                        <TableHead>Pago Semanal</TableHead>
                                        <TableHead>Saldo</TableHead>
                                        <TableHead>Estado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.slice(0, 50).map((row, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{row.nombreCompleto}</TableCell>
                                            <TableCell className="text-xs max-w-[200px] truncate" title={row.direccionCompleta}>{row.direccionCompleta}</TableCell>
                                            <TableCell>${row.montoPago}</TableCell>
                                            <TableCell>${row.saldoActual}</TableCell>
                                            <TableCell>
                                                {row.estatus === "valido" ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                        Válido
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800" title={row.errorMsg}>
                                                        Error
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {data.length > 50 && (
                                <div className="p-2 text-center text-xs text-muted-foreground bg-slate-50">
                                    Mostrando primeros 50 de {data.length} registros...
                                </div>
                            )}
                        </div>

                        {uploading ? (
                            <div className="space-y-2">
                                <Progress value={progress} className="w-full" />
                                <p className="text-center text-sm text-muted-foreground">Procesando importación... {progress}%</p>
                            </div>
                        ) : (
                            <Button
                                onClick={handleSave}
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                disabled={data.filter(d => d.estatus === "valido").length === 0}
                            >
                                <Save className="mr-2 h-4 w-4" />
                                Importar {data.filter(d => d.estatus === "valido").length} Clientes
                            </Button>
                        )}

                    </CardContent>
                </Card>
            )}
        </div>
    );
}
