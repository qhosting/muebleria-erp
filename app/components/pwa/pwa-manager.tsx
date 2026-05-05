
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // 1. Detección de Actualizaciones
    navigator.serviceWorker.ready.then((registration) => {
      setSwRegistration(registration);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              toast('Nueva versión disponible', {
                description: 'La aplicación se ha actualizado. Pulsa para recargar.',
                action: {
                  label: 'Actualizar',
                  onClick: () => window.location.reload()
                },
                duration: Infinity,
              });
            }
          });
        }
      });
    });

    // 2. Auto-recargar si el SW cambia
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // 3. Verificación de Versión vía API (para APK y PWA persistente)
    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          const serverVersion = data.version;
          const localVersion = localStorage.getItem('vertex_app_version');

          if (localVersion && localVersion !== serverVersion) {
            console.log(`🔄 Nueva versión detectada: ${localVersion} -> ${serverVersion}`);
            localStorage.setItem('vertex_app_version', serverVersion);
            
            toast('Actualización obligatoria', {
              description: 'Se han aplicado cambios importantes en el servidor.',
              action: {
                label: 'Actualizar Ahora',
                onClick: () => window.location.reload()
              },
              duration: 5000,
            });

            setTimeout(() => {
              window.location.reload();
            }, 6000);
          } else if (!localVersion) {
            localStorage.setItem('vertex_app_version', serverVersion);
          }
        }
      } catch (error) {
        console.warn("No se pudo verificar la versión:", error);
      }
    };

    // Verificar al iniciar y cada 5 minutos
    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    // 🚀 FORZAR ACTUALIZACIÓN: Verificar cuando el usuario vuelve a la app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
        // Forzar al navegador a buscar un nuevo SW
        navigator.serviceWorker.ready.then(reg => reg.update());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Solicitar permiso de notificaciones
    const checkNotificationPermission = async () => {
      if (!('Notification' in window)) return;
      
      if (Notification.permission === 'granted') {
        subscribeToPush();
      }
    };

    checkNotificationPermission();
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Intentar obtener suscripción existente
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // En un entorno real, usarías process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        // Si no existe, no podemos suscribir.
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BP6OyWqzh5Ah3ovavEBnz4Mz47WGowP6TJPdE3mO72Hd1LbRgzpj6oZvhk9X5On1Yvxia_MwLVb-BzL0_J8nCAc';
        
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });
        } catch (err) {
          console.warn('Error al suscribir a push (posiblemente falta VAPID key real):', err);
          return;
        }
      }

      // Enviar suscripción al backend
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      
    } catch (error) {
      console.error('Error en suscripción PWA:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-bounce">
      <Button 
        onClick={() => window.location.reload()}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-2xl rounded-full px-6 flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Actualización lista
      </Button>
    </div>
  );
}
