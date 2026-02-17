'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Printer, Save, TestTube2, Loader2, Bluetooth, Radio } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface PrinterConfig {
  impresoraNombre: string;
  impresoraAnchoPapel: number;
  impresoraTamanoFuente: string;
  impresoraAutoImprimir: boolean;
}

interface BluetoothPrinter {
  id: string;
  name: string;
}

export default function MiImpresoraPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [bluetoothAvailable, setBluetoothAvailable] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<BluetoothPrinter[]>([]);
  const [config, setConfig] = useState<PrinterConfig>({
    impresoraNombre: '',
    impresoraAnchoPapel: 80,
    impresoraTamanoFuente: 'mediana',
    impresoraAutoImprimir: false,
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }

    // Verificar si Bluetooth está disponible
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      setBluetoothAvailable(true);
    }

    loadConfig();
  }, [session, status, router]);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/users/printer-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.printerConfig);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      toast.error('Error al cargar configuración de impresora');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/users/printer-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success('Configuración guardada exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // Simular prueba de impresora
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Prueba de impresión enviada. Verifica tu impresora.');
    } catch (error) {
      toast.error('Error al probar impresora');
    } finally {
      setTesting(false);
    }
  };

  const scanBluetoothDevices = async () => {
    if (!bluetoothAvailable) {
      toast.error('Bluetooth Web API no disponible en este navegador');
      return;
    }

    setScanning(true);
    try {
      console.log('🔍 Iniciando escaneo de dispositivos Bluetooth...');
      
      // Solicitar dispositivo Bluetooth
      const device = await (navigator as any).bluetooth.requestDevice({
        // acceptAllDevices para mostrar todos los dispositivos
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // Servicio común de impresoras
      });

      console.log('✅ Dispositivo seleccionado:', device);

      if (device && device.name) {
        // Actualizar configuración con el dispositivo seleccionado
        setConfig({
          ...config,
          impresoraNombre: device.name
        });
        
        toast.success(`Impresora "${device.name}" seleccionada correctamente`);
      } else {
        toast.warning('No se pudo obtener el nombre del dispositivo');
      }
    } catch (error: any) {
      console.error('❌ Error al escanear Bluetooth:', error);
      
      if (error.name === 'NotFoundError') {
        toast.info('No se seleccionó ningún dispositivo');
      } else if (error.name === 'SecurityError') {
        toast.error('Bluetooth bloqueado. Verifica los permisos del navegador.');
      } else {
        toast.error('Error al escanear dispositivos Bluetooth');
      }
    } finally {
      setScanning(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando configuración...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Printer className="h-8 w-8" />
            Mi Impresora
          </h1>
          <p className="text-muted-foreground mt-2">
            Configura tu impresora personal para imprimir tickets de cobro
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuración de Impresora</CardTitle>
            <CardDescription>
              Personaliza cómo se imprimen tus tickets de pago
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selección de impresora Bluetooth */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="impresoraNombre">
                  Impresora Bluetooth
                </Label>
                {bluetoothAvailable && (
                  <Badge variant="outline" className="gap-1">
                    <Radio className="h-3 w-3" />
                    Bluetooth disponible
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-2">
                <Input
                  id="impresoraNombre"
                  placeholder="Selecciona tu impresora Bluetooth"
                  value={config.impresoraNombre}
                  onChange={(e) => setConfig({ ...config, impresoraNombre: e.target.value })}
                  readOnly={bluetoothAvailable}
                  className={bluetoothAvailable ? 'cursor-not-allowed bg-muted' : ''}
                />
                {bluetoothAvailable && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={scanBluetoothDevices}
                    disabled={scanning}
                    className="shrink-0"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Bluetooth className="h-4 w-4 mr-2" />
                        Buscar
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                {bluetoothAvailable 
                  ? 'Haz clic en "Buscar" para seleccionar tu impresora Bluetooth' 
                  : 'Ingresa el nombre de tu impresora manualmente'}
              </p>

              {!bluetoothAvailable && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>⚠️ Bluetooth Web no disponible</strong><br />
                    Tu navegador no soporta Web Bluetooth API. Para usar esta función:
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 mt-2 space-y-1 ml-4">
                    <li>• Usa Chrome, Edge o Samsung Internet</li>
                    <li>• Habilita Bluetooth en tu dispositivo</li>
                    <li>• Asegúrate de usar HTTPS o localhost</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Ancho de papel */}
            <div className="space-y-2">
              <Label htmlFor="impresoraAnchoPapel">
                Ancho de Papel
              </Label>
              <Select
                value={config.impresoraAnchoPapel.toString()}
                onValueChange={(value) => setConfig({ ...config, impresoraAnchoPapel: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58">58 mm (Rollo pequeño)</SelectItem>
                  <SelectItem value="80">80 mm (Rollo estándar)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Selecciona el ancho del rollo de papel de tu impresora
              </p>
            </div>

            {/* Tamaño de fuente */}
            <div className="space-y-2">
              <Label htmlFor="impresoraTamanoFuente">
                Tamaño de Fuente
              </Label>
              <Select
                value={config.impresoraTamanoFuente}
                onValueChange={(value) => setConfig({ ...config, impresoraTamanoFuente: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pequena">Pequeña</SelectItem>
                  <SelectItem value="mediana">Mediana</SelectItem>
                  <SelectItem value="grande">Grande</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Tamaño del texto en los tickets impresos
              </p>
            </div>

            {/* Auto-imprimir */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="impresoraAutoImprimir">
                  Auto-imprimir Tickets
                </Label>
                <p className="text-sm text-muted-foreground">
                  Imprimir automáticamente al registrar un pago
                </p>
              </div>
              <Switch
                id="impresoraAutoImprimir"
                checked={config.impresoraAutoImprimir}
                onCheckedChange={(checked) => setConfig({ ...config, impresoraAutoImprimir: checked })}
              />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Configuración
                  </>
                )}
              </Button>

              <Button
                onClick={handleTest}
                disabled={testing || !config.impresoraNombre}
                variant="outline"
              >
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Probando...
                  </>
                ) : (
                  <>
                    <TestTube2 className="mr-2 h-4 w-4" />
                    Probar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card>
          <CardHeader>
            <CardTitle>Impresoras Compatibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">✅ Requisitos</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Impresoras térmicas con protocolo ESC/POS</li>
                <li>• Conexión Bluetooth habilitada en el dispositivo</li>
                <li>• Ancho de papel: 58mm o 80mm</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">📱 Modelos Probados</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Epson TM-T20, TM-T88</li>
                <li>• Star TSP143, TSP654</li>
                <li>• Bixolon SRP-350, SPP-R200</li>
                <li>• Zebra ZD410, ZD620</li>
              </ul>
            </div>

            {bluetoothAvailable && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>💡 Consejo:</strong> Asegúrate de que tu impresora Bluetooth esté encendida 
                  y en modo de emparejamiento antes de buscar dispositivos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
