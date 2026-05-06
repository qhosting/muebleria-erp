
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
  AlertTriangle,
  UserCheck,
  Handshake,
  MoreHorizontal,
  Printer
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
  onVerificar: (cliente: OfflineCliente) => void;
  onConvenio: (cliente: OfflineCliente) => void;
  onMotarario: (cliente: OfflineCliente) => void;
  onCall?: (telefono: string) => void;
  onAviso: (cliente: OfflineCliente) => void;
  onVerPerfil?: (cliente: OfflineCliente) => void;
  showSyncStatus?: boolean;
}

export function ClientCard({
  cliente,
  isOnline,
  onCobrar,
  onVerPagos,
  onVerificar,
  onConvenio,
  onMotarario,
  onCall,
  onAviso,
  onVerPerfil,
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
    <Card 
      className="w-full active:scale-[0.98] transition-transform cursor-pointer overflow-hidden border-slate-200 shadow-sm hover:shadow-md"
      onClick={() => onVerPerfil?.(cliente)}
    >
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight truncate">
              {cliente.nombreCompleto}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <Calendar className="w-4 h-4" />
              {getDayName(cliente.diaPago)} - {formatCurrency(cliente.montoAcordado)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge()}

            {showSyncStatus && (
              <div className="flex items-center">
                {cliente.syncStatus === 'synced' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : cliente.syncStatus === 'pending' ? (
                  <Clock className="w-4 h-4 text-orange-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-4">
        {/* Información de contacto y ubicación */}
        <div className="space-y-3">
          {cliente.telefono && (
            <div className="flex items-center gap-3 text-base">
              <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 truncate font-medium">{cliente.telefono}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCall();
                }}
                disabled={calling}
                className="h-8 w-8 p-0"
              >
                <Phone className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex items-start gap-3 text-base">
            <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {cliente.direccion}
            </span>
          </div>
        </div>

        {/* Información financiera */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-xl border border-muted">
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Saldo Pendiente</div>
            <div className={`text-xl font-black ${getSaldoColor()}`}>
              {formatCurrency(cliente.saldoPendiente)}
            </div>
          </div>

          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Último Pago</div>
            <div className="text-sm font-bold">
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
        <div className="space-y-2">
          <Button
            onClick={() => onCobrar(cliente)}
            className="w-full h-10 text-sm font-bold bg-blue-600 hover:bg-blue-700 shadow-md"
            disabled={cliente.statusCuenta !== 'activo'}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            COBRAR AHORA
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onVerPagos(cliente)}
              variant="outline"
              className="h-9 text-[10px] px-1"
            >
              <Receipt className="w-3 h-3 mr-1" />
              Ver Pagos
            </Button>

            <Button
              onClick={() => onVerificar(cliente)}
              variant="outline"
              className="h-9 text-[10px] px-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <UserCheck className="w-3 h-3 mr-1" />
              Verificar VD
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onConvenio(cliente)}
              variant="outline"
              className="h-9 text-[10px] px-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Handshake className="w-3 h-3 mr-1" />
              Convenio
            </Button>

            <Button
              onClick={() => onMotarario(cliente)}
              variant="outline"
              className="h-9 text-[10px] px-1 border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Motarario
            </Button>
          </div>

          <Button
            onClick={() => onAviso(cliente)}
            variant="outline"
            className="w-full h-9 text-[10px] border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            <Printer className="w-3 h-3 mr-1" />
            AVISO DE COBRO
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
    </Card >
  );
}
