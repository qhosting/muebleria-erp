"use client";

import { useEffect, useState } from "react";
import { 
    Trophy, 
    Target, 
    TrendingUp, 
    Star, 
    Award, 
    Flame, 
    Users, 
    ChevronRight,
    Zap,
    ShieldCheck,
    Crown
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function MetasPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMetas();
    }, []);

    const fetchMetas = async () => {
        try {
            const res = await fetch("/api/mobile/metas");
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Calculando tu rendimiento...</p>
            </div>
        );
    }

    if (!data) return null;

    const { metas, gamificacion, ranking } = data;

    return (
        <div className="space-y-6 pb-24">
            {/* --- CABECERA DE NIVEL --- */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                
                <div className="relative flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl rotate-3 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <span className="text-2xl font-black text-white -rotate-3">{gamificacion.nivel}</span>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-slate-800 p-1 rounded-full">
                                <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Nivel Actual</p>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">{gamificacion.rango}</h2>
                        </div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 font-black">
                        PUNTOS: {Math.floor(gamificacion.montoAcumulado / 100)}
                    </Badge>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        <span>XP para Nivel {gamificacion.nivel + 1}</span>
                        <span>{Math.round((gamificacion.xpActual / gamificacion.xpSiguienteNivel) * 100)}%</span>
                    </div>
                    <Progress value={(gamificacion.xpActual / gamificacion.xpSiguienteNivel) * 100} className="h-2.5 bg-slate-800" indicatorClassName="bg-gradient-to-r from-emerald-500 to-teal-400" />
                    <p className="text-[9px] text-slate-600 font-medium italic">Colecciona ${formatCurrency(gamificacion.xpSiguienteNivel - gamificacion.xpActual)} más para subir de nivel.</p>
                </div>
            </div>

            {/* --- METAS DIARIAS --- */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden">
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase">Cobro del Día</p>
                            <p className="text-lg font-black text-white">{metas.porcentajeMonto}%</p>
                        </div>
                        <Progress value={metas.porcentajeMonto} className="h-1.5 w-full bg-slate-800" indicatorClassName="bg-blue-500" />
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden">
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase">Visitas del Día</p>
                            <p className="text-lg font-black text-white">{metas.porcentajeVisitas}%</p>
                        </div>
                        <Progress value={metas.porcentajeVisitas} className="h-1.5 w-full bg-slate-800" indicatorClassName="bg-amber-500" />
                    </CardContent>
                </Card>
            </div>

            {/* --- LOGROS Y RACHAS --- */}
            <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Logros Recientes</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    <AchievementBadge icon={<Flame className="w-5 h-5" />} label="Racha 5 Días" color="text-orange-500" bg="bg-orange-500/10" />
                    <AchievementBadge icon={<ShieldCheck className="w-5 h-5" />} label="Cero Moras" color="text-emerald-500" bg="bg-emerald-500/10" />
                    <AchievementBadge icon={<Star className="w-5 h-5" />} label="Top Semanal" color="text-yellow-500" bg="bg-yellow-500/10" />
                    <AchievementBadge icon={<Crown className="w-5 h-5" />} label="Elite" color="text-purple-500" bg="bg-purple-500/10" />
                </div>
            </div>

            {/* --- LEADERBOARD (RANKING) --- */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Ranking del Mes</h3>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-bold uppercase text-slate-500 border-slate-700">Top 5</Badge>
                </div>
                <div className="divide-y divide-slate-800/50">
                    {ranking.map((player: any) => (
                        <div key={player.pos} className={`p-4 flex items-center justify-between ${player.isMe ? 'bg-emerald-500/5' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                    player.pos === 1 ? 'bg-yellow-500 text-slate-950' : 
                                    player.pos === 2 ? 'bg-slate-300 text-slate-900' : 
                                    player.pos === 3 ? 'bg-orange-400 text-slate-900' : 'bg-slate-800 text-slate-500'
                                }`}>
                                    {player.pos}
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${player.isMe ? 'text-emerald-400' : 'text-slate-200'}`}>
                                        {player.nombre} {player.isMe && '(Tú)'}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono">${formatCurrency(player.monto)}</p>
                                </div>
                            </div>
                            {player.pos === 1 && <Crown className="w-4 h-4 text-yellow-500" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AchievementBadge({ icon, label, color, bg }: any) {
    return (
        <div className={`${bg} min-w-[100px] p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 border border-white/5`}>
            <div className={color}>{icon}</div>
            <span className="text-[9px] font-black text-slate-300 uppercase leading-tight">{label}</span>
        </div>
    );
}
