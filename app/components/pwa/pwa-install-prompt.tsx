'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');

  useEffect(() => {
    // Detectar plataforma
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    }

    // Verificar si ya está instalado o si ya se mostró
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                       || (window.navigator as any).standalone 
                       || document.referrer.includes('android-app://');
    
    if (isStandalone) return;

    const hasBeenDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (hasBeenDismissed) {
      // Si fue rechazado hace más de 7 días, volver a mostrar
      const dismissDate = parseInt(hasBeenDismissed);
      if (Date.now() - dismissDate < 7 * 24 * 60 * 60 * 1000) return;
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostrar el prompt después de 5 segundos de navegación
      setTimeout(() => setShowPrompt(true), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Para iOS, no hay evento, mostramos después de un tiempo
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setTimeout(() => setShowPrompt(true), 8000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      localStorage.setItem('pwa-installed', 'true');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-4 right-4 z-[9998] md:left-auto md:right-6 md:w-96"
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 overflow-hidden relative">
          <button 
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start space-x-4">
            <div className="bg-blue-600 rounded-xl p-3 shadow-lg shadow-blue-200 dark:shadow-none">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">VertexERP Muebles</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                Instala nuestra app para una mejor experiencia, acceso rápido y uso sin internet.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col space-y-3">
            {platform === 'ios' ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 flex items-center flex-wrap">
                  Para instalar en tu iPhone: <br />
                  1. Pulsa el botón <Share className="w-4 h-4 mx-1 inline text-blue-500" /> "Compartir" <br />
                  2. Selecciona <PlusSquare className="w-4 h-4 mx-1 inline text-slate-700 dark:text-slate-300" /> "Añadir a pantalla de inicio"
                </p>
              </div>
            ) : (
              <Button 
                onClick={handleInstallClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none"
              >
                Instalar Ahora
              </Button>
            )}
            
            <button 
              onClick={handleDismiss}
              className="text-center text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              Quizás más tarde
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
