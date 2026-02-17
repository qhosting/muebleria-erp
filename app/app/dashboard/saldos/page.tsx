
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, Upload, Search, History, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import toast from 'react-hot-toast';

export default function ImportarSaldosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  
  // Importación individual
  const [codigoCliente, setCodigoCliente] = useState('');
  const [nuevoSaldo, setNuevoSaldo] = useState('');
  const [motivo, setMotivo] = useState('');
  
  // Importación masiva
  const [csvData, setCsvData] = useState('');

  // Verificar permisos - Solo Admin
  const userRole = (session?.user as any)?.role;

  // Redirigir si no hay sesión
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Mostrar loading mientras se verifica la sesión
  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="spinner mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Mostrar mensaje de acceso denegado si no es admin
  if (userRole !== 'admin') {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Solo los administradores tienen acceso a esta función.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  const handleImportarIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!codigoCliente || !nuevoSaldo) {
      toast.error('Código de cliente y nuevo saldo son requeridos');
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const response = await fetch('/api/saldos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoCliente: codigoCliente.trim(),
          nuevoSaldo: parseFloat(nuevoSaldo),
          motivo: motivo.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al importar saldo');
      }

      setResultado(data);
      toast.success('Saldo actualizado correctamente');
      
      // Limpiar formulario
      setCodigoCliente('');
      setNuevoSaldo('');
      setMotivo('');

    } catch (error: any) {
      toast.error(error.message);
      setResultado({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImportarMasivo = async () => {
    if (!csvData.trim()) {
      toast.error('Ingresa los datos CSV');
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      // Parsear CSV (formato: codigoCliente,saldo,motivo)
      const lines = csvData.trim().split('\n');
      const importes = lines.map(line => {
        const [codigo, saldo, motivo] = line.split(',').map(s => s.trim());
        return {
          codigoCliente: codigo,
          saldo: parseFloat(saldo),
          motivo: motivo || 'Importación masiva'
        };
      }).filter(item => item.codigoCliente && !isNaN(item.saldo));

      if (importes.length === 0) {
        throw new Error('No se encontraron datos válidos en el CSV');
      }

      const response = await fetch('/api/saldos/importar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importes })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al importar saldos');
      }

      setResultado(data);
      toast.success(`${data.exitosos} saldos actualizados correctamente`);
      
      // Limpiar
      setCsvData('');

    } catch (error: any) {
      toast.error(error.message);
      setResultado({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVerHistorial = async () => {
    if (!codigoCliente.trim()) {
      toast.error('Ingresa un código de cliente');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`/api/saldos/historial?codigoCliente=${codigoCliente.trim()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener historial');
      }

      setHistorial(data.historial || []);
      toast.success('Historial cargado');

    } catch (error: any) {
      toast.error(error.message);
      setHistorial([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Importación de Saldos</h1>
          <p className="text-muted-foreground">
            Actualiza los saldos de clientes de forma individual o masiva
          </p>
        </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Importación Individual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Importación Individual
            </CardTitle>
            <CardDescription>
              Actualiza el saldo de un cliente específico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleImportarIndividual} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigoCliente">Código de Cliente</Label>
                <Input
                  id="codigoCliente"
                  placeholder="Ej: CLI-001"
                  value={codigoCliente}
                  onChange={(e) => setCodigoCliente(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nuevoSaldo">Nuevo Saldo</Label>
                <Input
                  id="nuevoSaldo"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={nuevoSaldo}
                  onChange={(e) => setNuevoSaldo(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo (opcional)</Label>
                <Textarea
                  id="motivo"
                  placeholder="Razón del ajuste de saldo..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? 'Procesando...' : 'Actualizar Saldo'}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleVerHistorial}
                  disabled={loading}
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Importación Masiva */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importación Masiva (CSV)
            </CardTitle>
            <CardDescription>
              Actualiza múltiples saldos desde CSV
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csvData">Datos CSV</Label>
                <Textarea
                  id="csvData"
                  placeholder="CLI-001,1500.00,Ajuste inicial&#10;CLI-002,2300.50,Corrección&#10;CLI-003,890.00"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  disabled={loading}
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: codigoCliente,saldo,motivo (uno por línea)
                </p>
              </div>

              <Button 
                onClick={handleImportarMasivo} 
                disabled={loading}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Procesando...' : 'Importar Lote'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resultado */}
      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {resultado.error ? (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Error
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Resultado
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resultado.error ? (
              <Alert variant="destructive">
                <AlertDescription>{resultado.error}</AlertDescription>
              </Alert>
            ) : resultado.resultados ? (
              // Resultado de importación masiva
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{resultado.totalProcesados}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{resultado.exitosos}</div>
                    <div className="text-sm text-green-600">Exitosos</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{resultado.fallidos}</div>
                    <div className="text-sm text-red-600">Fallidos</div>
                  </div>
                </div>

                {resultado.resultados.exitosos.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Exitosos:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {resultado.resultados.exitosos.map((r: any, i: number) => (
                        <div key={i} className="text-sm p-2 bg-green-50 rounded">
                          <strong>{r.codigoCliente}</strong> - {r.nombreCompleto}: 
                          ${r.saldoAnterior} → ${r.saldoNuevo}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resultado.resultados.fallidos.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Fallidos:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {resultado.resultados.fallidos.map((r: any, i: number) => (
                        <div key={i} className="text-sm p-2 bg-red-50 rounded">
                          <strong>{r.codigoCliente}</strong>: {r.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : resultado.cliente ? (
              // Resultado de importación individual
              <div className="space-y-2">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="font-semibold">{resultado.cliente.nombreCompleto}</div>
                  <div className="text-sm text-muted-foreground">
                    Código: {resultado.cliente.codigoCliente}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground">Saldo Anterior</div>
                      <div className="font-bold">${resultado.cliente.saldoAnterior}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Saldo Nuevo</div>
                      <div className="font-bold text-green-600">${resultado.cliente.saldoNuevo}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Diferencia</div>
                      <div className="font-bold">${resultado.cliente.diferencia}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Ajustes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historial.map((h, i) => (
                <div key={i} className="p-3 bg-muted rounded-lg text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">
                        ${h.saldoAnterior} → ${h.saldoNuevo}
                      </div>
                      <div className="text-muted-foreground">
                        {h.motivo}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{new Date(h.fecha).toLocaleString()}</div>
                      <div>Por: {h.realizadoPor}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </DashboardLayout>
  );
}
