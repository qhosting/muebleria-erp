
'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DebugSessionPage() {
  const { data: session, status } = useSession() || {};

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Debug de Sesión
          </h1>
          <p className="text-gray-600">
            Información detallada de la sesión actual
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Estado de la Sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>Status:</strong>{' '}
                <Badge variant={
                  status === 'authenticated' ? 'default' : 
                  status === 'loading' ? 'secondary' : 
                  'destructive'
                }>
                  {status}
                </Badge>
              </div>
              
              {status === 'authenticated' && session && (
                <>
                  <div>
                    <strong>User ID:</strong> {(session.user as any)?.id || 'No disponible'}
                  </div>
                  <div>
                    <strong>Name:</strong> {session.user?.name || 'No disponible'}
                  </div>
                  <div>
                    <strong>Email:</strong> {session.user?.email || 'No disponible'}
                  </div>
                  <div>
                    <strong>Role:</strong>{' '}
                    <Badge variant="outline" className="font-bold text-lg">
                      {(session.user as any)?.role || 'No disponible'}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objeto Sesión Completo</CardTitle>
            <CardDescription>
              Información completa de la sesión para debugging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Navegación Permitida según Rol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(session?.user as any)?.role === 'admin' && (
                <div>✅ Acceso completo (Admin): Dashboard, Usuarios, Clientes, Reportes, Configuración</div>
              )}
              {(session?.user as any)?.role === 'gestor_cobranza' && (
                <div>✅ Gestor de Cobranza: Dashboard, Clientes, Reportes, Morosidad</div>
              )}
              {(session?.user as any)?.role === 'reporte_cobranza' && (
                <div>✅ Reportes: Dashboard, Reportes, Morosidad (solo lectura)</div>
              )}
              {(session?.user as any)?.role === 'cobrador' && (
                <div>✅ Cobrador: Dashboard, Cobranza Móvil, Rutas</div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          <Link href="/dashboard">
            <Button>Ir al Dashboard</Button>
          </Link>
          <Link href="/test-auth">
            <Button variant="outline">Probar Otros Usuarios</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
