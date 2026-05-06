
"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LeadModal } from "@/components/mobile/lead-modal";
import { LeadConversionModal } from "@/components/mobile/lead-conversion-modal";
import { TrendingUp, Target, Package, DollarSign, Calendar, ChevronRight, User, MapPin, UserPlus, Star, Tag, UserCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SalesMobilePage() {
  const [data, setData] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/ventas/leads");
      if (res.ok) {
        const json = await res.json();
        // Solo mostrar los que no han sido convertidos (estado !== 'convertido')
        setLeads(json.filter((l: any) => l.estado !== 'convertido'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ventas/metrics");
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

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando métricas de venta...</div>;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Seguimiento de Ventas</h1>
            <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</p>
          </div>
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1">Vendedor</Badge>
        </div>

        {/* --- MI PRESUPUESTO Y AVANCE --- */}
        {data?.presupuesto && (
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-medium opacity-90 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Meta: {data.presupuesto.nombre || "Periodo Activo"}
                </CardTitle>
                <TrendingUp className="h-8 w-8 opacity-20" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase opacity-70 font-bold">Monto ($)</p>
                  <p className="text-xl font-bold">{formatCurrency(data.presupuesto.logradoMonto)} / {formatCurrency(data.presupuesto.metaMonto)}</p>
                  <Progress value={data.presupuesto.porcentajeMonto} className="h-1.5 bg-white/20" color="bg-white" />
                  <p className="text-[10px] text-right font-medium">{data.presupuesto.porcentajeMonto.toFixed(1)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase opacity-70 font-bold">Piezas (Un.)</p>
                  <p className="text-xl font-bold">{data.presupuesto.logradoPiezas} / {data.presupuesto.metaPiezas}</p>
                  <Progress value={data.presupuesto.porcentajePiezas} className="h-1.5 bg-white/20" />
                  <p className="text-[10px] text-right font-medium">{data.presupuesto.porcentajePiezas.toFixed(1)}%</p>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-1">
                <div className="flex justify-between items-end">
                  <p className="text-xs uppercase opacity-70 font-bold">Leads (Prospectos)</p>
                  <p className="text-sm font-bold">{data.presupuesto.logradoLeads} / {data.presupuesto.metaLeads}</p>
                </div>
                <Progress value={data.presupuesto.porcentajeLeads} className="h-1.5 bg-white/20" />
                <p className="text-[10px] text-right font-medium">{data.presupuesto.porcentajeLeads.toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!data?.presupuesto && (
           <Card className="bg-amber-50 border-amber-100 border-dashed border-2">
             <CardContent className="p-4 text-center">
               <TrendingUp className="h-8 w-8 text-amber-500 mx-auto mb-2 opacity-50" />
               <p className="text-sm font-medium text-amber-900">No tienes un presupuesto asignado este mes.</p>
               <p className="text-xs text-amber-700">Comunícate con tu jefe de ventas para establecer tus metas.</p>
             </CardContent>
           </Card>
        )}

        {/* --- ACCIONES --- */}
        <div className="grid grid-cols-1 gap-3">
          <LeadModal onSuccess={fetchMetrics} />
        </div>

        {/* --- VENTAS DEL DÍA --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              Cerradas Hoy
            </h2>
            <Badge variant="outline" className="rounded-full bg-white">{data?.ventasHoy?.length || 0}</Badge>
          </div>

          <div className="space-y-3">
            {data?.ventasHoy?.length === 0 ? (
              <div className="p-10 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aún no has registrado ventas hoy. ¡A la carga!</p>
              </div>
            ) : (
              data.ventasHoy.map((venta: any) => (
                <Card key={venta.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:bg-gray-50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{venta.producto}</p>
                          <p className="text-xs text-gray-500 font-mono">{venta.contrato}</p>
                        </div>
                      </div>
                      <p className="font-bold text-emerald-600 text-lg">{formatCurrency(venta.monto)}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-[11px] font-medium text-gray-600 truncate">{venta.cliente}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-[11px] font-medium text-gray-600">{venta.equipo}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* --- MIS PROSPECTOS (LEADS) --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Mis Prospectos
            </h2>
            <Badge variant="outline" className="rounded-full bg-white">{leads.length}</Badge>
          </div>

          <div className="space-y-3">
            {leads.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <UserPlus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">No tienes prospectos pendientes.</p>
              </div>
            ) : (
              leads.map((lead: any) => (
                <Card key={lead.id} className="border-none shadow-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{lead.nombre}</p>
                        <p className="text-xs text-gray-500">{lead.telefono || "Sin teléfono"}</p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                        {lead.estado}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-4">
                      <Tag className="h-3 w-3" />
                      <span>Interés: {lead.interes || "General"}</span>
                    </div>

                    <Button 
                      className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowConvertModal(true);
                      }}
                    >
                      <UserCheck className="h-4 w-4" />
                      CONVERTIR A CLIENTE
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* MODALES */}
        <LeadConversionModal 
          lead={selectedLead} 
          open={showConvertModal} 
          onOpenChange={setShowConvertModal}
          onSuccess={() => {
            fetchMetrics();
            fetchLeads();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
