
// Hook personalizado para manejo de estado de conectividad - OPTIMIZADO PARA MÓVILES
'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const lastToastRef = useRef<number>(0); // Para evitar spam de toasts

  useEffect(() => {
    // Establecer estado inicial (solo en el cliente)
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      
      // 🚀 OPTIMIZACIÓN: Evitar spam de toasts con throttling
      const now = Date.now();
      if (wasOffline && now - lastToastRef.current > 5000) { // Mínimo 5 segundos entre toasts
        toast.success('Conexión restaurada', {
          description: 'Los datos se sincronizarán automáticamente',
          duration: 2000 // Reducir duración para menos distracción
        });
        lastToastRef.current = now;
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      
      // 🚀 OPTIMIZACIÓN: Toast menos agresivo para modo offline
      const now = Date.now();
      if (now - lastToastRef.current > 5000) {
        toast.info('Trabajando offline', {
          description: 'Los datos se guardarán localmente',
          duration: 2000 // Reducir duración
        });
        lastToastRef.current = now;
      }
    };

    // Event listeners (solo en el cliente)
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [wasOffline]); // Mantener dependencia para que funcione correctamente

  return { isOnline, wasOffline };
}
