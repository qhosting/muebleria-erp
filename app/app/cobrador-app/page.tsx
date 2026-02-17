'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePlatform } from '@/hooks/usePlatform';
import { Loader2 } from 'lucide-react';
import { obtenerDatoCobrador } from '@/lib/native/storage';

export default function CobradorAppPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { isNative } = usePlatform();
    const [message, setMessage] = useState('Iniciando...');

    useEffect(() => {
        const checkAuth = async () => {
            if (status === 'loading') return;

            let currentUser = session?.user;

            // Si no hay sesión de Next-Auth pero estamos en nativo, intentar recuperar del storage
            if (!currentUser && isNative) {
                const savedProfile = await obtenerDatoCobrador<any>('user_profile');
                if (savedProfile) {
                    console.log('✅ Sesión recuperada de storage nativo:', savedProfile.email);
                    currentUser = savedProfile;
                }
            }

            if (!currentUser && status === 'unauthenticated') {
                router.push('/login');
                return;
            }

            if (currentUser) {
                const userRole = (currentUser as any).role;

                if (userRole !== 'cobrador' && userRole !== 'admin') {
                    setMessage('Acceso denegado. Esta app es solo para cobradores.');
                    setTimeout(() => router.push('/dashboard'), 3000);
                    return;
                }

                setMessage('Sincronizando datos...');

                setTimeout(() => {
                    if (isNative) {
                        router.push('/mobile/home');
                    } else {
                        router.push('/dashboard/cobranza-mobile');
                    }
                }, 1000);
            }
        };

        checkAuth();
    }, [session, status, isNative, router]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
            <div className="w-full max-w-sm flex flex-col items-center space-y-8">
                {/* Logo o Icono */}
                <div className="w-24 h-24 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-12 h-12 text-white"
                    >
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-center">
                    VertexERP
                    <span className="block text-emerald-400 text-lg font-medium mt-1">Cobranza Móvil</span>
                </h1>

                <div className="flex flex-col items-center space-y-4 w-full">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                    <p className="text-slate-400 text-sm animate-pulse">{message}</p>
                </div>

                {/* Versión e Info */}
                <div className="absolute bottom-6 text-center text-xs text-slate-600">
                    <p>v1.0.0 Alpha</p>
                    <p className="mt-1">{isNative ? 'Modo Nativo Android' : 'Modo Web'}</p>
                </div>
            </div>
        </div>
    );
}
