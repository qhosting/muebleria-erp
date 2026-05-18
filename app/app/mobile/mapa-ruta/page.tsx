"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePlatform } from "@/hooks/usePlatform";
import { Loader2, Navigation, Crosshair } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

// Dynamic imports para Leaflet (no soporta SSR)
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

export default function MobileMap() {
    const { isNative } = usePlatform();
    const [loading, setLoading] = useState(true);
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [puntosRuta, setPuntosRuta] = useState<any[]>([]);

    useEffect(() => {
        // 1. Obtener ubicación actual del cobrador
        const getUbicacion = async () => {
            try {
                const { obtenerUbicacionCobrador } = await import("@/lib/native/location");
                const pos = await obtenerUbicacionCobrador(true, 60000);
                setPosition([pos.lat, pos.lng]);
            } catch (error) {
                console.warn("Error obteniendo ubicación, usando fallback:", error);
                setPosition([19.432608, -99.133209]); // Fallback
            }
        };

        getUbicacion();

        // 2. Cargar clientes reales con coordenadas
        const fetchRouteData = async () => {
            try {
                const response = await fetch('/api/mobile/clientes');
                if (response.ok) {
                    const result = await response.json();
                    const clientsArray = result.data || [];
                    // Filtrar solo los que tienen coordenadas (o simularlas si faltan para demo)
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

    if (loading || !position) {
        return (
            <div className="flex flex-col items-center justify-center p-8 h-full space-y-4 text-slate-400">
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
                        className="bg-emerald-600 p-2 rounded-lg text-white shadow-lg active:scale-95 transition-transform"
                        onClick={() => {
                            // Centrar mapa
                        }}
                    >
                        <Crosshair className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* MAPA INTERACTIVO */}
            <div className="flex-1 w-full h-full relative z-0">
                <MapContainer
                    center={position}
                    zoom={14}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* MARCADOR COBRADOR (AZUL) */}
                    <Marker position={position}>
                        <Popup>
                            <div className="text-center">
                                <p className="font-bold text-slate-800">¡Estás aquí!</p>
                            </div>
                        </Popup>
                    </Marker>

                    {/* MARCADORES CLIENTES (ROJO) */}
                    {puntosRuta.map(cliente => (
                        <Marker key={cliente.id} position={[cliente.lat, cliente.lng]}>
                            <Popup>
                                <div className="min-w-[150px]">
                                    <h3 className="font-bold text-slate-900">{cliente.nombre}</h3>
                                    <p className="text-xs text-slate-600 mb-2">{cliente.direccion}</p>
                                    <p className="font-mono font-bold text-emerald-600 mb-3">Deuda: ${cliente.deuda}</p>

                                    <button
                                        className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded flex items-center justify-center space-x-1 hover:bg-blue-700 transition"
                                        onClick={() => {
                                            if (isNative) {
                                                window.open(`geo:${cliente.lat},${cliente.lng}?q=${cliente.lat},${cliente.lng}`, '_system');
                                            } else {
                                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${cliente.lat},${cliente.lng}`, '_blank');
                                            }
                                        }}
                                    >
                                        <Navigation className="w-3 h-3" />
                                        <span>Navegar</span>
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* LEYENDA INFERIOR */}
            <div className="bg-slate-900 p-2 text-center text-[10px] text-slate-500 border-t border-slate-800">
                Mostrando ruta sugerida para hoy
            </div>
        </div>
    );
}
