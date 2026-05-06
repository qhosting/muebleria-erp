'use client';

import { X, Phone, MapPin, Calendar, Printer, User, ShoppingBag, CreditCard, DollarSign } from "lucide-react";
import { OfflineCliente } from "@/lib/offline-db";
import { formatCurrency, getDayName } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ProfileModalProps {
    cliente: OfflineCliente;
    onClose: () => void;
    onAviso: (cliente: OfflineCliente) => void;
}

export function ProfileModal({ cliente, onClose, onAviso }: ProfileModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-800 shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <h3 className="font-bold text-white text-lg">Perfil Detallado</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 active:scale-90 transition-all">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Encabezado con Nombre */}
                    <div className="flex items-center space-x-5">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-500 font-bold text-3xl shadow-inner">
                            {cliente.nombreCompleto.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-2xl font-black text-white leading-tight truncate">{cliente.nombreCompleto}</h4>
                            <p className="text-sm text-slate-500 font-mono tracking-tighter mt-1 uppercase">ID: {cliente.id}</p>
                        </div>
                    </div>

                    {/* Dashboard de Saldos */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-sm">
                            <p className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-widest">Saldo Actual</p>
                            <p className="text-2xl font-black text-white">${Math.round(cliente.saldoPendiente)}</p>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-sm">
                            <p className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-widest">Saldo Vencido</p>
                            <p className="text-2xl font-black text-amber-500">${Math.round(cliente.saldoVencido || 0)}</p>
                        </div>
                    </div>

                    {/* Esquema de Precios (Si están disponibles) */}
                    {(cliente.precios || cliente.montoCredito) && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <ShoppingBag className="w-4 h-4 text-slate-500" />
                                <h5 className="text-[11px] uppercase font-black text-slate-500 tracking-widest">Esquema de Precios</h5>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <PriceCard label="Contado" value={cliente.precios?.contado || cliente.montoCredito} />
                                <PriceCard label="Vendido en" value={cliente.vendidoEn} />
                                <PriceCard label="6 Meses" value={cliente.precios?.p6} />
                                <PriceCard label="12 Meses" value={cliente.precios?.p12} />
                            </div>
                        </div>
                    )}

                    {/* Información de Venta */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <CreditCard className="w-4 h-4 text-slate-500" />
                            <h5 className="text-[11px] uppercase font-black text-slate-500 tracking-widest">Detalle de Crédito</h5>
                        </div>
                        <div className="bg-slate-950/50 rounded-2xl border border-slate-800 divide-y divide-slate-800/50">
                            <DetailRow label="Producto" value={cliente.descripcionProducto} icon={<ShoppingBag className="w-4 h-4" />} />
                            <DetailRow label="Vendedor" value={cliente.vendedorNombre} icon={<User className="w-4 h-4" />} />
                            <DetailRow label="Periodicidad" value={cliente.diaPago ? `Paga los ${getDayName(cliente.diaPago)}` : 'N/A'} icon={<Calendar className="w-4 h-4" />} />
                            <DetailRow label="Pago Acordado" value={`$${Math.round(cliente.montoAcordado)}`} icon={<DollarSign className="w-4 h-4" />} highlight="text-emerald-400" />
                        </div>
                    </div>

                    {/* Ubicación y Contacto */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            <h5 className="text-[11px] uppercase font-black text-slate-500 tracking-widest">Ubicación y Contacto</h5>
                        </div>
                        <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-4 space-y-4">
                            <div className="space-y-1">
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Dirección</p>
                                <p className="text-base text-slate-200 leading-snug">{cliente.direccion}</p>
                            </div>
                            {cliente.telefono && (
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Teléfono</p>
                                    <p className="text-lg text-slate-200 font-bold tracking-tight">{cliente.telefono}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Acciones Inferiores */}
                <div className="p-6 bg-slate-800/80 border-t border-slate-700/50 grid grid-cols-1 gap-3">
                    <Button 
                        onClick={() => onAviso(cliente)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-7 rounded-2xl text-base shadow-lg shadow-amber-900/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Printer className="w-6 h-6" />
                        IMPRIMIR AVISO DE COBRO
                    </Button>
                    <Button 
                        variant="ghost" 
                        onClick={onClose}
                        className="w-full text-slate-400 font-bold py-4 active:bg-white/5"
                    >
                        CERRAR PERFIL
                    </Button>
                </div>
            </div>
        </div>
    );
}

function PriceCard({ label, value }: { label: string, value?: number }) {
    if (!value) return null;
    return (
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/50 shadow-inner">
            <p className="text-[9px] text-slate-500 uppercase font-black mb-1 tracking-tighter">{label}</p>
            <p className="text-lg font-black text-slate-200">${Math.round(value)}</p>
        </div>
    );
}

function DetailRow({ label, value, icon, highlight = "text-slate-300" }: { label: string, value?: string, icon: React.ReactNode, highlight?: string }) {
    if (!value) return null;
    return (
        <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
                <div className="text-slate-500">{icon}</div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">{label}</p>
            </div>
            <p className={`text-sm font-black text-right ${highlight}`}>{value}</p>
        </div>
    );
}
