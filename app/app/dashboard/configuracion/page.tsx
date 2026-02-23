
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
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface ConfiguracionSistema {
  empresa: {
    nombre: string;
    direccion: string;
    telefono: string;
    email: string;
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
    wahaSession: string;
    wahaApiKey?: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
    recordatoriosDias: number;
  };
  sincronizacion: {
    intervaloMinutos: number;
    sincronizacionAutomatica: boolean;
    backupAutomatico: boolean;
  };
  impresion: {
    nombreImpresora: string;
    anchoPapel: number;
    cortarPapel: boolean;
  };
}

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const [config, setConfig] = useState<ConfiguracionSistema>({
    empresa: {
      nombre: 'Nombre de su Empresa',
      direccion: '',
      telefono: '',
      email: ''
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
      wahaSession: 'default',
      wahaApiKey: '',
      emailEnabled: true,
      smsEnabled: false,
      recordatoriosDias: 2
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
    }
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saved, setSaved] = useState(false);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="text-gray-600">Configuración general del sistema</p>
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
                  <Label htmlFor="wahaSession">Sesión de WAHA</Label>
                  <Input
                    id="wahaSession"
                    value={config.notificaciones.wahaSession}
                    onChange={(e) => setConfig({ ...config, notificaciones: { ...config.notificaciones, wahaSession: e.target.value } })}
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
              </div>
            )}
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
      </div>
    </DashboardLayout>
  );
}
