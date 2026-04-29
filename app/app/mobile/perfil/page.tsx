'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from 'next-auth/react';
import { Settings, Printer, LogOut, RefreshCw, Bell, BellOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from '@/lib/version';

export default function MobilePerfilPage() {
    const { data: session } = useSession();
    const [pendingCount, setPendingCount] = useState(0);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    useEffect(() => {
        const loadPending = async () => {
            const { obtenerTamañoCola } = await import('@/lib/native/sync');
            const size = await obtenerTamañoCola();
            setPendingCount(size);
        };
        loadPending();

        // Verificar si las notificaciones están activas
        if ('Notification' in window) {
            setNotificationsEnabled(Notification.permission === 'granted');
        }
    }, []);

    const toggleNotifications = async () => {
        if (!('Notification' in window)) {
            toast.error('Este navegador no soporta notificaciones');
            return;
        }

        if (Notification.permission === 'granted') {
            toast.info('Las notificaciones ya están activas');
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            setNotificationsEnabled(true);
            toast.success('¡Notificaciones activadas!');
            // Intentar suscribir inmediatamente
            const registration = await navigator.serviceWorker.ready;
            // Aquí se llamaría a la función de suscripción que definimos en PWAManager
        } else {
            toast.error('Permiso de notificaciones denegado');
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <h2 className="text-xl font-bold text-white">Mi Perfil</h2>

            <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-2xl font-bold text-white uppercase shadow-lg shadow-emerald-900/40">
                        {session?.user?.name?.[0] || 'U'}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white">{session?.user?.name || 'Usuario'}</h3>
                        <p className="text-sm text-slate-400">{session?.user?.email}</p>
                        <div className="text-[10px] text-emerald-400 mt-1 uppercase font-bold tracking-wider bg-emerald-950/50 px-2 py-0.5 rounded inline-block border border-emerald-900">
                            {(session?.user as any)?.role || 'Usuario'}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <div className="text-xs text-slate-500 uppercase font-bold ml-1">Configuración</div>

                <Button
                    onClick={toggleNotifications}
                    className={`w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white justify-start h-12 ${notificationsEnabled ? 'border-emerald-500/30' : ''}`}
                    variant="outline"
                >
                    {notificationsEnabled ? (
                        <Bell className="w-5 h-5 mr-3 text-emerald-500" />
                    ) : (
                        <BellOff className="w-5 h-5 mr-3 text-slate-400" />
                    )}
                    {notificationsEnabled ? 'Notificaciones Activas' : 'Activar Notificaciones'}
                </Button>

                <Button
                    className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white justify-start h-12"
                    variant="outline"
                >
                    <Printer className="w-5 h-5 mr-3 text-slate-400" />
                    Configurar Impresora
                </Button>

                <Button
                    onClick={async () => {
                        const { sincronizarCola } = await import('@/lib/native/sync');
                        toast.info('Sincronizando datos...');
                        const result = await sincronizarCola();
                        if (result.procesados > 0) {
                            toast.success(`Se sincronizaron ${result.procesados} elementos`);
                            setPendingCount(0);
                        } else if (result.offline) {
                            toast.error('Sin conexión a internet');
                        } else {
                            toast.info('No hay datos pendientes de sincronizar');
                        }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white justify-between h-12"
                    variant="outline"
                >
                    <div className="flex items-center">
                        <RefreshCw className="w-5 h-5 mr-3 text-slate-400" />
                        Sincronizar Datos
                    </div>
                    {pendingCount > 0 && (
                        <span className="bg-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full text-white">
                            {pendingCount} Pendientes
                        </span>
                    )}
                </Button>
            </div>

            <div className="space-y-3 pt-4">
                <Button
                    onClick={() => {
                        const callbackUrl = Capacitor.isNativePlatform() ? '/login' : '/';
                        signOut({ callbackUrl });
                    }}
                    variant="destructive"
                    className="w-full h-12 font-semibold shadow-lg shadow-red-900/20"
                >
                    <LogOut className="w-5 h-5 mr-2" />
                    Cerrar Sesión
                </Button>

                <div className="text-center text-xs text-slate-600 pt-4 flex flex-col gap-1">
                    <p>VertexERP Muebles v{APP_VERSION}</p>
                    <p className="opacity-50">© {new Date().getFullYear()} Aurum Capital Holding</p>
                </div>
            </div>
        </div>
    );
}
