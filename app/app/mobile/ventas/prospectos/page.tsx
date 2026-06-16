"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeadModal } from "@/components/mobile/lead-modal";
import { LeadConversionModal } from "@/components/mobile/lead-conversion-modal";
import { useSession } from "next-auth/react";
import { MessageSquare, Phone, User, Tag, Calendar, UserCheck, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export default function MobileLeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const { data: session, status } = useSession();

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("/api/ventas/leads", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        // Mostrar solo los no convertidos en el panel activo
        setLeads(json.filter((l: any) => l.estado !== 'convertido'));
      } else {
        toast.error("Error al cargar prospectos");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeads();
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-4 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        <p className="animate-pulse">Verificando credenciales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-500/10 p-2.5 rounded-xl">
            <MessageSquare className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-100">Buzón de Prospectos</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Prospectación en Campo y Redes</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-sky-400 font-mono">{leads.length}</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase">Activos</p>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="px-1">
        <LeadModal onSuccess={fetchLeads} />
      </div>

      {/* LISTADO DE PROSPECTOS */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase font-bold text-slate-500 px-1 tracking-wider flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Prospectos Pendientes
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            <p className="text-xs">Actualizando prospectos...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
            <AlertCircle className="h-8 w-8 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No tienes prospectos registrados.</p>
            <p className="text-[10px] text-slate-600 mt-1">Registra nuevos prospectos para convertirlos en ventas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead: any) => (
              <Card key={lead.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:bg-slate-850/80 transition-colors">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-sky-950/40 border border-sky-900/40 flex items-center justify-center text-sky-400 font-bold">
                        {lead.nombre ? lead.nombre[0].toUpperCase() : 'P'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200 text-sm">{lead.nombre}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          Registrado: {format(new Date(lead.createdAt), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold px-2 py-0.5 border-sky-900 text-sky-400 bg-sky-950/20">
                      {lead.origen || 'Cambaceo'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-800/50 py-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-slate-300 truncate font-mono">{lead.telefono || 'Sin teléfono'}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Tag className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-slate-300 truncate max-w-[100px]">{lead.interes || 'Sin producto'}</span>
                    </div>
                  </div>

                  {lead.notas ? (
                    <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-850 text-slate-400 text-xs">
                      <p className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider mb-1">Notas</p>
                      <p className="line-clamp-2 italic">{lead.notas}</p>
                    </div>
                  ) : null}

                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform text-xs"
                    onClick={() => {
                      setSelectedLead(lead);
                      setShowConvertModal(true);
                    }}
                  >
                    <UserCheck className="h-4 w-4" />
                    CONVERTIR A CLIENTE (CRÉDITO)
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE CONVERSIÓN */}
      <LeadConversionModal 
        lead={selectedLead} 
        open={showConvertModal} 
        onOpenChange={setShowConvertModal}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
