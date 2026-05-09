
// Página principal de cobranza móvil PWA - VERSIÓN OPTIMIZADA SIN BUCLES
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CobranzaMobile from '@/components/mobile/cobranza-mobile';
import { OfflineCliente, db } from '@/lib/offline-db';
import { getFullPath } from '@/lib/api-config';

export default function CobranzaMobilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [initialClientes, setInitialClientes] = useState<OfflineCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const authCheckedRef = useRef(false);
  const dataLoadedRef = useRef(false);

  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  // 🚀 OPTIMIZACIÓN CRÍTICA: Un solo useEffect para autenticación sin bucles
  useEffect(() => {
    if (status === 'loading') return;
    if (authCheckedRef.current) return; // Evitar múltiples verificaciones

    authCheckedRef.current = true;

    // Verificar autenticación sin redirect múltiple
    if (!session) {
      router.replace('/login');
      return;
    }

    if (userRole !== 'cobrador') {
      router.replace('/dashboard');
      return;
    }

    // Solo cargar datos una vez
    if (!dataLoadedRef.current && userId) {
      loadInitialData();
      dataLoadedRef.current = true;
    } else {
      setLoading(false);
    }
  }, [status, session, userRole, userId, router]);

  const loadInitialData = async () => {
    try {
      const currentUserId = userId || localStorage.getItem('last_cobrador_id');
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      // 1. Intentar cargar desde IndexedDB primero (siempre, para velocidad)
      try {
        const offlineClientes = await db.clientes
          .where('cobradorAsignadoId')
          .equals(currentUserId)
          .and((cliente: OfflineCliente) => cliente.statusCuenta === 'activo')
          .toArray();
        
        if (offlineClientes.length > 0) {
          setInitialClientes(offlineClientes);
        }
      } catch (dbError) {
        console.error('Error loading from IndexedDB:', dbError);
      }

      // 2. Si hay conexión, intentar sincronizar con el servidor
      if (typeof window !== 'undefined' && navigator.onLine) {
        const response = await fetch(getFullPath(`/api/sync/clientes/${currentUserId}?full=true`), {
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (response.ok) {
          const clientes = await response.json();
          if (Array.isArray(clientes)) {
            setInitialClientes(clientes);
            // El componente CobranzaMobile se encargará de guardarlos en DB
          }
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Estados de carga simplificados con mejores condiciones
  if (status === 'loading' || !authCheckedRef.current) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!session || userRole !== 'cobrador') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return <CobranzaMobile initialClientes={initialClientes} />;
}
