
// Actualizar página de cobranza para redirigir a la versión móvil en dispositivos móviles
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  Search, 
  MapPin, 
  Phone, 
  Calendar,
  DollarSign,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt,
  Smartphone,
  Wifi,
  WifiOff,
  Monitor,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, getDayName } from '@/lib/utils';
import { toast } from 'sonner';
import { Cliente } from '@/lib/types';
import { CobranzaModal } from '@/components/cobranza/cobranza-modal';

export default function CobranzaPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDia, setSelectedDia] = useState('all');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showCobranzaModal, setShowCobranzaModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [cobranzaHoy, setCobranzaHoy] = useState(0);
  const [clientesVisitados, setClientesVisitados] = useState(0);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  const diasSemana = [
    { value: '1', label: 'Lunes' },
    { value: '2', label: 'Martes' },
    { value: '3', label: 'Miércoles' },
    { value: '4', label: 'Jueves' },
    { value: '5', label: 'Viernes' },
    { value: '6', label: 'Sábado' },
    { value: '7', label: 'Domingo' }
  ];

  // Detectar dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      window.innerWidth < 768;
      setIsMobileDevice(isMobile);
      
      // Si es cobrador en dispositivo móvil, redirigir a versión móvil
      if (isMobile && userRole === 'cobrador') {
        router.push('/dashboard/cobranza-mobile');
        return;
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [userRole, router]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

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
      cargarClientes();
      cargarEstadisticas();
    }
  }, [userId, selectedDia]);

  const cargarClientes = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      let url = `/api/clientes/cobrador/${userId}`;
      if (selectedDia !== 'all') {
        url += `?diaPago=${selectedDia}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setClientes(data);
      } else {
        toast.error('Error al cargar los clientes');
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    if (!userId) return;

    try {
      const hoy = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/reportes/cobranza?cobradorId=${userId}&fechaInicio=${hoy}&fechaFin=${hoy}`);
      
      if (response.ok) {
        const data = await response.json();
        setCobranzaHoy(data.totalCobrado || 0);
        setClientesVisitados(data.clientesUnicos || 0);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefono?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.direccionCompleta.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCobrar = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowCobranzaModal(true);
  };

  const handleCobranzaSuccess = () => {
    cargarClientes();
    cargarEstadisticas();
    setShowCobranzaModal(false);
    setSelectedCliente(null);
  };

  // Si es cobrador, mostrar opción para versión móvil
  if (userRole === 'cobrador') {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          {/* Header con opción móvil */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Gestión de Cobranza</h1>
                <p className="text-muted-foreground">
                  Administra tus clientes y registra pagos
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={isOnline ? 'default' : 'secondary'}>
                  {isOnline ? (
                    <><Wifi className="w-4 h-4 mr-2" />Online</>
                  ) : (
                    <><WifiOff className="w-4 h-4 mr-2" />Offline</>
                  )}
                </Badge>

                <Button 
                  onClick={() => router.push('/dashboard/cobranza-mobile')}
                  className="flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  Versión Móvil
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Promoción de versión móvil */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Smartphone className="w-5 h-5" />
                Nueva Versión Móvil PWA
              </CardTitle>
              <CardDescription className="text-blue-700">
                Trabaja offline, sincronización automática y optimizada para cobranza en campo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Funciona 100% offline
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Sincronización automática
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Interfaz optimizada para móvil
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Registro de motararios
                </div>
              </div>
              
              <Button 
                onClick={() => router.push('/dashboard/cobranza-mobile')}
                className="w-full sm:w-auto"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Probar Versión Móvil
              </Button>
            </CardContent>
          </Card>

          {/* Resto del contenido de cobranza desktop */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cobranza Hoy
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(cobranzaHoy)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total cobrado hoy
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Clientes Visitados
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clientesVisitados}</div>
                <p className="text-xs text-muted-foreground">
                  Clientes atendidos hoy
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Clientes
                </CardTitle>
                <Badge variant="outline" className="text-sm">
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredClientes.length}</div>
                <p className="text-xs text-muted-foreground">
                  Clientes asignados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre, teléfono o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedDia} onValueChange={setSelectedDia}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por día" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los días</SelectItem>
                {diasSemana.map((dia) => (
                  <SelectItem key={dia.value} value={dia.value}>
                    {dia.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lista de clientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando clientes...</p>
              </div>
            ) : filteredClientes.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">
                  No se encontraron clientes que coincidan con los filtros aplicados.
                </p>
              </div>
            ) : (
              filteredClientes.map((cliente) => (
                <Card key={cliente.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg leading-tight">
                          {cliente.nombreCompleto}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {getDayName(cliente.diaPago)}
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {formatCurrency(cliente.montoPago)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Badge 
                        variant={cliente.saldoActual > 0 ? "destructive" : "default"}
                        className="ml-2"
                      >
                        {cliente.saldoActual > 0 ? "Pendiente" : "Al día"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {cliente.telefono && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{cliente.telefono}</span>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span className="text-muted-foreground">
                          {cliente.direccionCompleta}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Saldo Actual</p>
                        <p className={`font-semibold ${
                          cliente.saldoActual > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(cliente.saldoActual)}
                        </p>
                      </div>

                      <Button
                        onClick={() => handleCobrar(cliente)}
                        disabled={cliente.statusCuenta !== 'activo'}
                        size="sm"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Cobrar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Modal de cobranza */}
          {selectedCliente && (
            <CobranzaModal
              cliente={selectedCliente}
              isOpen={showCobranzaModal}
              onClose={() => setShowCobranzaModal(false)}
              onSuccess={handleCobranzaSuccess}
            />
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Para otros roles, mostrar mensaje
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Monitor className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground">
            Esta sección está disponible solo para cobradores
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
