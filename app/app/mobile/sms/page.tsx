
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
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
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { db, OfflineCliente } from '@/lib/offline-db';
import { sendNativeSMS } from '@/lib/native/sms';
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
      const clients = await db.clientes
        .where('cobradorAsignadoId')
        .equals(userId)
        .and(c => c.statusCuenta === 'activo')
        .toArray();
      setClientes(clients);

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
          if (!navigator.onLine) {
            toast.error('Se requiere conexión a internet para envío vía Servidor');
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
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
        <p className="text-muted-foreground">Preparando campaña...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-400">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-slate-100">Campaña de SMS</h1>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
            <MessageSquare className="h-4 w-4 text-emerald-500" />
            1. Seleccionar Plantilla
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
              <SelectValue placeholder="Elige una plantilla..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
              {templates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <div className="mt-3 p-3 bg-slate-950 rounded-md text-xs text-slate-400 border border-slate-800">
              <p className="font-semibold mb-1 text-slate-300">Vista previa:</p>
              <p>{templates.find(t => t.id === selectedTemplate)?.templateText}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200">
              <Users className="h-4 w-4 text-emerald-500" />
              2. Destinatarios ({selectedClients.length})
            </div>
            <Badge variant="outline" className="border-slate-700 text-slate-400">{filteredClientes.length} visibles</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Buscar..." 
                className="pl-8 h-9 bg-slate-950 border-slate-800 text-slate-200"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterDia} onValueChange={setFilterDia}>
              <SelectTrigger className="w-[110px] h-9 text-xs bg-slate-950 border-slate-800 text-slate-200">
                <SelectValue placeholder="Día" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="all">Todos</SelectItem>
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia, i) => (
                  <SelectItem key={i} value={(i + 1).toString()}>{dia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 py-1 px-2 bg-slate-950 rounded border border-slate-800">
            <Checkbox 
              id="select-all" 
              checked={selectedClients.length === filteredClientes.length && filteredClientes.length > 0}
              onCheckedChange={handleSelectAll}
              className="border-slate-700 data-[state=checked]:bg-emerald-500"
            />
            <Label htmlFor="select-all" className="text-xs cursor-pointer flex-1 text-slate-400 font-medium">Seleccionar todos los visibles</Label>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredClientes.map(cliente => (
              <div 
                key={cliente.id} 
                className={`flex items-center space-x-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${selectedClients.includes(cliente.id) ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-slate-800'}`}
                onClick={() => handleToggleClient(cliente.id)}
              >
                <Checkbox 
                  checked={selectedClients.includes(cliente.id)}
                  className="border-slate-700 data-[state=checked]:bg-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-200 truncate">{cliente.nombreCompleto}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{cliente.telefono || 'Sin teléfono'}</p>
                </div>
                <Badge variant="secondary" className="text-[9px] px-1 h-4 bg-slate-800 text-slate-400 border-slate-700">D{cliente.diaPago}</Badge>
              </div>
            ))}
            {filteredClientes.length === 0 && (
              <p className="text-center py-8 text-xs text-slate-500">No se encontraron clientes</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {sending ? (
          <Card className="bg-slate-900 border-emerald-500/50">
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-200">Enviando campaña...</p>
              <p className="text-xs text-slate-500 mt-1">
                Procesando {progress.current} de {progress.total}
              </p>
              <div className="w-full bg-slate-950 h-2 rounded-full mt-4 overflow-hidden border border-slate-800">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {canUseNativeSms && (
              <Button 
                className="w-full h-14 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg" 
                onClick={() => startCampaign('native')}
                disabled={selectedClients.length === 0}
              >
                <Send className="h-5 w-5" />
                Enviar SMS Nativo (Gratis)
              </Button>
            )}
            
            {canUseLabsMobile && (
              <Button 
                variant="outline" 
                className="w-full h-14 gap-2 border-emerald-500/30 bg-slate-900 text-emerald-400 hover:bg-emerald-500/10 font-bold rounded-xl"
                onClick={() => startCampaign('labsmobile')}
                disabled={selectedClients.length === 0}
              >
                <CheckCircle2 className="h-5 w-5" />
                Enviar vía Servidor (API)
              </Button>
            )}
          </>
        )}
      </div>

      <p className="text-[10px] text-center text-slate-500 px-6">
        Nota: El envío nativo abrirá la aplicación de mensajes de tu equipo. Asegúrate de tener saldo disponible.
      </p>
    </div>
  );
}
