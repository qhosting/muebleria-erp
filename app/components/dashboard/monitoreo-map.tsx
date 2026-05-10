"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { formatCurrency, formatDate } from "@/lib/utils";

interface MonitoreoMapProps {
    pagos: any[];
    center?: [number, number];
}

export default function MonitoreoMap({ pagos, center = [20.5888, -100.3899] }: MonitoreoMapProps) {
    // Definir iconos dentro del componente para evitar errores de SSR/window
    const pagoIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const visitaIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    return (
        <MapContainer 
            center={center} 
            zoom={13} 
            style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {pagos.map((pago) => {
                if (!pago.latitud || !pago.longitud) return null;
                
                const lat = parseFloat(pago.latitud);
                const lng = parseFloat(pago.longitud);
                
                if (isNaN(lat) || isNaN(lng)) return null;

                return (
                    <Marker 
                        key={pago.id} 
                        position={[lat, lng]} 
                        icon={pago.tipoPago === 'regular' ? pagoIcon : visitaIcon}
                    >
                        <Popup className="custom-popup">
                            <div className="p-1">
                                <h4 className="font-bold text-gray-900">{pago.cliente?.nombreCompleto}</h4>
                                <p className="text-xs text-gray-500 mb-2">{pago.cobrador?.name}</p>
                                <div className="flex flex-col gap-1 border-t pt-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Monto:</span>
                                        <span className="font-bold text-emerald-600">{formatCurrency(pago.monto)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Fecha:</span>
                                        <span className="text-gray-600">{pago.fechaPago ? formatDate(pago.fechaPago) : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Método:</span>
                                        <span className="text-gray-600 capitalize">{pago.metodoPago}</span>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
