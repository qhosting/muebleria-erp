
"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { 
    User, 
    Settings, 
    LogOut, 
    MessageSquare, 
    ShieldCheck, 
    ShieldAlert,
    ChevronRight,
    Smartphone,
    Database,
    Trophy
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/offline-db";

export default function MobileMenu() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_role') : null);
    const isVendedor = userRole === 'vendedor' || userRole === 'jefe_ventas';
    const [vdCount, setVdCount] = useState(0);

    useEffect(() => {
        const getVdCount = async () => {
            try {
                const currentUserId = (session?.user as any)?.id;
                const clientes = currentUserId
                    ? await db.clientes.where('statusCuenta').equals('activo').filter(c => c.cobradorAsignadoId === currentUserId).toArray()
                    : await db.clientes.where('statusCuenta').equals('activo').toArray();
                const verificacionesLocales = await db.verificaciones.toArray();
                const clientesConVdLocal = new Set(verificacionesLocales.map(v => v.clienteId));
                const count = clientes.filter(c => 
                    !clientesConVdLocal.has(c.id) &&
                    (c.vdStatus === 'PENDIENTE' || (c.clasificacionCobranza === 'VD' && c.vdStatus !== 'REALIZADA'))
                ).length;
                setVdCount(count);
            } catch (err) {
                console.warn("Error getting VD count in menu:", err);
            }
        };
        getVdCount();

        const handleSyncEvent = () => {
            getVdCount();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('offline_data_synced', handleSyncEvent);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('offline_data_synced', handleSyncEvent);
            }
        };
    }, [session]);

    const menuItems = [
        {
            title: "Operación",
            items: [
                { icon: <Trophy className="w-5 h-5" />, label: "Mis Metas y Logros", href: "/mobile/metas", color: "text-yellow-400" },
                ...(isVendedor ? [] : [
                    { 
                        icon: <ShieldAlert className="w-5 h-5" />, 
                        label: "Verificaciones Domiciliarias (VD)", 
                        href: "/mobile/clientes?filtro=vd", 
                        color: "text-amber-400",
                        badge: vdCount > 0 ? `${vdCount} pendientes` : undefined
                    },
                    { icon: <MessageSquare className="w-5 h-5" />, label: "Campaña SMS", href: "/mobile/sms", color: "text-sky-400" }
                ]),
                { icon: <Database className="w-5 h-5" />, label: "Estado de Sincronización", href: "/mobile/sync", color: "text-emerald-400" },
            ]
        },
        {
            title: "Cuenta",
            items: [
                { icon: <User className="w-5 h-5" />, label: "Mi Perfil", href: "/mobile/perfil", color: "text-slate-300" },
                { icon: <ShieldCheck className="w-5 h-5" />, label: "Seguridad", href: "/mobile/seguridad", color: "text-slate-300" },
            ]
        }
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* PERFIL RESUMEN */}
            <div className="flex items-center space-x-4 px-2">
                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                    {(session?.user?.name || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_name') : ''))?.charAt(0) || "U"}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-100">{session?.user?.name || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_name') : '') || "Usuario"}</h2>
                    <p className="text-sm text-slate-500 uppercase tracking-wider font-medium">
                        {(session?.user as any)?.role === 'direccion' || (session?.user as any)?.role === 'admin'
                            ? 'Dirección General'
                            : (session?.user as any)?.role === 'vendedor' ? 'Vendedor Autorizado' : 'Cobrador Autorizado'}
                    </p>
                </div>
            </div>

            {/* SECCIONES DE MENÚ */}
            <div className="space-y-6">
                {menuItems.map((section, idx) => (
                    <div key={idx} className="space-y-2">
                        <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{section.title}</h3>
                        <div className="bg-slate-900/50 border-y border-slate-800 divide-y divide-slate-800">
                            {section.items.map((item: any, i: number) => (
                                <Link 
                                    key={i} 
                                    href={item.href}
                                    className="flex items-center justify-between p-4 active:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={item.color}>{item.icon}</div>
                                        <span className="text-sm font-medium text-slate-200">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.badge && (
                                            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                                                {item.badge}
                                            </span>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* BOTÓN CERRAR SESIÓN */}
            <div className="px-4 pt-4">
                <button 
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full bg-slate-900 border border-rose-500/30 text-rose-400 font-bold py-4 rounded-xl flex items-center justify-center space-x-2 active:bg-rose-500/10 transition-all shadow-lg"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Cerrar Sesión</span>
                </button>
                <p className="text-center text-[10px] text-slate-600 mt-6 font-mono">
                    VertexERP Mobile v2.9.33
                </p>
            </div>
        </div>
    );
}
