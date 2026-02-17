'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [installMethod, setInstallMethod] = useState<'native' | 'manual'>('native');

  useEffect(() => {
    // Verificar si ya está instalado
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
      || document.referrer.includes('android-app://')
      || Capacitor.isNativePlatform();

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    console.log('[PWA Install] Detection:', {
      isStandalone,
      isAndroid,
      isMobile,
      userAgent: navigator.userAgent
    });

    // Si ya está instalado, no mostrar botón
    if (isStandalone) {
      console.log('✅ [PWA] App ya instalada - ocultando botón');
      setShowInstallButton(false);
      return;
    }

    // Listener para el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('✅ [PWA] Evento beforeinstallprompt detectado');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
      setInstallMethod('native');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Timeout para fallback a método manual
    const fallbackTimeout = setTimeout(() => {
      // Si es nativo, nunca mostrar fallback
      if (Capacitor.isNativePlatform()) return;

      if (!deferredPrompt && (isAndroid || isMobile) && !isStandalone) {
        console.log('⚠️ [PWA] beforeinstallprompt no detectado, usando método manual');
        setShowInstallButton(true);
        setInstallMethod('manual');
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(fallbackTimeout);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    console.log('[PWA] Intento de instalación:', {
      hasDeferredPrompt: !!deferredPrompt,
      installMethod
    });

    if (deferredPrompt && installMethod === 'native') {
      try {
        console.log('🚀 [PWA] Mostrando prompt nativo...');
        await deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log('✅ [PWA] Resultado:', outcome);

        if (outcome === 'accepted') {
          toast.success('¡Aplicación instalada correctamente!');
        }

        setDeferredPrompt(null);
        setShowInstallButton(false);
      } catch (error) {
        console.error('❌ [PWA] Error en instalación nativa:', error);
        setInstallMethod('manual');
        showManualInstructions();
      }
    } else {
      showManualInstructions();
    }
  };

  const showManualInstructions = () => {
    console.log('📱 [PWA] Mostrando instrucciones manuales');

    const isChrome = /Chrome/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    let message = 'Para instalar la aplicación:\n\n';

    if (isAndroid && isChrome) {
      message += '1. Toca el menú (⋮) en la esquina superior derecha\n';
      message += '2. Busca la opción "Agregar a pantalla de inicio" o "Instalar app"\n';
      message += '3. Toca "Agregar" o "Instalar" para confirmar\n\n';
      message += '💡 Si no ves la opción, asegúrate de:\n';
      message += '   • Estar usando la última versión de Chrome\n';
      message += '   • Tener conexión HTTPS activa\n';
      message += '   • No haber rechazado la instalación previamente';
    } else {
      message += '1. Toca el menú del navegador (⋮ o ⋯)\n';
      message += '2. Selecciona "Agregar a pantalla de inicio"\n';
      message += '3. Confirma la instalación';
    }

    alert(message);
  };

  if (!showInstallButton) {
    return null;
  }

  return (
    <Button
      onClick={handleInstallClick}
      variant="default"
      size="sm"
      className="bg-green-600 hover:bg-green-700 text-white shadow-lg w-full"
    >
      <Download className="mr-2 h-4 w-4" />
      Instalar Aplicación
    </Button>
  );
}
