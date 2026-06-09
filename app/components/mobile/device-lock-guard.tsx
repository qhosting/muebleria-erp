
'use client';

import { useState, useEffect } from 'react';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { useSession } from 'next-auth/react';
import { 
  ShieldAlert, 
  Key, 
  Smartphone, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface DeviceInfo {
  id: string;
  model: string;
  operatingSystem: string;
}

export function DeviceLockGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpCode, setOtpCode] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    initDeviceCheck();
  }, [status]);

  const initDeviceCheck = async () => {
    if (!Capacitor.isNativePlatform()) {
      // En modo web (dev), permitimos el paso o simulamos un ID fijo
      setDeviceInfo({ id: 'WEB-DEBUG-ID', model: 'Browser', operatingSystem: 'Web' });
      setIsAuthorized(true);
      setLoading(false);
      return;
    }

    try {
      const id = await Device.getId();
      const info = await Device.getInfo();
      
      const currentDeviceInfo = {
        id: id.identifier,
        model: info.model,
        operatingSystem: info.operatingSystem
      };
      setDeviceInfo(currentDeviceInfo);

      const cacheKey = `device_authorized_${id.identifier}`;

      // Si no hay internet, validar directamente contra la caché local
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cachedAuth = localStorage.getItem(cacheKey);
        if (cachedAuth === 'true') {
          console.log('🔌 [DeviceLockGuard] Dispositivo offline previamente autorizado. Permitido.');
          setIsAuthorized(true);
          setLoading(false);
          return;
        }
      }

      // Verificar con el servidor si este ID está autorizado
      try {
        const res = await fetch(`/api/auth/device-status?deviceId=${id.identifier}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'AUTHORIZED') {
            setIsAuthorized(true);
            localStorage.setItem(cacheKey, 'true');
          } else {
            setIsAuthorized(false);
            localStorage.removeItem(cacheKey);
            // Registrar intento (upsert)
            await fetch('/api/auth/device-status', {
              method: 'POST',
              body: JSON.stringify(currentDeviceInfo)
            }).catch(() => {});
          }
        } else {
          // El servidor falló o retornó error, usar caché local si existe
          const cachedAuth = localStorage.getItem(cacheKey);
          if (cachedAuth === 'true') {
            console.log('⚠️ [DeviceLockGuard] Servidor no disponible, usando autorización en caché.');
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
          }
        }
      } catch (fetchError) {
        console.error('Fetch error checking device status:', fetchError);
        // Si hay error de red/fetch, verificar caché local como respaldo
        const cachedAuth = localStorage.getItem(cacheKey);
        if (cachedAuth === 'true') {
          console.log('🔌 [DeviceLockGuard] Error de conexión, usando autorización en caché.');
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      }
    } catch (error) {
      console.error('Error checking device:', error);
      toast.error('Error al verificar seguridad del dispositivo');
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!otpCode || otpCode.length < 4) {
      toast.error('Ingresa un código válido');
      return;
    }

    setLinking(true);
    try {
      const res = await fetch('/api/auth/link-device', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: deviceInfo?.id,
          otpCode: otpCode
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Dispositivo vinculado correctamente');
        setIsAuthorized(true);
      } else {
        toast.error(data.error || 'Código inválido o expirado');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setLinking(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Verificando seguridad del equipo...
        </p>
      </div>
    );
  }

  // Si no está autorizado, mostrar pantalla de bloqueo
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="flex justify-center mb-6">
            <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20">
              <Lock className="h-12 w-12 text-red-500" />
            </div>
          </div>
          
          <Card className="border-red-500/20 shadow-2xl">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold">Equipo no Vinculado</CardTitle>
              <CardDescription>
                Este dispositivo no ha sido autorizado para acceder al sistema de cobranza.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold">
                  <Smartphone className="h-3 w-3" />
                  Identificador de Hardware
                </div>
                <code className="block text-sm font-mono break-all bg-white p-2 rounded border border-slate-100 text-slate-700">
                  {deviceInfo?.id}
                </code>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="otp">Código de Activación</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="otp"
                      placeholder="Ej: 123456" 
                      className="pl-10 h-12 text-center text-xl tracking-widest font-bold"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      maxLength={8}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Solicita este código a tu administrador
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full h-12 gap-2 bg-slate-900 hover:bg-black text-white" 
                onClick={handleLink}
                disabled={linking || !otpCode}
              >
                {linking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Activar este Dispositivo
              </Button>
            </CardFooter>
          </Card>

          <div className="flex items-center gap-2 justify-center text-slate-500 text-xs py-4">
            <ShieldAlert className="h-3 w-3" />
            Acceso restringido por política de seguridad
          </div>
        </div>
      </div>
    );
  }

  // Si está autorizado, renderizar el contenido normal
  return <>{children}</>;
}
