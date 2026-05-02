"use client";

import { useEffect, useState } from "react";
import { Search, MapPin, DollarSign, ChevronRight, X, Send, Printer } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";

export default function MobileClientes() {
    const { isNative } = usePlatform();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCliente, setSelectedCliente] = useState<any>(null);
    const [detailCliente, setDetailCliente] = useState<any>(null);
    const [montoCobrar, setMontoCobrar] = useState("");
    const [pagoExitoso, setPagoExitoso] = useState(false);
    const [loading, setLoading] = useState(true);
    const [clientes, setClientes] = useState<any[]>([]);
    const [mostrarTodos, setMostrarTodos] = useState(false);
    const [filtroDia, setFiltroDia] = useState("todos");
    const [filtroEstatus, setFiltroEstatus] = useState("todos");

    useEffect(() => {
        const fetchClientes = async () => {
            try {
                const response = await fetch(`/api/mobile/clientes?q=${searchTerm}`);
                if (response.ok) {
                    const data = await response.json();
                    setClientes(data);
                }
            } catch (error) {
                console.error("Error fetching clientes:", error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchClientes, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleClienteClick = (cliente: any) => {
        setDetailCliente(cliente);
    };

    const handleCobrarClick = (cliente: any) => {
        setDetailCliente(null);
        setSelectedCliente(cliente);
        setMontoCobrar(cliente.pagoSemanal.toString());
        setPagoExitoso(false);
    };

    const confirmarCobro = async () => {
        if (!selectedCliente || !montoCobrar) return;

        const { agregarColaSincronizacion } = await import("@/lib/native/sync");
        
        const pagoPayload = {
            clienteId: selectedCliente.id,
            monto: parseFloat(montoCobrar),
            fechaPago: new Date().toISOString(),
            metodoPago: 'gestor',
            tipoPago: 'regular'
        };

        try {
            await agregarColaSincronizacion('pago', pagoPayload);
            setPagoExitoso(true);
            
            // Actualizar estado local
            setClientes(prev => prev.map(c => 
                c.id === selectedCliente.id 
                ? { ...c, saldo: c.saldo - parseFloat(montoCobrar), yaPagoEstaSemana: true } 
                : c
            ));
        } catch (error) {
            console.error("Error al registrar pago:", error);
        }
    };

    const enviarWhatsApp = () => {
        if (!selectedCliente) return;

        const mensaje = `Hola ${selectedCliente.nombre}, recibimos tu pago de $${montoCobrar}.
Saldo restante: $${selectedCliente.saldo}.
Fecha: ${new Date().toLocaleDateString()}.
¡Gracias por tu pago!`;

        const url = `https://wa.me/${selectedCliente.telefono}?text=${encodeURIComponent(mensaje)}`;

        if (isNative) {
            window.open(url, '_system');
        } else {
            window.open(url, '_blank');
        }
    };

    const filteredClientes = clientes.filter(c => {
        // Búsqueda por Nombre, Calle o Colonia (ya viene filtrado por API pero reforzamos localmente)
        const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.direccion.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Filtro por Día
        const matchesDia = filtroDia === "todos" || c.diaPago === filtroDia;

        // Filtro Lento (Atrasado)
        const matchesLento = filtroEstatus === "todos" || c.estatus === "atrasado";

        // Filtro Pendientes vs Todos
        const matchesPendiente = mostrarTodos || !c.yaPagoEstaSemana;

        return matchesSearch && matchesDia && matchesLento && matchesPendiente;
    });

    const dias = [
        { id: "todos", label: "Día" },
        { id: "1", label: "Lun" },
        { id: "2", label: "Mar" },
        { id: "3", label: "Mié" },
        { id: "4", label: "Jue" },
        { id: "5", label: "Vie" },
        { id: "6", label: "Sáb" },
        { id: "7", label: "Dom" }
    ];

    return (
        <div className="space-y-4 pb-20">
            {/* SEARCH BAR & FILTER */}
            <div className="sticky top-0 bg-slate-950 pt-2 pb-4 z-10 px-1 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, calle o colonia..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-col space-y-3">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {dias.map(dia => (
                            <button
                                key={dia.id}
                                onClick={() => setFiltroDia(dia.id)}
                                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    filtroDia === dia.id 
                                    ? 'bg-sky-600 text-white shadow-lg' 
                                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                                }`}
                            >
                                {dia.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center justify-between px-1">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setMostrarTodos(!mostrarTodos)}
                                className={`text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase transition-colors ${
                                    mostrarTodos 
                                    ? 'bg-slate-800 text-slate-400' 
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                            >
                                {mostrarTodos ? 'Todos' : 'Pendientes'}
                            </button>
                            <button 
                                onClick={() => setFiltroEstatus(filtroEstatus === "todos" ? "lento" : "todos")}
                                className={`text-[10px] px-3 py-1.5 rounded-lg font-bold uppercase transition-colors ${
                                    filtroEstatus === "lento" 
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                            >
                                {filtroEstatus === "lento" ? 'Solo Lentos' : 'Todo Estatus'}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-600 font-mono">
                            {filteredClientes.length} Result.
                        </p>
                    </div>
                </div>
            </div>

            {/* LISTA DE CLIENTES */}
            <div className="space-y-3">
                {filteredClientes.map((cliente) => (
                    <div 
                        key={cliente.id} 
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4 active:scale-[0.99] transition-transform"
                        onClick={() => handleClienteClick(cliente)}
                    >
                        <div className="flex justify-between items-start">
                            <div className="max-w-[70%]">
                                <h3 className="font-bold text-slate-200 truncate">{cliente.nombre}</h3>
                                <div className="flex items-start text-slate-500 text-[11px] mt-1">
                                    <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-1">{cliente.direccion}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[9px] font-bold text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20">D{cliente.diaPago}</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase font-bold ${cliente.estatus === 'aldia' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        cliente.estatus === 'atrasado' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}>
                                    {cliente.estatus === 'atrasado' ? 'Lento' : cliente.estatus}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-end">
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-bold">Saldo</p>
                                    <p className="text-base font-mono font-bold text-slate-200">${cliente.saldo}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-amber-500 uppercase font-bold">Vencido</p>
                                    <p className="text-base font-mono font-bold text-amber-500">${Math.round(cliente.saldoVencido)}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">D{cliente.diaPago}</p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCobrarClick(cliente);
                                    }}
                                    className="bg-emerald-600 active:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/40"
                                >
                                    <DollarSign className="w-4 h-4" />
                                    <span>Cobrar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL DE DETALLE DEL CLIENTE */}
            {detailCliente && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-800 shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <h3 className="font-bold text-white">Perfil del Cliente</h3>
                            <button onClick={() => setDetailCliente(null)} className="p-1 rounded-full hover:bg-slate-700">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 font-bold text-2xl">
                                    {detailCliente.nombre.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-white leading-tight">{detailCliente.nombre}</h4>
                                    <p className="text-sm text-slate-500 font-mono">Código: {detailCliente.codigoCliente}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                                <InfoItem label="Periodicidad" value={detailCliente.periodicidad} />
                                <InfoItem label="Pago Sugerido" value={`$${detailCliente.pagoSemanal}`} highlight="text-emerald-400" />
                                <InfoItem label="Saldo Actual" value={`$${detailCliente.saldo}`} highlight="text-white" />
                                <InfoItem label="Saldo Vencido" value={`$${Math.round(detailCliente.saldoVencido)}`} highlight="text-amber-500" />
                                <InfoItem label="Días Vencido" value={detailCliente.diasVencidos} />
                                <InfoItem label="Monto Crédito" value={`$${detailCliente.montoCredito}`} />
                            </div>

                            <div className="space-y-4 pt-2">
                                <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-1">Esquema de Precios</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Precio Contado</p>
                                        <p className="text-sm font-bold text-slate-200">${detailCliente.precios.contado}</p>
                                    </div>
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Vendido en $</p>
                                        <p className="text-sm font-bold text-slate-200">${detailCliente.vendidoEn}</p>
                                    </div>
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Precio 6 Meses</p>
                                        <p className="text-sm font-bold text-slate-200">${detailCliente.precios.p6}</p>
                                    </div>
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Precio 12 Meses</p>
                                        <p className="text-sm font-bold text-slate-200">${detailCliente.precios.p12}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2 border-t border-slate-800/50">
                                <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-1">Información General</h5>
                                <div className="space-y-4 bg-slate-950/30 p-4 rounded-2xl">
                                    <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Producto</p>
                                            <p className="text-sm text-slate-200 font-medium">{detailCliente.descripcionProducto}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Vendedor</p>
                                            <p className="text-sm text-slate-300">{detailCliente.vendedorNombre}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Aval</p>
                                            <p className="text-sm text-slate-300">{detailCliente.aval}</p>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Ocupación / Empleado</p>
                                            <p className="text-sm text-slate-300">{detailCliente.empleado}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-950 border-t border-slate-800 sticky bottom-0">
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                    onClick={() => handleCobrarClick(detailCliente)} 
                                    className="col-span-3 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold mb-2 shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <DollarSign className="w-5 h-5" />
                                    COBRAR AHORA
                                </button>
                                <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tight active:scale-95 transition-all">PAGOS</button>
                                <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tight active:scale-95 transition-all">VERIFICAR VD</button>
                                <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tight active:scale-95 transition-all">CONVENIO</button>
                                <button className="col-span-3 bg-amber-600/10 text-amber-500 py-3 rounded-xl text-[10px] font-bold uppercase mt-1 border border-amber-500/20 active:bg-amber-600/20 transition-all">AVISO DE COBRO</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

function InfoItem({ label, value, highlight = "text-slate-300" }: any) {
    return (
        <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">{label}</p>
            <p className={`text-sm font-bold truncate ${highlight}`}>{value}</p>
        </div>
    );
}
