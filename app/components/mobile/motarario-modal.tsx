
// Modal de motarario optimizado para móvil offline
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Calendar,
  MessageSquare,
  Save,
  Wifi,
  WifiOff,
  Clock,
  User,
  MapPin
} from 'lucide-react';
import { OfflineCliente } from '@/lib/offline-db';
import { syncService } from '@/lib/sync-service';
import { toast } from 'sonner';

interface MotararioModalProps {
  cliente: OfflineCliente;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isOnline: boolean;
}

const motivosMotarario = [
  { value: 'no_estaba', label: 'No estaba en casa', icon: '🏠' },
  { value: 'sin_dinero', label: 'Sin dinero', icon: '💰' },
  { value: 'viajo', label: 'Salió de viaje', icon: '✈️' },
  { value: 'enfermo', label: 'Enfermo', icon: '🏥' },
  { value: 'otro', label: 'Otro motivo', icon: '📝' }
];

export function MotararioModal({ cliente, isOpen, onClose, onSuccess, isOnline }: MotararioModalProps) {
  const { data: session } = useSession();
  const [motivo, setMotivo] = useState<'no_estaba' | 'sin_dinero' | 'viajo' | 'enfermo' | 'otro'>('no_estaba');
  const [descripcion, setDescripcion] = useState('');
  const [proximaVisita, setProximaVisita] = useState('');
  const [loading, setLoading] = useState(false);

  const userId = (session?.user as any)?.id;

  // Reset form cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setMotivo('no_estaba');
      setDescripcion('');
      setProximaVisita('');
    }
  }, [isOpen]);

  // Auto-llenar descripción basada en el motivo
  useEffect(() => {
    const motivoData = motivosMotarario.find(m => m.value === motivo);
    if (motivoData && descripcion === '') {
      setDescripcion(`${motivoData.label} - ${cliente.nombreCompleto}`);
    }
  }, [motivo, cliente.nombreCompleto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!descripcion.trim()) {
      toast.error('Por favor ingrese una descripción');
      return;
    }

    if (!userId) {
      toast.error('Error de sesión');
      return;
    }

    setLoading(true);

    try {
      const motararioData = {
        id: '', // Se generará en el servidor
        clienteId: cliente.id,
        cobradorId: userId,
        motivo,
        descripcion: descripcion.trim(),
        fecha: new Date().toISOString(),
        proximaVisita: proximaVisita ? new Date(proximaVisita).toISOString() : undefined
      };

      if (isOnline) {
        // Si está online, enviar directamente al servidor
        const response = await fetch('/api/motararios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(motararioData)
        });

        if (!response.ok) {
          throw new Error('Error al registrar motarario');
        }

        toast.success('Motarario registrado exitosamente');
        
      } else {
        // Si está offline, guardar localmente
        await syncService.addMotararioOffline(motararioData);
        
        toast.success('Motarario guardado offline', {
          description: 'Se sincronizará cuando tengas conexión'
        });
      }

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error registering motarario:', error);
      toast.error('Error al registrar motarario');
    } finally {
      setLoading(false);
    }
  };

  // Generar fecha mínima (mañana) y máxima (30 días) para próxima visita
  const getDateLimits = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);

    return {
      min: tomorrow.toISOString().split('T')[0],
      max: maxDate.toISOString().split('T')[0]
    };
  };

  const dateLimits = getDateLimits();

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Registrar Motarario
            </DialogTitle>
            
            <Badge variant={isOnline ? 'default' : 'secondary'} className="text-xs">
              {isOnline ? (
                <><Wifi className="w-3 h-3 mr-1" />Online</>
              ) : (
                <><WifiOff className="w-3 h-3 mr-1" />Offline</>
              )}
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información del cliente */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                {cliente.nombreCompleto}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {cliente.direccion}
              </div>
              
              {cliente.telefono && (
                <div className="text-sm text-muted-foreground">
                  📱 {cliente.telefono}
                </div>
              )}
              
              <div className="text-sm">
                <span className="text-muted-foreground">Saldo Pendiente: </span>
                <span className="font-semibold text-red-600">
                  ${cliente.saldoPendiente.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo de No Cobro *</Label>
            <Select value={motivo} onValueChange={(value: any) => setMotivo(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {motivosMotarario.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      {item.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción Detallada *</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe la situación encontrada..."
              rows={3}
              required
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground">
              {descripcion.length}/250 caracteres
            </div>
          </div>

          {/* Fecha de próxima visita */}
          <div className="space-y-2">
            <Label htmlFor="proximaVisita">Próxima Visita Sugerida</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="proximaVisita"
                type="date"
                value={proximaVisita}
                onChange={(e) => setProximaVisita(e.target.value)}
                min={dateLimits.min}
                max={dateLimits.max}
                className="pl-10"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Opcional: Fecha sugerida para el próximo intento de cobro
            </div>
          </div>

          {/* Información adicional según el motivo */}
          {motivo === 'sin_dinero' && (
            <div className="p-3 bg-orange-50 rounded-lg border-l-2 border-orange-400">
              <div className="flex items-center gap-2 text-sm text-orange-800">
                <AlertTriangle className="w-4 h-4" />
                <strong>Sugerencias:</strong>
              </div>
              <ul className="text-xs text-orange-700 mt-1 ml-4 space-y-1">
                <li>• Ofrecer plan de pagos</li>
                <li>• Verificar fecha de cobro del cliente</li>
                <li>• Considerar abono parcial</li>
              </ul>
            </div>
          )}

          {motivo === 'no_estaba' && (
            <div className="p-3 bg-blue-50 rounded-lg border-l-2 border-blue-400">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Clock className="w-4 h-4" />
                <strong>Recomendaciones:</strong>
              </div>
              <ul className="text-xs text-blue-700 mt-1 ml-4 space-y-1">
                <li>• Preguntar a vecinos por horarios</li>
                <li>• Intentar contacto telefónico</li>
                <li>• Programar visita en diferente horario</li>
              </ul>
            </div>
          )}

          {motivo === 'enfermo' && (
            <div className="p-3 bg-green-50 rounded-lg border-l-2 border-green-400">
              <div className="text-sm text-green-800">
                <strong>Nota:</strong> Considerar extender plazo por situación médica
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={loading || !descripcion.trim()}
              className="flex-1"
            >
              {loading ? (
                'Guardando...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </div>

          {/* Advertencia offline */}
          {!isOnline && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border-l-2 border-yellow-400">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                Trabajando offline. El motarario se sincronizará automáticamente cuando tengas conexión.
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
