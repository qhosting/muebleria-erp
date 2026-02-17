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

    // Mock Data de Clientes
    const [puntosRuta, setPuntosRuta] = useState([
        { id: 1, lat: 19.432608, lng: -99.133209, nombre: "Juan Pérez", direccion: "Centro Histórico", deuda: 1200 },
        { id: 2, lat: 19.427025, lng: -99.167665, nombre: "María González", direccion: "Zona Rosa", deuda: 850 },
        { id: 3, lat: 19.434222, lng: -99.143222, nombre: "Carlos López", direccion: "Alameda Central", deuda: 2500 }
    ]);

    useEffect(() => {
        // Simular obtención de ubicación del cobrador
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setPosition([pos.coords.latitude, pos.coords.longitude]);
                    setLoading(false);
                },
                () => {
                    // Fallback location (CDMX Zócalo)
                    setPosition([19.432608, -99.133209]);
                    setLoading(false);
                }
            );
        } else {
            setPosition([19.432608, -99.133209]);
            setLoading(false);
        }
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
