
'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Eye, Truck, Users, CheckCircle, XCircle } from 'lucide-react';

const testUsers = [
  {
    email: 'admin@muebleria.com',
    password: 'admin123',
    role: 'admin',
    name: 'Administrador Sistema',
    icon: Shield,
    color: 'bg-red-500',
    description: 'Acceso completo al sistema'
  },
  {
    email: 'gestor@muebleria.com',
    password: 'gestor123', 
    role: 'gestor_cobranza',
    name: 'María González',
    icon: Users,
    color: 'bg-blue-500',
    description: 'Gestión de cobranza y clientes'
  },
  {
    email: 'reportes@muebleria.com',
    password: 'reportes123',
    role: 'reporte_cobranza', 
    name: 'Carlos Méndez',
    icon: Eye,
    color: 'bg-green-500',
    description: 'Solo lectura y reportes'
  },
  {
    email: 'cobrador1@muebleria.com',
    password: 'cobrador123',
    role: 'cobrador',
    name: 'Juan Pérez',
    icon: Truck,
    color: 'bg-purple-500',
    description: 'Cobranza móvil'
  },
  {
    email: 'cobrador2@muebleria.com', 
    password: 'cobrador123',
    role: 'cobrador',
    name: 'Ana Rodríguez',
    icon: Truck,
    color: 'bg-orange-500',
    description: 'Cobranza móvil'
  },
  {
    email: 'john@doe.com',
    password: 'johndoe123',
    role: 'admin',
    name: 'John Doe',
    icon: User,
    color: 'bg-gray-500',
    description: 'Usuario de prueba (Admin)'
  }
];

export default function TestAuthPage() {
  const { data: session } = useSession() || {};
  const [loading, setLoading] = useState<string | null>(null);
  const [loginResults, setLoginResults] = useState<{[key: string]: {success: boolean, message: string}}>({});

  const handleLogin = async (user: typeof testUsers[0]) => {
    setLoading(user.email);
    
    try {
      const result = await signIn('credentials', {
        email: user.email,
        password: user.password,
        redirect: false,
      });

      const success = !result?.error;
      setLoginResults(prev => ({
        ...prev,
        [user.email]: {
          success,
          message: success ? 'Login exitoso' : result?.error || 'Error desconocido'
        }
      }));

      if (success) {
        // Recargar la página para mostrar la nueva sesión
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      setLoginResults(prev => ({
        ...prev,
        [user.email]: {
          success: false,
          message: 'Error de conexión'
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const getResult = (email: string) => loginResults[email];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🔐 Prueba de Autenticación
          </h1>
          <p className="text-blue-200">
            Haz clic en cualquier usuario para probar el login con sus credenciales
          </p>
        </div>

        {/* Sesión actual */}
        {session && (
          <Card className="mb-6 border-green-500 border-2">
            <CardHeader>
              <CardTitle className="text-green-700 flex items-center space-x-2">
                <CheckCircle className="h-5 w-5" />
                <span>Sesión Activa</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <strong>Usuario:</strong> {(session.user as any)?.name}
                </div>
                <div>
                  <strong>Email:</strong> {session.user?.email}
                </div>
                <div>
                  <strong>Rol:</strong>{' '}
                  <Badge variant="outline" className="font-bold">
                    {(session.user as any)?.role}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grid de usuarios para probar */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {testUsers.map((user) => {
            const IconComponent = user.icon;
            const result = getResult(user.email);
            const isLoading = loading === user.email;
            
            return (
              <Card key={user.email} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${user.color} text-white`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm">{user.name}</div>
                      <Badge variant="secondary" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {user.description}
                  </p>
                  
                  <div className="text-xs space-y-1">
                    <div><strong>Email:</strong> {user.email}</div>
                    <div><strong>Password:</strong> {user.password}</div>
                  </div>

                  {result && (
                    <div className={`flex items-center space-x-2 text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                      {result.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span>{result.message}</span>
                    </div>
                  )}

                  <Button 
                    onClick={() => handleLogin(user)}
                    disabled={isLoading}
                    className="w-full"
                    variant={session?.user?.email === user.email ? "default" : "outline"}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Probando...
                      </>
                    ) : (
                      <>
                        {session?.user?.email === user.email ? '✅ Sesión Activa' : 'Probar Login'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Instrucciones */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">📝 Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 space-y-2">
            <p>1. <strong>Haz clic</strong> en "Probar Login" para cualquier usuario</p>
            <p>2. <strong>Observa</strong> si el login es exitoso y qué rol se asigna</p>
            <p>3. <strong>Ve al Dashboard</strong> para verificar que se muestren las opciones correctas para cada rol</p>
            <p>4. <strong>Cierra sesión</strong> y prueba con otro usuario</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
