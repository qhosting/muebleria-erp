
'use client';

import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  History, 
  Settings, 
  RefreshCw, 
  Users, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Coins
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface Template {
  id: string;
  campaignKey: string;
  name: string;
  templateText: string;
  description: string;
}

interface Campaign {
  id: string;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  totalSent: number;
  totalFailed: number;
  totalCost: number;
  createdBy: string;
}

interface ClientPreview {
  id: string;
  codigoCliente: string;
  nombreCompleto: string;
  telefono: string;
  diaPago: string;
  saldoVencido: number;
}

export function SmsDashboard() {
  const [balance, setBalance] = useState<{ localBalance: number; apiBalance?: number; error?: string } | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const [previewClients, setPreviewClients] = useState<ClientPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [diaFilter, setDiaFilter] = useState('TODOS');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [balanceRes, templatesRes, campaignsRes] = await Promise.all([
        fetch('/api/sms/balance'),
        fetch('/api/sms/templates'),
        fetch('/api/sms/campaign')
      ]);

      const balanceData = await balanceRes.json();
      const templatesData = await templatesRes.json();
      const campaignsData = await campaignsRes.json();

      setBalance(balanceData);
      setTemplates(templatesData);
      setCampaigns(campaignsData);

      if (templatesData.length > 0) {
        setSelectedTemplate(templatesData[0]);
      }
    } catch (error) {
      toast.error('Error al cargar datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const key = mode === 'template' ? selectedTemplate.campaignKey : 'custom_manual';
      const res = await fetch(`/api/sms/preview?campaignKey=${key}&diaCobro=${diaFilter}`);
      const data = await res.json();
      setPreviewClients(data);
      toast.success(`${data.length} clientes encontrados`);
    } catch (error) {
      toast.error('Error al cargar previsualización');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const res = await fetch('/api/sms/templates', {
        method: 'POST',
        body: JSON.stringify(selectedTemplate),
      });
      if (res.ok) {
        toast.success('Plantilla actualizada');
      }
    } catch (error) {
      toast.error('Error al guardar plantilla');
    }
  };

  const handleSendCampaign = async () => {
    if (mode === 'template' && !selectedTemplate) return;
    if (mode === 'custom' && !customMessage.trim()) {
      toast.error('Escribe un mensaje personalizado');
      return;
    }
    if (previewClients.length === 0) {
      toast.error('Previsualiza los clientes antes de enviar');
      return;
    }
    
    if (!confirm(`¿Estás seguro de enviar ${previewClients.length} mensajes?`)) return;

    setSending(true);
    try {
      const res = await fetch('/api/sms/campaign', {
        method: 'POST',
        body: JSON.stringify({
          campaignKey: mode === 'template' ? selectedTemplate?.campaignKey : 'custom_manual',
          clients: previewClients,
          templateText: mode === 'template' ? selectedTemplate?.templateText : customMessage
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Campaña enviada: ${data.sent} éxitos, ${data.failed} fallos`);
        fetchInitialData();
        setPreviewClients([]);
      } else {
        toast.error(data.error || 'Error al enviar campaña');
      }
    } catch (error) {
      toast.error('Error de red al enviar campaña');
    } finally {
      setSending(false);
    }
  };

  const syncBalance = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sms/balance');
      const data = await res.json();
      setBalance(data);
      toast.success('Saldo sincronizado');
    } catch (error) {
      toast.error('Error al sincronizar saldo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Balance */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Campañas SMS</h1>
          <p className="text-muted-foreground">Envío masivo y automatizado de recordatorios.</p>
        </div>
        
        <Card className="w-full md:w-auto bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">SMS Disponibles</p>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold">{balance?.localBalance ?? '...'}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={syncBalance} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {balance?.error && <p className="text-[10px] text-destructive">{balance.error}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Configurar Envío</CardTitle>
                <CardDescription>Selecciona el tipo de campaña y filtros.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="template">Plantillas</TabsTrigger>
                    <TabsTrigger value="custom">Texto Libre</TabsTrigger>
                  </TabsList>

                  <TabsContent value="template" className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo de Campaña</label>
                      <Select 
                        onValueChange={(val) => setSelectedTemplate(templates.find(t => t.campaignKey === val) || null)}
                        value={selectedTemplate?.campaignKey}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map(t => (
                            <SelectItem key={t.id} value={t.campaignKey}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="custom" className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mensaje Personalizado</label>
                      <Textarea 
                        placeholder="Escribe el mensaje aquí..."
                        className="h-32 resize-none"
                        maxLength={160}
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold">
                        <span>Variable: [nombre]</span>
                        <span className={customMessage.length > 140 ? 'text-amber-600' : ''}>
                          {customMessage.length} / 160
                        </span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Filtrar por Día de Cobro</label>
                  <Select onValueChange={setDiaFilter} value={diaFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos los días</SelectItem>
                      <SelectItem value="1">Lunes</SelectItem>
                      <SelectItem value="2">Martes</SelectItem>
                      <SelectItem value="3">Miércoles</SelectItem>
                      <SelectItem value="4">Jueves</SelectItem>
                      <SelectItem value="5">Viernes</SelectItem>
                      <SelectItem value="6">Sábado</SelectItem>
                      <SelectItem value="7">Domingo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full mt-2" onClick={fetchPreview} disabled={loading || (mode === 'template' && !selectedTemplate) || (mode === 'custom' && !customMessage)}>
                  <Users className="mr-2 h-4 w-4" />
                  Previsualizar Clientes ({previewClients.length})
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Previsualización de Mensajes</CardTitle>
                  <CardDescription>Clientes que recibirán el SMS.</CardDescription>
                </div>
                <Button 
                  variant="default" 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={previewClients.length === 0 || sending}
                  onClick={handleSendCampaign}
                >
                  <Send className={`mr-2 h-4 w-4 ${sending ? 'animate-bounce' : ''}`} />
                  {sending ? 'Enviando...' : 'Confirmar y Enviar'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border max-h-[400px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left">Contrato</th>
                        <th className="p-2 text-left">Nombre</th>
                        <th className="p-2 text-left">Teléfono</th>
                        <th className="p-2 text-left">Día</th>
                        <th className="p-2 text-right">Mora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewClients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            No hay datos para mostrar. Haz clic en Previsualizar.
                          </td>
                        </tr>
                      ) : (
                        previewClients.map(c => (
                          <tr key={c.id} className="border-t hover:bg-muted/50">
                            <td className="p-2 font-mono">{c.codigoCliente}</td>
                            <td className="p-2">{c.nombreCompleto}</td>
                            <td className="p-2">{c.telefono}</td>
                            <td className="p-2"><Badge variant="outline">{c.diaPago}</Badge></td>
                            <td className="p-2 text-right text-destructive font-semibold">${c.saldoVencido}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Editor de Plantillas</CardTitle>
                <CardDescription>Personaliza los mensajes masivos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seleccionar Plantilla</label>
                  <Select 
                    onValueChange={(val) => setSelectedTemplate(templates.find(t => t.campaignKey === val) || null)}
                    value={selectedTemplate?.campaignKey}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.campaignKey}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nombre</label>
                      <Input 
                        value={selectedTemplate.name} 
                        onChange={(e) => setSelectedTemplate({...selectedTemplate, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mensaje</label>
                      <Textarea 
                        value={selectedTemplate.templateText} 
                        className="h-32 font-sans"
                        onChange={(e) => setSelectedTemplate({...selectedTemplate, templateText: e.target.value})}
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                        <span>Variable: [nombre]</span>
                        <span className={selectedTemplate.templateText.length > 160 ? 'text-destructive font-bold' : ''}>
                          {selectedTemplate.templateText.length} / 160 caracteres
                        </span>
                      </div>
                    </div>
                    <Button className="w-full" onClick={handleUpdateTemplate}>Guardar Cambios</Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tips de Envío</CardTitle>
                <CardDescription>Mejores prácticas para SMS.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg dark:bg-blue-900/20 dark:border-blue-900/30">
                  <p className="font-semibold text-blue-800 dark:text-blue-300">Placeholders</p>
                  <p className="mt-1">Usa <code className="bg-white/50 px-1 rounded">[nombre]</code> para que el sistema inserte automáticamente el nombre completo del cliente.</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg dark:bg-amber-900/20 dark:border-amber-900/30">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">Límite de Caracteres</p>
                  <p className="mt-1">Un SMS estándar tiene 160 caracteres. Si te pasas, se cobrarán 2 o más créditos por mensaje.</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg dark:bg-green-900/20 dark:border-green-900/30">
                  <p className="font-semibold text-green-800 dark:text-green-300">Horarios</p>
                  <p className="mt-1">Recomendamos enviar recordatorios entre 9:00 AM y 7:00 PM para una mejor tasa de respuesta.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Campañas</CardTitle>
              <CardDescription>Registro de envíos realizados.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3">Campaña</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3 text-center">Enviados</th>
                      <th className="p-3 text-center">Fallidos</th>
                      <th className="p-3 text-right">Costo Est.</th>
                      <th className="p-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">No hay campañas registradas.</td>
                      </tr>
                    ) : (
                      campaigns.map(c => (
                        <tr key={c.id} className="border-t">
                          <td className="p-3 font-medium">{c.name}</td>
                          <td className="p-3 text-muted-foreground text-xs">{new Date(c.startedAt).toLocaleString()}</td>
                          <td className="p-3 text-center">{c.totalSent}</td>
                          <td className="p-3 text-center text-destructive">{c.totalFailed}</td>
                          <td className="p-3 text-right font-mono">${c.totalCost}</td>
                          <td className="p-3 text-right">
                            {c.finishedAt ? (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Completada</Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">En proceso</Badge>
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
    </div>
  );
}
