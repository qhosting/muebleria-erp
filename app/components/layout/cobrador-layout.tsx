'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlatform } from '@/hooks/usePlatform';
import { Home, Users, DollarSign, User, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
// import { SyncIndicator } from '@/components/sync-indicator'; // TODO: Crear este componente después
// import { NetworkStatus } from '@/components/network-status'; // TODO: o este

interface CobradorLayoutProps {
    children: ReactNode;
}

export function CobradorLayout({ children }: CobradorLayoutProps) {
    const { isNative } = usePlatform();
    const pathname = usePathname();

    // Simulación de estado de red (luego conectaremos el hook real)
    const isOnline = true;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Header simplificado */}
            <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-md">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-white text-xs">V</span>
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Cobrador</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant={isOnline ? undefined : 'destructive'} className="h-6 px-1.5 text-[10px] uppercase gap-1">
                            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {isOnline ? "Online" : "Offline"}
                        </Badge>
                    </div>
                </div>
            </header>

            {/* Contenido con padding para el nav inferior */}
            <main className="flex-1 pb-20 overflow-y-auto">
                <div className="p-4">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 pb-safe">
                <div className="grid grid-cols-4 h-16">
                    <NavButton
                        href="/mobile/home"
                        icon={Home}
                        label="Inicio"
                        isActive={pathname === '/mobile/home'}
                    />
                    <NavButton
                        href="/mobile/clientes"
                        icon={Users}
                        label="Clientes"
                        isActive={pathname.includes('/mobile/clientes')}
                    />
                    <NavButton
                        href="/mobile/caja"
                        icon={DollarSign}
                        label="Caja"
                        isActive={pathname.includes('/mobile/caja')}
                    />
                    <NavButton
                        href="/mobile/perfil"
                        icon={User}
                        label="Perfil"
                        isActive={pathname.includes('/mobile/perfil')}
                    />
                </div>
            </nav>
        </div>
    );
}

interface NavButtonProps {
    href: string;
    icon: any;
    label: string;
    isActive: boolean;
}

function NavButton({ href, icon: Icon, label, isActive }: NavButtonProps) {
    return (
        <Link
            href={href}
            className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors relative",
                isActive ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
            )}
        >
            {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-b-full opacity-75" />
            )}
            <Icon className={cn("w-6 h-6", isActive && "fill-current opacity-20")} />
            <span className="text-[10px] font-medium">{label}</span>
        </Link>
    );
}
