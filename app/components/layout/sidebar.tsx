
'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { VersionInfo } from '@/components/version-info';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  CreditCard,
  Route,
  Receipt,
  AlertTriangle,
  Upload,
  Printer,
  Package,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  session?: any;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'gestor_cobranza', 'reporte_cobranza', 'cobrador'],
  },
  {
    name: 'Clientes',
    href: '/dashboard/clientes',
    icon: Users,
    roles: ['admin', 'gestor_cobranza'],
  },
  {
    name: 'Usuarios',
    href: '/dashboard/usuarios',
    icon: UserCheck,
    roles: ['admin'],
  },
  {
    name: 'Importar Saldos',
    href: '/dashboard/saldos',
    icon: Upload,
    roles: ['admin'], // Solo admin
  },
  {
    name: 'Cobranza Móvil',
    href: '/dashboard/cobranza',
    icon: CreditCard,
    roles: ['cobrador'],
  },
  {
    name: 'Mi Impresora',
    href: '/dashboard/mi-impresora',
    icon: Printer,
    roles: ['cobrador'],
  },
  {
    name: 'Pagos',
    href: '/dashboard/pagos',
    icon: Receipt,
    roles: ['admin', 'gestor_cobranza', 'reporte_cobranza'],
  },
  {
    name: 'Inventario',
    href: '/dashboard/inventario',
    icon: Package,
    roles: ['admin', 'gestor_cobranza'],
  },
  {
    name: 'Reportes',
    href: '/dashboard/reportes',
    icon: BarChart3,
    roles: ['admin', 'gestor_cobranza', 'reporte_cobranza'],
  },
  {
    name: 'Morosidad',
    href: '/dashboard/morosidad',
    icon: AlertTriangle,
    roles: ['admin', 'gestor_cobranza', 'reporte_cobranza'],
  },
  {
    name: 'Rutas',
    href: '/dashboard/rutas',
    icon: Route,
    roles: ['admin', 'gestor_cobranza', 'cobrador'],
  },
  {
    name: 'Plantillas',
    href: '/dashboard/plantillas',
    icon: FileText,
    roles: ['admin', 'gestor_cobranza'],
  },
  {
    name: 'Configuración',
    href: '/dashboard/configuracion',
    icon: Settings,
    roles: ['admin'],
  },
];

export function Sidebar({ className, session }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const userRole = (session?.user as any)?.role;

  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(userRole)
  );

  const handleSignOut = () => {
    // Solo limpiar credenciales si el usuario no eligió recordarlas
    const rememberMe = localStorage.getItem('remember_me') === 'true';
    if (!rememberMe) {
      localStorage.removeItem('remembered_email');
      localStorage.removeItem('remembered_password');
      localStorage.removeItem('remember_me');
    }

    signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white shadow-md"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        "lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        className
      )}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-semibold text-gray-900 text-sm">
                  Mueblería La Económica
                </h1>
                <p className="text-xs text-gray-500">Sistema de Cobranza</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex h-8 w-8"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info and logout */}
        <div className="border-t border-gray-200 p-4">
          {!isCollapsed && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900">
                {session?.user?.name}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {userRole === 'admin' && 'Administrador'}
                {userRole === 'gestor_cobranza' && 'Gestor de Cobranza'}
                {userRole === 'reporte_cobranza' && 'Reportes'}
                {userRole === 'cobrador' && 'Cobrador'}
              </p>
              {/* Version Info */}
              <div className="flex justify-center">
                <VersionInfo showButton={true} />
              </div>
            </div>
          )}
          <Button
            variant="outline"
            size={isCollapsed ? "icon" : "sm"}
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
            {!isCollapsed && "Cerrar Sesión"}
          </Button>
        </div>
      </div>
    </>
  );
}
