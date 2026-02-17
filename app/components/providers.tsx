
'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { getFullPath } from '@/lib/api-config';

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
