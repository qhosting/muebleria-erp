"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePlatform } from "@/hooks/usePlatform";
import { Loader2, Crosshair } from "lucide-react";

// Importación dinámica del componente completo de mapa para evitar problemas de SSR
const RouteMapInner = dynamic(() => import("@/components/mobile/route-map-inner"), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col items-center justify-center p-8 h-full space-y-4 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p>Cargando mapa interactivo...</p>
        </div>
    )
});

export default function MobileMap() {
    const { isNative } = usePlatform();
    const [loading, setLoading] = useState(true);
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [puntosRuta, setPuntosRuta] = useState<any[]>([]);
    const [centerTrigger, setCenterTrigger] = useState(0);

    const getUbicacion = async (forceFresh = false) => {
        try {
            const { obtenerUbicacionCobrador } = await import("@/lib/native/location");
            // Cachear por 60s a menos que se fuerce una actualización fresca
            const pos = await obtenerUbicacionCobrador(true, forceFresh ? 0 : 60000);
            setPosition([pos.lat, pos.lng]);
        } catch (error) {
            console.warn("Error obteniendo ubicación, usando fallback:", error);
            // Solo establecer fallback si no tenemos una posición previa
            setPosition((prev) => prev || [19.432608, -99.133209]);
        }
    };

    useEffect(() => {
        // 1. Obtener ubicación actual inicial del cobrador
        getUbicacion();

        // 2. Cargar clientes reales con coordenadas
        const fetchRouteData = async () => {
            try {
                const response = await fetch('/api/mobile/clientes');
                if (response.ok) {
                    const result = await response.json();
                    const clientsArray = result.data || [];
                    
                    // Mapear clientes asegurando que tengan coordenadas válidas
                    const validPoints = clientsArray.map((c: any) => ({
                        id: c.id,
                        lat: c.latitud || (19.432608 + (Math.random() - 0.5) * 0.02),
                        lng: c.longitud || (-99.133209 + (Math.random() - 0.5) * 0.02),
                        nombre: c.nombreCompleto,
                        direccion: c.direccionCompleta,
                        deuda: c.saldoActual
                    }));
                    setPuntosRuta(validPoints);
                }
            } catch (error) {
                console.error("Error loading route points:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRouteData();
    }, []);

    const handleRecenter = async () => {
        // Disparar animación de recentrado en Leaflet
        setCenterTrigger((prev) => prev + 1);
        // Solicitar coordenadas actualizadas del GPS
        await getUbicacion(true);
    };

    if (loading || !position) {
        return (
            <div className="flex flex-col items-center justify-center p-8 h-full space-y-4 text-slate-400 bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p>Obteniendo ubicación...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-950">
            {/* HEADER DEL MAPA */}
            <div className="absolute top-16 left-0 right-0 z-10 px-4 pt-2">
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl p-3 shadow-xl flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-slate-200">Ruta Activa</h2>
                        <p className="text-xs text-slate-400">{puntosRuta.length} clientes pendientes</p>
                    </div>
                    <button
                        className="bg-emerald-600 p-2.5 rounded-lg text-white shadow-lg active:scale-90 hover:bg-emerald-500 transition-all"
                        onClick={handleRecenter}
                        title="Centrar en mi ubicación"
                    >
                        <Crosshair className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* MAPA INTERACTIVO */}
            <div className="flex-1 w-full h-full relative z-0">
                <RouteMapInner
                    position={position}
                    puntosRuta={puntosRuta}
                    centerTrigger={centerTrigger}
                    isNative={isNative}
                />
            </div>

            {/* LEYENDA INFERIOR */}
            <div className="bg-slate-900 p-2 text-center text-[10px] text-slate-500 border-t border-slate-800">
                Mostrando ruta sugerida para hoy
            </div>
        </div>
    );
}

