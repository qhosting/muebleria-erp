
'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { getFullPath } from '@/lib/api-config';

// 🔌 Interceptor de Red para NextAuth Offline
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    let url = '';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else if (input && typeof input === 'object' && 'url' in input) {
      url = (input as any).url;
    }

    // Interceptar llamadas de sesión de NextAuth
    if (url.includes('/api/auth/session')) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      
      if (isOffline) {
        const cached = localStorage.getItem('offline_nextauth_session');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            // Extender expiración de la sesión para evitar que NextAuth la considere expirada en el cliente
            parsed.expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
            
            console.log('🔌 [NextAuth Offline] Retornando sesión simulada (expiración extendida) desde caché local.');
            return new Response(JSON.stringify(parsed), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          } catch (e) {
            console.error('[NextAuth Offline] Error al parsear sesión en caché:', e);
          }
        }
      }

      // Intentar llamada de red real
      try {
        const response = await originalFetch(input, init);
        if (response.ok) {
          try {
            const clone = response.clone();
            const data = await clone.json();
            if (data && typeof data === 'object' && Object.keys(data).length > 0 && data.user) {
              localStorage.setItem('offline_nextauth_session', JSON.stringify(data));
              // También guardamos campos auxiliares en localStorage para compatibilidad
              if (data.user.role) localStorage.setItem('last_cobrador_role', data.user.role);
              if (data.user.id) localStorage.setItem('last_cobrador_id', data.user.id);
              if (data.user.name) localStorage.setItem('last_cobrador_name', data.user.name);
              if (data.user.email) localStorage.setItem('last_cobrador_email', data.user.email);
            }
          } catch (e) {
            console.error('[NextAuth Offline] Error al cachear sesión exitosa:', e);
          }
        }
        return response;
      } catch (error) {
        console.warn('[NextAuth Offline] Error de red en fetch de sesión, intentando caché local:', error);
        const cached = localStorage.getItem('offline_nextauth_session');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            parsed.expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
            return new Response(JSON.stringify(parsed), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          } catch (e) {
            console.error('[NextAuth Offline] Error al parsear sesión en caché post-fallo:', e);
          }
        }
        throw error;
      }
    }

    // Interceptar llamadas de signout de NextAuth para limpiar la sesión en caché
    if (url.includes('/api/auth/signout')) {
      console.log('🔌 [NextAuth Offline] Detectada llamada de cierre de sesión, limpiando caché local.');
      localStorage.removeItem('offline_nextauth_session');
      localStorage.removeItem('last_cobrador_role');
      localStorage.removeItem('last_cobrador_id');
      localStorage.removeItem('last_cobrador_name');
      localStorage.removeItem('last_cobrador_email');
    }

    return originalFetch(input, init);
  };
}

export function Providers({
  children
}: {
  children: React.ReactNode;
}) {
  // En nativo, necesitamos decirle a NextAuth dónde está el servidor
  const authBasePath = getFullPath('/api/auth');

  return (
    <SessionProvider basePath={authBasePath}>
      {children}
      <Toaster position="top-right" richColors />
    </SessionProvider>
  );
}

