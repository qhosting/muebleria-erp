
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VertexERP Muebles - Sistema de Cobranza',
  description: 'Sistema integral de gestión de clientes y cobranza en campo',
  manifest: '/manifest.json',
};

// 🚀 OPTIMIZACIÓN MÓVIL: Viewport optimizado para mejor rendimiento
export const viewport = {
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
      <head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        
        {/* PWA - Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icon-512x512.png" sizes="512x512" />
        
        {/* PWA - Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* PWA - Mobile Web App Capable */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="VertexERP Muebles" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* PWA - Theme Color */}
        <meta name="theme-color" content="#0F172A" />
        <meta name="msapplication-TileColor" content="#0F172A" />
        <meta name="msapplication-navbutton-color" content="#0F172A" />
        
        {/* PWA - Icons for other platforms */}
        <meta name="msapplication-TileImage" content="/icon-192x192.png" />
        
        {/* PWA - Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('✅ Service Worker registrado:', registration.scope);
                      
                      // Detectar cuando se instala
                      window.addEventListener('appinstalled', () => {
                        console.log('✅ PWA instalada exitosamente');
                      });
                    })
                    .catch(function(err) {
                      console.error('❌ Error al registrar Service Worker:', err);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
