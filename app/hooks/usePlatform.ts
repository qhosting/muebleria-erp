import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';

export function usePlatform() {
  const [platformState, setPlatformState] = useState({
    isNative: false,
    isAndroid: false,
    isIOS: false,
    isWeb: true,
    platform: 'web',
    isCobrador: false
  });

  useEffect(() => {
    // Verificar si estamos en el cliente
    if (typeof window !== 'undefined') {
      const platform = Capacitor.getPlatform();
      const isNative = Capacitor.isNativePlatform();
      
      setPlatformState({
        isNative,
        isAndroid: platform === 'android',
        isIOS: platform === 'ios',
        isWeb: platform === 'web',
        platform,
        // Detectar si estamos en la app específica de cobrador
        isCobrador: isNative && (
          // Por variable de entorno o path
          process.env.NEXT_PUBLIC_APP_MODE === 'cobrador' || 
          window.location.pathname.includes('cobrador')
        )
      });
    }
  }, []);
  
  return platformState;
}

export function isPlatform(platformName: 'android' | 'ios' | 'web'): boolean {
  if (typeof window === 'undefined') return platformName === 'web';
  return Capacitor.getPlatform() === platformName;
}

export function isCobradorNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform() && process.env.NEXT_PUBLIC_APP_MODE === 'cobrador';
}
