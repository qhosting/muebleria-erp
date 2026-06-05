"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { Navigation } from "lucide-react";

// Iconos personalizados con CDN estables para evitar marcadores rotos o en blanco
const cobradorIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const clienteIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface RouteMapInnerProps {
    position: [number, number];
    puntosRuta: any[];
    centerTrigger: number;
    isNative: boolean;
}

// Controlador para centrar y animar el paneo del mapa cuando cambia la posición o se presiona centrar
function MapController({ position, centerTrigger }: { position: [number, number]; centerTrigger: number }) {
    const map = useMap();

    useEffect(() => {
        if (position) {
            map.setView(position, 14, { animate: true, duration: 1.0 });
        }
    }, [position, centerTrigger, map]);

    return null;
}

export default function RouteMapInner({ position, puntosRuta, centerTrigger, isNative }: RouteMapInnerProps) {
    return (
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

            {/* Controlador reactivo del viewport del mapa */}
            <MapController position={position} centerTrigger={centerTrigger} />

            {/* MARCADOR COBRADOR (AZUL) */}
            <Marker position={position} icon={cobradorIcon}>
                <Popup>
                    <div className="text-center font-sans">
                        <p className="font-bold text-slate-800">¡Estás aquí!</p>
                        <p className="text-[10px] text-slate-500">Mi ubicación actual</p>
                    </div>
                </Popup>
            </Marker>

            {/* MARCADORES CLIENTES (ROJO) */}
            {puntosRuta.map((cliente) => (
                <Marker key={cliente.id} position={[cliente.lat, cliente.lng]} icon={clienteIcon}>
                    <Popup>
                        <div className="min-w-[150px] font-sans">
                            <h3 className="font-bold text-slate-900 text-sm mb-0.5">{cliente.nombre}</h3>
                            <p className="text-[11px] text-slate-600 mb-1.5 leading-tight">{cliente.direccion}</p>
                            <p className="font-mono font-bold text-emerald-600 text-xs mb-3">Deuda: ${cliente.deuda}</p>

                            <button
                                className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded flex items-center justify-center space-x-1 hover:bg-blue-700 active:scale-[0.98] transition"
                                onClick={() => {
                                    if (isNative) {
                                        window.open(`geo:${cliente.lat},${cliente.lng}?q=${cliente.lat},${cliente.lng}`, "_system");
                                    } else {
                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${cliente.lat},${cliente.lng}`, "_blank");
                                    }
                                }}
                            >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>Navegar</span>
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
