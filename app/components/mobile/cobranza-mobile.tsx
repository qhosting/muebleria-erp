
// Componente principal de cobranza móvil con funcionalidad offline
'use client';

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Filter,
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  RefreshCw,
  Grid3x3,
  List,
  SortAsc,
  SortDesc,
  MapPin,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';
import { OfflineCliente, db, getSyncStats } from '@/lib/offline-db';
import { syncService } from '@/lib/sync-service';
import { SyncStatus } from './sync-status';
import { ClientCard } from './client-card';
import { CobroModal } from './cobro-modal';
import { PagosModal } from './pagos-modal';
import { MotararioModal } from './motarario-modal';
import { ConvenioModal } from './convenio-modal';
import { VerificacionModal } from './verificacion-modal';
import { ProfileModal } from './profile-modal';
import { ComprobanteCapturaModal, ComprobanteData } from './comprobante-captura-modal';
import { formatCurrency, getDayName } from '@/lib/utils';
import { toast } from 'sonner';
import { FooterVersion } from '@/components/version-info';
import { PWAInstallButton } from '@/components/pwa/pwa-install-button';
import { optimizeRoute } from '@/lib/tsp-algorithm';
import { obtenerUbicacionCobrador } from '@/lib/native/location';
import { useBluetoothPrinter } from '@/hooks/use-bluetooth-printer';

interface CobranzaMobileProps {
  initialClientes?: OfflineCliente[];
  disableLayout?: boolean;
}

