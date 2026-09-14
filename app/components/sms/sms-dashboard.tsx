'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  MessageSquare, 
  Send, 
  History, 
  RefreshCw, 
  Users, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  Save,
  Coins,
  Play,
  Search,
  Smartphone,
  Info,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { sendNativeSMS, canSendSMS } from '@/lib/native/sms';

interface Template {
  id: string;
  campaignKey: string;
  name: string;
  templateText: string;
  description?: string;
}

interface RutaCobranza {
  id: number;
  periodicidad: string;
  fecha_inicio_periodo: string;
  fecha_fin_periodo: string;
  status: 'ACTIVO' | 'INACTIVO';
}

interface CampaignLog {
  id: string;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  totalSent: number;
  totalFailed: number;
  totalCost: number;
  createdBy: string;
}

interface ClientRecipient {
  id: string;
  codigoCliente: string;
  nombreCompleto: string;
  telefono: string;
  diaPago: string;
  diaPagoRaw?: string;
  periodicidad?: string;
  saldoVencido: number;
  saldoActual?: number;
  gestor?: string;
}

export function SmsDashboard() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const canUseNativeSms = user?.enableNativeSms ?? canSendSMS();

  // Estados principales
  const [balance, setBalance] = useState<{ localBalance: number; apiBalance?: number; error?: string } | null>(null);
  const [rutas, setRutas] = useState<RutaCobranza[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignLog[]>([]);
  
  // Estado de Campaña No Pagos
  const [diaCobro, setDiaCobro] = useState<string>('TODOS');
  const [previewClients, setPreviewClients] = useState<ClientRecipient[]>([]);
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [hasPreviewed, setHasPreviewed] = useState<boolean>(false);

  // Estados de carga
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [syncingBalance, setSyncingBalance] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [savingRutaId, setSavingRutaId] = useState<number | null>(null);
  const [savingTemplateKey, setSavingTemplateKey] = useState<string | null>(null);
  
  // Estados de modal de envío y progreso
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [activeCampaignToSend, setActiveCampaignToSend] = useState<{
    key: string;
    name: string;
    templateText: string;
    clients: ClientRecipient[];
  } | null>(null);
  const [sendMethod, setSendMethod] = useState<'labsmobile' | 'native'>('labsmobile');
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  // Carga inicial
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoadingInitial(true);
    try {
      await Promise.all([
        fetchBalance(),
        fetchRutas(),
        fetchTemplates(),
        fetchCampaigns()
      ]);
    } catch (err) {
      toast.error('Error al cargar datos del sistema de SMS');
    } finally {
      setLoadingInitial(false);
    }
  };

  const fetchBalance = async () => {
    try {
      setSyncingBalance(true);
      const res = await fetch('/api/sms/balance');
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch {
      toast.error('No se pudo sincronizar el saldo');
    } finally {
      setSyncingBalance(false);
    }
  };

  const fetchRutas = async () => {
    try {
      const res = await fetch('/api/sms/rutas');
      if (res.ok) {
        const data = await res.json();
        setRutas(data);
      }
    } catch (err) {
      console.error('Error fetching rutas:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/sms/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/sms/campaign');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };

  // Guardar Ruta de Cobranza (fechas y estatus)
  const handleSaveRuta = async (ruta: RutaCobranza) => {
    setSavingRutaId(ruta.id);
    try {
      const res = await fetch('/api/sms/rutas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruta),
      });
      if (res.ok) {
        toast.success(`Ruta ${ruta.periodicidad} actualizada correctamente`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al actualizar la ruta');
      }
    } catch {
      toast.error('Error de red al actualizar la ruta');
    } finally {
      setSavingRutaId(null);
    }
  };

  const handleRutaFieldChange = (id: number, field: keyof RutaCobranza, value: any) => {
    setRutas(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Guardar Plantilla
  const handleSaveTemplate = async (template: Template) => {
    setSavingTemplateKey(template.campaignKey);
    try {
      const res = await fetch('/api/sms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (res.ok) {
        toast.success(`Plantilla "${template.name}" guardada correctamente`);
      } else {
        toast.error('Error al guardar la plantilla');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSavingTemplateKey(null);
    }
  };

  const handleTemplateTextChange = (key: string, text: string) => {
    setTemplates(prev => prev.map(t => t.campaignKey === key ? { ...t, templateText: text } : t));
  };

  const insertVariableIntoTemplate = (key: string, variable: string = '[nombre]') => {
    setTemplates(prev => prev.map(t => {
      if (t.campaignKey === key) {
        return { ...t, templateText: `${t.templateText} ${variable}`.trim() };
      }
      return t;
    }));
  };

  // Previsualizar campaña a No Pagos
  const handlePreviewNoPagos = async () => {
    setLoadingPreview(true);
    setHasPreviewed(true);
    try {
      const res = await fetch(`/api/sms/preview?campaignKey=no_pagos&diaCobro=${encodeURIComponent(diaCobro)}`);
      if (res.ok) {
        const data: ClientRecipient[] = await res.json();
        setPreviewClients(data);
        toast.success(`${data.length} destinatarios encontrados para día ${diaCobro}`);
      } else {
        toast.error('Error al consultar destinatarios');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Preparar confirmación de campaña No Pagos
  const openConfirmNoPagos = () => {
    if (previewClients.length === 0) {
      toast.error('No hay destinatarios para enviar');
      return;
    }
    const template = templates.find(t => t.campaignKey === 'no_pagos') || {
      id: 'no_pagos',
      campaignKey: 'no_pagos',
      name: 'Recordatorio a No Pagos',
      templateText: 'Estimado [nombre], no recibimos tu pago. Favor de regularizar tu cuenta hoy mismo para evitar cargos.'
    };

    setActiveCampaignToSend({
      key: 'no_pagos',
      name: `Recordatorio a No Pagos (${diaCobro})`,
      templateText: template.templateText,
      clients: previewClients
    });
    setSendDialogOpen(true);
  };

  // Ejecutar Campaña Inicio de Semana (1-click como en sms_dashboard.php)
  const handleRunInicioSemana = async () => {
    const template = templates.find(t => t.campaignKey === 'inicio_semana') || {
      id: 'inicio_semana',
      campaignKey: 'inicio_semana',
      name: 'Recordatorio Inicio de Semana',
      templateText: 'Hola [nombre], te recordamos que tu pago esta proximo. ¡Que tengas excelente semana!'
    };

    setLoadingPreview(true);
    try {
      const res = await fetch('/api/sms/preview?campaignKey=inicio_semana&diaCobro=TODOS');
      if (res.ok) {
        const clients: ClientRecipient[] = await res.json();
        if (clients.length === 0) {
          toast.info('No hay clientes en rutas activas para esta semana');
          return;
        }
        setActiveCampaignToSend({
          key: 'inicio_semana',
          name: 'Recordatorio Inicio de Semana',
          templateText: template.templateText,
          clients
        });
        setSendDialogOpen(true);
      }
    } catch {
      toast.error('Error al consultar clientes para Inicio de Semana');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Ejecutar Envío Final
  const handleExecuteSend = async () => {
    if (!activeCampaignToSend) return;

    setIsSending(true);
    setSendProgress({ current: 0, total: activeCampaignToSend.clients.length });

    const { key, name, templateText, clients } = activeCampaignToSend;

    if (sendMethod === 'labsmobile') {
      try {
        const res = await fetch('/api/sms/campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignKey: key,
            clients,
            templateText,
            diaCobro
          }),
        });

        const result = await res.json();
        if (res.ok && result.success) {
          toast.success(`Campaña enviada con éxito: ${result.sent} enviados, ${result.failed} fallidos`);
          fetchBalance();
          fetchCampaigns();
          setSendDialogOpen(false);
          setPreviewClients([]);
          setHasPreviewed(false);
        } else {
          toast.error(result.error || 'Error al enviar campaña');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error de conexión');
      } finally {
        setIsSending(false);
      }
    } else {
      // Método nativo móvil (dispositivo)
      let sentCount = 0;
      let failCount = 0;

      for (let i = 0; i < clients.length; i++) {
        const c = clients[i];
        const msg = templateText.replace(/\[nombre\]/g, c.nombreCompleto);
        const res = await sendNativeSMS(c.telefono, msg);
        if (res.success) sentCount++;
        else failCount++;

        setSendProgress({ current: i + 1, total: clients.length });
        await new Promise(r => setTimeout(r, 600));
      }

      setIsSending(false);
      setSendDialogOpen(false);
      toast.success(`Proceso nativo finalizado: ${sentCount} procesados, ${failCount} fallidos`);
    }
  };

  // Filtro en memoria para tabla de previsualización
  const filteredPreviewClients = useMemo(() => {
    if (!previewSearch.trim()) return previewClients;
    const q = previewSearch.toLowerCase();
    return previewClients.filter(c => 
      c.nombreCompleto.toLowerCase().includes(q) ||
      c.codigoCliente.toLowerCase().includes(q) ||
      c.telefono.includes(q)
    );
  }, [previewClients, previewSearch]);

  const displayBalance = balance?.apiBalance !== undefined 
    ? balance.apiBalance 
    : (balance?.localBalance ?? 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Título & Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            Gestión de Campañas SMS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envío masivo y automatizado de recordatorios a clientes (LabsMobile / SMS Nativo)
          </p>
        </div>

        {/* Caja de Saldo (Balance Box como en sms_dashboard.php) */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-blue-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-3.5 flex items-center gap-4">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider block">
                SMS Disponibles
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-black text-blue-900 dark:text-white">
                  {loadingInitial ? '...' : displayBalance.toLocaleString('es-MX')}
                </span>
                <span className="text-lg">💰</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-blue-700 hover:text-blue-900 hover:bg-blue-100" 
                  onClick={fetchBalance}
                  disabled={syncingBalance}
                  title="Sincronizar saldo con LabsMobile"
                >
                  <RefreshCw className={`h-4 w-4 ${syncingBalance ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {balance?.error && (
                <span className="text-[10px] text-amber-700 font-medium block">
                  {balance.error}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegación por pestañas */}
      <Tabs defaultValue="nopagos" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <TabsTrigger value="nopagos" className="py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Recordatorio a No Pagos
          </TabsTrigger>
          <TabsTrigger value="plantillas" className="py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            Plantillas & Inicio de Semana
          </TabsTrigger>
          <TabsTrigger value="rutas" className="py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-500" />
            Estado de Rutas
          </TabsTrigger>
          <TabsTrigger value="historial" className="py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-purple-500" />
            Historial de Envíos
          </TabsTrigger>
        </TabsList>

        {/* 1. RECORDATORIO A NO PAGOS (Equivalente al bloque central de sms_dashboard.php) */}
        <TabsContent value="nopagos" className="space-y-4 mt-4">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Ejecutar Campaña: Recordatorio a No Pagos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Filtra cuentas <strong>RUTA</strong> que no han realizado su pago en la semana de cobranza activa. Si seleccionas <strong>TODOS</strong>, abarca el acumulado desde el <strong>Sábado hasta el día de hoy</strong> y excluye automáticamente a quienes ya abonaron en la semana.
                  </CardDescription>
                </div>

                {/* Acciones de Previsualización y Envío */}
                <div className="flex flex-wrap items-center gap-2">
                  {hasPreviewed && previewClients.length > 0 && (
                    <Button 
                      onClick={openConfirmNoPagos} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-sm"
                    >
                      <Send className="h-4 w-4" />
                      Confirmar y Enviar ({previewClients.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Filtro por Día de Cobro */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5 flex-1 max-w-xs">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Filtrar por día de cobro:
                  </label>
                  <Select value={diaCobro} onValueChange={setDiaCobro}>
                    <SelectTrigger className="bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Selecciona un día" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">TODOS (Acumulado Sábado a Hoy)</SelectItem>
                      <SelectItem value="LUNES">Lunes</SelectItem>
                      <SelectItem value="MARTES">Martes</SelectItem>
                      <SelectItem value="MIERCOLES">Miércoles</SelectItem>
                      <SelectItem value="JUEVES">Jueves</SelectItem>
                      <SelectItem value="VIERNES">Viernes</SelectItem>
                      <SelectItem value="SABADO">Sábado</SelectItem>
                      <SelectItem value="DOMINGO">Domingo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handlePreviewNoPagos} 
                  disabled={loadingPreview}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2"
                >
                  <Search className={`h-4 w-4 ${loadingPreview ? 'animate-spin' : ''}`} />
                  {loadingPreview ? 'Consultando...' : 'Previsualizar Envío'}
                </Button>
              </div>

              {/* Resultados de la Previsualización */}
              {hasPreviewed && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Resumen de Destinatarios
                      </h3>
                      <Badge variant="secondary" className="font-semibold text-xs px-2.5 py-0.5">
                        {previewClients.length} encontrados
                      </Badge>
                      {diaCobro === 'TODOS' ? (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300">
                          Acumulado: Sábado a Hoy
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Día: {diaCobro}
                        </Badge>
                      )}
                    </div>

                    {previewClients.length > 0 && (
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                          placeholder="Buscar cliente, contrato o teléfono..."
                          value={previewSearch}
                          onChange={e => setPreviewSearch(e.target.value)}
                          className="pl-8 h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {previewClients.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground font-medium">
                        No se encontraron clientes que cumplan con los criterios seleccionados para el día {diaCobro}.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Verifica que las rutas de cobranza correspondientes estén en estatus ACTIVO y con fechas vigentes.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-hidden max-h-[420px] overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0">
                          <tr>
                            <th className="p-2.5">Contrato / Código</th>
                            <th className="p-2.5">Nombre del Cliente</th>
                            <th className="p-2.5">Teléfono</th>
                            <th className="p-2.5">Día de Cobro</th>
                            <th className="p-2.5 text-right">Saldo Vencido</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredPreviewClients.map((client) => (
                            <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="p-2.5 font-mono font-semibold text-primary">
                                {client.codigoCliente}
                              </td>
                              <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                                {client.nombreCompleto}
                              </td>
                              <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                                {client.telefono}
                              </td>
                              <td className="p-2.5">
                                <Badge variant="outline" className="text-[10px] font-medium uppercase">
                                  {client.diaPago}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-right font-semibold text-rose-600 dark:text-rose-400">
                                ${client.saldoVencido.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. PLANTILLAS DE MENSAJES & INICIO DE SEMANA */}
        <TabsContent value="plantillas" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map(template => {
              const charCount = template.templateText.length;
              const isOverLimit = charCount > 160;
              const isSaving = savingTemplateKey === template.campaignKey;

              return (
                <Card key={template.id || template.campaignKey} className="flex flex-col shadow-sm border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                          {template.name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {template.description || `Clave: ${template.campaignKey}`}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {template.campaignKey}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 flex-1">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Texto del Mensaje
                        </label>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 text-[10px] px-2 gap-1 text-primary border-primary/30"
                          onClick={() => insertVariableIntoTemplate(template.campaignKey, '[nombre]')}
                        >
                          + [nombre]
                        </Button>
                      </div>

                      <Textarea 
                        rows={4}
                        className="text-sm font-sans resize-none"
                        value={template.templateText}
                        onChange={e => handleTemplateTextChange(template.campaignKey, e.target.value)}
                      />

                      <div className="flex justify-between items-center text-[11px] pt-1">
                        <span className="text-muted-foreground text-[10px]">
                          Variable disponible: <code className="text-primary font-semibold">[nombre]</code>
                        </span>
                        <span className={`font-mono font-bold ${isOverLimit ? 'text-rose-600' : 'text-slate-500'}`}>
                          Caracteres: {charCount}/160 {isOverLimit && '(consumirá 2 créditos)'}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-3 border-t bg-slate-50/50 dark:bg-slate-900/30 flex flex-wrap items-center justify-between gap-2">
                    <Button 
                      onClick={() => handleSaveTemplate(template)} 
                      disabled={isSaving}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <Save className={`h-3.5 w-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                      {isSaving ? 'Guardando...' : 'Guardar Plantilla'}
                    </Button>

                    {/* Botón directo de ejecución para inicio_semana (como en sms_dashboard.php) */}
                    {template.campaignKey === 'inicio_semana' && (
                      <Button 
                        onClick={handleRunInicioSemana}
                        disabled={loadingPreview}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs shadow-sm"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Ejecutar Campaña Ahora
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* 3. ESTADO DE RUTAS DE COBRANZA (Tabla interactiva idéntica a sms_dashboard.php) */}
        <TabsContent value="rutas" className="space-y-4 mt-4">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <Calendar className="h-5 w-5 text-emerald-600" />
                Estado de Rutas de Cobranza
              </CardTitle>
              <CardDescription className="text-xs">
                Sincronizado automáticamente con el <strong>Calendario Anual de Cobradores</strong> (Ciclo Sábado a Viernes). Activa o desactiva periodicidades para la emisión de campañas SMS.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs md:text-sm text-left">
                  <thead className="bg-slate-800 text-white font-semibold">
                    <tr>
                      <th className="p-3">Periodicidad</th>
                      <th className="p-3">Fechas del Periodo (Inicio - Fin)</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rutas.map(ruta => {
                      const isSaving = savingRutaId === ruta.id;
                      const isActivo = ruta.status === 'ACTIVO';

                      return (
                        <tr key={ruta.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                            {ruta.periodicidad}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col sm:flex-row items-center gap-2 max-w-sm">
                              <Input 
                                type="date" 
                                value={ruta.fecha_inicio_periodo}
                                onChange={e => handleRutaFieldChange(ruta.id, 'fecha_inicio_periodo', e.target.value)}
                                className="h-8 text-xs font-mono"
                              />
                              <span className="text-muted-foreground text-xs hidden sm:inline">a</span>
                              <Input 
                                type="date" 
                                value={ruta.fecha_fin_periodo}
                                onChange={e => handleRutaFieldChange(ruta.id, 'fecha_fin_periodo', e.target.value)}
                                className="h-8 text-xs font-mono"
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <Select 
                              value={ruta.status} 
                              onValueChange={(val: 'ACTIVO' | 'INACTIVO') => handleRutaFieldChange(ruta.id, 'status', val)}
                            >
                              <SelectTrigger className={`h-8 w-28 text-xs font-semibold ${isActivo ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' : 'text-slate-500'}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ACTIVO" className="text-emerald-600 font-semibold">Activo</SelectItem>
                                <SelectItem value="INACTIVO" className="text-slate-500">Inactivo</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3 text-right">
                            <Button 
                              onClick={() => handleSaveRuta(ruta)}
                              disabled={isSaving}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-8 px-3 text-xs gap-1"
                            >
                              <Save className={`h-3 w-3 ${isSaving ? 'animate-spin' : ''}`} />
                              {isSaving ? 'Guardando...' : 'Guardar'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 bg-blue-50/80 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Nota operativa:</strong> Las campañas a no pagos y de inicio de semana consultan exclusivamente a los clientes cuya periodicidad esté marcada como <strong>ACTIVO</strong> y donde la fecha del día de hoy se encuentre dentro del rango de fecha de inicio y fecha de fin.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. HISTORIAL DE CAMPAÑAS RECIENTES */}
        <TabsContent value="historial" className="space-y-4 mt-4">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                  <History className="h-5 w-5 text-purple-600" />
                  Historial de Campañas Recientes
                </CardTitle>
                <CardDescription className="text-xs">
                  Registro de envíos masivos ejecutados en el sistema.
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchCampaigns}
                className="gap-1 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Actualizar
              </Button>
            </CardHeader>

            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="p-3">Campaña</th>
                      <th className="p-3">Inicio</th>
                      <th className="p-3 text-center">Enviados</th>
                      <th className="p-3 text-center">Fallidos</th>
                      <th className="p-3 text-right">Costo Aprox.</th>
                      <th className="p-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No hay campañas registradas en el historial.
                        </td>
                      </tr>
                    ) : (
                      campaigns.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">
                            {c.name}
                          </td>
                          <td className="p-3 text-muted-foreground font-mono">
                            {new Date(c.startedAt).toLocaleString('es-MX')}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-600">
                            {c.totalSent}
                          </td>
                          <td className="p-3 text-center font-bold text-rose-600">
                            {c.totalFailed}
                          </td>
                          <td className="p-3 text-right font-mono font-semibold">
                            ${Number(c.totalCost || 0).toFixed(2)} MXN
                          </td>
                          <td className="p-3 text-right">
                            {c.finishedAt ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                Completada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                En Proceso
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DE CONFIRMACIÓN Y ENVÍO */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Send className="h-5 w-5 text-emerald-600" />
              Confirmar Envío de Campaña
            </DialogTitle>
            <DialogDescription className="text-xs">
              Por favor confirma los detalles antes de iniciar la emisión de mensajes.
            </DialogDescription>
          </DialogHeader>

          {activeCampaignToSend && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campaña:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{activeCampaignToSend.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destinatarios válidos:</span>
                  <span className="font-bold text-emerald-600">{activeCampaignToSend.clients.length} clientes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Costo estimado:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    ${(activeCampaignToSend.clients.length * 0.45).toFixed(2)} MXN
                  </span>
                </div>
              </div>

              {/* Vista previa del mensaje */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Mensaje a emitir:</label>
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded font-sans text-xs text-slate-800 dark:text-slate-200 border">
                  {activeCampaignToSend.templateText}
                </div>
              </div>

              {/* Selector de Método de Envío (si es móvil nativo o LabsMobile) */}
              {canUseNativeSms && (
                <div className="space-y-1.5 pt-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Vía de Envío:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      type="button"
                      variant={sendMethod === 'labsmobile' ? 'default' : 'outline'}
                      className="h-9 text-xs gap-1.5"
                      onClick={() => setSendMethod('labsmobile')}
                      disabled={isSending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      LabsMobile API
                    </Button>
                    <Button 
                      type="button"
                      variant={sendMethod === 'native' ? 'default' : 'outline'}
                      className="h-9 text-xs gap-1.5"
                      onClick={() => setSendMethod('native')}
                      disabled={isSending}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      SMS Nativo
                    </Button>
                  </div>
                </div>
              )}

              {/* Barra de Progreso durante el envío */}
              {isSending && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Enviando mensajes...</span>
                    <span>{sendProgress.current} de {sendProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${(sendProgress.current / (sendProgress.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setSendDialogOpen(false)}
              disabled={isSending}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleExecuteSend}
              disabled={isSending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs"
            >
              <Send className={`h-4 w-4 ${isSending ? 'animate-spin' : ''}`} />
              {isSending ? 'Emitiendo campaña...' : 'Confirmar y Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
