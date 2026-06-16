"use client";

import { useSession } from "next-auth/react";
import { usePlatform } from "@/hooks/usePlatform";
import { usePathname } from "next/navigation";
import { Network, Wifi, WifiOff, MapPin, Printer, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import Link from "next/link";
import { toast } from "sonner";

interface CobradorLayoutProps {
    children: React.ReactNode;
}

export default function CobradorLayout({ children }: CobradorLayoutProps) {
    const { isNative } = usePlatform();
    const pathname = usePathname();
    const [pendingCount, setPendingCount] = useState(0);

    const [isOnline, setIsOnline] = useState(true);

    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_role') : null);
    const isVendedor = userRole === 'vendedor' || userRole === 'jefe_ventas';
    const isDireccion = userRole === 'direccion' || userRole === 'admin';

    const [modoSol, setModoSol] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const active = localStorage.getItem('modo_sol') === 'true';
            setModoSol(active);
            if (active) {
                document.body.classList.add('modo-sol');
            } else {
                document.body.classList.remove('modo-sol');
            }
        }
    }, []);

    const toggleModoSol = () => {
        const next = !modoSol;
        setModoSol(next);
        if (typeof window !== 'undefined') {
            if (next) {
                document.body.classList.add('modo-sol');
                localStorage.setItem('modo_sol', 'true');
            } else {
                document.body.classList.remove('modo-sol');
                localStorage.setItem('modo_sol', 'false');
            }
        }
    };

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
        const initPushNotifications = async () => {
            if (!Capacitor.isNativePlatform()) return;
            
            try {
                const { PushNotifications } = await import('@capacitor/push-notifications');
                
                let permStatus = await PushNotifications.checkPermissions();
                
                if (permStatus.receive === 'prompt') {
                    permStatus = await PushNotifications.requestPermissions();
                }
                
                if (permStatus.receive !== 'granted') {
                    console.warn("Permisos de notificaciones push denegados.");
                    return;
                }
                
                await PushNotifications.register();
                
                await PushNotifications.addListener('registration', async (token) => {
                    const fcmToken = token.value;
                    console.log('FCM Token registrado:', fcmToken);
                    
                    let deviceId = 'web-browser';
                    try {
                        const { Device } = await import('@capacitor/device');
                        const idInfo = await Device.getId();
                        deviceId = idInfo.identifier;
                    } catch (e) {}

                    await fetch('/api/mobile/dispositivos/fcm-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ deviceId, fcmToken })
                    });
                });
                
                await PushNotifications.addListener('registrationError', (error) => {
                    console.error('Error al registrar notificaciones push:', error);
                });
                
                await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                    console.log('Notificación recibida en primer plano:', notification);
                    const title = notification.title || "Notificación";
                    const body = notification.body || "";
                    toast.info(title, { description: body });
                });
                
                await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
                    console.log('Acción sobre notificación:', action);
                });
                
            } catch (error) {
                console.error("Error al inicializar notificaciones push:", error);
            }
        };

        initPushNotifications();
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
                let nombre = 'Navegador Web';
                let modelo = 'Browser';
                let sistemaOperativo = 'Web';
                
                if (Capacitor.isNativePlatform()) {
                    const { Device } = await import('@capacitor/device');
                    const idInfo = await Device.getId();
                    deviceId = idInfo.identifier;
                    
                    try {
                        const info = await Device.getInfo();
                        modelo = info.model || 'Device';
                        nombre = `${info.manufacturer || ''} ${info.model || ''}`.trim() || 'Dispositivo Móvil';
                        sistemaOperativo = `${info.operatingSystem || ''} ${info.osVersion || ''}`.trim() || 'Android/iOS';
                    } catch (deviceError) {
                        console.warn("No se pudo obtener información del dispositivo:", deviceError);
                    }
                }

                // Importar dinámicamente para evitar problemas de SSR / Capacitor
                const { obtenerUbicacionCobrador } = await import('@/lib/native/location');
                const pos = (await obtenerUbicacionCobrador(true, 60000)) as any; // Alta precisión (GPS), caché de 1 minuto

                await fetch('/api/mobile/dispositivos/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        deviceId,
                        latitud: pos?.lat,
                        longitud: pos?.lng, // Corregido: longitud en vez de longitd
                        nombre,
                        modelo,
                        sistemaOperativo
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
        <div className="flex flex-col h-screen h-[100dvh] bg-slate-950 text-slate-100 overflow-hidden relative">
            {/* HEADER NATIVO - Opcional según la página */}
            {pathname !== '/mobile/home' && (
                <header className="flex-none bg-slate-900 border-b border-slate-800 p-4 pt-safe-top z-20 shadow-md">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-emerald-400">VertexERP</h1>
                        <p className="text-xs text-slate-400">
                            {isDireccion ? 'Modo Dirección' : isVendedor ? 'Modo Vendedor' : 'Modo Cobrador'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Botón de Modo Sol (Alto Contraste) */}
                        <button 
                            onClick={toggleModoSol} 
                            className={`p-2 rounded-xl border transition-all ${modoSol ? 'bg-amber-100 text-amber-600 border-amber-300' : 'bg-slate-800 text-amber-400 border-slate-700'}`}
                            title="Modo Sol (Alto Contraste)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                        </button>

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
                        
                        {isDireccion ? (
                            <>
                                <NavButton icon="users" label="Clientes" href="/mobile/clientes" active={pathname === "/mobile/clientes"} />
                                <NavButton icon="shopping-bag" label="Ventas" href="/mobile/ventas" active={pathname === "/mobile/ventas"} />
                                <NavButton icon="dollar" label="Caja" href="/mobile/caja" active={pathname === "/mobile/caja"} />
                            </>
                        ) : isVendedor ? (
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
