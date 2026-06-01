// Componente de estado de sincronización para PWA/Nativo móvil
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
import { db, getSyncStats } from '@/lib/offline-db';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function SyncStatus() {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  const userId = (session?.user as any)?.id || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_id') : null);
  const userRole = (session?.user as any)?.role || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_role') : null);
  const isVendedor = userRole === 'vendedor' || userRole === 'jefe_ventas';

  useEffect(() => {
    // Listeners para estado de conexión
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexión restaurada', {
        description: 'Los datos se sincronizarán automáticamente'
      });
      loadSyncData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('Trabajando offline', {
        description: 'Los datos se guardarán localmente'
      });
      loadSyncData();
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
    if (userId) {
      loadSyncData();
      
      if (userRole === 'cobrador') {
        // Inicializar sync automático
        syncService.initAutoSync(userId);
      }
    }

    return () => {
      if (userRole === 'cobrador') {
        syncService.stopAutoSync();
      }
    };
  }, [userId, userRole]);

  const loadSyncData = async () => {
    if (!userId) return;

    try {
      if (userRole === 'cobrador') {
        const [syncStatusData, statsData] = await Promise.all([
          syncService.getSyncStatus(userId),
          getSyncStats(userId)
        ]);

        setSyncStatus(syncStatusData);
        setStats(statsData);
      } else if (isVendedor) {
        // Para vendedor, obtenemos las solicitudes de Dexie
        const totalSol = await db.solicitudes.count();
        const pendingSol = await db.solicitudes.where('syncStatus').equals('pending').count();
        const failedSol = await db.solicitudes.where('syncStatus').equals('failed').count();
        
        // También leemos de la cola nativa (Preferences)
        const { obtenerTamañoCola } = await import('@/lib/native/sync');
        const pendingQueue = await obtenerTamañoCola();

        setStats({
          solicitudesTotal: totalSol,
          pendingSync: pendingSol || pendingQueue,
        });

        const lastSyncVal = localStorage.getItem('last_vendedor_sync');
        setSyncStatus({
          lastSync: lastSyncVal ? parseInt(lastSyncVal) : null,
          pendingPagos: 0,
          pendingMotararios: 0,
          pendingVerificaciones: 0,
          pendingSolicitudes: pendingSol || pendingQueue,
          failedItems: failedSol,
          isOnline: navigator.onLine,
          syncInProgress: syncing,
          preferOffline: false
        });
      }
    } catch (error) {
      console.error('Error loading sync data:', error);
    }
  };

  const handleManualSync = async () => {
    if (!userId || syncing) return;

    setSyncing(true);
    
    try {
      if (userRole === 'cobrador') {
        const success = await syncService.syncAll(userId, true);
        if (success) {
          await loadSyncData();
        }
      } else if (isVendedor) {
        toast.info('Sincronizando solicitudes...');
        const { sincronizarCola } = await import('@/lib/native/sync');
        const res = await sincronizarCola();
        
        // Guardar la fecha del último sync
        const now = Date.now();
        localStorage.setItem('last_vendedor_sync', now.toString());
        
        toast.success(`Sincronización completada: ${res.procesados} procesados, ${res.errores} errores`);
        await loadSyncData();
      }
    } catch (error) {
      console.error("Error en sincronización manual:", error);
      toast.error("Error en sincronización");
    } finally {
      setSyncing(false);
    }
  };

  const handleDebugPagos = async () => {
    if (!userId) return;
    
    try {
      if (userRole === 'cobrador') {
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
      } else {
        const totalSol = await db.solicitudes.count();
        const pendingSol = await db.solicitudes.where('syncStatus').equals('pending').toArray();
        console.log('=== DEBUG SOLICITUDES OFFLINE ===');
        console.log(`Total solicitudes: ${totalSol}`);
        console.log(`Pendientes de sincronizar: ${pendingSol.length}`);
        pendingSol.forEach(s => {
          console.log(`- ${s.localId}: ${s.data?.nombreCompleto || 'Sin nombre'} (${s.fecha})`);
        });

        toast.info(`Debug: ${totalSol} solicitudes offline (${pendingSol.length} pendientes)`);
      }
    } catch (error) {
      console.error('Error en debug:', error);
    }
  };

  if (userRole !== 'cobrador' && !isVendedor || !userId) {
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
    if (userRole === 'cobrador') {
      return (syncStatus?.pendingPagos || 0) + (syncStatus?.pendingMotararios || 0) + (syncStatus?.pendingVerificaciones || 0);
    } else {
      return syncStatus?.pendingSolicitudes || 0;
    }
  };

  const getSyncProgress = () => {
    if (!stats) return 0;
    
    if (userRole === 'cobrador') {
      const total = stats.pagosTotal + stats.motarariosTotal;
      const pending = getPendingCount();
      
      if (total === 0) return 100;
      return Math.round(((total - pending) / total) * 100);
    } else {
      const total = stats.solicitudesTotal;
      const pending = getPendingCount();
      
      if (total === 0) return 100;
      return Math.round(((total - pending) / total) * 100);
    }
  };

  return (
    <Card className="mb-4 bg-slate-900 border-slate-800 text-slate-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-200">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-500" />
            )}
            Estado de Sincronización
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            
            {getPendingCount() > 0 && (
              <Badge variant="outline" className="text-xs bg-sky-500/10 text-sky-400 border-sky-500/20">
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
            <span className="text-slate-400">Datos sincronizados</span>
            <span className="font-medium text-emerald-400">{getSyncProgress()}%</span>
          </div>
          <Progress value={getSyncProgress()} className="h-2 bg-slate-800 [&>div]:bg-emerald-500" />
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-4 text-sm bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
          {userRole === 'cobrador' ? (
            <>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="font-mono font-bold text-slate-200">{stats?.clientesOffline || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Clientes</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-green-400" />
                <div>
                  <div className="font-mono font-bold text-slate-200">{stats?.pagosTotal || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Pagos</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="font-mono font-bold text-slate-200">{stats?.solicitudesTotal || 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Solicitudes</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-green-400" />
                <div>
                  <div className="font-mono font-bold text-slate-200">{getPendingCount()}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Pendientes</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Última sincronización */}
        <div className="flex items-center justify-between text-sm pt-2">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Clock className="w-3.5 h-3.5" />
            Última sync: {getLastSyncText()}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDebugPagos}
              className="h-8 px-2.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              Debug
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualSync}
              disabled={syncing || !isOnline}
              className="h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            >
              {syncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              )}
              {syncing ? 'Syncing...' : 'Sincronizar'}
            </Button>
          </div>
        </div>

        {/* Indicadores de estado */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[10px] text-slate-500">
          <div className="flex items-center gap-4">
            {syncStatus?.failedItems > 0 && (
              <div className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-3 h-3" />
                {syncStatus.failedItems} errores
              </div>
            )}
            
            {getPendingCount() === 0 && (
              <div className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle className="w-3 h-3" />
                Todo al día
              </div>
            )}

            {userRole === 'cobrador' && syncStatus?.preferOffline && (
              <div className="flex items-center gap-1 text-amber-500">
                <WifiOff className="w-3 h-3" />
                Modo Offline Preferido
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
