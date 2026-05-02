
"use client";

import { signOut, useSession } from "next-auth/react";
import { 
    User, 
    Settings, 
    LogOut, 
    MessageSquare, 
    ShieldCheck, 
    ChevronRight,
    Smartphone,
    Database
} from "lucide-react";
import Link from "next/link";

export default function MobileMenu() {
    const { data: session } = useSession();

    const menuItems = [
        {
            title: "Operación",
            items: [
                { icon: <MessageSquare className="w-5 h-5" />, label: "Campaña SMS", href: "/mobile/sms", color: "text-sky-400" },
                { icon: <Database className="w-5 h-5" />, label: "Estado de Sincronización", href: "#", color: "text-emerald-400" },
            ]
        },
        {
            title: "Cuenta",
            items: [
                { icon: <User className="w-5 h-5" />, label: "Mi Perfil", href: "/mobile/perfil", color: "text-slate-300" },
                { icon: <ShieldCheck className="w-5 h-5" />, label: "Seguridad", href: "#", color: "text-slate-300" },
            ]
        }
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* PERFIL RESUMEN */}
            <div className="flex items-center space-x-4 px-2">
                <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                    {session?.user?.name?.charAt(0) || "U"}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-100">{session?.user?.name || "Usuario"}</h2>
                    <p className="text-sm text-slate-500 uppercase tracking-wider font-medium">Cobrador Autorizado</p>
                </div>
            </div>

            {/* SECCIONES DE MENÚ */}
            <div className="space-y-6">
                {menuItems.map((section, idx) => (
                    <div key={idx} className="space-y-2">
                        <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{section.title}</h3>
                        <div className="bg-slate-900/50 border-y border-slate-800 divide-y divide-slate-800">
                            {section.items.map((item, i) => (
                                <Link 
                                    key={i} 
                                    href={item.href}
                                    className="flex items-center justify-between p-4 active:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={item.color}>{item.icon}</div>
                                        <span className="text-sm font-medium text-slate-200">{item.label}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
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
