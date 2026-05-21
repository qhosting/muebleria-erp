import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';

export function usePlatform() {
  const [platformState, setPlatformState] = useState({
    isNative: false,
    isAndroid: false,
    isIOS: false,
    isWeb: true,
    platform: 'web',
    isCobrador: false,
    isPWA: false,
    isMobileBrowser: false,
    isMobileMode: false
  });

  useEffect(() => {
    // Verificar si estamos en el cliente
    if (typeof window !== 'undefined') {
      const platform = Capacitor.getPlatform();
      const isNative = Capacitor.isNativePlatform();
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent) || window.innerWidth < 768;
      const isMobileMode = isNative || isPWA || isMobileBrowser;
      
      setPlatformState({
        isNative,
        isAndroid: platform === 'android',
        isIOS: platform === 'ios',
        isWeb: platform === 'web',
        platform,
        isPWA,
        isMobileBrowser,
        isMobileMode,
        // Detectar si estamos en la app específica de cobrador
        isCobrador: (isNative || isMobileMode) && (
          // Por variable de entorno o path
          process.env.NEXT_PUBLIC_APP_MODE === 'cobrador' || 
          window.location.pathname.includes('cobrador')
        )
      });
    }
  }, []);
  
  return platformState;
}

export function isMobileEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const isNative = Capacitor.isNativePlatform();
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent) || window.innerWidth < 768;
  return isNative || isPWA || isMobileBrowser;
}

export function isPlatform(platformName: 'android' | 'ios' | 'web'): boolean {
  if (typeof window === 'undefined') return platformName === 'web';
  return Capacitor.getPlatform() === platformName;
}

export function isCobradorNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform() && process.env.NEXT_PUBLIC_APP_MODE === 'cobrador';
}
