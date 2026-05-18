"use client";

import { useSession } from "next-auth/react";
import { usePlatform } from "@/hooks/usePlatform";
import { usePathname } from "next/navigation";
import { Network, Wifi, WifiOff, MapPin, Printer, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import Link from "next/link";

interface CobradorLayoutProps {
    children: React.ReactNode;
}

export default function CobradorLayout({ children }: CobradorLayoutProps) {
    const { isNative } = usePlatform();
    const pathname = usePathname();
    const [pendingCount, setPendingCount] = useState(0);

    const [isOnline, setIsOnline] = useState(true);

    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const isVendedor = userRole === 'vendedor' || userRole === 'jefe_ventas';

    useEffect(() => {
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const fetchPending = async () => {
            if (isVendedor) return; // No buscamos convenios si es vendedor
            try {
                const response = await fetch('/api/mobile/convenios');
                if (response.ok) {
                    const data = await response.json();
                    setPendingCount(data.convenios?.length || 0);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchPending();
        // Silent Heartbeat (Rastreo de dispositivo)
        const sendHeartbeat = async () => {
            try {
                let deviceId = 'web-browser';
                
                if (Capacitor.isNativePlatform()) {
                    const { Device } = await import('@capacitor/device');
                    const info = await Device.getId();
                    deviceId = info.identifier;
                }

                // Importar dinámicamente para evitar problemas de SSR / Capacitor
                const { obtenerUbicacionCobrador } = await import('@/lib/native/location');
                const pos = await obtenerUbicacionCobrador(false, 300000); // Baja precisión, caché de 5 minutos

                await fetch('/api/mobile/dispositivos/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        deviceId,
                        latitud: pos.lat,
                        longitd: pos.lng
                    })
                });
            } catch (e) {
                console.warn("Heartbeat GPS error o fallido:", e);
            }
        };

        sendHeartbeat();
        const heartbeatInterval = setInterval(sendHeartbeat, 300000); // Cada 5 minutos

        return () => {
            clearInterval(heartbeatInterval);
        };
    }, [isVendedor]);

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-100 overflow-hidden relative">
            {/* HEADER NATIVO - Opcional según la página */}
            {pathname !== '/mobile/home' && (
                <header className="flex-none bg-slate-900 border-b border-slate-800 p-4 pt-safe-top z-20 shadow-md">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-emerald-400">VertexERP</h1>
                        <p className="text-xs text-slate-400">
                            {isVendedor ? 'Modo Vendedor' : 'Modo Cobrador'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Indicadores de Estado Dinámicos */}
                        <div className="flex items-center space-x-1">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}></span>
                            <span className={`text-xs font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>
            )}

            {/* CONTENIDO PRINCIPAL SCROLLEABLE */}
            <main className={`flex-1 overflow-y-auto px-4 pb-24 z-10 ${pathname === '/mobile/home' ? 'pt-safe-top' : 'pt-2'}`}>
                {children}
            </main>

            {/* BOTTOM NAVIGATION BAR */}
            {!pathname.includes('/mobile/ventas/solicitud') && (
                <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 pb-safe-bottom z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
                    <div className="grid grid-cols-5 h-16">
                        <NavButton icon="home" label="Inicio" href="/mobile/home" active={pathname === "/mobile/home"} />
                        
                        {isVendedor ? (
                            <>
                                <NavButton icon="shopping-bag" label="Ventas" href="/mobile/ventas" active={pathname === "/mobile/ventas"} />
                                <NavButton icon="message-square" label="Prospectos" href="/mobile/ventas#leads" active={pathname === "/mobile/ventas"} />
                                <NavButton icon="database" label="Bóveda" href="/mobile/ventas/boveda" active={pathname === "/mobile/ventas/boveda"} />
                            </>
                        ) : (
                            <>
                                <NavButton icon="users" label="Clientes" href="/mobile/clientes" active={pathname === "/mobile/clientes"} />
                                <NavButton icon="convenios" label="Convenios" href="/mobile/convenios" active={pathname === "/mobile/convenios"} badge={pendingCount > 0 ? pendingCount : undefined} />
                                <NavButton icon="dollar" label="Caja" href="/mobile/caja" active={pathname === "/mobile/caja"} />
                            </>
                        )}
                        
                        <NavButton icon="menu" label="Menú" href="/mobile/menu" active={pathname === "/mobile/menu"} badge={!isVendedor && pendingCount > 0 ? true : false} />
                    </div>
                </nav>
            )}
        </div>
    );
}

function NavButton({ icon, label, href, active = false, badge }: any) {
    // Icon mapping simple
    const Icons: any = {
        home: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        ),
        users: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        ),
        dollar: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01" /><path d="M18 12h.01" /></svg>
        ),
        convenios: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="m9 16 2 2 4-4" /></svg>
        ),
        'shopping-bag': (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        ),
        'message-square': (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        ),
        database: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
        ),
        menu: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
        )
    };

    return (
        <Link href={href} className={`flex flex-col items-center justify-center space-y-1 relative ${active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-100'}`}>
            <div className="relative">
                {Icons[icon]}
                {badge && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-slate-900"></span>
                    </span>
                )}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
        </Link>
    )
}
