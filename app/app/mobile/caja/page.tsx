"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlatform } from "@/hooks/usePlatform";
import { Loader2, DollarSign, Printer, Download, CreditCard, ChevronUp, ChevronDown, CheckCircle2, Calendar, Filter, RefreshCw, Eye } from "lucide-react";
import { useBluetoothPrinter } from "@/hooks/use-bluetooth-printer";
import { toast } from "sonner";
import { formatCurrency, formatWhatsAppNumber } from "@/lib/utils";
import { VisualizarTicketModal } from "@/components/mobile/visualizar-ticket-modal";
import { ArqueoModal } from "@/components/mobile/arqueo-modal";
import { sharePdfNative } from "@/lib/native/share";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MobileCaja() {
    const { isNative } = usePlatform();
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [stats, setStats] = useState<any>({
        cobradoHoy: 0,
        pagosRegistrados: 0,
        cuentasTotales: 0,
        efectivo: 0,
        cuentasEfectivo: 0,
        bancarioManual: 0,
        cuentasBancarioManual: 0,
        bancarioBot: 0,
        cuentasBancarioBot: 0,
        dp: {
            total: 0,
            cuentas: 0,
            efectivo: 0,
            cuentasEfectivo: 0,
            bancarioManual: 0,
            cuentasBancarioManual: 0,
            bancarioBot: 0,
            cuentasBancarioBot: 0
        },
        dq: {
            total: 0,
            cuentas: 0,
            efectivo: 0,
            cuentasEfectivo: 0,
            bancarioManual: 0,
            cuentasBancarioManual: 0,
            bancarioBot: 0,
            cuentasBancarioBot: 0
        }
    });
    const [pagos, setPagos] = useState<any[]>([]);
    const { isConnected, printTicket, printCollectionReport, printArqueo, connectToPrinter } = useBluetoothPrinter();
    const [printing, setPrinting] = useState<string | null>(null);
    const [selectedPago, setSelectedPago] = useState<any | null>(null);
    const [showArqueoModal, setShowArqueoModal] = useState(false);
    const [showVisualizarModal, setShowVisualizarModal] = useState(false);
    const [visualizarTicketData, setVisualizarTicketData] = useState<any | null>(null);

    const handleVerTicket = (pago: any) => {
        if (!pago) return;
        
        const data = {
            numeroRecibo: pago.numeroRecibo || `REC-${pago.id.slice(-8)}`,
            cliente: {
                nombreCompleto: pago.cliente.nombreCompleto || "",
                telefono: pago.cliente.telefono,
                direccion: pago.cliente.direccionCompleta || pago.cliente.direccion || "",
                diaPago: pago.cliente.diaPago
            },
            cobrador: {
                nombre: pago.cobrador?.name || "Cobrador",
                id: pago.cobrador?.id || ""
            },
            pago: {
                monto: pago.monto,
                interesMoratorio: pago.interesMoratorio,
                gastosCobranza: pago.gastosCobranza,
                tipoPago: pago.tipoPago,
                metodoPago: pago.metodoPago,
                concepto: pago.concepto,
                fechaPago: pago.fechaPago
            },
            saldos: {
                anterior: pago.saldoAnterior,
                nuevo: pago.saldoNuevo,
            },
            empresa: {
                nombre: 'Grupo Mueblero DASO',
                direccion: 'Juarez Ote. 223, Centro, SJR. QRO',
                telefono: 'Tel: 442 980 0772'
            }
        };

        setVisualizarTicketData(data);
        setShowVisualizarModal(true);
    };

    // Calcular ciclo semanal de cobranza (Sábado a Viernes)
    const getWeekCycleDates = () => {
        const today = dayjs();
        const day = today.day(); // 0: Sunday, 1: Monday, ..., 6: Saturday
        
        let daysToSubtract = 0;
        if (day === 6) {
            daysToSubtract = 0;
        } else {
            daysToSubtract = day + 1;
        }
        
        let daysToAdd = 0;
        if (day === 6) {
            daysToAdd = 6;
        } else {
            daysToAdd = 5 - day;
        }
        
        const startOfCycle = today.subtract(daysToSubtract, 'day').startOf('day');
        const endOfCycle = today.add(daysToAdd, 'day').endOf('day');
        
        return {
            from: startOfCycle.format('YYYY-MM-DDTHH:mm'),
            to: endOfCycle.format('YYYY-MM-DDTHH:mm')
        };
    };

    const cycleDates = getWeekCycleDates();
    const [dateFrom, setDateFrom] = useState(cycleDates.from);
    const [dateTo, setDateTo] = useState(cycleDates.to);
    const [showFilters, setShowFilters] = useState(false);

    const fetchCajaData = useCallback(async () => {
        setLoading(true);
        try {
            const url = new URL('/api/mobile/caja', window.location.origin);
            
            const fromDate = dayjs(dateFrom);
            const toDate = dayjs(dateTo);
            
            if (fromDate.isValid() && toDate.isValid()) {
                url.searchParams.append('from', fromDate.toISOString());
                url.searchParams.append('to', toDate.toISOString());
            } else {
                toast.error("Rango de fechas inválido");
                setLoading(false);
                return;
            }
            
            const response = await fetch(url.toString());
            if (response.ok) {
                const data = await response.json();
                setStats(data.stats);
                setPagos(data.pagos);
            } else {
                toast.error("Error al obtener los datos de la caja");
            }
        } catch (error) {
            console.error("Error fetching caja data:", error);
            toast.error("Error al cargar datos de caja");
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo]);

    useEffect(() => {
        fetchCajaData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p>Calculando arqueo de caja...</p>
            </div>
        );
    }

    const toggleExpand = () => setIsExpanded(!isExpanded);

    const handlePrintReport = async () => {
        if (!isConnected) {
            toast.error("Impresora no conectada", {
                action: {
                    label: "Conectar",
                    onClick: () => connectToPrinter()
                }
            });
            return;
        }

        setPrinting("report");
        try {
            await printCollectionReport(stats, pagos, { from: dateFrom, to: dateTo });
        } catch (error) {
            console.error("Error al imprimir reporte:", error);
        } finally {
            setPrinting(null);
        }
    };

    const fetchPagoDetails = async (pagoId: string) => {
        try {
            const response = await fetch(`/api/pagos/${pagoId}`);
            if (!response.ok) throw new Error("No se pudo obtener el detalle");
            const data = await response.json();
            setSelectedPago(data);
        } catch (error) {
            toast.error("Error al cargar detalles");
        }
    };

    const handleReprintTicket = async (pagoId: string) => {
        if (!isConnected) {
            toast.error("Conecta la impresora primero");
            return;
        }

        setPrinting(pagoId);
        try {
            const response = await fetch(`/api/pagos/${pagoId}`);
            if (!response.ok) throw new Error("No se pudo obtener el detalle del pago");
            
            const data = await response.json();
            
            // Mapear a formato TicketData
            const ticketData = {
                numeroRecibo: data.numeroRecibo || "",
                cliente: {
                    nombreCompleto: data.cliente.nombreCompleto,
                    telefono: data.cliente.telefono,
                    direccion: data.cliente.direccionCompleta,
                    diaPago: data.cliente.diaPago
                },
                cobrador: {
                    nombre: data.cobrador?.name || "Cobrador",
                    id: data.cobrador?.id || ""
                },
                pago: {
                    monto: data.monto,
                    interesMoratorio: data.interesMoratorio,
                    gastosCobranza: data.gastosCobranza,
                    tipoPago: data.tipoPago,
                    metodoPago: data.metodoPago,
                    concepto: data.concepto,
                    fechaPago: data.fechaPago
                },
                saldos: {
                    anterior: data.saldoAnterior,
                    nuevo: data.saldoNuevo,
                },
                empresa: {
                    nombre: 'Grupo Mueblero DASO',
                    direccion: 'Juarez Ote. 223, Centro, SJR. QRO',
                    telefono: 'Tel: 442 980 0772'
                }
            };

            await printTicket(ticketData as any);
        } catch (error) {
            console.error("Error reimprimiendo:", error);
            toast.error("Error al reimprimir ticket");
        } finally {
            setPrinting(null);
        }
    };
    const handleShareWhatsApp = async (pago: any) => {
        if (!pago) return;

        try {
            const telefono = formatWhatsAppNumber(pago.cliente.telefono);
            if (!telefono) {
                toast.error("El cliente no tiene un teléfono válido");
                return;
            }

            // Mapear a formato TicketData
            const ticketData = {
                numeroRecibo: pago.numeroRecibo || `REC-${pago.id.slice(-8)}`,
                cliente: {
                    nombreCompleto: pago.cliente.nombreCompleto || "",
                    telefono: pago.cliente.telefono,
                    direccion: pago.cliente.direccionCompleta || pago.cliente.direccion || "",
                    diaPago: pago.cliente.diaPago
                },
                cobrador: {
                    nombre: pago.cobrador?.name || "Cobrador",
                    id: pago.cobrador?.id || ""
                },
                pago: {
                    monto: pago.monto,
                    interesMoratorio: pago.interesMoratorio,
                    gastosCobranza: pago.gastosCobranza,
                    tipoPago: pago.tipoPago,
                    metodoPago: pago.metodoPago,
                    concepto: pago.concepto,
                    fechaPago: pago.fechaPago
                },
                saldos: {
                    anterior: pago.saldoAnterior,
                    nuevo: pago.saldoNuevo,
                },
                empresa: {
                    nombre: 'Grupo Mueblero DASO',
                    direccion: 'Juarez Ote. 223, Centro, SJR. QRO',
                    telefono: 'Tel: 442 980 0772'
                }
            };

            const total = Number(pago.monto || 0) + Number(pago.interesMoratorio || 0) + Number(pago.gastosCobranza || 0);
            const mensaje = `Hola *${pago.cliente.nombreCompleto}* 👋, adjunto encontrarás tu comprobante de pago por *$${total.toFixed(2)}* del ${new Date(pago.fechaPago).toLocaleDateString('es-MX')}. ¡Gracias!`;

            toast.info('Abriendo WhatsApp para enviar mensaje...');
            
            // 1. Abrir WhatsApp primero con el mensaje de texto
            const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
            window.open(url, isNative ? '_system' : '_blank');

            // 2. Registrar el listener de retorno para compartir el PDF nativamente
            let triggered = false;
            const sharePDF = async () => {
                if (triggered) return;
                triggered = true;

                window.removeEventListener('focus', sharePDF);

                toast.info('Generando comprobante PDF para compartir...');
                const { generateReceiptPdf } = await import("@/lib/receipt-pdf");
                const doc = await generateReceiptPdf(ticketData);

                const clienteCodigo = pago.cliente.codigoCliente || pago.cliente.nombreCompleto?.replace(/\s+/g, '_') || 'cliente';
                const pdfName = `Comprobante_${clienteCodigo}_${ticketData.numeroRecibo}.pdf`;
                const shareTitle = `Comprobante de Pago — ${pago.cliente.nombreCompleto}`;
                const shareText = `Comprobante de pago por $${total.toFixed(2)} — ${new Date(pago.fechaPago).toLocaleDateString('es-MX')}`;

                // Intentar compartir usando el plugin nativo de Capacitor (APK)
                const sharedNatively = await sharePdfNative(doc, pdfName, shareTitle, shareText);

                if (!sharedNatively) {
                    // Fallback: intentar Web Share API (Navegadores móviles compatibles)
                    const pdfOutput = doc.output('arraybuffer');
                    const pdfBlob = new Blob([pdfOutput], { type: 'application/pdf' });
                    const pdfFile = new File([pdfBlob], pdfName, { type: 'application/pdf' });

                    const canShare = typeof navigator.share === 'function' && navigator.canShare?.({ files: [pdfFile] });

                    if (canShare) {
                        await navigator.share({
                            title: shareTitle,
                            text: shareText,
                            files: [pdfFile],
                        });
                        toast.success('PDF compartido exitosamente');
                    } else {
                        doc.save(pdfName);
                        toast.success('PDF descargado.');
                    }
                } else {
                    toast.success('PDF compartido exitosamente');
                }
            };

            // Registrar listeners para detectar cuando el usuario regrese
            window.addEventListener('focus', sharePDF);
            
            // Registrar evento de Capacitor si es nativo
            try {
                const { App } = await import('@capacitor/app');
                const listener = await App.addListener('appStateChange', (state) => {
                    if (state.isActive) {
                        sharePDF();
                        listener.remove();
                    }
                });
            } catch (e) {
                console.warn('Capacitor App state listener error:', e);
            }

        } catch (error: any) {
            if (error?.name === 'AbortError') return;
            console.error("Error al compartir PDF:", error);
            toast.error("Error al generar el comprobante PDF");
        }
    };
    const handlePrintArqueo = async (arqueo: any) => {
        try {
            // Guardar en base de datos primero
            const saveResponse = await fetch('/api/mobile/arqueos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(arqueo)
            });

            if (!saveResponse.ok) {
                console.error("Error al guardar arqueo en DB");
            } else {
                toast.success("Arqueo guardado en sistema");
            }

            // Luego imprimir
            await printArqueo(arqueo);
            setShowArqueoModal(false);
        } catch (error) {
            console.error("Error procesando arqueo:", error);
            toast.error("Error al procesar arqueo");
        }
    };

    const totalAbonos = pagos.reduce((sum: number, p: any) => sum + (p.monto || 0), 0);
    const totalMoras = pagos.reduce((sum: number, p: any) => sum + (p.interesMoratorio || 0), 0);
    const totalGastos = pagos.reduce((sum: number, p: any) => sum + (p.gastosCobranza || 0), 0);
    const granTotal = totalAbonos + totalMoras + totalGastos;

    return (
        <div className="space-y-6 pt-2">
            {/* FILTROS DE RANGO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full flex items-center justify-between p-4 active:bg-slate-800 transition-colors"
                >
                    <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-300">Rango de Cobranza</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-500 font-medium">
                            {dayjs(dateFrom).format('DD/MM HH:mm')} - {dayjs(dateTo).format('DD/MM HH:mm')}
                        </span>
                        {showFilters ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                    </div>
                </button>

                {showFilters && (
                    <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top duration-200">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Desde</label>
                                <Input 
                                    type="datetime-local" 
                                    value={dateFrom}
                                    onChange={(e: any) => setDateFrom(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-xs text-white h-10 rounded-xl"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Hasta</label>
                                <Input 
                                    type="datetime-local" 
                                    value={dateTo}
                                    onChange={(e: any) => setDateTo(e.target.value)}
                                    className="bg-slate-950 border-slate-800 text-xs text-white h-10 rounded-xl"
                                />
                            </div>
                        </div>
                        <Button 
                            onClick={() => {
                                fetchCajaData();
                                setShowFilters(false);
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Actualizar Corte
                        </Button>
                    </div>
                )}
            </div>

            {/* RESUMEN PRINCIPAL */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-end mb-1">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total Cobrado Hoy</p>
                        <p className="text-emerald-500/80 text-[10px] font-black uppercase tracking-widest">{stats.cuentasTotales} CUENTAS</p>
                    </div>
                    <p className="text-5xl font-black text-white tracking-tighter">{formatCurrency(stats.cobradoHoy, 0)}</p>

                    <div className="mt-6 grid grid-cols-3 gap-2 border-t border-slate-700/50 pt-4">
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Efectivo</p>
                            <p className="text-lg font-black text-slate-200">{formatCurrency(stats.efectivo, 0)}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">{stats.cuentasEfectivo} CTAS</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Bancario M.</p>
                            <p className="text-lg font-black text-slate-200">{formatCurrency(stats.bancarioManual, 0)}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">{stats.cuentasBancarioManual} CTAS</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Bancario Bot</p>
                            <p className="text-lg font-black text-emerald-400">{formatCurrency(stats.bancarioBot, 0)}</p>
                            <p className="text-[9px] text-emerald-500/50 font-bold uppercase">{stats.cuentasBancarioBot} CTAS</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* DESGLOSE POR RUTA / EMPRESA (DP & DQ) */}
            <div className="grid grid-cols-2 gap-4">
                {/* RUTA DQ */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <div className="relative z-10 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="bg-blue-950/80 border border-blue-800/50 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">DQ</span>
                            <span className="text-[9px] text-slate-500 font-bold">{stats.dq?.cuentas || 0} CTAS</span>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{formatCurrency(stats.dq?.total || 0, 0)}</p>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
                            <div className="flex justify-between text-slate-400">
                                <span>Efectivo:</span>
                                <span className="font-semibold text-slate-300">
                                    {formatCurrency(stats.dq?.efectivo || 0, 0)} <span className="text-[9px] text-slate-500">({stats.dq?.cuentasEfectivo || 0})</span>
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>Bancario M:</span>
                                <span className="font-semibold text-slate-300">
                                    {formatCurrency(stats.dq?.bancarioManual || 0, 0)} <span className="text-[9px] text-slate-500">({stats.dq?.cuentasBancarioManual || 0})</span>
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>Bancario Bot:</span>
                                <span className="font-semibold text-emerald-400">
                                    {formatCurrency(stats.dq?.bancarioBot || 0, 0)} <span className="text-[9px] text-emerald-600/50">({stats.dq?.cuentasBancarioBot || 0})</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RUTA DP */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <div className="relative z-10 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="bg-purple-950/80 border border-purple-800/50 text-purple-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">DP</span>
                            <span className="text-[9px] text-slate-500 font-bold">{stats.dp?.cuentas || 0} CTAS</span>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-white">{formatCurrency(stats.dp?.total || 0, 0)}</p>
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
                            <div className="flex justify-between text-slate-400">
                                <span>Efectivo:</span>
                                <span className="font-semibold text-slate-300">
                                    {formatCurrency(stats.dp?.efectivo || 0, 0)} <span className="text-[9px] text-slate-500">({stats.dp?.cuentasEfectivo || 0})</span>
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>Bancario M:</span>
                                <span className="font-semibold text-slate-300">
                                    {formatCurrency(stats.dp?.bancarioManual || 0, 0)} <span className="text-[9px] text-slate-500">({stats.dp?.cuentasBancarioManual || 0})</span>
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>Bancario Bot:</span>
                                <span className="font-semibold text-emerald-400">
                                    {formatCurrency(stats.dp?.bancarioBot || 0, 0)} <span className="text-[9px] text-emerald-600/50">({stats.dp?.cuentasBancarioBot || 0})</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACCIONES DE CAJA */}
            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={handlePrintReport}
                    disabled={printing === "report"}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 p-4 rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors active:scale-95 disabled:opacity-50"
                >
                    <Printer className={`w-6 h-6 text-sky-400 ${printing === "report" ? "animate-pulse" : ""}`} />
                    <span className="text-xs font-bold">Imprimir Reporte</span>
                </button>
                <button 
                    onClick={() => setShowArqueoModal(true)}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 p-4 rounded-xl flex flex-col items-center justify-center space-y-2 transition-colors active:scale-95"
                >
                    <CreditCard className="w-6 h-6 text-amber-400" />
                    <span className="text-xs font-bold">Arqueo de Caja</span>
                </button>
            </div>

            {/* LISTA DE PAGOS DEL DÍA */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider">Últimos Movimientos</h2>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-md">{pagos.length} Pagos</span>
                </div>

                <div className="relative">
                    {/* Línea de tiempo vertical */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-800 pointer-events-none"></div>

                    <div className="space-y-6 pl-0">
                        {pagos.map((pago: any) => (
                            <div key={pago.id} className="relative flex items-start pl-10 group">
                                <div className="absolute left-[11px] top-4 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-900 group-hover:bg-emerald-500 transition-colors z-10"></div>

                                <div 
                                    className="flex-1 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 hover:bg-slate-800 transition-colors active:scale-[0.99] space-y-3"
                                    onClick={() => fetchPagoDetails(pago.id)}
                                >
                                    {/* Header: Cliente y Código */}
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/60 uppercase">
                                                {pago.codigoCliente || 'S/C'}
                                            </span>
                                            <p className="font-bold text-slate-200 text-sm mt-1">{pago.cliente}</p>
                                        </div>
                                        
                                        {/* Monto Principal */}
                                        <div className="text-right">
                                            <p className="font-mono text-emerald-400 font-extrabold text-base">+{formatCurrency(pago.monto)}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{pago.metodo}</p>
                                        </div>
                                    </div>

                                    {/* Desglose de Moras y Gastos (Solo si alguno es mayor a 0) */}
                                    {(pago.interesMoratorio > 0 || pago.gastosCobranza > 0) && (
                                        <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-805/50 text-[11px] font-medium text-slate-400">
                                            {pago.interesMoratorio > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Mora:</span>
                                                    <span className="text-orange-400 font-bold">+{formatCurrency(pago.interesMoratorio)}</span>
                                                </div>
                                            )}
                                            {pago.gastosCobranza > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Gtos. Cobranza:</span>
                                                    <span className="text-sky-400 font-bold">+{formatCurrency(pago.gastosCobranza)}</span>
                                                </div>
                                            )}
                                            <div className="col-span-2 border-t border-slate-800/60 pt-1 flex justify-between font-bold text-slate-300">
                                                <span>Total Recibido:</span>
                                                <span className="text-emerald-400 font-black">+{formatCurrency(pago.monto + pago.interesMoratorio + pago.gastosCobranza)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer: Fecha, Hora y Reimpresión */}
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/40 text-[11px] text-slate-500 font-semibold">
                                        <div className="flex items-center space-x-2">
                                            <span>{pago.fecha}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                                            <span>{pago.hora}</span>
                                        </div>
                                        
                                        <button 
                                            onClick={(e: any) => {
                                                e.stopPropagation();
                                                handleReprintTicket(pago.id);
                                            }}
                                            disabled={!!printing}
                                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors active:scale-90"
                                            title="Reimprimir Ticket"
                                        >
                                            <Printer className={`w-3.5 h-3.5 ${printing === pago.id ? "animate-spin text-emerald-400" : ""}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* TOTALIZADOR DE MOVIMIENTOS */}
                {pagos.length > 0 && (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mt-2 space-y-3 shadow-inner">
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                            Resumen Contable de la Lista
                        </h3>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between text-slate-400 font-semibold">
                                <span>Total Abonos Principal:</span>
                                <span className="font-mono text-slate-200">{formatCurrency(totalAbonos)}</span>
                            </div>
                            
                            {totalMoras > 0 && (
                                <div className="flex justify-between text-slate-400 font-semibold">
                                    <span>Total Intereses Moratorios:</span>
                                    <span className="font-mono text-orange-400">+{formatCurrency(totalMoras)}</span>
                                </div>
                            )}
                            
                            {totalGastos > 0 && (
                                <div className="flex justify-between text-slate-400 font-semibold">
                                    <span>Total Gastos Cobranza:</span>
                                    <span className="font-mono text-sky-400">+{formatCurrency(totalGastos)}</span>
                                </div>
                            )}
                            
                            <div className="border-t border-slate-850 pt-2.5 flex justify-between items-center">
                                <span className="text-slate-300 font-bold uppercase tracking-wide">Gran Total Recibido:</span>
                                <span className="text-lg font-black text-emerald-400 font-mono">
                                    {formatCurrency(granTotal)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DE DETALLE DE PAGO */}
            {selectedPago && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl overflow-y-auto max-h-[90dvh] shadow-2xl animate-in zoom-in-95 duration-200 custom-scrollbar">
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-slate-100 font-bold">Detalle del Pago</h3>
                                <button onClick={() => setSelectedPago(null)} className="text-slate-500 hover:text-slate-300">
                                    <ChevronDown className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Cliente</p>
                                    <p className="text-slate-200 font-medium">{selectedPago.cliente.nombreCompleto}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase">Monto Abono</p>
                                        <p className="text-slate-200 font-mono">{formatCurrency(selectedPago.monto)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase">Método</p>
                                        <p className="text-slate-200">{selectedPago.metodoPago}</p>
                                    </div>
                                </div>

                                {(selectedPago.interesMoratorio > 0 || selectedPago.gastosCobranza > 0) && (
                                    <div className="bg-slate-800/50 rounded-xl p-3 space-y-2">
                                        {selectedPago.interesMoratorio > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">Int. Moratorio:</span>
                                                <span className="text-amber-400">{formatCurrency(selectedPago.interesMoratorio)}</span>
                                            </div>
                                        )}
                                        {selectedPago.gastosCobranza > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-400">Gastos Cobranza:</span>
                                                <span className="text-sky-400">{formatCurrency(selectedPago.gastosCobranza)}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-slate-700 pt-1 flex justify-between text-sm font-bold">
                                            <span className="text-slate-300">Total Recibido:</span>
                                            <span className="text-emerald-400">
                                                {formatCurrency(selectedPago.monto + (selectedPago.interesMoratorio || 0) + (selectedPago.gastosCobranza || 0))}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase">Saldo Anterior</p>
                                        <p className="text-slate-400 font-mono text-xs">{formatCurrency(selectedPago.saldoAnterior)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase">Saldo Nuevo</p>
                                        <p className="text-emerald-400 font-bold font-mono">{formatCurrency(selectedPago.saldoNuevo)}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase">Fecha y Hora</p>
                                    <p className="text-slate-400 text-xs">
                                        {new Date(selectedPago.fechaPago).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 space-y-2">
                                <button 
                                    onClick={() => handleVerTicket(selectedPago)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all text-xs"
                                >
                                    <Eye className="w-4 h-4" />
                                    <span>Visualizar Ticket</span>
                                </button>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleReprintTicket(selectedPago.id)}
                                        className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all text-xs"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span>Reimprimir</span>
                                    </button>
                                    <button 
                                        onClick={() => handleShareWhatsApp(selectedPago)}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all text-xs"
                                    >
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.534 0 10.04-4.501 10.044-10.036.002-2.68-1.038-5.198-2.93-7.091C16.54 1.584 14.03.543 11.37.543c-5.535 0-10.04 4.502-10.044 10.038-.001 1.815.49 3.593 1.42 5.148l-1.008 3.68 3.777-.99c1.517.828 3.027 1.258 4.542 1.259zm11.386-7.855c-.324-.162-1.917-.946-2.213-1.054-.297-.109-.514-.162-.73.162-.217.324-.838 1.054-1.027 1.27-.19.216-.379.243-.703.08-.324-.162-1.372-.507-2.613-1.614-.966-.862-1.617-1.927-1.806-2.25-.19-.324-.02-.499.14-.66.147-.144.325-.378.487-.568.162-.189.216-.324.324-.54.108-.216.054-.405-.027-.567-.08-.162-.73-1.758-1.001-2.407-.263-.632-.53-.547-.73-.557-.189-.01-.405-.012-.622-.012-.216 0-.568.08-.865.405-.297.324-1.135 1.108-1.135 2.703 0 1.594 1.162 3.135 1.324 3.35.162.217 2.287 3.493 5.54 4.896.774.333 1.379.533 1.85.683.778.247 1.487.213 2.047.129.624-.093 1.917-.783 2.189-1.54.27-.757.27-1.406.189-1.54-.08-.135-.297-.216-.621-.378z"/>
                                        </svg>
                                        <span>Compartir</span>
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setSelectedPago(null)}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all text-xs"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BOTÓN CIERRE DE DÍA */}
            <div className="sticky bottom-4 mx-4">
                <button 
                    onClick={() => setShowArqueoModal(true)}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-rose-900/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                >
                    <Download className="w-5 h-5" />
                    <span>Cerrar Caja del Día</span>
                </button>
            </div>

            <ArqueoModal 
                isOpen={showArqueoModal}
                onClose={() => setShowArqueoModal(false)}
                sistemaEfectivo={stats.efectivo}
                onPrint={handlePrintArqueo}
            />

            <VisualizarTicketModal
                isOpen={showVisualizarModal}
                onClose={() => setShowVisualizarModal(false)}
                ticketData={visualizarTicketData}
                onPrint={selectedPago ? () => handleReprintTicket(selectedPago.id) : undefined}
                isPrinting={selectedPago ? printing === selectedPago.id : false}
            />
        </div>
    );
}

