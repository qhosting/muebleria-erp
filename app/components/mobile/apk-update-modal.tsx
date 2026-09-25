'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
    Download, 
    Wifi, 
    WifiOff, 
    Smartphone, 
    Sparkles, 
    AlertTriangle, 
    CheckCircle2, 
    X,
    ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { obtenerEstadoRed, escucharCambiosRed, NetworkStatusResult } from '@/lib/native/network';
import { toast } from 'sonner';

interface ApkVersionData {
    versionCode: number;
    versionName: string;
    minVersionCode: number;
    apkUrl: string;
    fileSize: string;
    isMandatory: boolean;
    requireWifi: boolean;
    releaseNotes: string[];
}

export function ApkUpdateModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [updateData, setUpdateData] = useState<ApkVersionData | null>(null);
    const [currentVersion, setCurrentVersion] = useState({ name: '2.9.41', build: 45 });
    const [networkStatus, setNetworkStatus] = useState<NetworkStatusResult>({
        connected: true,
        connectionType: 'wifi'
    });
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        let isMounted = true;

        // 1. Escuchar el estado de la red (WiFi vs Celular) en tiempo real
        obtenerEstadoRed().then((status) => {
            if (isMounted) setNetworkStatus(status);
        });

        const unregisterNetwork = escucharCambiosRed((status) => {
            if (isMounted) {
                setNetworkStatus(status);
                if (status.connectionType === 'wifi' && isOpen) {
                    toast.success('¡Conexión Wi-Fi detectada! Ya puedes descargar la actualización.', {
                        id: 'wifi-detected'
                    });
                }
            }
        });

        // 2. Verificar versión al montar el componente
        const checkAppVersion = async (ignoreSnooze = false) => {
            try {
                // Verificar si se pospuso recientemente en esta sesión (si no es obligatoria y no se fuerza apertura)
                if (!ignoreSnooze) {
                    const snoozeUntil = localStorage.getItem('vertex_apk_update_snooze');
                    if (snoozeUntil && Date.now() < parseInt(snoozeUntil, 10)) {
                        // Está pospuesta temporalmente
                        return;
                    }
                }

                // Obtener info nativa si estamos en Android / Capacitor
                let localBuild = 45;
                let localVersionName = '2.9.41';

                if (Capacitor.isNativePlatform()) {
                    try {
                        const { App } = await import('@capacitor/app');
                        const info = await App.getInfo();
                        localBuild = parseInt(info.build || '0', 10);
                        localVersionName = info.version || '2.9.41';
                    } catch (e) {
                        console.warn('No se pudo obtener App.getInfo() nativo:', e);
                    }
                } else {
                    // Modo desarrollo / Web: permitir probar con ?test_update=1
                    const urlParams = new URLSearchParams(window.location.search);
                    if (urlParams.get('test_update') === '1') {
                        localBuild = 1; // Forzar para pruebas
                    } else {
                        // En web normal no mostramos la alerta de APK nativo salvo que se fuerce
                        if (!ignoreSnooze) return;
                    }
                }

                if (isMounted) {
                    setCurrentVersion({ name: localVersionName, build: localBuild });
                }

                // Consultar versión más reciente del servidor
                const res = await fetch('/api/mobile/apk-version', { cache: 'no-store' });
                if (!res.ok) return;

                const data: ApkVersionData = await res.json();

                // ¿El servidor tiene un build superior al instalado o se forzó?
                if (data.versionCode > localBuild || ignoreSnooze) {
                    if (isMounted) {
                        setUpdateData(data);
                        setIsOpen(true);
                    }
                }
            } catch (err) {
                console.warn('Error al verificar versión de APK:', err);
            }
        };

        checkAppVersion();

        // 3. Listener para abrir el modal desde el botón de Perfil u otras vistas
        const handleOpenModal = (event: any) => {
            localStorage.removeItem('vertex_apk_update_snooze');
            if (event?.detail?.updateData) {
                setUpdateData(event.detail.updateData);
                setIsOpen(true);
            } else {
                checkAppVersion(true);
            }
        };

        window.addEventListener('open-apk-update-modal', handleOpenModal);

        return () => {
            isMounted = false;
            unregisterNetwork();
            window.removeEventListener('open-apk-update-modal', handleOpenModal);
        };
    }, []);

    if (!isOpen || !updateData) return null;

    const isWifi = networkStatus.connectionType === 'wifi';
    const isCellular = networkStatus.connectionType === 'cellular';
    const isConnected = networkStatus.connected && networkStatus.connectionType !== 'none';
    const canDownload = !updateData.requireWifi || isWifi;

    const handleDownload = () => {
        if (!canDownload) {
            toast.error('Se requiere conexión Wi-Fi para descargar el APK y evitar consumir tu paquete de datos móviles.', {
                duration: 4000
            });
            return;
        }

        setIsDownloading(true);
        toast.info('Iniciando descarga del nuevo APK...', { duration: 3000 });

        try {
            // Abrir la URL del APK en el navegador/gestor de descargas de Android
            if (typeof window !== 'undefined') {
                const targetUrl = updateData.apkUrl.startsWith('http') 
                    ? updateData.apkUrl 
                    : `${window.location.origin}${updateData.apkUrl}`;

                window.open(targetUrl, '_system');
            }
        } catch (e) {
            console.error('Error al abrir enlace de descarga:', e);
            toast.error('No se pudo abrir el instalador. Intenta de nuevo.');
        } finally {
            setTimeout(() => setIsDownloading(false), 2000);
        }
    };

    const handleSnooze = () => {
        // Posponer por 2 horas si no es obligatoria
        const twoHours = Date.now() + 2 * 60 * 60 * 1000;
        localStorage.setItem('vertex_apk_update_snooze', twoHours.toString());
        setIsOpen(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                
                {/* ENCABEZADO CON GRADIENTE */}
                <div className="relative p-5 bg-gradient-to-br from-emerald-600/30 via-slate-900 to-slate-950 border-b border-slate-800">
                    {!updateData.isMandatory && (
                        <button 
                            onClick={handleSnooze}
                            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                            aria-label="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 shadow-inner">
                            <Sparkles className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                                {updateData.isMandatory ? 'Actualización Requerida' : 'Actualización Disponible'}
                            </span>
                            <h3 className="text-lg font-bold text-white leading-tight">
                                VertexERP Móvil v{updateData.versionName}
                            </h3>
                        </div>
                    </div>

                    {/* BADGES DE VERSIÓN */}
                    <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                            Actual: v{currentVersion.name} (b{currentVersion.build})
                        </span>
                        <span className="text-slate-500">➔</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold">
                            Nueva: v{updateData.versionName}
                        </span>
                    </div>
                </div>

                {/* CONTENIDO Y NOVEDADES */}
                <div className="p-5 space-y-4 text-sm text-slate-300 max-h-[42vh] overflow-y-auto">
                    <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Novedades de la versión:
                        </h4>
                        <ul className="space-y-1.5 text-xs text-slate-300">
                            {(Array.isArray(updateData.releaseNotes) ? updateData.releaseNotes : []).map((note, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>{note}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* TAMAÑO DEL ARCHIVO */}
                    <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-slate-500" />
                            Tamaño de descarga:
                        </span>
                        <span className="font-semibold text-slate-200">{updateData.fileSize}</span>
                    </div>

                    {/* ESTADO DE CONEXIÓN WI-FI */}
                    {isWifi ? (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs">
                            <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
                            <div>
                                <p className="font-semibold">Conectado a Wi-Fi</p>
                                <p className="text-[11px] text-emerald-400/80">Listo para descargar sin consumir tu plan de datos.</p>
                            </div>
                        </div>
                    ) : isCellular ? (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs">
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-300">Conectado por Datos Móviles (4G/LTE)</p>
                                <p className="text-[11px] text-amber-200/80 mt-0.5 leading-snug">
                                    Para no consumir los datos de tu paquete en ruta, <strong>conéctate a una red Wi-Fi</strong> para habilitar la descarga.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
                            <WifiOff className="w-5 h-5 text-rose-400 shrink-0" />
                            <div>
                                <p className="font-semibold">Sin conexión a Internet</p>
                                <p className="text-[11px] text-rose-300/80">Conéctate a una red Wi-Fi para continuar.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col gap-2">
                    <Button
                        onClick={handleDownload}
                        disabled={!canDownload || isDownloading || !isConnected}
                        className={`w-full py-5 text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                            canDownload && isConnected
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                                : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                        }`}
                    >
                        <Download className="w-4 h-4" />
                        {canDownload 
                            ? (isDownloading ? 'Descargando APK...' : 'Descargar e Instalar APK')
                            : 'Requiere Conexión Wi-Fi'}
                    </Button>

                    {!updateData.isMandatory && (
                        <Button
                            variant="ghost"
                            onClick={handleSnooze}
                            className="w-full text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 py-2 h-auto"
                        >
                            Recordar más tarde
                        </Button>
                    )}
                </div>

            </div>
        </div>
    );
}
