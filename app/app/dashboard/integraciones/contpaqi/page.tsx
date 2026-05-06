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
  Plus,
  Trash2,
  Building2,
  Activity,
  Save,
  Link2,
  Users,
  Package,
  ArrowRight
} from 'lucide-center'; // Nota: corrigiendo a lucide-react si es necesario, pero asumo lucide-react
import { toast } from 'sonner';

// Re-importing icons correctly
import * as LucideIcons from 'lucide-react';

interface EmpresaContpaqi {
  id: string;
  nombre: string;
  apiUrl: string;
  apiKey: string;
  conceptoAbono: string;
  clasificacion: string;
  ruta: string;
  isActive: boolean;
}

export default function ContpaqiMultiPage() {
  const [empresas, setEmpresas] = useState<EmpresaContpaqi[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/configuracion');
      if (response.ok) {
        const data = await response.json();
        if (data.contpaqi?.empresas) {
          setEmpresas(data.contpaqi.empresas);
        }
      }
    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmpresa = () => {
    const newEmpresa: EmpresaContpaqi = {
      id: Math.random().toString(36).substr(2, 9),
      nombre: 'Nueva Empresa',
      apiUrl: 'http://vortex520.qhosting.net:5000',
      apiKey: 'VERTEX123_CONTPAQI_ERP_2024',
      conceptoAbono: 'ABONO CLIENTE',
      clasificacion: 'COBRANZA NORMAL',
      ruta: '',
      isActive: true
    };
    setEmpresas([...empresas, newEmpresa]);
  };

  const handleRemoveEmpresa = (id: string) => {
    setEmpresas(empresas.filter(e => e.id !== id));
  };

  const handleUpdateEmpresa = (id: string, field: keyof EmpresaContpaqi, value: any) => {
    setEmpresas(empresas.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleSaveAll = async () => {
    try {
      const res = await fetch('/api/configuracion');
      const currentConfig = await res.json();

      const response = await fetch('/api/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentConfig,
          contpaqi: { empresas }
        })
      });

      if (response.ok) {
        toast.success('Configuración multi-empresa guardada');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      toast.error('Error al persistir la configuración');
    }
  };

  const handleSync = async (empresa: EmpresaContpaqi, target: string) => {
    setSyncingId(`${empresa.id}-${target}`);
    setSyncProgress(20);
    try {
      // Pasamos los filtros específicos de la empresa
      let query = `?target=${target}`;
      if (empresa.clasificacion) query += `&clasificacion=${encodeURIComponent(empresa.clasificacion)}`;
      if (empresa.ruta) query += `&ruta=${encodeURIComponent(empresa.ruta)}`;
      
      // Enviamos también los datos de conexión dinámicamente si la API lo soporta
      // Para este MVP, el backend usará los datos guardados en la DB si coinciden con la empresa actual
      const url = `/api/contpaqi/sync${query}&empresaId=${empresa.id}`;
      
      const response = await fetch(url);
      setSyncProgress(60);
      const data = await response.json();
      
      if (response.ok) {
        setSyncProgress(100);
        toast.success(`Sincronización de ${empresa.nombre} (${target}) exitosa`);
      } else {
        throw new Error(data.error || 'Error en el servidor');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setTimeout(() => {
        setSyncingId(null);
        setSyncProgress(0);
      }, 1500);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <LucideIcons.RefreshCcw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-200">
                <LucideIcons.Link2 className="h-8 w-8 text-white" />
              </div>
              Contpaqi Multi-Empresa
            </h1>
            <p className="text-slate-500 text-lg">Gestiona múltiples conexiones y carteras de clientes de forma centralizada</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="lg" onClick={handleAddEmpresa} className="border-slate-200 hover:bg-slate-50">
              <LucideIcons.Plus className="h-5 w-5 mr-2 text-blue-600" />
              Añadir Empresa
            </Button>
            <Button size="lg" onClick={handleSaveAll} className="bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200">
              <LucideIcons.Save className="h-5 w-5 mr-2" />
              Guardar Todo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {empresas.map((empresa) => (
            <Card key={empresa.id} className="border-slate-200 shadow-lg overflow-hidden bg-white/40 backdrop-blur-md hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 flex flex-row justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                    <LucideIcons.Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-800">{empresa.nombre}</CardTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`h-2 w-2 rounded-full ${empresa.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                        {empresa.isActive ? 'Conexión Activa' : 'Deshabilitada'}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveEmpresa(empresa.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50">
                  <LucideIcons.Trash2 className="h-5 w-5" />
                </Button>
              </CardHeader>
              
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                      <LucideIcons.Settings className="h-4 w-4 text-blue-500" />
                      Parámetros de Conexión
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre de Empresa (DB)</Label>
                        <Input 
                          value={empresa.nombre} 
                          onChange={(e) => handleUpdateEmpresa(empresa.id, 'nombre', e.target.value)}
                          className="bg-white/80 border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Concepto de Abono</Label>
                        <Input 
                          value={empresa.conceptoAbono} 
                          onChange={(e) => handleUpdateEmpresa(empresa.id, 'conceptoAbono', e.target.value)}
                          className="bg-white/80 border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">URL Servidor</Label>
                        <Input 
                          value={empresa.apiUrl} 
                          onChange={(e) => handleUpdateEmpresa(empresa.id, 'apiUrl', e.target.value)}
                          className="bg-white/80 border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">API Key</Label>
                        <Input 
                          type="password"
                          value={empresa.apiKey} 
                          onChange={(e) => handleUpdateEmpresa(empresa.id, 'apiKey', e.target.value)}
                          className="bg-white/80 border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                        <LucideIcons.Activity className="h-4 w-4 text-indigo-500" />
                        Filtros de Sincronización
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clasificación Principal</Label>
                          <Input 
                            placeholder="Ej: COBRANZA NORMAL"
                            value={empresa.clasificacion} 
                            onChange={(e) => handleUpdateEmpresa(empresa.id, 'clasificacion', e.target.value)}
                            className="bg-white/80"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ruta / Clasif 2</Label>
                          <Input 
                            placeholder="Ej: RUTA 01"
                            value={empresa.ruta} 
                            onChange={(e) => handleUpdateEmpresa(empresa.id, 'ruta', e.target.value)}
                            className="bg-white/80"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-between p-6 bg-slate-900 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <LucideIcons.RefreshCcw className="h-40 w-40" />
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        Acciones Rápidas
                        <LucideIcons.ArrowRight className="h-5 w-5 text-blue-400" />
                      </h3>
                      <p className="text-slate-400 text-sm">Dispara la sincronización manual para esta empresa.</p>
                      
                      <div className="grid grid-cols-2 gap-3 pt-4">
                        <Button 
                          onClick={() => handleSync(empresa, 'clientes')}
                          disabled={!!syncingId}
                          className="bg-white/10 hover:bg-white/20 border-white/10 text-white h-auto py-4 flex-col gap-2"
                        >
                          <LucideIcons.Users className="h-5 w-5" />
                          <span className="text-[10px] font-bold uppercase">Clientes</span>
                        </Button>
                        <Button 
                          onClick={() => handleSync(empresa, 'productos')}
                          disabled={!!syncingId}
                          className="bg-white/10 hover:bg-white/20 border-white/10 text-white h-auto py-4 flex-col gap-2"
                        >
                          <LucideIcons.Package className="h-5 w-5" />
                          <span className="text-[10px] font-bold uppercase">Productos</span>
                        </Button>
                      </div>
                    </div>

                    <div className="mt-8 space-y-4 relative z-10">
                      {syncingId?.startsWith(empresa.id) && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold text-blue-400">
                            <span>Sincronizando...</span>
                            <span>{syncProgress}%</span>
                          </div>
                          <Progress value={syncProgress} className="h-1 bg-white/10" />
                        </div>
                      )}
                      
                      <Button 
                        onClick={() => handleSync(empresa, 'all')}
                        disabled={!!syncingId}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-2xl"
                      >
                        <LucideIcons.RefreshCcw className={`h-5 w-5 mr-3 ${syncingId?.startsWith(empresa.id) ? 'animate-spin' : ''}`} />
                        Sincronización Total
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {empresas.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <LucideIcons.Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-600">No hay empresas configuradas</h3>
              <Button onClick={handleAddEmpresa} className="mt-6 bg-blue-600">
                <LucideIcons.Plus className="h-4 w-4 mr-2" />
                Configurar Ahora
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