export default function CobranzaMobile({ initialClientes = [], disableLayout = false }: CobranzaMobileProps) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  // Filtro por defecto: día actual de la semana
  const [selectedDia, setSelectedDia] = useState(() => {
    const today = new Date().getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
    const diasMap = ['7', '1', '2', '3', '4', '5', '6']; // Ajustamos para que domingo=7
    return diasMap[today];
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'nombre' | 'saldo' | 'dia' | 'ruta'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedIds, setOptimizedIds] = useState<string[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<OfflineCliente | null>(null);
  const [showCobroModal, setShowCobroModal] = useState(false);
  const [showPagosModal, setShowPagosModal] = useState(false);
  const [showMotararioModal, setShowMotararioModal] = useState(false);
  const [showConvenioModal, setShowConvenioModal] = useState(false);
  const [showVerificacionModal, setShowVerificacionModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [comprobanteCapturaData, setComprobanteCapturaData] = useState<ComprobanteData | null>(null);
  const [showComprobanteCapturaModal, setShowComprobanteCapturaModal] = useState(false);

  const handleShowComprobante = (data: ComprobanteData) => {
    setComprobanteCapturaData(data);
    setShowComprobanteCapturaModal(true);
  };

  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientesOffline, setClientesOffline] = useState<OfflineCliente[]>([]);
  const { isConnected, printCollectionNotice, connectToPrinter } = useBluetoothPrinter();

  const userRole = (session?.user as any)?.role || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_role') : null);
  const userId = (session?.user as any)?.id || (typeof window !== 'undefined' ? localStorage.getItem('last_cobrador_id') : null);

  const diasSemana = [
    { value: '1', label: 'LUNES' },
    { value: '2', label: 'MARTES' },
    { value: '3', label: 'MIÉRCOLES' },
    { value: '4', label: 'JUEVES' },
    { value: '5', label: 'VIERNES' },
    { value: '6', label: 'SÁBADO' },
    { value: '7', label: 'DOMINGO' }
  ];

  // 🚀 OPTIMIZACIÓN CRÍTICA: Simplificar gestión de conectividad
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Establecer estado inicial
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 🚀 ESCUCHA DE SINCRONIZACIÓN REMOTA (FORZADA POR ADMIN)
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REMOTE_SYNC_REQUESTED' && userId) {
        console.log('⚡ Recibida orden de sincronización remota del Administrador');
        toast.info('Sincronización remota iniciada por el administrador', {
            description: 'Subiendo datos pendientes ahora mismo...',
            duration: 5000
        });
        
        // Sincronizar ignorando preferencias
        syncService.syncAll(userId, true);
      }
    };

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [userId]);

  // 🚀 OPTIMIZACIÓN CRÍTICA: Cargar clientes con useCallback para evitar re-creaciones
  const loadClientesOffline = useCallback(async () => {
    if (!userId) return;

    try {
      const clientes = await db.clientes
        .where('cobradorAsignadoId')
        .equals(userId)
        .and(cliente => cliente.statusCuenta === 'activo')
        .toArray();

      // Solo actualizar si hay cambios para evitar re-renders innecesarios
      setClientesOffline(prevClientes => {
        // Comparación simple por longitud y algunos IDs
        if (prevClientes.length !== clientes.length) {
          return clientes;
        }

        // Verificar algunos IDs para detectar cambios
        const prevIds = prevClientes.slice(0, 5).map(c => c.id).sort();
        const newIds = clientes.slice(0, 5).map(c => c.id).sort();

        if (JSON.stringify(prevIds) !== JSON.stringify(newIds)) {
          return clientes;
        }

        // Si no hay cambios significativos, mantener el estado anterior
        return prevClientes;
      });
    } catch (error) {
      console.error('Error loading clientes offline:', error);
      setClientesOffline([]);
    }
  }, [userId]); // Solo depende del userId

  // 🚀 OPTIMIZACIÓN CRÍTICA: Un solo useEffect sin bucles para carga inicial
  useEffect(() => {
    if (!userId || userRole !== 'cobrador') {
      setLoading(false);
      return;
    }

    let mounted = true; // Flag para evitar actualizaciones si el componente se desmonta

    const initializeData = async () => {
      if (!mounted) return;
      setLoading(true);

      try {
        // Cargar estadísticas básicas
        const stats = await getSyncStats(userId);
        if (mounted) setStats(stats);

        // Cargar clientes de IndexedDB
        await loadClientesOffline();

        // Procesar clientes iniciales solo si los hay y no se han procesado antes
        if (initialClientes.length > 0) {
          try {
            // Eliminar clientes que pertenezcan a otros gestores para evitar residuos
            await db.clientes.filter(c => !c.cobradorAsignadoId || c.cobradorAsignadoId !== userId).delete();

            // Verificar si ya existen clientes en IndexedDB para este usuario
            const existingClientes = await db.clientes
              .where('cobradorAsignadoId')
              .equals(userId)
              .count();

            // Solo insertar si no hay clientes existentes
            if (existingClientes === 0) {
              await db.transaction('rw', db.clientes, async () => {
                for (const cliente of initialClientes) {
                  await db.clientes.put({
                    ...cliente,
                    cobradorAsignadoId: cliente.cobradorAsignadoId || userId,
                    lastSync: Date.now(),
                    syncStatus: 'synced' as const
                  });
                }
              });

              // Recargar después de insertar solo si el componente sigue montado
              if (mounted) {
                await loadClientesOffline();
              }
            }
          } catch (dbError) {
            console.error('Error saving initial clientes:', dbError);
          }
        }

      } catch (error) {
        console.error('Error in initialization:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeData();

    // Cleanup function
    return () => {
      mounted = false;
    };
  }, [userId, userRole]); // Solo dependencias estables, removemos initialClientes.length

  // 🚀 OPTIMIZACIÓN: Procesar clientes iniciales en un useEffect separado y controlado
  useEffect(() => {
    if (!userId || userRole !== 'cobrador' || initialClientes.length === 0) return;
    if (loading) return; // No procesar si aún está cargando

    let mounted = true;

    const processInitialClientes = async () => {
      try {
        // Eliminar clientes pertenecientes a otros gestores
        await db.clientes.filter(c => !c.cobradorAsignadoId || c.cobradorAsignadoId !== userId).delete();

        // Solo procesar si hay clientes y no se han guardado antes
        const existingCount = await db.clientes
          .where('cobradorAsignadoId')
          .equals(userId)
          .count();

        if (existingCount === 0 && mounted) {
          await db.transaction('rw', db.clientes, async () => {
            for (const cliente of initialClientes) {
              await db.clientes.put({
                ...cliente,
                cobradorAsignadoId: cliente.cobradorAsignadoId || userId,
                lastSync: Date.now(),
                syncStatus: 'synced' as const
              });
            }
          });

          if (mounted) {
            await loadClientesOffline();
          }
        }
      } catch (error) {
        console.error('Error processing initial clientes:', error);
      }
    };

    processInitialClientes();

    return () => {
      mounted = false;
    };
  }, [initialClientes, userId, userRole, loading]); // Controlado con flag de loading

  // 🚀 OPTIMIZACIÓN CRÍTICA: Memoizar filtrado para evitar re-cálculos constantes
  const filteredClientes = useMemo(() => {
    if (!clientesOffline || clientesOffline.length === 0) return [];

    // Filtrado optimizado con búsqueda en minúsculas pre-calculada
    const searchLower = searchTerm.toLowerCase();

    return clientesOffline
      .filter(cliente => {
        // 🚀 Short-circuit evaluation para mejor rendimiento
        if (selectedDia !== 'all' && cliente.diaPago !== selectedDia) return false;

        if (searchLower && !cliente.nombreCompleto.toLowerCase().includes(searchLower) &&
          !cliente.telefono?.toLowerCase().includes(searchLower) &&
          !cliente.direccion.toLowerCase().includes(searchLower)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'nombre':
            comparison = a.nombreCompleto.localeCompare(b.nombreCompleto);
            break;
          case 'saldo':
            comparison = a.saldoPendiente - b.saldoPendiente;
            break;
          case 'dia':
            comparison = parseInt(a.diaPago) - parseInt(b.diaPago);
            break;
          case 'ruta':
            const indexA = optimizedIds.indexOf(a.id);
            const indexB = optimizedIds.indexOf(b.id);
            if (indexA === -1 && indexB === -1) comparison = 0;
            else if (indexA === -1) comparison = 1;
            else if (indexB === -1) comparison = -1;
            else comparison = indexA - indexB;
            break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [clientesOffline, searchTerm, selectedDia, sortBy, sortOrder]);

  // 🚀 OPTIMIZACIÓN: Memoizar estadísticas calculadas
  useEffect(() => {
    if (userId) {
      localStorage.setItem('last_cobrador_id', userId);
      if (session?.user?.name) {
        localStorage.setItem('last_cobrador_name', session.user.name);
      }
      if (session?.user?.email) {
        localStorage.setItem('last_cobrador_email', session.user.email);
      }
      if (userRole) {
        localStorage.setItem('last_cobrador_role', userRole);
      }
    }
  }, [userId, userRole, session]);

  const clientStats = useMemo(() => {
    const totalSaldoPendiente = filteredClientes.reduce((sum, c) => sum + c.saldoPendiente, 0);
    const clientesConDeuda = filteredClientes.filter(c => c.saldoPendiente > 0).length;
    const clientesAlDia = filteredClientes.filter(c => c.saldoPendiente <= 0).length;

    return { totalSaldoPendiente, clientesConDeuda, clientesAlDia };
  }, [filteredClientes]);

  // 🚀 OPTIMIZACIÓN: Handlers simplificados sin memoización compleja
  const handleCobrar = (cliente: OfflineCliente) => {
    setSelectedCliente(cliente);
    setShowCobroModal(true);
  };

  const handleVerPagos = (cliente: OfflineCliente) => {
    setSelectedCliente(cliente);
    setShowPagosModal(true);
  };

  const handleVerificar = (cliente: OfflineCliente) => {
    setSelectedCliente(cliente);
    setShowVerificacionModal(true);
  };

  const handleConvenio = (cliente: OfflineCliente) => {
    setSelectedCliente(cliente);
    setShowConvenioModal(true);
  };

  const handleMotarario = (cliente: OfflineCliente) => {
    setSelectedCliente(cliente);
    setShowMotararioModal(true);
  };

  const handleAviso = async (cliente: OfflineCliente) => {
    if (!isConnected) {
      toast.error("Impresora no conectada", {
        action: {
          label: "Conectar",
          onClick: () => connectToPrinter()
        }
      });
      return;
    }

    try {
      toast.info("Imprimiendo aviso...");
      // Mapear OfflineCliente al formato esperado por printCollectionNotice si es necesario
      const noticeData = {
        nombre: cliente.nombreCompleto,
        codigoCliente: cliente.id, // O el campo real
        saldo: cliente.saldoPendiente,
        saldoVencido: cliente.saldoVencido || 0,
        pagoSemanal: cliente.montoAcordado,
        cobradorNombre: session?.user?.name || 'GESTOR'
      };
      await printCollectionNotice(noticeData);
    } catch (error) {
      console.error("Error al imprimir aviso:", error);
      toast.error("Error al imprimir aviso de cobro");
    }
  };

  const handleVerPerfil = (cliente: OfflineCliente) => {
    setSelectedCliente(cliente);
    setShowProfileModal(true);
  };

  // 🚀 OPTIMIZACIÓN: Handler optimizado con useCallback
  const handleModalSuccess = useCallback(async () => {
    try {
      // Recargar clientes después de un pago exitoso
      await loadClientesOffline();

      // Recargar estadísticas básicas
      if (userId) {
        const stats = await getSyncStats(userId);
        setStats(stats);
      }
    } catch (error) {
      console.error('Error in modal success handler:', error);
    }
  }, [loadClientesOffline, userId]); // Dependencias claras

  const toggleSort = () => {
    setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleOptimizeRoute = async () => {
    setIsOptimizing(true);
    try {
      // Para optimizar ruta, no necesitamos precisión extrema de GPS (ahorra batería)
      // Aceptamos una ubicación de hasta 5 minutos de antigüedad
      const coords: any = await obtenerUbicacionCobrador(false, 300000); 
      
      // Filtrar clientes que tienen coordenadas
      const clientsWithCoords = clientesOffline
        .filter(c => c.latitud && c.longitud)
        .map(c => ({
          id: c.id,
          lat: parseFloat(c.latitud!.toString()),
          lng: parseFloat(c.longitud!.toString())
        }));

      if (clientsWithCoords.length === 0) {
        toast.error('No hay clientes con coordenadas para optimizar');
        return;
      }

      const startPoint = { id: 'current', lat: coords.lat, lng: coords.lng };
      const optimized = optimizeRoute(startPoint, clientsWithCoords);
      
      setOptimizedIds(optimized.map(o => o.id));
      setSortBy('ruta');
      toast.success('Ruta optimizada según tu ubicación actual');
    } catch (error) {
      console.error('Error optimizando ruta:', error);
      toast.error('Error al obtener ubicación GPS');
    } finally {
      setIsOptimizing(false);
    }
  };

  if (userRole !== 'cobrador') {
    if (disableLayout) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Esta sección es solo para cobradores
          </p>
        </div>
      );
    }

    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Esta sección es solo para cobradores
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const LayoutWrapper = disableLayout ? Fragment : DashboardLayout;

  return (
    <LayoutWrapper>
      <div className={disableLayout ? "" : "max-w-md mx-auto space-y-4 pb-20"}>
        <div className="flex items-center justify-between py-2">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Cobranza</h1>
            <p className="text-base text-muted-foreground font-medium">
              {filteredClientes.length} clientes asignados
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? 'default' : 'secondary'} className="px-3 py-1 text-xs font-bold">
              {isOnline ? (
                <><Wifi className="w-4 h-4 mr-1 text-emerald-400" />Online</>
              ) : (
                <><WifiOff className="w-4 h-4 mr-1 text-slate-400" />Offline</>
              )}
            </Badge>
          </div>
        </div>

        {/* Estado de sincronización */}
        <SyncStatus />

        {/* Botón de instalación PWA */}
        <div className="mb-4">
          <PWAInstallButton />
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center shadow-sm border-slate-200">
            <CardContent className="p-4">
              <div className="text-2xl font-black text-emerald-600">{clientStats.clientesAlDia}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Al día</div>
            </CardContent>
          </Card>

          <Card className="text-center shadow-sm border-slate-200">
            <CardContent className="p-4">
              <div className="text-2xl font-black text-red-600">{clientStats.clientesConDeuda}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Con deuda</div>
            </CardContent>
          </Card>

          <Card className="text-center shadow-sm border-slate-200">
            <CardContent className="p-4">
              <div className="text-xl font-black">{formatCurrency(clientStats.totalSaldoPendiente)}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y búsqueda */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>

          <div className="flex gap-2">
            <Select value={selectedDia} onValueChange={setSelectedDia}>
              <SelectTrigger className="flex-1 h-14 text-lg">
                <SelectValue placeholder="Día" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">TODOS</SelectItem>
                {diasSemana.map((dia) => (
                  <SelectItem key={dia.value} value={dia.value}>
                    {dia.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="flex-1 h-14 text-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nombre">Por nombre</SelectItem>
                <SelectItem value="saldo">Por saldo</SelectItem>
                <SelectItem value="dia">Por día</SelectItem>
                <SelectItem value="ruta">Por ruta optimizada</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSort}
              className="flex-shrink-0 h-14 w-14 rounded-xl"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="w-5 h-5" />
              ) : (
                <SortDesc className="w-5 h-5" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleOptimizeRoute}
              className={`flex-shrink-0 h-14 w-14 rounded-xl ${sortBy === 'ruta' ? 'bg-primary/10 border-primary text-primary' : ''}`}
              disabled={isOptimizing}
              title="Optimizar Ruta (TSP)"
            >
              <RefreshCw className={`w-5 h-5 ${isOptimizing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Lista de clientes */}
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Cargando clientes...</p>
          </div>
        ) : filteredClientes.length === 0 ? (
          <div className="text-center py-8">
            <Database className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchTerm || selectedDia !== 'all'
                ? 'No se encontraron clientes con los filtros aplicados'
                : 'No hay clientes asignados'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClientes.map((cliente) => (
              <ClientCard
                key={cliente.id}
                cliente={cliente}
                isOnline={isOnline}
                onCobrar={handleCobrar}
                onVerPagos={handleVerPagos}
                onVerificar={handleVerificar}
                onConvenio={handleConvenio}
                onMotarario={handleMotarario}
                onAviso={handleAviso}
                onVerPerfil={handleVerPerfil}
                showSyncStatus={true}
              />
            ))}
          </div>
        )}

        {/* Modales */}
        {selectedCliente && (
          <>
            <CobroModal
              cliente={selectedCliente}
              isOpen={showCobroModal}
              onClose={() => setShowCobroModal(false)}
              onSuccess={handleModalSuccess}
              isOnline={isOnline}
              onShowComprobante={handleShowComprobante}
            />

            <PagosModal
              cliente={selectedCliente}
              isOpen={showPagosModal}
              onClose={() => setShowPagosModal(false)}
              isOnline={isOnline}
            />

            <MotararioModal
              cliente={selectedCliente}
              isOpen={showMotararioModal}
              onClose={() => setShowMotararioModal(false)}
              onSuccess={handleModalSuccess}
              isOnline={isOnline}
            />

            <ConvenioModal
              cliente={selectedCliente}
              isOpen={showConvenioModal}
              onClose={() => setShowConvenioModal(false)}
              onSuccess={handleModalSuccess}
              isOnline={isOnline}
            />

            <VerificacionModal
              cliente={selectedCliente}
              isOpen={showVerificacionModal}
              onClose={() => setShowVerificacionModal(false)}
              onSuccess={handleModalSuccess}
              isOnline={isOnline}
            />

            {showProfileModal && (
              <ProfileModal
                cliente={selectedCliente}
                onClose={() => setShowProfileModal(false)}
                onAviso={handleAviso}
              />
            )}
          </>
        )}

        {/* Modal de Comprobante para Captura de Pantalla */}
        <ComprobanteCapturaModal
          isOpen={showComprobanteCapturaModal}
          onClose={() => setShowComprobanteCapturaModal(false)}
          data={comprobanteCapturaData}
        />

        {/* Footer con información de versión */}
        <div className="mt-8 pt-4 border-t">
          <FooterVersion />
        </div>
      </div>
    </LayoutWrapper>
  );
}
