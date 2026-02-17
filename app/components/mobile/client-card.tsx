
// Tarjeta de cliente optimizada para móvil offline
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign,
  CreditCard,
  Receipt,
  MessageSquare,
  Clock,
  CheckCircle,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react';
import { OfflineCliente } from '@/lib/offline-db';
import { formatCurrency, getDayName } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientCardProps {
  cliente: OfflineCliente;
  isOnline: boolean;
  onCobrar: (cliente: OfflineCliente) => void;
  onVerPagos: (cliente: OfflineCliente) => void;
  onCall?: (telefono: string) => void;
  showSyncStatus?: boolean;
}

export function ClientCard({ 
  cliente, 
  isOnline, 
  onCobrar, 
  onVerPagos,
  onCall,
  showSyncStatus = true
}: ClientCardProps) {
  const [calling, setCalling] = useState(false);

  const handleCall = async () => {
    if (!cliente.telefono || calling) return;
    
    setCalling(true);
    
    try {
      // Intentar abrir la app de teléfono
      if (onCall) {
        onCall(cliente.telefono);
      } else {
        window.open(`tel:${cliente.telefono}`);
      }
    } catch (error) {
      console.error('Error making call:', error);
    } finally {
      setCalling(false);
    }
  };

  const getSaldoColor = () => {
    if (cliente.saldoPendiente <= 0) return 'text-green-600';
    if (cliente.saldoPendiente > cliente.montoAcordado * 2) return 'text-red-600';
    return 'text-orange-600';
  };

  const getDaysOverdue = () => {
    if (!cliente.fechaUltimoPago) return null;
    
    const lastPayment = new Date(cliente.fechaUltimoPago);
    const today = new Date();
    const diffTime = today.getTime() - lastPayment.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 7 ? diffDays : null;
  };

  const getStatusBadge = () => {
    const overdueDays = getDaysOverdue();
    
    if (cliente.saldoPendiente <= 0) {
      return <Badge className="bg-green-500">Al día</Badge>;
    }
    
    if (overdueDays && overdueDays > 15) {
      return <Badge variant="destructive">Mora {overdueDays}d</Badge>;
    }
    
    if (overdueDays && overdueDays > 7) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">
        Vencido {overdueDays}d
      </Badge>;
    }
    
    return <Badge variant="secondary">Activo</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm leading-tight truncate">
              {cliente.nombreCompleto}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {getDayName(cliente.diaPago)} - {formatCurrency(cliente.montoAcordado)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            
            {showSyncStatus && (
              <div className="flex items-center">
                {cliente.syncStatus === 'synced' ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : cliente.syncStatus === 'pending' ? (
                  <Clock className="w-3 h-3 text-orange-500" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Información de contacto y ubicación */}
        <div className="space-y-2">
          {cliente.telefono && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 truncate">{cliente.telefono}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCall}
                disabled={calling}
                className="h-6 w-6 p-0"
              >
                <Phone className="w-3 h-3" />
              </Button>
            </div>
          )}
          
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-xs text-muted-foreground line-clamp-2">
              {cliente.direccion}
            </span>
          </div>
        </div>

        {/* Información financiera */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Saldo Pendiente</div>
            <div className={`text-sm font-semibold ${getSaldoColor()}`}>
              {formatCurrency(cliente.saldoPendiente)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Último Pago</div>
            <div className="text-sm">
              {cliente.fechaUltimoPago 
                ? formatDistanceToNow(new Date(cliente.fechaUltimoPago), { 
                    addSuffix: true, 
                    locale: es 
                  })
                : 'Sin pagos'
              }
            </div>
          </div>
        </div>

        {/* Notas si existen */}
        {cliente.notas && (
          <div className="text-xs text-muted-foreground p-2 bg-blue-50 rounded border-l-2 border-blue-200">
            <MessageSquare className="w-3 h-3 inline mr-1" />
            {cliente.notas}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button
            onClick={() => onCobrar(cliente)}
            className="flex-1 h-9 text-xs"
            disabled={cliente.statusCuenta !== 'activo'}
          >
            <CreditCard className="w-4 h-4 mr-1" />
            Cobrar
          </Button>
          
          <Button
            onClick={() => onVerPagos(cliente)}
            variant="outline"
            className="flex-1 h-9 text-xs"
          >
            <Receipt className="w-4 h-4 mr-1" />
            Ver Pagos
          </Button>
        </div>

        {/* Indicador de conectividad */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <span>ID: {cliente.id.slice(-8)}</span>
          
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
