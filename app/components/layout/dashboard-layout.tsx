
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from './sidebar';
import { BusquedaGlobal } from '@/components/busqueda-global';
import { cn } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Activar atajos de teclado
  useKeyboardShortcuts();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar session={session} />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header con búsqueda global */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex-1 max-w-2xl">
              <BusquedaGlobal />
            </div>
            <div className="ml-4 text-sm text-muted-foreground hidden md:block">
              Usa <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 border border-gray-300 rounded">Ctrl+K</kbd> para buscar
            </div>
          </div>
        </header>
        
        <main className={cn("flex-1 p-4 lg:p-8", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
