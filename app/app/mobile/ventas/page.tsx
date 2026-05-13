
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LeadModal } from "@/components/mobile/lead-modal";
import { LeadConversionModal } from "@/components/mobile/lead-conversion-modal";
import { DigitalizadorModal } from "@/components/ventas/digitalizador-modal";
import { useSession } from "next-auth/react";
import { TrendingUp, Target, Package, DollarSign, Calendar, ChevronRight, User, MapPin, UserPlus, Star, Tag, UserCheck, FileText, Image as ImageIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SalesMobilePage() {
  const [data, setData] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  
  // Estados para el digitalizador
  const [showDigitalizador, setShowDigitalizador] = useState(false);
  const [selectedForDocs, setSelectedForDocs] = useState<any>(null);
  const { data: session } = useSession();

  useEffect(() => {
    fetchMetrics();
    fetchLeads();
    fetchSolicitudes();
  }, []);

  const fetchSolicitudes = async () => {
    try {
      const res = await fetch("/api/ventas/solicitudes");
      if (res.ok) {
        const json = await res.json();
        setSolicitudes(json);
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  return (
    <div className="space-y-6 pb-20">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando métricas de venta...</div>
        ) : (
          <>
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

            {/* --- MIS SOLICITUDES DE CRÉDITO --- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-sky-500" />
                  Solicitudes de Crédito
                </h2>
                <Badge variant="outline" className="rounded-full bg-white">{solicitudes.length}</Badge>
              </div>

              <div className="space-y-3">
                {solicitudes.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No tienes solicitudes pendientes.</p>
                  </div>
                ) : (
                  solicitudes.map((sol: any) => (
                    <Card key={sol.id} className="border-none shadow-sm rounded-2xl overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-gray-900">{sol.nombreCompleto}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">{sol.telefono}</p>
                                {sol.scoreBuro && (
                                    <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 border-emerald-200 text-emerald-600 bg-emerald-50">
                                        Score: {sol.scoreBuro}
                                    </Badge>
                                )}
                            </div>
                          </div>
                          <Badge className={
                              sol.status === 'APROBADA' ? 'bg-emerald-100 text-emerald-700 border-none' :
                              sol.status === 'RECHAZADA' ? 'bg-rose-100 text-rose-700 border-none' :
                              'bg-amber-100 text-amber-700 border-none'
                          }>
                            {sol.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-4">
                          <Tag className="h-3 w-3" />
                          <span>{sol.productoInteres || "Producto no especificado"}</span>
                        </div>

                        <Button 
                          className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                          onClick={() => {
                            setSelectedForDocs({
                              nombreCompleto: sol.nombreCompleto,
                              curp: sol.curp,
                              codigoCliente: sol.contpaqiCodigo,
                              numContrato: sol.folio
                            });
                            setShowDigitalizador(true);
                          }}
                        >
                          <ImageIcon className="h-4 w-4" />
                          DIGITALIZAR DOCUMENTOS
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* MODALES */}
            {selectedForDocs && (
              <DigitalizadorModal 
                open={showDigitalizador}
                onOpenChange={setShowDigitalizador}
                cliente={selectedForDocs}
                isAdmin={false}
              />
            )}
            <LeadConversionModal 
              lead={selectedLead} 
              open={showConvertModal} 
              onOpenChange={setShowConvertModal}
              onSuccess={() => {
                fetchMetrics();
                fetchLeads();
                fetchSolicitudes();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
