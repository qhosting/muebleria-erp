
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
import { formatCurrency, getDayName } from '@/lib/utils';
import { toast } from 'sonner';
import { FooterVersion } from '@/components/version-info';
import { PWAInstallButton } from '@/components/pwa/pwa-install-button';

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
  const [sortBy, setSortBy] = useState<'nombre' | 'saldo' | 'dia'>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCliente, setSelectedCliente] = useState<OfflineCliente | null>(null);
  const [showCobroModal, setShowCobroModal] = useState(false);
  const [showPagosModal, setShowPagosModal] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clientesOffline, setClientesOffline] = useState<OfflineCliente[]>([]);

  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
            // Verificar si ya existen clientes en IndexedDB para evitar duplicados
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
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [clientesOffline, searchTerm, selectedDia, sortBy, sortOrder]);

  // 🚀 OPTIMIZACIÓN: Memoizar estadísticas calculadas
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
        {/* Header con estado de conexión */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Cobranza Móvil</h1>
            <p className="text-sm text-muted-foreground">
              {filteredClientes.length} clientes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? 'default' : 'secondary'}>
              {isOnline ? (
                <><Wifi className="w-3 h-3 mr-1" />Online</>
              ) : (
                <><WifiOff className="w-3 h-3 mr-1" />Offline</>
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
        <div className="grid grid-cols-3 gap-2">
          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-lg font-semibold text-green-600">{clientStats.clientesAlDia}</div>
              <div className="text-xs text-muted-foreground">Al día</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-lg font-semibold text-red-600">{clientStats.clientesConDeuda}</div>
              <div className="text-xs text-muted-foreground">Con deuda</div>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-sm font-semibold">{formatCurrency(clientStats.totalSaldoPendiente)}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y búsqueda */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Select value={selectedDia} onValueChange={setSelectedDia}>
              <SelectTrigger className="flex-1">
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
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nombre">Por nombre</SelectItem>
                <SelectItem value="saldo">Por saldo</SelectItem>
                <SelectItem value="dia">Por día</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleSort}
              className="flex-shrink-0"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
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
            />

            <PagosModal
              cliente={selectedCliente}
              isOpen={showPagosModal}
              onClose={() => setShowPagosModal(false)}
              isOnline={isOnline}
            />
          </>
        )}

        {/* Footer con información de versión */}
        <div className="mt-8 pt-4 border-t">
          <FooterVersion />
        </div>
      </div>
    </LayoutWrapper>
  );
}
