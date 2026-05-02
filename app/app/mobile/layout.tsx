"use client";

import { usePlatform } from "@/hooks/usePlatform";
import { usePathname } from "next/navigation";
import { Network, Wifi, WifiOff, MapPin, Printer } from "lucide-react";

interface CobradorLayoutProps {
    children: React.ReactNode;
}

export default function CobradorLayout({ children }: CobradorLayoutProps) {
    const { isNative } = usePlatform();
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-100 overflow-hidden relative">
            {/* HEADER NATIVO */}
            <header className="flex-none bg-slate-900 border-b border-slate-800 p-4 pt-safe-top z-20 shadow-md">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-emerald-400">VertexERP</h1>
                        <p className="text-xs text-slate-400">Modo Cobrador</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Indicadores de Estado */}
                        <div className="flex items-center space-x-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs text-slate-400">Online</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* CONTENIDO PRINCIPAL SCROLLEABLE */}
            <main className="flex-1 overflow-y-auto p-4 pb-24 z-10">
                {children}
            </main>

            {/* BOTTOM NAVIGATION BAR */}
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 pb-safe-bottom z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]">
                <div className="grid grid-cols-4 h-16">
                    <NavButton icon="home" label="Inicio" href="/mobile/home" active={pathname === "/mobile/home"} />
                    <NavButton icon="users" label="Clientes" href="/mobile/clientes" active={pathname === "/mobile/clientes"} />
                    <NavButton icon="dollar" label="Caja" href="/mobile/caja" active={pathname === "/mobile/caja"} />
                    <NavButton icon="menu" label="Menú" href="/mobile/menu" active={pathname === "/mobile/menu"} />
                </div>
            </nav>
        </div>
    );
}

function NavButton({ icon, label, href, active = false }: any) {
    // Icon mapping simple
    const Icons: any = {
        home: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        ),
        users: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        ),
        dollar: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01" /><path d="M18 12h.01" /></svg>
        ),
        menu: (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
        )
    };

    return (
        <a href={href} className={`flex flex-col items-center justify-center space-y-1 ${active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-100'}`}>
            {Icons[icon]}
            <span className="text-[10px] font-medium">{label}</span>
        </a>
    )
}
