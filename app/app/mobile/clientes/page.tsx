"use client";

import { useEffect, useState, Suspense } from "react";
import { Search, MapPin, DollarSign, ChevronRight, X, Send, Printer, History, Calendar, CheckCircle2, Handshake, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { usePlatform } from "@/hooks/usePlatform";
import { formatWhatsAppNumber } from "@/lib/utils";
import { useBluetoothPrinter } from "@/hooks/use-bluetooth-printer";
import { VerificacionModal } from "@/components/mobile/verificacion-modal";
import { ConvenioModal } from "@/components/mobile/convenio-modal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { db } from "@/lib/offline-db";

export default function MobileClientesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        }>
            <MobileClientes />
        </Suspense>
    );
}

function MobileClientes() {
    const { data: session } = useSession();
    const { isNative } = usePlatform();
    const searchParams = useSearchParams();
    const { isConnected, printCollectionNotice, connectToPrinter, printTicket } = useBluetoothPrinter();
    const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
    const [idFromUrl, setIdFromUrl] = useState(searchParams.get("id"));
    const [selectedCliente, setSelectedCliente] = useState<any>(null);
    const [detailCliente, setDetailCliente] = useState<any>(null);
    const [montoCobrar, setMontoCobrar] = useState("");
    const [pagoExitoso, setPagoExitoso] = useState(false);
    const [loading, setLoading] = useState(true);
    const [clientes, setClientes] = useState<any[]>([]);
    const [mostrarTodos, setMostrarTodos] = useState(false);
    const [filtroDia, setFiltroDia] = useState("todos");
    const [filtroEstatus, setFiltroEstatus] = useState("todos");
    
    // Estados para el cobro
    const [interesMoratorio, setInteresMoratorio] = useState("0");
    const [gastosCobranza, setGastosCobranza] = useState("0");
    const [tipoPago, setTipoPago] = useState("regular");
    const [metodoPago, setMetodoPago] = useState("GESTOR");
    const [concepto, setConcepto] = useState("");
    
    // Estados para historial de pagos
    const [historicoPagos, setHistoricoPagos] = useState<any[]>([]);
    const [verHistorico, setVerHistorico] = useState(false);
    const [cargandoHistorico, setCargandoHistorico] = useState(false);

    // Estados para Verificación
    const [verVerificacion, setVerVerificacion] = useState(false);

    // Estados para Convenio
    const [verConvenio, setVerConvenio] = useState(false);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const fetchClientes = async (reset = false) => {
            setLoading(true);
            const isActuallyOffline = !navigator.onLine;
            setIsOffline(isActuallyOffline);

            try {
                if (isActuallyOffline) {
                    console.log("Modo Offline detectado, consultando base de datos local...");
                    await fetchOfflineClientes(reset);
                    return;
                }

                const currentPage = reset ? 1 : page;
                const response = await fetch(`/api/mobile/clientes?q=${searchTerm}&page=${currentPage}&limit=30`);
                
                if (response.ok) {
                    const result = await response.json();
                    const newData = result.data || [];
                    
                    if (reset) {
                        setClientes(newData);
                        setPage(1);
                    } else {
                        setClientes(prev => {
                            const existingIds = new Set(prev.map(c => c.id));
                            const uniqueNew = newData.filter((c: any) => !existingIds.has(c.id));
                            return [...prev, ...uniqueNew];
                        });
                    }
                    setHasMore(result.page < result.totalPages);

                    // 🚀 SINCRONIZACIÓN: Guardar en local para futuros usos offline
                    if (newData.length > 0) {
                        await syncToLocalDB(newData);
                    }
                } else {
                    // Si falla el API, intentar local
                    await fetchOfflineClientes(reset);
                }
            } catch (error) {
                console.error("Error fetching clientes:", error);
                await fetchOfflineClientes(reset);
            } finally {
                setLoading(false);
                setIsRefreshing(false);
            }
        };

        const fetchOfflineClientes = async (reset: boolean) => {
            try {
                let query = db.clientes.toCollection();
                
                if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    query = db.clientes.filter(c => 
                        (c.nombreCompleto?.toLowerCase() || "").includes(searchLower) ||
                        (c.direccion?.toLowerCase() || "").includes(searchLower)
                    );
                }

                const allOffline = await query.toArray();
                
                // Mapear al formato que espera la UI si es necesario
                const mapped = allOffline.map(c => ({
                    id: c.id,
                    nombre: c.nombreCompleto,
                    direccion: c.direccion,
                    diaPago: c.diaPago,
                    estatus: c.statusCuenta === 'activo' ? 'aldia' : c.statusCuenta,
                    saldo: Number(c.saldoPendiente || 0),
                    saldoVencido: Number(c.saldoVencido || 0),
                    pagoSemanal: Number(c.montoAcordado || 0),
                    telefono: c.telefono,
                    yaPagoEstaSemana: false,
                    // Campos extendidos para perfil
                    descripcionProducto: c.descripcionProducto,
                    vendedorNombre: c.vendedorNombre,
                    empleado: c.empleado,
                    aval: c.aval,
                    montoCredito: c.montoCredito,
                    vendidoEn: c.vendidoEn,
                    precios: c.precios || { contado: 0, p6: 0, p12: 0 },
                    diasVencidos: c.diasVencidos || 0
                }));

                setClientes(mapped);
                setHasMore(false); 
                if (reset) setPage(1);
            } catch (err) {
                console.error("Error in fetchOfflineClientes:", err);
            }
        };

        const syncToLocalDB = async (data: any[]) => {
            try {
                const toPut = data.map(c => ({
                    id: c.id,
                    nombreCompleto: c.nombre,
                    direccion: c.direccion,
                    diaPago: c.diaPago,
                    statusCuenta: c.estatus === 'aldia' ? 'activo' : (c.estatus === 'atrasado' ? 'activo' : c.estatus),
                    saldoPendiente: c.saldo,
                    saldoVencido: c.saldoVencido,
                    montoAcordado: c.pagoSemanal,
                    telefono: c.telefono,
                    // Datos extendidos
                    descripcionProducto: c.descripcionProducto,
                    vendedorNombre: c.vendedorNombre,
                    empleado: c.empleado,
                    aval: c.aval,
                    montoCredito: c.montoCredito,
                    vendidoEn: c.vendidoEn,
                    precios: c.precios,
                    diasVencidos: c.diasVencidos,
                    lastSync: Date.now(),
                    syncStatus: 'synced'
                }));
                await db.clientes.bulkPut(toPut as any);
            } catch (err) {
                console.warn("Failed to sync to local DB:", err);
            }
        };

        const timer = setTimeout(() => fetchClientes(true), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 🚀 NUEVO: Abrir modal automáticamente si viene ID en la URL
    useEffect(() => {
        if (idFromUrl && clientes.length > 0) {
            const found = clientes.find(c => c.id === idFromUrl);
            if (found) {
                setDetailCliente(found);
                // Limpiar el ID para que no se abra de nuevo si cierra y vuelve a buscar
                setIdFromUrl(null);
            }
        }
    }, [clientes, idFromUrl]);

    const handleLoadMore = async () => {
        if (!hasMore || loading) return;
        
        const nextPage = page + 1;
        setPage(nextPage);
        setLoading(true);
        
        try {
            const response = await fetch(`/api/mobile/clientes?q=${searchTerm}&page=${nextPage}&limit=30`);
            if (response.ok) {
                const result = await response.json();
                const newData = result.data || [];
                
                setClientes(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const uniqueNew = newData.filter((c: any) => !existingIds.has(c.id));
                    return [...prev, ...uniqueNew];
                });
                
                setHasMore(result.page < result.totalPages);
            }
        } catch (error) {
            console.error("Error loading more clientes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClienteClick = (cliente: any) => {
        setDetailCliente(cliente);
    };

    const handleCobrarClick = (cliente: any) => {
        if (!cliente) return;
        setDetailCliente(null);
        setSelectedCliente(cliente);
        setMontoCobrar((cliente.pagoSemanal || 0).toString());
        setInteresMoratorio("0");
        setGastosCobranza("0");
        setTipoPago("regular");
        setMetodoPago("gestor");
        setConcepto("");
        setPagoExitoso(false);
    };

    const confirmarCobro = async () => {
        if (!selectedCliente || !montoCobrar) return;

        let latitud = null;
        let longitud = null;

        // Intentar obtener ubicación GPS
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            });
            latitud = position.coords.latitude.toString();
            longitud = position.coords.longitude.toString();
        } catch (error) {
            console.warn("No se pudo obtener ubicación GPS para el cobro:", error);
        }

        const { syncService } = await import("@/lib/sync-service");
        const cobradorId = (session?.user as any)?.id;

        if (!cobradorId) {
            toast.error("Error de sesión", { description: "Por favor vuelve a iniciar sesión." });
            return;
        }
        
        const montoTotal = parseFloat(montoCobrar) + parseFloat(interesMoratorio) + parseFloat(gastosCobranza);
        
        const pagoPayload = {
            clienteId: selectedCliente.id,
            cobradorId,
            monto: montoTotal,
            montoAbono: parseFloat(montoCobrar),
            interesMoratorio: parseFloat(interesMoratorio),
            gastosCobranza: parseFloat(gastosCobranza),
            fechaPago: new Date().toISOString(),
            metodoPago,
            tipoPago,
            concepto: concepto || (tipoPago === 'regular' ? 'Pago de cuota' : tipoPago),
            latitud,
            longitud
        };

        try {
            // 1. Agregar a la cola de sincronización robusta (Dexie)
            await syncService.addPagoOffline(pagoPayload as any);
            
            // 2. Actualizar base de datos local (Dexie) para que persista el nuevo saldo offline
            const clienteLocal = await db.clientes.get(selectedCliente.id);
            if (clienteLocal) {
                const nuevoSaldo = Number(clienteLocal.saldoPendiente || 0) - parseFloat(montoCobrar);
                await db.clientes.update(selectedCliente.id, {
                    saldoPendiente: nuevoSaldo,
                    syncStatus: 'synced' // Marcamos como sincronizado localmente
                });
            }

            setPagoExitoso(true);
            
            // 3. Actualizar estado local de la UI
            setClientes(prev => prev.map(c => 
                c.id === selectedCliente.id 
                ? { ...c, saldo: c.saldo - parseFloat(montoCobrar), yaPagoEstaSemana: true } 
                : c
            ));

            toast.success("Pago registrado localmente", {
                description: "Se sincronizará automáticamente cuando tengas señal."
            });
        } catch (error) {
            console.error("Error al registrar pago:", error);
            toast.error("Error al guardar el pago");
        }
    };

    const handleImprimirRecibo = async () => {
        if (!selectedCliente || !isConnected) {
            if (!isConnected) {
                toast.error("Impresora no conectada", {
                    action: {
                        label: "Conectar",
                        onClick: () => connectToPrinter()
                    }
                });
            }
            return;
        }

        try {
            const ticketData = {
                cliente: {
                    nombreCompleto: selectedCliente.nombre,
                    direccion: selectedCliente.direccion,
                    diaPago: selectedCliente.diaPago,
                    telefono: selectedCliente.telefono
                },
                cobrador: {
                    nombre: session?.user?.name || "COBRADOR",
                    id: (session?.user as any)?.id || "N/A"
                },
                pago: {
                    monto: parseFloat(montoCobrar),
                    interesMoratorio: parseFloat(interesMoratorio),
                    gastosCobranza: parseFloat(gastosCobranza),
                    tipoPago,
                    metodoPago,
                    concepto: concepto || "Pago de cuota",
                    fechaPago: new Date().toISOString()
                },
                saldos: {
                    anterior: selectedCliente.saldo,
                    nuevo: selectedCliente.saldo - parseFloat(montoCobrar)
                },
                empresa: {
                    nombre: "VERTEX ERP - MUEBLERIA",
                    direccion: "CENTRO DE OPERACIONES"
                }
            };

            await (printTicket as any)(ticketData);
        } catch (error) {
            console.error("Error al imprimir recibo:", error);
            toast.error("Error al imprimir el recibo");
        }
    };

    const enviarWhatsApp = () => {
        if (!selectedCliente) return;

        const mensaje = `Hola ${selectedCliente.nombre}, recibimos tu pago de $${montoCobrar}.
Saldo restante: $${selectedCliente.saldo}.
Fecha: ${new Date().toLocaleDateString()}.
¡Gracias por tu pago!`;

        const telefono = formatWhatsAppNumber(selectedCliente.telefono);
        const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

        if (isNative) {
            window.open(url, '_system');
        } else {
            window.open(url, '_blank');
        }
    };

    const handleAvisoCobro = async (cliente: any) => {
        if (!isConnected) {
            toast.error("Impresora no conectada", {
                action: {
                    label: "Conectar",
                    onClick: () => connectToPrinter()
                }
            });
            return;
        }

        try {
            toast.info("Imprimiendo aviso...");
            await printCollectionNotice(cliente);
        } catch (error) {
            console.error("Error al imprimir aviso:", error);
            toast.error("Error al imprimir aviso de cobro");
        }
    };

    const handleVerPagos = async (cliente: any) => {
        setVerHistorico(true);
        setCargandoHistorico(true);
        try {
            const res = await fetch(`/api/mobile/pagos?clienteId=${cliente.id}`);
            if (res.ok) {
                const data = await res.json();
                setHistoricoPagos(data);
            }
        } catch (e) {
            toast.error("Error al cargar historial");
        } finally {
            setCargandoHistorico(false);
        }
    };

    const filteredClientes = clientes.filter(c => {
        if (!c) return false;
        
        // Búsqueda por Nombre, Calle o Colonia (ya viene filtrado por API pero reforzamos localmente)
        const nombre = c.nombre || "";
        const direccion = c.direccion || "";
        
        const matchesSearch = nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            direccion.toLowerCase().includes(searchTerm.toLowerCase());
        
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
                                <h3 className="font-bold text-slate-200 truncate">{cliente.nombre || 'Sin Nombre'}</h3>
                                <div className="flex items-start text-slate-500 text-[11px] mt-1">
                                    <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-1">{cliente.direccion || 'Sin dirección'}</span>
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
                                    <p className="text-base font-mono font-bold text-slate-200">${cliente.saldo || 0}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-amber-500 uppercase font-bold">Vencido</p>
                                    <p className="text-base font-mono font-bold text-amber-500">${Math.round(cliente.saldoVencido || 0)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Ver Perfil</span>
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                            </div>
                        </div>
                    </div>
                ))}

                {hasMore && (
                    <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-sm font-bold active:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <span>Cargar más clientes</span>
                        )}
                    </button>
                )}

                {!hasMore && filteredClientes.length > 0 && (
                    <p className="text-center text-[10px] text-slate-600 py-4 uppercase tracking-widest font-bold">
                        Fin de la lista
                    </p>
                )}

                {filteredClientes.length === 0 && !loading && (
                    <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50">
                        <Search className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                        <p className="text-slate-500 font-bold">No se encontraron clientes</p>
                        <p className="text-[10px] text-slate-600 mt-1 uppercase">Prueba con otro filtro o término de búsqueda</p>
                    </div>
                )}
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
                                    {(detailCliente.nombre || "S").charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-white leading-tight">{detailCliente.nombre || "Sin Nombre"}</h4>
                                    <p className="text-sm text-slate-500 font-mono">Código: {detailCliente.codigoCliente || "N/A"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                                <InfoItem label="Periodicidad" value={detailCliente.periodicidad || 'N/A'} />
                                <InfoItem label="Pago Sugerido" value={`$${detailCliente.pagoSemanal || 0}`} highlight="text-emerald-400" />
                                <InfoItem label="Saldo Actual" value={`$${detailCliente.saldo || 0}`} highlight="text-white" />
                                <InfoItem label="Saldo Vencido" value={`$${Math.round(detailCliente.saldoVencido || 0)}`} highlight="text-amber-500" />
                                <InfoItem label="Días Vencido" value={detailCliente.diasVencidos || 0} />
                                <InfoItem label="Monto Crédito" value={`$${detailCliente.montoCredito || 0}`} />
                            </div>

                            <div className="space-y-4 pt-2">
                                <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-1">Esquema de Precios</h5>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Precio Contado</p>
                                        <p className="text-sm font-bold text-slate-200">${detailCliente.precios?.contado || 0}</p>
                                    </div>
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Vendido en $</p>
                                        <p className="text-sm font-bold text-slate-200">${detailCliente.vendidoEn || 0}</p>
                                    </div>
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Precio 6 Meses</p>
                                        <p className="text-sm font-bold text-slate-200">${detailCliente.precios?.p6 || 0}</p>
                                    </div>
                                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Precio 12 Meses</p>
                                        <p className="text-sm font-bold text-slate-200">${detailCliente.precios?.p12 || 0}</p>
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
                                            <p className="text-sm text-slate-300">{detailCliente.vendedorNombre || 'No asignado'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Aval</p>
                                            <p className="text-sm text-slate-300">{detailCliente.aval || 'No asignado'}</p>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Ocupación / Empleado</p>
                                            <p className="text-sm text-slate-300">{detailCliente.empleado || 'No especificado'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 pb-20 bg-slate-950 border-t border-slate-800 sticky bottom-0">
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                    onClick={() => handleCobrarClick(detailCliente)} 
                                    className="col-span-3 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold mb-2 shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <DollarSign className="w-5 h-5" />
                                    COBRAR AHORA
                                </button>
                                <button 
                                    onClick={() => handleVerPagos(detailCliente)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-tight active:scale-95 transition-all flex items-center justify-center gap-1"
                                >
                                    <History className="w-3.5 h-3.5" />
                                    PAGOS
                                </button>
                                <button 
                                    onClick={() => setVerVerificacion(true)}
                                    className="bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-tight active:scale-95 transition-all"
                                >
                                    VERIFICAR VD
                                </button>
                                <button 
                                    onClick={() => setVerConvenio(true)}
                                    className="bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-tight active:scale-95 transition-all flex items-center justify-center gap-1"
                                >
                                    <Handshake className="w-3.5 h-3.5" />
                                    CONVENIO
                                </button>
                                <button 
                                    onClick={() => handleAvisoCobro(detailCliente)}
                                    className="col-span-3 bg-amber-600/10 text-amber-500 py-3 rounded-xl text-[10px] font-bold uppercase mt-1 border border-amber-500/20 active:bg-amber-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-3 h-3" />
                                    AVISO DE COBRO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE COBRO */}
            {selectedCliente && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 pb-20">

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
                                    <div className="text-center bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">{selectedCliente.nombre}</p>
                                        <p className="text-3xl font-bold text-emerald-400 font-mono">
                                            ${(parseFloat(montoCobrar || "0") + parseFloat(interesMoratorio || "0") + parseFloat(gastosCobranza || "0")).toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Total a Recibir</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2">
                                                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5 ml-1">Monto Abono (Saldo)</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-4 h-4" />
                                                    <input
                                                        type="number"
                                                        value={montoCobrar}
                                                        onChange={(e) => setMontoCobrar(e.target.value)}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-white font-mono focus:outline-none focus:border-emerald-500 text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5 ml-1">Interés Mora</label>
                                                <input
                                                    type="number"
                                                    value={interesMoratorio}
                                                    onChange={(e) => setInteresMoratorio(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white font-mono focus:outline-none focus:border-orange-500 text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5 ml-1">Gastos Cobro</label>
                                                <input
                                                    type="number"
                                                    value={gastosCobranza}
                                                    onChange={(e) => setGastosCobranza(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white font-mono focus:outline-none focus:border-blue-500 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5 ml-1">Tipo Pago</label>
                                                <select 
                                                    value={tipoPago}
                                                    onChange={(e) => setTipoPago(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-sky-500 appearance-none"
                                                >
                                                    <option value="regular">Regular</option>
                                                    <option value="abono">Abono</option>
                                                    <option value="moratorio">Mora</option>
                                                    <option value="liquidacion">Liquidación</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5 ml-1">Método</label>
                                                <select 
                                                    value={metodoPago}
                                                    onChange={(e) => setMetodoPago(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-white text-xs focus:outline-none focus:border-sky-500 appearance-none"
                                                >
                                                    <option value="gestor">GESTOR</option>
                                                    <option value="bancario">GESTOR BANCOS</option>
                                                    <option value="bancario_bot">BANCOS BOT</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5 ml-1">Concepto / Notas</label>
                                            <textarea
                                                value={concepto}
                                                onChange={(e) => setConcepto(e.target.value)}
                                                rows={2}
                                                placeholder="Opcional..."
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
                                            />
                                        </div>

                                        <button
                                            onClick={confirmarCobro}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 mt-2"
                                        >
                                            <span>Confirmar Cobro</span>
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

                                        <button 
                                            onClick={handleImprimirRecibo}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 active:scale-95 transition-transform"
                                        >
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

            {/* MODAL HISTORIAL DE PAGOS */}
            {verHistorico && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-400" />
                                <h3 className="font-bold text-white text-base">Historial de Pagos</h3>
                            </div>
                            <button onClick={() => setVerHistorico(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {cargandoHistorico ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                                    <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Consultando Servidor...</p>
                                </div>
                            ) : historicoPagos.length === 0 ? (
                                <div className="text-center py-20 opacity-40">
                                    <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                    <p className="text-sm font-bold">Sin pagos registrados</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {historicoPagos.map((pago) => (
                                        <div key={pago.id} className="bg-slate-950/50 border border-slate-800/50 p-4 rounded-2xl flex justify-between items-center">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-white">${Number(pago.monto)}</span>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border ${
                                                        pago.metodoPago === 'bancario' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    }`}>
                                                        {pago.metodoPago}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold">{new Date(pago.fechaPago).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] text-slate-500 uppercase font-black">Concepto</p>
                                                <p className="text-[10px] text-slate-300 font-bold">{pago.concepto || 'Pago Regular'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
                            <Button 
                                onClick={() => setVerHistorico(false)}
                                className="w-full bg-slate-800 text-white rounded-xl py-3 font-bold text-xs"
                            >
                                ENTENDIDO
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL VERIFICACIÓN VD */}
            {detailCliente && (
                <VerificacionModal 
                    cliente={detailCliente}
                    isOpen={verVerificacion}
                    onClose={() => setVerVerificacion(false)}
                    onSuccess={() => {
                        setVerVerificacion(false);
                    }}
                    isOnline={true}
                />
            )}

            {/* MODAL CONVENIO DE PAGO */}
            {detailCliente && (
                <ConvenioModal 
                    cliente={detailCliente}
                    isOpen={verConvenio}
                    onClose={() => setVerConvenio(false)}
                    onSuccess={() => {
                        setVerConvenio(false);
                    }}
                    isOnline={true}
                />
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
