"use client";

import { useEffect, useState } from "react";
import { Search, MapPin, DollarSign, ChevronRight, X, Send, Printer } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";

export default function MobileClientes() {
    const { isNative } = usePlatform();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCliente, setSelectedCliente] = useState<any>(null);
    const [montoCobrar, setMontoCobrar] = useState("");
    const [pagoExitoso, setPagoExitoso] = useState(false);

    // Mock Data
    const [clientes] = useState([
        { id: 1, nombre: "Juan Pérez", direccion: "Calle 5 de Mayo #123", saldo: 1500, pagoSemanal: 250, telefono: "5215512345678", estatus: "aldia" },
        { id: 2, nombre: "María González", direccion: "Av. Reforma #45", saldo: 800, pagoSemanal: 200, telefono: "5215587654321", estatus: "atrasado" },
        { id: 3, nombre: "Carlos López", direccion: "Privada Los Pinos #8", saldo: 200, pagoSemanal: 100, telefono: "5215511223344", estatus: "aldia" },
        { id: 4, nombre: "Ana Rodríguez", direccion: "Blvd. Costero #99", saldo: 3200, pagoSemanal: 400, telefono: "5215599887766", estatus: "moroso" },
    ]);

    const handleCobrarClick = (cliente: any) => {
        setSelectedCliente(cliente);
        setMontoCobrar(cliente.pagoSemanal.toString());
        setPagoExitoso(false);
    };

    const confirmarCobro = () => {
        // Aquí iría la lógica de guardar en IndexedDB / Sync
        setPagoExitoso(true);
    };

    const enviarWhatsApp = () => {
        if (!selectedCliente) return;

        const mensaje = `Hola ${selectedCliente.nombre}, recibimos tu pago de $${montoCobrar}.
Saldo restante: $${selectedCliente.saldo - Number(montoCobrar)}.
Fecha: ${new Date().toLocaleDateString()}.
¡Gracias por tu pago!`;

        const url = `https://wa.me/${selectedCliente.telefono}?text=${encodeURIComponent(mensaje)}`;

        if (isNative) {
            window.open(url, '_system');
        } else {
            window.open(url, '_blank');
        }
    };

    const filteredClientes = clientes.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.direccion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 pb-20">
            {/* SEARCH BAR */}
            <div className="sticky top-0 bg-slate-950 pt-2 pb-4 z-10 px-1">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-emerald-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* LISTA DE CLIENTES */}
            <div className="space-y-3">
                {filteredClientes.map((cliente) => (
                    <div key={cliente.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 active:scale-[0.99] transition-transform">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-slate-200">{cliente.nombre}</h3>
                                <div className="flex items-center text-slate-500 text-xs mt-1">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {cliente.direccion}
                                </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${cliente.estatus === 'aldia' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    cliente.estatus === 'atrasado' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                }`}>
                                {cliente.estatus}
                            </span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase">Saldo Pendiente</p>
                                <p className="text-lg font-mono font-bold text-slate-200">${cliente.saldo}</p>
                            </div>
                            <button
                                onClick={() => handleCobrarClick(cliente)}
                                className="bg-emerald-600 active:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 shadow-lg shadow-emerald-900/20"
                            >
                                <DollarSign className="w-4 h-4" />
                                <span>Cobrar</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL DE COBRO */}
            {selectedCliente && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">

                        {/* Header Modal */}
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <h3 className="font-bold text-white">Registrar Pago</h3>
                            <button onClick={() => setSelectedCliente(null)} className="p-1 rounded-full hover:bg-slate-700">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {!pagoExitoso ? (
                                <>
                                    <div className="text-center">
                                        <p className="text-slate-400 text-sm mb-1">{selectedCliente.nombre}</p>
                                        <p className="text-3xl font-bold text-emerald-400 font-mono">
                                            ${montoCobrar}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Pago Sugerido</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Monto a Cobrar</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
                                                <input
                                                    type="number"
                                                    value={montoCobrar}
                                                    onChange={(e) => setMontoCobrar(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white font-mono text-lg focus:outline-none focus:border-emerald-500"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={confirmarCobro}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-transform flex items-center justify-center space-x-2"
                                        >
                                            <span>Confirmar Pago</span>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center space-y-6">
                                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                        <DollarSign className="w-8 h-8 text-emerald-400" />
                                    </div>

                                    <div>
                                        <h4 className="text-xl font-bold text-white mb-2">¡Pago Registrado!</h4>
                                        <p className="text-slate-400 text-sm">El pago se ha guardado correctamente.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={enviarWhatsApp}
                                            className="bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-transform"
                                        >
                                            <Send className="w-4 h-4" />
                                            <span>WhatsApp</span>
                                        </button>

                                        <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 active:scale-95 transition-transform">
                                            <Printer className="w-4 h-4" />
                                            <span>Imprimir</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setSelectedCliente(null)}
                                        className="text-slate-500 text-sm hover:text-slate-300 underline"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
