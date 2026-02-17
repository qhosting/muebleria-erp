
// Componente de estado de sincronización para PWA móvil
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Database,
  Upload,
  Download
} from 'lucide-react';
import { syncService } from '@/lib/sync-service';
import { getSyncStats } from '@/lib/offline-db';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function SyncStatus() {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  const userId = (session?.user as any)?.id;
  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    // Listeners para estado de conexión
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexión restaurada', {
        description: 'Los datos se sincronizarán automáticamente'
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('Trabajando offline', {
        description: 'Los datos se guardarán localmente'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (userId && userRole === 'cobrador') {
      loadSyncData();
      
      // Inicializar sync automático
      syncService.initAutoSync(userId);
    }

    return () => {
      syncService.stopAutoSync();
    };
  }, [userId, userRole]);

  const loadSyncData = async () => {
    if (!userId) return;

    try {
      const [syncStatus, stats] = await Promise.all([
        syncService.getSyncStatus(userId),
        getSyncStats(userId)
      ]);

      setSyncStatus(syncStatus);
      setStats(stats);
    } catch (error) {
      console.error('Error loading sync data:', error);
    }
  };

  const handleManualSync = async () => {
    if (!userId || syncing) return;

    setSyncing(true);
    
    try {
      const success = await syncService.syncAll(userId, true);
      if (success) {
        await loadSyncData();
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDebugPagos = async () => {
    if (!userId) return;
    
    try {
      const pagosOffline = await syncService.getPagosOffline(userId);
      console.log('=== DEBUG PAGOS OFFLINE ===');
      console.log(`Total de pagos offline: ${pagosOffline.length}`);
      
      const pagosPorTipo = pagosOffline.reduce((acc: any, pago: any) => {
        acc[pago.tipoPago] = (acc[pago.tipoPago] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Pagos por tipo:', pagosPorTipo);
      
      const pagosPendientes = pagosOffline.filter(p => p.syncStatus === 'pending');
      console.log(`Pagos pendientes de sincronizar: ${pagosPendientes.length}`);
      
      pagosPendientes.forEach((pago: any) => {
        console.log(`- ${pago.localId}: ${pago.tipoPago} $${pago.monto} (${pago.fechaPago})`);
      });
      
      toast.info(`Debug: ${pagosOffline.length} pagos offline (${pagosPendientes.length} pendientes)`, {
        description: 'Revisa la consola para más detalles'
      });
      
    } catch (error) {
      console.error('Error en debug:', error);
    }
  };

  if (userRole !== 'cobrador' || !userId) {
    return null;
  }

  const getLastSyncText = () => {
    if (!syncStatus?.lastSync) return 'Nunca';
    
    return formatDistanceToNow(new Date(syncStatus.lastSync), {
      addSuffix: true,
      locale: es
    });
  };

  const getPendingCount = () => {
    return (syncStatus?.pendingPagos || 0) + (syncStatus?.pendingMotararios || 0);
  };

  const getSyncProgress = () => {
    if (!stats) return 0;
    
    const total = stats.pagosTotal + stats.motarariosTotal;
    const pending = getPendingCount();
    
    if (total === 0) return 100;
    return Math.round(((total - pending) / total) * 100);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            Estado de Sincronización
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? 'default' : 'secondary'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            
            {getPendingCount() > 0 && (
              <Badge variant="outline" className="text-xs">
                {getPendingCount()} pendientes
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progreso de sincronización */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Datos sincronizados</span>
            <span className="font-medium">{getSyncProgress()}%</span>
          </div>
          <Progress value={getSyncProgress()} className="h-2" />
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-500" />
            <div>
              <div className="font-medium">{stats?.clientesOffline || 0}</div>
              <div className="text-muted-foreground">Clientes</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-green-500" />
            <div>
              <div className="font-medium">{stats?.pagosTotal || 0}</div>
              <div className="text-muted-foreground">Pagos</div>
            </div>
          </div>
        </div>

        {/* Última sincronización */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            Última sync: {getLastSyncText()}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDebugPagos}
              className="h-8 px-2 text-xs"
            >
              Debug
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualSync}
              disabled={syncing || !isOnline}
              className="h-8"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          </div>
        </div>

        {/* Indicadores de estado */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {syncStatus?.failedItems > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500" />
                {syncStatus.failedItems} errores
              </div>
            )}
            
            {getPendingCount() === 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Todo sincronizado
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
