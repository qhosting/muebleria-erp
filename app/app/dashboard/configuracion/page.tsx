
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
  Type
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
    }
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saved, setSaved] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [loadingTest, setLoadingTest] = useState(false);

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
          setConfig(data);
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

  const [activeTab, setActiveTab] = useState('general');

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
                <div>
                  <Label htmlFor="logoUrl">URL del Logo (Opcional - Para Landing Page)</Label>
                  <Input
                    id="logoUrl"
                    placeholder="https://ejemplo.com/logo.png"
                    value={config.empresa.logoUrl || ''}
                    onChange={(e) => setConfig({ ...config, empresa: { ...config.empresa, logoUrl: e.target.value } })}
                  />
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

          <TabsContent value="avanzado" className="space-y-6">
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
