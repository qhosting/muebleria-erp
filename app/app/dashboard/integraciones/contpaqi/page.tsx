
'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCcw, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Users,
  Package,
  Activity,
  Save,
  Link2
} from 'lucide-react';
import { toast } from 'sonner';

export default function ContpaqiPage() {
  const [config, setConfig] = useState({
    apiUrl: 'http://vortex520.qhosting.net:5000',
    apiKey: 'VERTEX123_CONTPAQI_ERP_2024',
    webhookUrl: 'https://erp.mueblesdaso.com/api/contpaqi/webhook'
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const checkConnection = async () => {
    setStatus('loading');
    try {
      const response = await fetch('/api/contpaqi/sync?target=health');
      if (response.ok) {
        setStatus('success');
        toast.success('Conexión con Contpaqi exitosa');
      } else {
        throw new Error('No se pudo establecer conexión');
      }
    } catch (error) {
      setStatus('error');
      toast.error('Error de conexión con la API de Contpaqi');
    }
  };

  const handleSync = async (target: string) => {
    setSyncProgress(10);
    try {
      const response = await fetch(`/api/contpaqi/sync?target=${target}`);
      setSyncProgress(50);
      const data = await response.json();
      
      if (response.ok) {
        setSyncProgress(100);
        setLastSync(new Date().toLocaleString());
        toast.success(`Sincronización de ${target} completada: ${JSON.stringify(data.results)}`);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setSyncProgress(0);
      toast.error(`Error en sincronización: ${error.message}`);
    } finally {
      setTimeout(() => setSyncProgress(0), 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                <Link2 className="h-6 w-6 text-white" />
              </div>
              Contpaqi Comercial Premium
            </h1>
            <p className="text-slate-500 mt-1">Sincronización bidireccional y automatización de documentos</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={status === 'success' ? 'success' : status === 'error' ? 'destructive' : 'outline'} className="px-3 py-1 text-sm font-medium">
              {status === 'success' ? (
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> En línea</span>
              ) : status === 'error' ? (
                <span className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Desconectado</span>
              ) : (
                <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Esperando prueba</span>
              )}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuración de Conexión */}
          <Card className="lg:col-span-2 border-slate-200 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-400" />
                Configuración del Puente API
              </CardTitle>
              <CardDescription>Establece los parámetros de conexión con el servidor Contpaqi</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl">URL del Servidor API</Label>
                  <Input 
                    id="apiUrl" 
                    value={config.apiUrl} 
                    onChange={(e) => setConfig({...config, apiUrl: e.target.value})}
                    placeholder="http://ip-servidor:5000"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">X-API-Key</Label>
                  <Input 
                    id="apiKey" 
                    type="password"
                    value={config.apiKey} 
                    onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                    className="bg-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook de Retorno (VertexERP)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="webhookUrl" 
                    value={config.webhookUrl} 
                    readOnly
                    className="bg-slate-50 text-slate-500 italic"
                  />
                  <Button variant="outline" size="icon" onClick={() => window.open(config.webhookUrl, '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400">Esta es la URL que Contpaqi usará para notificarnos cambios en tiempo real.</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={checkConnection} disabled={status === 'loading'}>
                  <RefreshCcw className={`h-4 w-4 mr-2 ${status === 'loading' && 'animate-spin'}`} />
                  Probar Conexión
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estado de Sincronización */}
          <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCcw className="h-5 w-5 text-slate-400" />
                Sincronización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2 text-slate-600">
                      <Users className="h-4 w-4" /> Clientes
                    </span>
                    <Button size="sm" variant="ghost" className="h-8 text-blue-600" onClick={() => handleSync('clientes')}>
                      Sincronizar
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2 text-slate-600">
                      <Package className="h-4 w-4" /> Productos
                    </span>
                    <Button size="sm" variant="ghost" className="h-8 text-blue-600" onClick={() => handleSync('productos')}>
                      Sincronizar
                    </Button>
                  </div>
                </div>

                {syncProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Procesando datos...</span>
                      <span>{syncProgress}%</span>
                    </div>
                    <Progress value={syncProgress} className="h-1.5 bg-slate-100" />
                  </div>
                )}

                {lastSync && (
                  <div className="text-[10px] text-center text-slate-400 italic">
                    Última sincronización exitosa: {lastSync}
                  </div>
                )}

                <Button className="w-full bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-100 py-6 text-md font-semibold" onClick={() => handleSync('all')}>
                  <RefreshCcw className="h-5 w-5 mr-2" />
                  Sincronización Total
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de Ayuda/Documentación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl border border-blue-100 bg-blue-50/30 flex gap-4">
            <div className="p-3 bg-blue-100 rounded-xl h-fit">
              <CheckCircle2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-bold text-blue-900">¿Qué se sincroniza?</h4>
              <p className="text-sm text-blue-700/70 mt-1 leading-relaxed">
                VertexERP lee automáticamente el saldo de los clientes, sus nombres y las existencias de productos desde Contpaqi Comercial Premium cada vez que inicias una sincronización.
              </p>
            </div>
          </div>
          <div className="p-5 rounded-2xl border border-amber-100 bg-amber-50/30 flex gap-4">
            <div className="p-3 bg-amber-100 rounded-xl h-fit">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900">Importante</h4>
              <p className="text-sm text-amber-700/70 mt-1 leading-relaxed">
                Asegúrate de que el puerto 5000 esté abierto en el Firewall de tu servidor Contpaqi y que la API REST esté en ejecución (publish/INICIAR.bat).
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
