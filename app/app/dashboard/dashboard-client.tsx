
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { VersionInfo } from '@/components/version-info';

interface DashboardStats {
  totalClientes: number;
  clientesActivos: number;
  totalCobradores: number;
  cobranzaHoy: number;
  cobranzaMes: number;
  clientesMorosos: number;
  saldosTotales: number;
}

interface DashboardClientProps {
  session: any;
}

export function DashboardClient({ session: initialSession }: DashboardClientProps) {
  const { data: clientSession } = useSession();
  const session = initialSession || clientSession;
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const hasRedirected = useRef(false);

  const userRole = session?.user?.role;

  // 🚀 FIX: Redirección única sin loops usando useRef
  useEffect(() => {
    if (!userRole || hasRedirected.current) return;

    // Detectar modo móvil/PWA en el cliente
    const isPWA = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true
    );
    const isMobileBrowser = typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent) ||
      window.innerWidth < 768
    );
    const isMobileMode = isPWA || isMobileBrowser;

    if (isMobileMode && ['cobrador', 'vendedor', 'jefe_ventas', 'admin', 'direccion'].includes(userRole)) {
      hasRedirected.current = true;
      router.replace('/mobile/home');
      return;
    }

    const roleRedirects: Record<string, string> = {
      'gestor_cobranza': '/dashboard/clientes',
      'reporte_cobranza': '/dashboard/reportes',
      'cobrador': '/cobrador-app'
    };

    const redirectPath = roleRedirects[userRole];

    if (redirectPath) {
      hasRedirected.current = true;
      router.replace(redirectPath);
    }
  }, [userRole, router]);

  // 🚀 Cargar estadísticas solo para roles con permisos
  useEffect(() => {
    if (['admin', 'gestor_cobranza', 'reporte_cobranza', 'direccion'].includes(userRole)) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('Error al obtener estadísticas');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, description, icon: Icon, color = 'blue' }: {
    title: string;
    value: string | number;
    description?: string;
    icon: any;
    color?: string;
  }) => (
    <Card className="animate-fade-in hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const welcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {welcomeMessage()}, {session?.user?.name}
            </h1>
            <p className="text-gray-600 mt-1">
              {userRole === 'admin' && 'Panel de Administración'}
              {userRole === 'gestor_cobranza' && 'Panel de Gestión de Cobranza'}
              {userRole === 'reporte_cobranza' && 'Panel de Reportes'}
              {userRole === 'cobrador' && 'Panel de Cobranza'}
              {userRole === 'direccion' && 'Panel de Dirección General'}
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date().toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </Badge>
          </div>
        </div>


        {/* Stats Grid - Solo para roles con permisos */}
        {stats && userRole !== 'cobrador' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Clientes"
              value={stats.totalClientes}
              description="Clientes registrados"
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Clientes Activos"
              value={stats.clientesActivos}
              description="Con cuentas activas"
              icon={Users}
              color="green"
            />
            <StatCard
              title="Cobradores Activos"
              value={stats.totalCobradores}
              description="En el sistema"
              icon={Users}
              color="purple"
            />

            <StatCard
              title="Cobranza Hoy"
              value={formatCurrency(stats.cobranzaHoy)}
              description="Pagos del día"
              icon={DollarSign}
              color="green"
            />

            <StatCard
              title="Cobranza del Mes"
              value={formatCurrency(stats.cobranzaMes)}
              description="Pagos mensuales"
              icon={TrendingUp}
              color="blue"
            />

            <StatCard
              title="Clientes Morosos"
              value={stats.clientesMorosos}
              description="Con saldos pendientes"
              icon={AlertTriangle}
              color="red"
            />

            <StatCard
              title="Saldos Totales"
              value={formatCurrency(stats.saldosTotales)}
              description="Por cobrar"
              icon={CreditCard}
              color="orange"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userRole === 'cobrador' && (
            <Card 
              onClick={() => router.push('/mobile/home')}
              className="animate-fade-in hover:shadow-md transition-all hover:border-blue-400 cursor-pointer group"
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 group-hover:text-blue-600 transition-colors">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span>Cobranza del Día</span>
                </CardTitle>
                <CardDescription>
                  Acceder a la interfaz de cobranza móvil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Registra pagos y gestiona tu ruta de cobranza
                </p>
              </CardContent>
            </Card>
          )}

          {(userRole === 'admin' || userRole === 'gestor_cobranza') && (
            <>
              <Card 
                onClick={() => router.push('/dashboard/clientes')}
                className="animate-fade-in hover:shadow-md transition-all hover:border-green-400 cursor-pointer group"
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 group-hover:text-green-600 transition-colors">
                    <Users className="h-5 w-5 text-green-600" />
                    <span>Gestionar Clientes</span>
                  </CardTitle>
                  <CardDescription>
                    Administrar información de clientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Crear, editar y asignar clientes a cobradores
                  </p>
                </CardContent>
              </Card>

              <Card 
                onClick={() => router.push('/dashboard/reportes')}
                className="animate-fade-in hover:shadow-md transition-all hover:border-purple-400 cursor-pointer group"
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 group-hover:text-purple-600 transition-colors">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <span>Ver Reportes</span>
                  </CardTitle>
                  <CardDescription>
                    Análisis de productividad y cobranza
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Reportes de cobranza, morosidad y rutas
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {(userRole === 'admin' || userRole === 'gestor_cobranza' || userRole === 'reporte_cobranza' || userRole === 'direccion') && (
            <Card 
              onClick={() => router.push('/dashboard/morosidad')}
              className="animate-fade-in hover:shadow-md transition-all hover:border-red-400 cursor-pointer group"
            >
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 group-hover:text-red-600 transition-colors">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span>Morosidad</span>
                </CardTitle>
                <CardDescription>
                  Seguimiento de cuentas morosas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {stats?.clientesMorosos || 0} clientes con pagos pendientes
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
