
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClienteModal } from '@/components/clientes/ClienteModal';
import { ImportarClientesModal } from '@/components/clientes/ImportarClientesModal';
import { ExportButton } from '@/components/export-button';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Filter,
  Upload,
  MoreVertical
} from 'lucide-react';
import { formatCurrency, formatDate, getDayName, getPeriodicidadLabel } from '@/lib/utils';
import { toast } from 'sonner';
import { Cliente, User } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ClientesResponse {
  clientes: Cliente[];
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    perPage: number;
  };
}

export default function ClientesPage() {
  const { data: session } = useSession();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cobradores, setCobradores] = useState<User[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCobrador, setSelectedCobrador] = useState('all');
  const [selectedDiaPago, setSelectedDiaPago] = useState(() => {
    // Obtener día actual de la semana (0=domingo, 1=lunes, ..., 6=sábado)
    const today = new Date().getDay();
    const diasMap = ['7', '1', '2', '3', '4', '5', '6']; // Ajustamos para que domingo=7
    return diasMap[today];
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    currentPage: 1,
    perPage: 20,
  });

  // Modal states
  const [clienteModalOpen, setClienteModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const userRole = (session?.user as any)?.role;

  useEffect(() => {
    if (session) {
      fetchClientes();
      fetchCobradores();
      fetchInventario();

      // Inicializar filtro de cobrador según el rol del usuario
      if (userRole && userRole !== 'admin' && selectedCobrador === 'all') {
        setSelectedCobrador('');
      }
    }
  }, [session, currentPage, searchTerm, selectedCobrador, selectedDiaPago]);

  // Ajustar filtro inicial cuando se carga el rol del usuario
  useEffect(() => {
    if (userRole && userRole !== 'admin' && userRole !== 'gestor_cobranza' && selectedCobrador === 'all') {
      // Para cobradores, no necesitan filtro de cobrador ya que solo ven sus clientes
      setSelectedCobrador('');
    }
  }, [userRole]);

  const fetchClientes = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
        cobrador: selectedCobrador === 'all' ? '' : selectedCobrador,
        diaPago: selectedDiaPago === 'todos' ? '' : selectedDiaPago,
      });

      const response = await fetch(`/api/clientes?${params}`);
      if (response.ok) {
        const data: ClientesResponse = await response.json();
        setClientes(data.clientes);
        setPagination(data.pagination);
      } else if (response.status === 401) {
        console.log('Usuario no autenticado, redirigiendo al login');
        window.location.href = '/login';
        return;
      } else {
        throw new Error(`Error al obtener clientes: ${response.status}`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar clientes. Verifique su conexión.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCobradores = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users: User[] = await response.json();
        setCobradores(users.filter(u => u.role === 'cobrador' && u.isActive));
      } else if (response.status === 401) {
        console.log('Usuario no autenticado al obtener cobradores');
        return;
      }
    } catch (error) {
      console.error('Error al obtener cobradores:', error);
    }
  };

  const fetchInventario = async () => {
    try {
      const [resProductos, resSucursales] = await Promise.all([
        fetch('/api/inventario/productos?activo=true'),
        fetch('/api/inventario/sucursales')
      ]);

      if (resProductos.ok) {
        const data = await resProductos.json();
        setProductos(data.productos || []);
      }

      if (resSucursales.ok) {
        const data = await resSucursales.json();
        setSucursales(data.sucursales || []);
      }
    } catch (error) {
      console.error('Error al cargar inventario:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'activo') {
      return <Badge variant="success">Activo</Badge>;
    }
    return <Badge variant="secondary">Inactivo</Badge>;
  };



  const getSaldoBadge = (saldo: number) => {
    if (saldo === 0) {
      return <Badge variant="success">Al corriente</Badge>;
    } else if (saldo > 0) {
      return <Badge variant="warning">Saldo pendiente</Badge>;
    }
    return <Badge variant="secondary">Sin saldo</Badge>;
  };

  // Modal handlers
  const handleCreateCliente = () => {
    setSelectedCliente(null);
    setClienteModalOpen(true);
  };

  const handleEditCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setClienteModalOpen(true);
  };

  const handleViewClienteDetails = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setClienteModalOpen(true);
  };

  const handleDeleteCliente = async (cliente: Cliente) => {
    if (!confirm(`¿Está seguro de que desea desactivar el cliente "${cliente.nombreCompleto}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/clientes/${cliente.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Cliente desactivado exitosamente');
        fetchClientes();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al desactivar cliente');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al desactivar cliente');
    }
  };

  const handleModalSuccess = () => {
    fetchClientes();
    setSelectedCliente(null);
  };

  // Verificar permisos - cobradores solo pueden ver, no crear
  if (!['admin', 'gestor_cobranza', 'cobrador'].includes(userRole)) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Acceso Restringido
          </h3>
          <p className="text-gray-600">
            No tienes permisos para acceder a la gestión de clientes.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {userRole === 'cobrador' ? 'Mis Clientes Asignados' : 'Gestión de Clientes'}
            </h1>
            <p className="text-gray-600 mt-1">
              {userRole === 'admin' ?
                'Administra la información y asignaciones de clientes' :
                userRole === 'gestor_cobranza' ?
                  'Administra clientes y asignaciones de cobradores' :
                  'Visualiza tus clientes asignados (solo lectura)'
              }
            </p>
          </div>
          {(userRole === 'admin' || userRole === 'gestor_cobranza') && (
            <div className="flex space-x-2 mt-4 sm:mt-0">
              <ExportButton
                endpoint="/api/exportar/clientes"
                filename={`clientes-${new Date().toISOString().split('T')[0]}`}
                label="Exportar"
              />
              {userRole === 'admin' && (
                <Button variant="outline" onClick={() => setImportModalOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </Button>
              )}
              <Button onClick={handleCreateCliente}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtros</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${(userRole === 'admin' || userRole === 'gestor_cobranza') ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {/* Filtro de cobradores visible para admin y gestor */}
              {(userRole === 'admin' || userRole === 'gestor_cobranza') && (
                <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cobrador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los cobradores</SelectItem>
                    {cobradores.map((cobrador) => (
                      <SelectItem key={cobrador.id} value={cobrador.id}>
                        {cobrador.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedDiaPago} onValueChange={setSelectedDiaPago}>
                <SelectTrigger>
                  <SelectValue placeholder="Día de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">TODOS</SelectItem>
                  <SelectItem value="1">LUNES</SelectItem>
                  <SelectItem value="2">MARTES</SelectItem>
                  <SelectItem value="3">MIÉRCOLES</SelectItem>
                  <SelectItem value="4">JUEVES</SelectItem>
                  <SelectItem value="5">VIERNES</SelectItem>
                  <SelectItem value="6">SÁBADO</SelectItem>
                  <SelectItem value="7">DOMINGO</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center text-sm text-gray-600">
                Total: {pagination.total} clientes
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clientes List */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : clientes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay clientes
              </h3>
              <p className="text-gray-600 mb-4">
                No se encontraron clientes con los filtros aplicados.
              </p>
              {userRole === 'admin' && (
                <Button onClick={handleCreateCliente}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer cliente
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clientes.map((cliente) => (
              <Card
                key={cliente.id}
                className="animate-fade-in hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {cliente.nombreCompleto}
                      </CardTitle>
                      <CardDescription className="flex items-center space-x-2">
                        <span className="font-mono text-sm">
                          {cliente.codigoCliente}
                        </span>
                        {getStatusBadge(cliente.statusCuenta)}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {userRole === 'cobrador' ? (
                          <DropdownMenuItem onClick={() => handleViewClienteDetails(cliente)}>
                            <Users className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => handleEditCliente(cliente)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar Cliente
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteCliente(cliente)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Desactivar Cliente
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cliente.telefono && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{cliente.telefono}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{cliente.direccionCompleta}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {getDayName(cliente.diaPago)} - {getPeriodicidadLabel(cliente.periodicidad)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    <span>Pago: {formatCurrency(cliente.montoPago)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Saldo: {formatCurrency(cliente.saldoActual)}
                      </p>
                      {getSaldoBadge(cliente.saldoActual)}
                    </div>
                  </div>

                  {cliente.cobradorAsignado && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">Cobrador asignado:</p>
                      <p className="text-sm font-medium text-gray-900">
                        {cliente.cobradorAsignado.name}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Registrado: {formatDate(cliente.createdAt)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * pagination.perPage) + 1} a{' '}
              {Math.min(currentPage * pagination.perPage, pagination.total)} de{' '}
              {pagination.total} clientes
            </p>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <div className="flex items-center space-x-1">
                {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                disabled={currentPage === pagination.pages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Cliente - Para todos los roles */}
      <ClienteModal
        open={clienteModalOpen}
        onOpenChange={setClienteModalOpen}
        cliente={selectedCliente}
        cobradores={cobradores}
        productos={productos}
        sucursales={sucursales}
        onSuccess={handleModalSuccess}
        readOnly={userRole === 'cobrador'}
      />

      {/* Modal de Importación - Solo para admin */}
      {userRole === 'admin' && (
        <ImportarClientesModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          onSuccess={handleModalSuccess}
        />
      )}
    </DashboardLayout>
  );
}
