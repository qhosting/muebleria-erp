
'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { 
  Smartphone, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  RefreshCw, 
  Search,
  CheckCircle2,
  XCircle,
  Key,
  Clock,
  User as UserIcon,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Dispositivo {
  id: string;
  nombre: string;
  modelo: string;
  sistemaOperativo: string;
  isAuthorized: boolean;
  otpCode: string | null;
  otpExpires: string | null;
  lastLogin: string | null;
  createdAt: string;
  userId: string | null;
  user?: {
    name: string;
    email: string;
  };
}

export default function DispositivosAdminPage() {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Dispositivo | null>(null);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

  useEffect(() => {
    fetchDispositivos();
  }, []);

  const fetchDispositivos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dispositivos');
      if (res.ok) {
        setDispositivos(await res.json());
      }
    } catch (error) {
      toast.error('Error al cargar dispositivos');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthorization = async (device: Dispositivo) => {
    try {
      const res = await fetch('/api/dispositivos', {
        method: 'PUT',
        body: JSON.stringify({
          id: device.id,
          isAuthorized: !device.isAuthorized
        })
      });

      if (res.ok) {
        toast.success(device.isAuthorized ? 'Dispositivo bloqueado' : 'Dispositivo autorizado');
        fetchDispositivos();
      }
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const generateOtp = async (deviceId: string) => {
    try {
      const res = await fetch('/api/dispositivos', {
        method: 'POST',
        body: JSON.stringify({
          deviceId,
          action: 'GENERATE_OTP'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedOtp(data.otp);
        setShowOtpDialog(true);
        fetchDispositivos();
      }
    } catch (error) {
      toast.error('Error al generar código');
    }
  };

  const deleteDevice = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este dispositivo? Deberá vincularse de nuevo.')) return;

    try {
      const res = await fetch(`/api/dispositivos?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Dispositivo eliminado');
        fetchDispositivos();
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const filtered = dispositivos.filter(d => 
    d.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Seguridad de Dispositivos</h1>
            <p className="text-muted-foreground text-sm">Gestiona los equipos móviles autorizados para cobranza en campo.</p>
          </div>
          <Button onClick={fetchDispositivos} variant="outline" size="icon">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por ID, nombre o usuario..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo / ID</TableHead>
                  <TableHead>Usuario Vinculado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última Conexión</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${device.isAuthorized ? 'bg-green-50' : 'bg-slate-50'}`}>
                          <Smartphone className={`h-5 w-5 ${device.isAuthorized ? 'text-green-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{device.nombre || 'Sin nombre'}</div>
                          <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                            {device.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {device.user ? (
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-3 w-3 text-slate-400" />
                          <span className="text-sm">{device.user.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No vinculado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {device.isAuthorized ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                          <ShieldCheck className="h-3 w-3 mr-1" /> Autorizado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">
                          <Clock className="h-3 w-3 mr-1" /> Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {device.lastLogin 
                          ? format(new Date(device.lastLogin), 'Pp', { locale: es })
                          : 'Nunca'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!device.isAuthorized && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1"
                            onClick={() => generateOtp(device.id)}
                          >
                            <Key className="h-3.5 w-3.5" /> Vincular
                          </Button>
                        )}
                        <Button 
                          variant={device.isAuthorized ? "ghost" : "outline"}
                          size="sm"
                          className={`h-8 ${device.isAuthorized ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-green-600'}`}
                          onClick={() => toggleAuthorization(device)}
                        >
                          {device.isAuthorized ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => deleteDevice(device.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No se encontraron dispositivos registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialogo de OTP */}
        <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Código de Vinculación
              </DialogTitle>
              <DialogDescription>
                Entrega este código al cobrador para que lo ingrese en su dispositivo móvil.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="text-5xl font-black tracking-[0.5em] text-primary bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-200">
                {generatedOtp}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Válido por 30 minutos
              </p>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={() => setShowOtpDialog(false)}>
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
