"use client";

import { useEffect, useState } from "react";
import { Loader2, DollarSign, MapPin, Printer, TrendingUp, ShieldAlert, Hash, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePlatform } from "@/hooks/usePlatform";
import { db } from "@/lib/offline-db";

import { useSession } from "next-auth/react";

export default function MobileHome() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_role') : null);
    const isVendedor = userRole === 'vendedor' || userRole === 'jefe_ventas';
    const isDireccion = userRole === 'direccion' || userRole === 'admin';

    const [loading, setLoading] = useState(true);
    const { isNative } = usePlatform();
    const [data, setData] = useState<any>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [preferOffline, setPreferOffline] = useState(true); // 🚀 Por defecto en modo offline preferido

    useEffect(() => {
        const loadSettings = async () => {
            const userId = (session?.user as any)?.id || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_id') : null);
            if (userId) {
                if (session?.user) {
                    localStorage.setItem('last_cobrador_id', userId);
                    if (session.user.name) localStorage.setItem('last_cobrador_name', session.user.name);
                    if (session.user.email) localStorage.setItem('last_cobrador_email', session.user.email);
                    if (userRole) localStorage.setItem('last_cobrador_role', userRole);
                }
                const settings = await db.settings.get(userId);
                if (settings) {
                    setPreferOffline(!!settings.preferOffline);
                } else {
                    // Si no existen settings, inicializar con preferOffline: true por defecto
                    const defaultSettings = {
                        cobradorId: userId,
                        syncEnabled: true,
                        autoSync: true,
                        preferOffline: true, // 🚀 MODO OFFLINE PREFERIDO POR DEFECTO
                        offlineMode: false,
                        printFormat: 'thermal' as const
                    };
                    await db.settings.put(defaultSettings);
                    setPreferOffline(true);
                }
            }
        };
        loadSettings();
    }, [session, userRole]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const isActuallyOffline = !navigator.onLine || preferOffline;
            setIsOffline(isActuallyOffline);

            try {
                if (isActuallyOffline) {
                    console.log("Dashboard en modo offline...");
                    await loadOfflineDashboard();
                    return;
                }

                const endpoint = isDireccion 
                    ? '/api/mobile/direccion/dashboard' 
                    : isVendedor 
                        ? '/api/mobile/vendedor/dashboard' 
                        : '/api/mobile/dashboard';
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout for poor signal

                const response = await fetch(endpoint, {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                } else {
                    await loadOfflineDashboard();
                }
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                await loadOfflineDashboard();
            } finally {
                setLoading(false);
            }
        };

        const loadOfflineDashboard = async () => {
            try {
                const currentUserId = (session?.user as any)?.id;

                // 1. Calcular cobrado hoy desde base de datos local
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                
                const pagosHoy = currentUserId 
                    ? await db.pagos.where('fechaPago').aboveOrEqual(hoy.toISOString()).filter(p => p.cobradorId === currentUserId).toArray()
                    : await db.pagos.where('fechaPago').aboveOrEqual(hoy.toISOString()).toArray();
                const totalCobrado = pagosHoy.reduce((acc, p) => acc + Number(p.monto), 0);
                const cuentasCobradas = pagosHoy.length;

                // 2. Clientes pendientes (Cálculo real en offline)
                const hoyLocal = new Date();
                const dayOfWeekLocal = hoyLocal.getDay(); // 0: Dom, 1: Lun, ..., 6: Sab
                const diffToSaturdayLocal = (dayOfWeekLocal + 1) % 7;
                const inicioCicloLocal = new Date(hoyLocal);
                inicioCicloLocal.setDate(hoyLocal.getDate() - diffToSaturdayLocal);
                inicioCicloLocal.setHours(0, 0, 0, 0);

                const clientesActivos = currentUserId
                    ? await db.clientes.where('statusCuenta').equals('activo').filter(c => c.cobradorAsignadoId === currentUserId).toArray()
                    : await db.clientes.where('statusCuenta').equals('activo').toArray();
                
                // Obtener todos los pagos registrados localmente en este ciclo para verificar cuáles clientes ya pagaron
                const pagosCiclo = currentUserId
                    ? await db.pagos.where('fechaPago').aboveOrEqual(inicioCicloLocal.toISOString()).filter(p => p.cobradorId === currentUserId).toArray()
                    : await db.pagos.where('fechaPago').aboveOrEqual(inicioCicloLocal.toISOString()).toArray();

                // IDs de clientes que ya pagaron en este ciclo (localmente)
                const clientesQuePagaronLocal = new Set(
                    pagosCiclo
                        .filter(p => p.tipoPago === 'regular')
                        .map(p => p.clienteId)
                );

                // Filtrar clientes pendientes
                const clientesPendientesLista = clientesActivos.filter(c => {
                    // Ya pagó localmente en este ciclo
                    if (clientesQuePagaronLocal.has(c.id)) {
                        return false;
                    }
                    // Ya pagó según la fecha del último pago sincronizada del servidor
                    if (c.fechaUltimoPago) {
                        const fechaUltimo = new Date(c.fechaUltimoPago);
                        if (fechaUltimo >= inicioCicloLocal) {
                            return false;
                        }
                    }
                    return true;
                });

                const clientesPendientes = clientesPendientesLista.length;

                // 3. Próximos clientes (Top 10 por saldo vencido que siguen pendientes)
                const proximos = clientesPendientesLista
                    .sort((a, b) => (b.saldoVencido || 0) - (a.saldoVencido || 0));

                setData({
                    stats: {
                        totalCobrado,
                        cuentasCobradas,
                        clientesPendientes,
                        efectividad: (cuentasCobradas + clientesPendientes) > 0 
                            ? Math.round((cuentasCobradas / (cuentasCobradas + clientesPendientes)) * 100) 
                            : 100
                    },
                    proximosClientes: proximos.slice(0, 10).map(c => ({
                        id: c.id,
                        nombre: c.nombreCompleto,
                        direccion: c.direccion,
                        saldo: Number(c.saldoPendiente || 0),
                        vencido: Number(c.saldoVencido || 0)
                    }))
                });
            } catch (err) {
                console.error("Error loading offline dashboard:", err);
            }
        };

        fetchDashboardData();
    }, [preferOffline, session, isVendedor, isDireccion]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p className="animate-pulse">Sincronizando datos...</p>
            </div>
        );
    }

    if (isDireccion) {
        const stats = data?.stats || { 
            totalCobrado: 0, 
            cuentasCobradas: 0, 
            clientesPendientes: 0, 
            efectividad: 100, 
            ventasHoy: 0, 
            countVentasHoy: 0, 
            leadsActivos: 0, 
            metaAlcanzada: 0 
        };
        const recentPayments = data?.recentPayments || [];
        const recentLeads = data?.recentLeads || [];

        return (
            <div className="space-y-6">
                {/* SALUDO DIRECCION */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                        <TrendingUp className="h-32 w-32 text-indigo-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-100 mb-1">
                        Hola, {session?.user?.name || "Director"}
                    </h2>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        Resumen Ejecutivo de la Operación
                    </p>
                </div>

                {/* METRICAS DE COBRANZA (OCULTO TEMPORALMENTE) */}
                {/*
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Métricas de Cobranza</h3>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase">Hoy</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-2xl font-mono font-bold text-emerald-400">${stats.totalCobrado}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">Cobrado Total</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-2xl font-mono font-bold text-amber-400">{stats.clientesPendientes}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">Clientes Pendientes</p>
                        </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                        <span>Cuentas Cobradas: <strong>{stats.cuentasCobradas}</strong></span>
                        <span>Efectividad: <strong>{stats.efectividad}%</strong></span>
                    </div>
                </div>
                */}

                {/* METRICAS DE VENTAS */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Métricas de Ventas</h3>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase">Este Mes</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-2xl font-mono font-bold text-indigo-400">${stats.ventasHoy}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">Ventas Hoy ({stats.countVentasHoy})</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-2xl font-mono font-bold text-sky-400">{stats.leadsActivos}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">Leads Activos</p>
                        </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs text-slate-400">Avance de Meta Global</span>
                            <span className="text-xs font-bold text-indigo-400">{stats.metaAlcanzada}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(stats.metaAlcanzada, 100)}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* PAGOS RECIENTES (OCULTO TEMPORALMENTE) */}
                {/*
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Cobros Recientes</h3>
                        <Link href="/mobile/clientes" className="text-xs text-emerald-400 font-bold">Ver Clientes</Link>
                    </div>

                    {recentPayments.length > 0 ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                            {recentPayments.map((p: any) => (
                                <div key={p.id} className="p-4 flex items-center justify-between">
                                    <div className="min-w-0 flex-1 pr-2">
                                        <p className="text-sm font-bold text-slate-200 truncate">{p.cliente}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {new Date(p.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="font-mono text-sm font-bold text-emerald-400">+${p.monto}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 border border-dashed border-slate-800 p-8 rounded-2xl text-center">
                            <p className="text-slate-500 text-xs italic">No hay cobros registrados hoy</p>
                        </div>
                    )}
                </div>
                */}

                {/* LEADS RECIENTES */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Leads Recientes</h3>
                        <Link href="/mobile/ventas" className="text-xs text-indigo-400 font-bold">Ver Ventas</Link>
                    </div>

                    {recentLeads.length > 0 ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                            {recentLeads.map((l: any) => (
                                <div key={l.id} className="p-4 flex items-center justify-between">
                                    <div className="min-w-0 flex-1 pr-2">
                                        <p className="text-sm font-bold text-slate-200 truncate">{l.nombre}</p>
                                        <p className="text-[10px] text-slate-500">{l.interes}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold uppercase border border-indigo-500/20">
                                            {l.estado}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 border border-dashed border-slate-800 p-8 rounded-2xl text-center">
                            <p className="text-slate-500 text-xs italic">No hay leads registrados hoy</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (isVendedor) {
        const stats = data?.stats || { ventasHoy: 0, leadsActivos: 0, metaAlcanzada: 0 };
        const prospectos = data?.prospectos || [];

        return (
            <div className="space-y-6">
                {/* DASHBOARD VENTAS */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
                    <h2 className="text-white/70 text-xs font-bold uppercase tracking-wider mb-4">Métricas de Venta</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-3xl font-bold">${stats.ventasHoy}</p>
                            <p className="text-[10px] text-white/60 uppercase">Ventas Hoy</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-3xl font-bold">{stats.leadsActivos}</p>
                            <p className="text-[10px] text-white/60 uppercase">Leads Activos</p>
                        </div>
                    </div>
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-bold text-white/80">Avance de Meta Mensual</span>
                            <span className="text-xs font-bold">{stats.metaAlcanzada}%</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white rounded-full" style={{ width: `${stats.metaAlcanzada}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* ACCIONES RÁPIDAS */}
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/mobile/ventas#leads" className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 active:scale-95 transition-transform">
                        <div className="h-10 w-10 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-300">Nuevo Lead</span>
                    </Link>
                    <Link href="/mobile/ventas/boveda" className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 active:scale-95 transition-transform">
                        <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                            <Printer className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-300">Bóveda Digital</span>
                    </Link>
                </div>

                {/* PROSPECTOS RECIENTES */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Leads Recientes</h3>
                        <Link href="/mobile/ventas" className="text-xs text-blue-400 font-bold">Ver todos</Link>
                    </div>

                    {prospectos.length > 0 ? (
                        prospectos.map((lead: any) => (
                            <Link key={lead.id} href="/mobile/ventas" className="block group">
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between group-active:scale-95 transition-all">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center text-blue-500 font-bold">
                                            {lead.nombre?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-200">{lead.nombre}</p>
                                            <p className="text-[10px] text-slate-500">{lead.productoInteres}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold uppercase border border-blue-500/20">
                                            {lead.estado}
                                        </span>
                                        <p className="text-[8px] text-slate-600 mt-1 uppercase font-bold">{lead.canal}</p>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="bg-slate-900/50 border border-dashed border-slate-800 p-8 rounded-2xl text-center">
                            <p className="text-slate-500 text-xs italic">No hay prospectos recientes</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const stats = data?.stats || { totalCobrado: 0, clientesPendientes: 0, cuentasCobradas: 0, efectividad: 0, vdPendientes: 0 };
    const proximosClientes = data?.proximosClientes || [];
    const clientesVdPendientes = data?.clientesVdPendientes || [];

    return (
        <div className="space-y-6">
            {/* TARJETA RESUMEN DEL DÍA */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
                <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">Resumen del Día</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-3xl font-bold text-emerald-400">${stats.totalCobrado}</p>
                        <p className="text-xs text-slate-500">Cobrado Hoy</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-3xl font-bold text-amber-400">{stats.clientesPendientes}</p>
                        <p className="text-xs text-slate-500">Clientes Pendientes</p>
                    </div>
                </div>

                {/* Fila secundaria: efectividad + VD pendientes */}
                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-slate-300">
                        <TrendingUp className="w-4 h-4 text-sky-400" />
                        <span className="text-sm">Efectividad: {stats.efectividad}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {stats.vdPendientes > 0 && (
                            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                                <ShieldAlert className="w-3 h-3 text-amber-400" />
                                <span className="text-xs font-bold text-amber-400">{stats.vdPendientes} VD</span>
                            </div>
                        )}
                        <Link href="/mobile/mapa-ruta" className="bg-sky-600 hover:bg-sky-500 transition-colors text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg active:scale-95 transition-transform inline-block text-center">
                            Ver Ruta
                        </Link>
                    </div>
                </div>
            </div>

            {/* ALERTA: VD PENDIENTES */}
            {stats.vdPendientes > 0 && (
                <div className="bg-amber-950/40 border border-amber-600/30 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-amber-600/20">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">VD Pendientes</span>
                        </div>
                        <Link
                            href="/mobile/clientes"
                            className="text-[10px] text-amber-400/70 font-bold uppercase hover:text-amber-300"
                        >
                            Ver todos ({stats.vdPendientes})
                        </Link>
                    </div>

                    <div className="divide-y divide-amber-900/30">
                        {clientesVdPendientes.map((c: any) => (
                            <Link
                                key={c.id}
                                href={`/mobile/clientes?id=${c.id}&search=${encodeURIComponent(c.nombre)}`}
                                className="flex items-center justify-between px-5 py-3 active:bg-amber-900/20 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-200 truncate">{c.nombre}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {c.codigo && (
                                            <span className="flex items-center gap-0.5 text-[10px] text-slate-500 font-mono">
                                                <Hash className="w-2.5 h-2.5" />{c.codigo}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-600">{c.direccion?.slice(0, 30)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">Sin VD</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* LISTA DE PRÓXIMOS CLIENTES (REAL DATA) */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Prioridad de Visita</h3>
                    <Link href="/mobile/clientes" className="text-xs text-sky-400 font-medium">Ver todos</Link>
                </div>

                {proximosClientes.length > 0 ? (
                    proximosClientes.map((cliente: any) => (
                        <Link key={cliente.id} href={`/mobile/clientes?id=${cliente.id}&search=${encodeURIComponent(cliente.nombre)}`} className="block">
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between active:scale-95 transition-transform">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-emerald-500">
                                        {cliente.nombre?.charAt(0) || "C"}
                                    </div>
                                    <div className="max-w-[180px]">
                                        <p className="font-bold text-slate-200 truncate">{cliente.nombre}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{cliente.direccion}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-emerald-500 font-bold">${Math.round(cliente.saldo)}</p>
                                    <p className="text-[10px] text-amber-500 uppercase font-bold">Vencido: ${Math.round(cliente.vencido)}</p>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="bg-slate-900/50 border border-dashed border-slate-800 p-8 rounded-xl text-center">
                        <p className="text-slate-500 text-sm italic">No tienes cobros programados para hoy</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ActionButton({ icon, label, color }: any) {
    return (
        <button className={`${color} p-4 rounded-xl flex flex-col items-center justify-center space-y-2 active:opacity-80 transition-opacity shadow-lg`}>
            <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm">
                {icon}
            </div>
            <span className="font-bold text-sm">{label}</span>
        </button>
    );
}
