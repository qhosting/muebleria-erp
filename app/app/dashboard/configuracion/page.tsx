
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Shield,
  Building2,
  Smartphone,
  Printer,
  Database,
  Save,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Layout,
  Image as ImageIcon,
  Type,
  Upload,
  Plus,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface ConfiguracionSistema {
  empresa: {
    nombre: string;
    direccion: string;
    telefono: string;
    email: string;
    logoUrl?: string;
    habilitarLandingPage?: boolean;
  };
  cobranza: {
    diasGracia: number;
    cargoMoratorio: number;
    requiereTicket: boolean;
    permitirPagoParcial: boolean;
  };
  notificaciones: {
    whatsappEnabled: boolean;
    wahaApiUrl: string;
    wahaSessionName: string;
    wahaApiKey?: string;
    tesoreriaWahaSession?: string;
    tesoreriaWahaApiUrl?: string;
    tesoreriaWahaApiKey?: string;
    tesoreriaAgentName?: string;
    
    leadsWahaApiKey?: string;
    leadsWahaSession?: string;
    leadsWahaApiUrl?: string;
    leadsAgentName?: string;
    disableSofiaBot?: boolean;
    
    globalAgentName?: string;
    openaiApiKey?: string;
    
    emailEnabled: boolean;
    smsEnabled: boolean;
    recordatoriosDias: number;
    whatsappBlacklist?: string;
  };
  sincronizacion: {
    intervaloMinutos: number;
    sincronizacionAutomatica: boolean;
    backupAutomatico: boolean;
  };
  impresion: {
    nombreImpresora?: string;
    anchoPapel: number;
    cortarPapel: boolean;
  };
  landing: {
    hero: {
      titulo: string;
      subtitulo: string;
      botonTexto: string;
      imagenUrl: string;
    };
    features: Array<{
      id: number;
      titulo: string;
      descripcion: string;
      icon: string;
    }>;
  };
  contpaqi: {
    apiUrl: string;
    apiKey: string;
    empresas: Array<{
      id: string;
      nombre: string;
      baseDatos: string;
      apiUrl?: string;
      apiKey?: string;
      isActive: boolean;
    }>;
  };
}

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const [config, setConfig] = useState<ConfiguracionSistema>({
    empresa: {
      nombre: 'Nombre de su Empresa',
      direccion: '',
      telefono: '',
      email: '',
      logoUrl: '',
      habilitarLandingPage: true
    },
    cobranza: {
      diasGracia: 3,
      cargoMoratorio: 50,
      requiereTicket: true,
      permitirPagoParcial: true
    },
    notificaciones: {
      whatsappEnabled: false,
      wahaApiUrl: '',
      wahaSessionName: 'default',
      wahaApiKey: '',
      leadsWahaSession: '',
      leadsWahaApiUrl: '',
      leadsWahaApiKey: '',
      leadsAgentName: 'Sofía (Ventas)',
      openaiApiKey: '',
      disableSofiaBot: false,
      tesoreriaWahaSession: '',
      tesoreriaWahaApiUrl: '',
      tesoreriaWahaApiKey: '',
      tesoreriaAgentName: 'Asistente de Tesorería',
      globalAgentName: 'Asistente Global',
      emailEnabled: true,
      smsEnabled: false,
      recordatoriosDias: 2,
      whatsappBlacklist: ''
    },
    sincronizacion: {
      intervaloMinutos: 15,
      sincronizacionAutomatica: true,
      backupAutomatico: true
    },
    impresion: {
      nombreImpresora: 'Impresora Bluetooth',
      anchoPapel: 80,
      cortarPapel: true
    },
    landing: {
      hero: {
        titulo: '',
        subtitulo: '',
        botonTexto: '',
        imagenUrl: ''
      },
      features: []
    },
    contpaqi: {
      apiUrl: '',
      apiKey: '',
      empresas: [
        { id: 'default', nombre: 'Empresa Principal', baseDatos: 'adDASOPLUS16', isActive: true }
      ]
    }
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saved, setSaved] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [loadingTest, setLoadingTest] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [syncingFechas, setSyncingFechas] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'branding');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        setConfig({ ...config, empresa: { ...config.empresa, logoUrl: data.url } });
        toast.success('Logo subido correctamente');
      } else {
        throw new Error(data.error || 'Error al subir logo');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleTestWhatsapp = async () => {
    if (!testPhone) return;
    setLoadingTest(true);
    try {
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: config.notificaciones,
          phone: testPhone
        })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Prueba completada');
        if (data.failed && data.failed.length > 0) {
          toast.error(`Error en: ${data.failed.join(', ')}`, { duration: 5000 });
        }
      } else {
        throw new Error(data.error || 'Error al enviar prueba');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoadingTest(false);
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/configuracion');
        if (response.ok) {
          const data = await response.json();
          // Merge seguro para evitar que campos faltantes (como landing) rompan la UI
          setConfig(prev => ({
            ...prev,
            ...data,
            landing: data.landing || prev.landing,
            empresa: { ...prev.empresa, ...data.empresa },
            notificaciones: { ...prev.notificaciones, ...data.notificaciones },
            contpaqi: data.contpaqi || prev.contpaqi
          }));
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        toast.error('Error al cargar la configuración');
      } finally {
        setLoadingData(false);
      }
    };

    if (session?.user && (session.user as any)?.role === 'admin') {
      loadConfig();
    } else {
      setLoadingData(false);
    }
  }, [session]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/configuracion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.config) setConfig(data.config);
        setSaved(true);
        toast.success('Configuración guardada exitosamente');
        setTimeout(() => setSaved(false), 2000);
      } else {
        throw new Error(data.details || data.error || 'Error al guardar');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('¿Está seguro de restablecer la configuración a valores por defecto?')) {
      toast.success('Configuración restablecida');
    }
  };

  const handleResetDatabase = async () => {
    const confirmed = confirm('⚠️ ADVERTENCIA: Esta acción eliminará TODOS los clientes y pagos. ¿Desea continuar?');
    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch('/api/reset-database', { method: 'POST' });
      if (response.ok) {
        toast.success('Base de datos reseteada exitosamente');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Error al resetear');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al resetear la base de datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAllFechasVenta = async () => {
    setSyncingFechas(true);
    const loadingToast = toast.loading('Iniciando sincronización masiva de fechas de venta...');
    try {
      const response = await fetch('/api/contpaqi/sync?target=clientes', { cache: 'no-store' });
      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success('Se han sincronizado las fechas de venta de todos los clientes con éxito.');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la sincronización masiva');
      }
    } catch (error: any) {
      console.error('Error al sincronizar fechas masivamente:', error);
      toast.dismiss(loadingToast);
      toast.error(`No se pudo sincronizar de forma masiva: ${error.message || 'Error desconocido'}`);
    } finally {
      setSyncingFechas(false);
    }
  };

  if (!session || (session.user as any)?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Denegado</h2>
        </div>
      </DashboardLayout>
    );
  }

  if (loadingData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <p>Cargando configuración...</p>
        </div>
      </DashboardLayout>
    );
  }



  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="text-gray-600">Configuración general y diseño del sistema</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restablecer
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="landing">Landing Builder</TabsTrigger>
            <TabsTrigger value="notificaciones">WhatsApp/IA</TabsTrigger>
            <TabsTrigger value="contpaqi">ERP / Contpaqi</TabsTrigger>
            <TabsTrigger value="avanzado">Avanzado</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información de la Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombreEmpresa">Nombre de la empresa</Label>
                    <Input
                      id="nombreEmpresa"
                      value={config.empresa.nombre}
                      onChange={(e) => setConfig({ ...config, empresa: { ...config.empresa, nombre: e.target.value } })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefonoEmpresa">Teléfono</Label>
                    <Input
                      id="telefonoEmpresa"
                      value={config.empresa.telefono}
                      onChange={(e) => setConfig({ ...config, empresa: { ...config.empresa, telefono: e.target.value } })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="direccionEmpresa">Dirección</Label>
                  <Input
                    id="direccionEmpresa"
                    value={config.empresa.direccion}
                    onChange={(e) => setConfig({ ...config, empresa: { ...config.empresa, direccion: e.target.value } })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="logoUrl">Logo de la Empresa (Landing Page)</Label>
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="w-full md:flex-1">
                      <div className="flex gap-2">
                        <Input
                          id="logoUrl"
                          placeholder="https://ejemplo.com/logo.png"
                          value={config.empresa.logoUrl || ''}
                          onChange={(e) => setConfig({ ...config, empresa: { ...config.empresa, logoUrl: e.target.value } })}
                          className="flex-1"
                        />
                        <div className="relative">
                          <Input
                            type="file"
                            id="logoUpload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={uploadingLogo}
                          />
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => document.getElementById('logoUpload')?.click()}
                            disabled={uploadingLogo}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            {uploadingLogo ? 'Subiendo...' : 'Subir'}
                          </Button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Sube una imagen o pega una URL directa. Se recomienda formato PNG transparente.</p>
                    </div>
                    {config.empresa.logoUrl && (
                      <div className="h-16 w-32 border rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                        <img 
                          src={config.empresa.logoUrl} 
                          alt="Logo Preview" 
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <div>
                    <Label htmlFor="habilitarLanding" className="text-blue-900 font-bold">Habilitar Landing Page (Tienda Pública)</Label>
                    <p className="text-xs text-blue-700/70">Si se desactiva, la página principal redirigirá automáticamente al Login.</p>
                  </div>
                  <Switch 
                    id="habilitarLanding"
                    checked={config.empresa.habilitarLandingPage ?? true}
                    onCheckedChange={(checked) => setConfig({ ...config, empresa: { ...config.empresa, habilitarLandingPage: checked } })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración de Cobranza
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="diasGracia">Días de gracia</Label>
                    <Input
                      id="diasGracia"
                      type="number"
                      value={config.cobranza.diasGracia}
                      onChange={(e) => setConfig({ ...config, cobranza: { ...config.cobranza, diasGracia: parseInt(e.target.value) || 0 } })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cargoMoratorio">Cargo moratorio ($)</Label>
                    <Input
                      id="cargoMoratorio"
                      type="number"
                      value={config.cobranza.cargoMoratorio}
                      onChange={(e) => setConfig({ ...config, cobranza: { ...config.cobranza, cargoMoratorio: parseFloat(e.target.value) || 0 } })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="landing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Sección Principal (Hero)
                </CardTitle>
                <CardDescription>Configura el primer mensaje que verán tus clientes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Título Principal</Label>
                  <Input 
                    value={config.landing?.hero?.titulo || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      landing: {
                        ...config.landing,
                        hero: { ...config.landing.hero, titulo: e.target.value }
                      }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo / Descripción</Label>
                  <Textarea 
                    value={config.landing?.hero?.subtitulo || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      landing: {
                        ...config.landing,
                        hero: { ...config.landing.hero, subtitulo: e.target.value }
                      }
                    })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Texto del Botón</Label>
                    <Input 
                      value={config.landing?.hero?.botonTexto || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        landing: {
                          ...config.landing,
                          hero: { ...config.landing.hero, botonTexto: e.target.value }
                        }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL Imagen de Fondo</Label>
                    <Input 
                      placeholder="/furniture_ecommerce_hero.png"
                      value={config.landing?.hero?.imagenUrl || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        landing: {
                          ...config.landing,
                          hero: { ...config.landing.hero, imagenUrl: e.target.value }
                        }
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Indicadores de Confianza (Features)
                </CardTitle>
                <CardDescription>Personaliza los 4 beneficios principales.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {config.landing?.features?.map((feature, idx) => (
                    <div key={feature.id} className="p-4 border rounded-lg space-y-3 bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{idx + 1}</Badge>
                        <Input 
                          placeholder="Título del beneficio"
                          className="font-bold"
                          value={feature.titulo}
                          onChange={(e) => {
                            const newFeatures = [...config.landing.features];
                            newFeatures[idx].titulo = e.target.value;
                            setConfig({ ...config, landing: { ...config.landing, features: newFeatures } });
                          }}
                        />
                      </div>
                      <Textarea 
                        placeholder="Descripción corta"
                        className="text-sm h-20"
                        value={feature.descripcion}
                        onChange={(e) => {
                          const newFeatures = [...config.landing.features];
                          newFeatures[idx].descripcion = e.target.value;
                          setConfig({ ...config, landing: { ...config.landing, features: newFeatures } });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificaciones" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Notificaciones y WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="whatsappEnabled">Habilitar WhatsApp (WAHA API)</Label>
                    <p className="text-sm text-gray-500">Enviar mensajes automáticos de bienvenida</p>
                  </div>
                  <Switch
                    id="whatsappEnabled"
                    checked={config.notificaciones.whatsappEnabled}
                    onCheckedChange={(checked) => setConfig({ ...config, notificaciones: { ...config.notificaciones, whatsappEnabled: checked } })}
                  />
                </div>

                {config.notificaciones.whatsappEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-green-200 py-2">
                    <div className="md:col-span-2">
                      <Label htmlFor="wahaApiUrl">URL de WAHA API</Label>
                      <Input
                        id="wahaApiUrl"
                        placeholder="http://tu-servidor:3000"
                        value={config.notificaciones.wahaApiUrl}
                        onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, wahaApiUrl: e.target.value } })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="wahaSession">Nombre de Sesión (WAHA)</Label>
                      <Input
                        id="wahaSession"
                        placeholder="Ej. Domiahome"
                        value={config.notificaciones.wahaSessionName}
                        onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, wahaSessionName: e.target.value } })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="wahaApiKey">API Key (Opcional)</Label>
                      <Input
                        id="wahaApiKey"
                        type="password"
                        value={config.notificaciones.wahaApiKey}
                        onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, wahaApiKey: e.target.value } })}
                      />
                    </div>

                    <Separator className="my-2 md:col-span-2" />
                    
                    {/* Canales Específicos */}
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-sm font-semibold text-slate-700">Configuración por Departamento (Canales)</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-slate-50/50">
                        <div className="md:col-span-2 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ventas y Leads (Cerebro de IA)</h4>
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between bg-white p-3 rounded-lg border">
                          <div>
                            <Label htmlFor="disableSofiaBot" className="font-bold text-slate-700">Desactivar IA Sofia (Ventas)</Label>
                            <p className="text-[10px] text-slate-500">Apaga temporalmente las respuestas automáticas de la IA para leads y ventas.</p>
                          </div>
                          <Switch
                            id="disableSofiaBot"
                            checked={config.notificaciones.disableSofiaBot || false}
                            onCheckedChange={(checked) => setConfig({ ...config, notificaciones: { ...config.notificaciones, disableSofiaBot: checked } })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="leadsAgentName">Nombre del Agente / Personalidad</Label>
                          <Input
                            id="leadsAgentName"
                            placeholder="Ej. Sofía (Ventas)"
                            value={config.notificaciones.leadsAgentName || ''}
                            onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, leadsAgentName: e.target.value } })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="leadsSession">Sesión WAHA (Ventas)</Label>
                          <Input
                            id="leadsSession"
                            placeholder="Ej. ventas_session"
                            value={config.notificaciones.leadsWahaSession || ''}
                            onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, leadsWahaSession: e.target.value } })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="leadsApiKey">API Key (Ventas)</Label>
                          <Input
                            id="leadsApiKey"
                            type="password"
                            placeholder="Key específica para ventas"
                            value={config.notificaciones.leadsWahaApiKey || ''}
                            onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, leadsWahaApiKey: e.target.value } })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="openaiKey">OpenAI API Key (Cerebro de IA)</Label>
                          <Input
                            id="openaiKey"
                            type="password"
                            placeholder="sk-..."
                            value={config.notificaciones.openaiApiKey || ''}
                            onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, openaiApiKey: e.target.value } })}
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Requerido para que la IA pueda conversar y detectar intenciones de venta.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-slate-50/50">
                        <div className="md:col-span-2 flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tesorería (Pagos y Tickets)</h4>
                        </div>
                        <div>
                          <Label htmlFor="tesoreriaAgentName">Nombre del Agente</Label>
                          <Input
                            id="tesoreriaAgentName"
                            placeholder="Ej. Asistente de Pagos"
                            value={config.notificaciones.tesoreriaAgentName || ''}
                            onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, tesoreriaAgentName: e.target.value } })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="tesoreriaSession">Sesión WAHA (Tesorería)</Label>
                          <Input
                            id="tesoreriaSession"
                            placeholder="Ej. tesoreria_session"
                            value={config.notificaciones.tesoreriaWahaSession || ''}
                            onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, tesoreriaWahaSession: e.target.value } })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="tesoreriaApiKey">API Key (Tesorería)</Label>
                          <Input
                            id="tesoreriaApiKey"
                            type="password"
                            placeholder="Key específica para pagos"
                            value={config.notificaciones.tesoreriaWahaApiKey || ''}
                            onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, tesoreriaWahaApiKey: e.target.value } })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 pt-2">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <Label className="text-slate-900 font-semibold mb-2 block">Lista Negra (Ignorar)</Label>
                        <Input
                          placeholder="Números o IDs de grupos a ignorar, separados por coma (ej: 521..., 12345@g.us)"
                          value={config.notificaciones.whatsappBlacklist || ''}
                          onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, whatsappBlacklist: e.target.value } })}
                        />
                        <p className="text-[10px] text-slate-500 mt-2">
                          Los mensajes provenientes de estos IDs serán ignorados por la IA. Útil para grupos o contactos administrativos.
                        </p>
                      </div>

                      <Separator className="my-4" />
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <Label className="text-slate-900 font-semibold mb-2 block">Probar Conexión</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Número de WhatsApp (ej: 521442...)"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            variant="secondary" 
                            onClick={handleTestWhatsapp} 
                            disabled={loadingTest || !testPhone}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {loadingTest ? 'Enviando...' : 'Enviar Prueba'}
                          </Button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">
                          Ingresa tu número con código de país (ej: 521 para México) para recibir un mensaje de prueba.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="contpaqi" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Conexión con Contpaqi Comercial
                </CardTitle>
                <CardDescription>Configura la comunicación con tu servidor local de Contpaqi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="contpaqiUrl">URL Global del API Wrapper</Label>
                    <Input
                      id="contpaqiUrl"
                      placeholder="http://vortex520.qhosting.net:5000"
                      value={config.contpaqi.apiUrl}
                      onChange={(e) => setConfig({ ...config, contpaqi: { ...config.contpaqi, apiUrl: e.target.value } })}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">La dirección donde está instalado el servicio REST de Contpaqi.</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="contpaqiKey">API Key Global</Label>
                    <Input
                      id="contpaqiKey"
                      type="password"
                      placeholder="Tu llave secreta"
                      value={config.contpaqi.apiKey}
                      onChange={(e) => setConfig({ ...config, contpaqi: { ...config.contpaqi, apiKey: e.target.value } })}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Llave de seguridad para autorizar peticiones desde el ERP.</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Empresas Vinculadas</h3>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const newEmpresas = [...config.contpaqi.empresas];
                        newEmpresas.push({
                          id: `empresa_${Date.now()}`,
                          nombre: 'Nueva Empresa',
                          baseDatos: '',
                          isActive: true
                        });
                        setConfig({ ...config, contpaqi: { ...config.contpaqi, empresas: newEmpresas } });
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Añadir Empresa
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {config.contpaqi.empresas.map((empresa, idx) => (
                      <div key={empresa.id} className="p-4 border rounded-xl bg-slate-50/50 space-y-4">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">Empresa #{idx + 1}</Badge>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7"
                            onClick={() => {
                              const newEmpresas = config.contpaqi.empresas.filter((_, i) => i !== idx);
                              setConfig({ ...config, contpaqi: { ...config.contpaqi, empresas: newEmpresas } });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Nombre Comercial</Label>
                            <Input
                              placeholder="Ej. Mueblería DASO"
                              value={empresa.nombre}
                              onChange={(e) => {
                                const newEmpresas = [...config.contpaqi.empresas];
                                newEmpresas[idx].nombre = e.target.value;
                                setConfig({ ...config, contpaqi: { ...config.contpaqi, empresas: newEmpresas } });
                              }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Base de Datos (Alias Contpaqi)</Label>
                            <Input
                              placeholder="Ej. adDASOPLUS16"
                              value={empresa.baseDatos}
                              onChange={(e) => {
                                const newEmpresas = [...config.contpaqi.empresas];
                                newEmpresas[idx].baseDatos = e.target.value;
                                setConfig({ ...config, contpaqi: { ...config.contpaqi, empresas: newEmpresas } });
                              }}
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <details className="text-xs">
                            <summary className="cursor-pointer text-blue-600 font-medium">Configuración Avanzada (Overrides)</summary>
                            <div className="mt-3 space-y-3 pl-2 border-l-2 border-blue-200">
                              <div>
                                <Label className="text-[10px] uppercase">URL Específica (Opcional)</Label>
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Dejar vacío para usar Global"
                                  value={empresa.apiUrl || ''}
                                  onChange={(e) => {
                                    const newEmpresas = [...config.contpaqi.empresas];
                                    newEmpresas[idx].apiUrl = e.target.value;
                                    setConfig({ ...config, contpaqi: { ...config.contpaqi, empresas: newEmpresas } });
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase">API Key Específica (Opcional)</Label>
                                <Input
                                  className="h-8 text-xs"
                                  type="password"
                                  placeholder="Dejar vacío para usar Global"
                                  value={empresa.apiKey || ''}
                                  onChange={(e) => {
                                    const newEmpresas = [...config.contpaqi.empresas];
                                    newEmpresas[idx].apiKey = e.target.value;
                                    setConfig({ ...config, contpaqi: { ...config.contpaqi, empresas: newEmpresas } });
                                  }}
                                />
                              </div>
                            </div>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="avanzado" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-600" />
                  Mantenimiento de Catálogos
                </CardTitle>
                <CardDescription>
                  Herramientas para forzar actualizaciones manuales masivas de la base de datos local.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Sincronización Masiva de Fechas de Venta</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Consulta en vivo todos los documentos de facturación en Contpaqi para cada cliente de la base de datos local y recalcula su Fecha de Venta real.
                  </p>
                  <Button 
                    onClick={handleSyncAllFechasVenta} 
                    disabled={syncingFechas} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncingFechas ? 'animate-spin' : ''}`} />
                    {syncingFechas ? 'Sincronizando...' : 'Sincronizar Fechas de Venta de Todos los Clientes'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Zona de Peligro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={handleResetDatabase} disabled={loading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Resetear Base de Datos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
