
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

    // 3. Solicitar permiso de notificaciones de forma sutil
    const checkNotificationPermission = async () => {
      if (!('Notification' in window)) return;
      
      if (Notification.permission === 'default') {
        // No molestamos inmediatamente, esperamos a que el usuario interactúe
      } else if (Notification.permission === 'granted') {
        subscribeToPush();
      }
    };

    checkNotificationPermission();
  }, []);

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Intentar obtener suscripción existente
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // En un entorno real, usarías process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        // Si no existe, no podemos suscribir.
        const vapidPublicKey = 'BEl62i4nZSk9zjP_96S1x-N2p-4wYc_487F0X43hC9vJ5V-GRoA5S_R7Z5_89523'; // Placeholder
        
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
