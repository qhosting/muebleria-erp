
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Users, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Filter,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { db, OfflineCliente } from '@/lib/offline-db';
import { sendNativeSMS } from '@/lib/native/sms';
import { sendSMS as sendLabsMobileSMS } from '@/lib/sms-utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

interface SmsTemplate {
  id: string;
  name: string;
  templateText: string;
  campaignKey: string;
}

export default function MobileSmsCampaignPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [clientes, setClientes] = useState<OfflineCliente[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDia, setFilterDia] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  const user = session?.user as any;
  const userId = user?.id;
  const canUseLabsMobile = user?.enableLabsMobile ?? false;
  const canUseNativeSms = user?.enableNativeSms ?? true;

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar clientes desde IndexedDB (offline-first)
      const clients = await db.clientes
        .where('cobradorAsignadoId')
        .equals(userId)
        .and(c => c.statusCuenta === 'activo')
        .toArray();
      setClientes(clients);

      // 2. Cargar plantillas desde el servidor
      const tplRes = await fetch('/api/sms/templates');
      if (tplRes.ok) {
        setTemplates(await tplRes.json());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const matchesSearch = c.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.telefono?.includes(searchTerm);
      const matchesDia = filterDia === 'all' || c.diaPago === filterDia;
      return matchesSearch && matchesDia;
    });
  }, [clientes, searchTerm, filterDia]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(filteredClientes.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleToggleClient = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId) 
        : [...prev, clientId]
    );
  };

  const startCampaign = async (method: 'native' | 'labsmobile') => {
    if (selectedClients.length === 0) {
      toast.error('Selecciona al menos un cliente');
      return;
    }
    if (!selectedTemplate) {
      toast.error('Selecciona una plantilla');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setSending(true);
    setProgress({ current: 0, total: selectedClients.length });

    let successCount = 0;
    let failCount = 0;

    for (const clientId of selectedClients) {
      const cliente = clientes.find(c => c.id === clientId);
      if (!cliente || !cliente.telefono) continue;

      const message = template.templateText.replace(/\[nombre\]/g, cliente.nombreCompleto);
      
      try {
        let result;
        if (method === 'native') {
          result = await sendNativeSMS(cliente.telefono, message);
        } else {
          // LabsMobile vía API (requiere conexión)
          if (!navigator.onLine) {
            toast.error('Se requiere conexión a internet para LabsMobile');
            break;
          }
          const res = await fetch('/api/sms/campaign', {
            method: 'POST',
            body: JSON.stringify({
              campaignKey: template.campaignKey,
              clients: [cliente],
              templateText: template.templateText
            })
          });
          result = { success: res.ok };
        }

        if (result.success) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
      }

      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
      
      // Pequeña pausa entre envíos si es nativo para no saturar el sistema de intents
      if (method === 'native') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setSending(false);
    toast.success(`Campaña finalizada: ${successCount} enviados, ${failCount} fallidos`);
    
    if (successCount > 0) {
      setSelectedClients([]);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Preparando campaña...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Campaña de SMS</h1>
        </div>

        {/* Configuración de Campaña */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              1. Seleccionar Plantilla
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Elige una plantilla..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <div className="mt-3 p-3 bg-slate-50 rounded-md text-xs text-slate-600 border border-slate-100">
                <p className="font-semibold mb-1">Vista previa:</p>
                <p>{templates.find(t => t.id === selectedTemplate)?.templateText}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selección de Clientes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                2. Destinatarios ({selectedClients.length})
              </div>
              <Badge variant="outline">{filteredClientes.length} visibles</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-8 h-9"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterDia} onValueChange={setFilterDia}>
                <SelectTrigger className="w-[110px] h-9 text-xs">
                  <SelectValue placeholder="Día" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
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

            <div className="flex items-center space-x-2 py-1 px-2 bg-slate-50 rounded">
              <Checkbox 
                id="select-all" 
                checked={selectedClients.length === filteredClientes.length && filteredClientes.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="text-xs cursor-pointer flex-1">Seleccionar todos los visibles</Label>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {filteredClientes.map(cliente => (
                <div 
                  key={cliente.id} 
                  className={`flex items-center space-x-3 p-2 rounded-lg border transition-colors ${selectedClients.includes(cliente.id) ? 'bg-primary/5 border-primary/20' : 'bg-white border-slate-100'}`}
                  onClick={() => handleToggleClient(cliente.id)}
                >
                  <Checkbox 
                    checked={selectedClients.includes(cliente.id)}
                    onCheckedChange={() => handleToggleClient(cliente.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cliente.nombreCompleto}</p>
                    <p className="text-[10px] text-muted-foreground">{cliente.telefono || 'Sin teléfono'}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] px-1 h-4">D{cliente.diaPago}</Badge>
                </div>
              ))}
              {filteredClientes.length === 0 && (
                <p className="text-center py-4 text-xs text-muted-foreground">No se encontraron clientes</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Acciones de Envío */}
        <div className="grid grid-cols-1 gap-3">
          {sending ? (
            <Card className="border-primary">
              <CardContent className="pt-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Enviando campaña...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Procesando {progress.current} de {progress.total}
                </p>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {canUseNativeSms && (
                <Button 
                  className="w-full h-12 gap-2" 
                  onClick={() => startCampaign('native')}
                  disabled={selectedClients.length === 0}
                >
                  <Send className="h-4 w-4" />
                  Enviar vía SMS Nativo (Gratis)
                </Button>
              )}
              
              {canUseLabsMobile && (
                <Button 
                  variant="outline" 
                  className="w-full h-12 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => startCampaign('labsmobile')}
                  disabled={selectedClients.length === 0}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Enviar vía LabsMobile (API)
                </Button>
              )}

              {!canUseNativeSms && !canUseLabsMobile && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">
                    No tienes métodos de envío habilitados. Contacta a un administrador.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          Nota: El envío nativo abrirá la aplicación de mensajes de tu equipo.
        </p>
      </div>
    </DashboardLayout>
  );
}
