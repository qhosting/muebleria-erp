'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');
  const [isSafari, setIsSafari] = useState(true);

  useEffect(() => {
    // Detectar plataforma y navegador
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    // En iOS, solo Safari permite instalar PWAs correctamente
    const isSafariBrowser = isIOS && /safari/.test(userAgent) && !/crios|fxios|optios|edgios/.test(userAgent);
    
    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    
    setIsSafari(isSafariBrowser);

    // Verificar si ya está instalado
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                       || (window.navigator as any).standalone === true;
    
    if (isStandalone) {
        console.log('App is already in standalone mode');
        return;
    }

    const hasBeenDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (hasBeenDismissed) {
      const dismissDate = parseInt(hasBeenDismissed);
      // Mostrar de nuevo solo después de 14 días si fue rechazado
      if (Date.now() - dismissDate < 14 * 24 * 60 * 60 * 1000) return;
    }

    // Manejador para Android/Chrome
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostrar el prompt después de 3 segundos
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Para iOS, mostramos el prompt manualmente después de un tiempo
    if (isIOS) {
      setTimeout(() => setShowPrompt(true), 4000);
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
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/20 dark:border-slate-800 p-5 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start space-x-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-3 shadow-lg shadow-blue-500/20">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">Instalar VertexERP</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                Accede más rápido y trabaja sin internet. ¡Añádela a tu pantalla de inicio!
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col space-y-3">
            {platform === 'ios' ? (
              !isSafari ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800/30">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Compass className="w-4 h-4" /> Abrir en Safari para instalar
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300/70 mt-1">
                    Copia la URL y ábrela en el navegador Safari de tu iPhone.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                  <div className="space-y-3 text-sm text-slate-800 dark:text-slate-200">
                    <p className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold">1</span>
                      <span>Toca el icono <Share className="w-4 h-4 mx-1 inline text-blue-500" /> "Compartir"</span>
                    </p>
                    <p className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold">2</span>
                      <span>Busca <PlusSquare className="w-4 h-4 mx-1 inline text-slate-700 dark:text-slate-200" /> "Añadir a pantalla de inicio"</span>
                    </p>
                  </div>
                </div>
              )
            ) : (
              <Button 
                onClick={handleInstallClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                Instalar ahora
              </Button>
            )}
            
            <button 
              onClick={handleDismiss}
              className="text-center text-slate-400 dark:text-slate-500 text-xs font-medium hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              Quizás más tarde
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
