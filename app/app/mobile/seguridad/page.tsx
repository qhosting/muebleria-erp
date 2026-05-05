"use client";

import { useState } from "react";
import { ChevronLeft, ShieldCheck, Lock, Fingerprint, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SecurityPage() {
    const [showPin, setShowPin] = useState(false);
    const [pin, setPin] = useState("****");

    const handleUpdatePin = () => {
        toast.success("Funcionalidad de cambio de PIN en desarrollo", {
            description: "Esta opción estará disponible en la próxima actualización de seguridad."
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2">
                <Link href="/mobile/menu" className="p-2 hover:bg-slate-900 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6 text-slate-400" />
                </Link>
                <h1 className="text-xl font-bold text-slate-100">Seguridad</h1>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 bg-gradient-to-br from-emerald-600/20 to-transparent border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-white">PIN de Acceso Rápido</h3>
                            <p className="text-xs text-slate-400">Protección para el bloqueo de pantalla</p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-2xl">
                            <ShieldCheck className="w-8 h-8 text-emerald-500" />
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">PIN Actual</label>
                        <div className="relative">
                            <Input 
                                type={showPin ? "text" : "password"} 
                                value="1234" 
                                readOnly
                                className="bg-slate-950 border-slate-800 h-14 text-lg font-mono tracking-widest text-center"
                            />
                            <button 
                                onClick={() => setShowPin(!showPin)}
                                className="absolute right-4 top-4 text-slate-500"
                            >
                                {showPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>

                    <Button 
                        onClick={handleUpdatePin}
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98]"
                    >
                        Cambiar PIN de Acceso
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase ml-2 tracking-wider">Opciones Avanzadas</h3>
                
                <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-sky-500/10 rounded-lg">
                                <Fingerprint className="w-5 h-5 text-sky-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-200">Biometría</p>
                                <p className="text-[10px] text-slate-500 italic">Desactivado por hardware</p>
                            </div>
                        </div>
                        <div className="w-10 h-6 bg-slate-800 rounded-full relative opacity-50">
                            <div className="absolute left-1 top-1 w-4 h-4 bg-slate-600 rounded-full"></div>
                        </div>
                    </div>

                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <Lock className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-200">Cifrado de Sesión</p>
                                <p className="text-[10px] text-slate-500">Sesión válida por 24 horas</p>
                            </div>
                        </div>
                        <div className="text-xs font-bold text-emerald-500">ACTIVO</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
