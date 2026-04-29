
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';
import { PWAInstallPrompt } from '@/components/pwa/pwa-install-prompt';
import { PWAManager } from '@/components/pwa/pwa-manager';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VertexERP Muebles - Sistema de Cobranza',
  description: 'Sistema integral de gestión de clientes y cobranza en campo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'VertexERP',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/favicon.ico',
    apple: [
      { url: '/icon-192x192.png' },
      { url: '/icon-192x192.png', sizes: '152x152' },
      { url: '/icon-192x192.png', sizes: '180x180' },
      { url: '/icon-192x192.png', sizes: '167x167' },
    ],
  },
};

// 🚀 OPTIMIZACIÓN MÓVIL: Viewport optimizado para mejor rendimiento
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Permitir zoom para accesibilidad
  userScalable: true, // Permitir zoom para accesibilidad
  themeColor: '#0F172A',
  viewportFit: 'cover', // Optimización para pantallas con notch
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('✅ Service Worker registrado:', registration.scope);
                    })
                    .catch(function(err) {
                      console.error('❌ Error al registrar Service Worker:', err);
                    });
                });
              }
            `,
          }}
        />
        <Providers>
          <OfflineIndicator />
          <PWAInstallPrompt />
          <PWAManager />
          {children}
        </Providers>
      </body>
    </html>
  );
}
