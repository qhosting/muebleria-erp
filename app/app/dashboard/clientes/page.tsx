
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
import { ImportarSaldosModal } from '@/components/clientes/ImportarSaldosModal';
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
  MoreVertical,
  Smartphone,
  Receipt
} from 'lucide-react';
import { formatCurrency, formatDate, getDayName, getPeriodicidadLabel } from '@/lib/utils';
import { toast } from 'sonner';
import { Cliente, User } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CobranzaModal } from '@/components/cobranza/cobranza-modal';

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
  const [importSaldosOpen, setImportSaldosOpen] = useState(false);
  const [importWelcomeMode, setImportWelcomeMode] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  const [isConsolidated, setIsConsolidated] = useState(false);
  const [cobranzaModalOpen, setCobranzaModalOpen] = useState(false);
  const [clienteParaCobrar, setClienteParaCobrar] = useState<Cliente | null>(null);

  const userRole = (session?.user as any)?.role;

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCobrador, selectedDiaPago, isConsolidated]);

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
  }, [session, currentPage, searchTerm, selectedCobrador, selectedDiaPago, isConsolidated]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
        cobrador: selectedCobrador === 'all' ? '' : selectedCobrador,
        diaPago: selectedDiaPago === 'todos' ? '' : selectedDiaPago,
        consolidated: isConsolidated ? 'true' : 'false',
      });

      const response = await fetch(`/api/clientes?${params}`, { cache: 'no-store' });
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

  const handleCobrar = (cliente: Cliente) => {
    setClienteParaCobrar(cliente);
    setCobranzaModalOpen(true);
  };

  const handleCobranzaSuccess = () => {
    fetchClientes();
    setCobranzaModalOpen(false);
    setClienteParaCobrar(null);
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
          </div>
          {(userRole === 'admin' || userRole === 'gestor_cobranza') && (
            <div className="flex space-x-2 mt-4 sm:mt-0">
              <ExportButton
                endpoint="/api/exportar/clientes"
                filename={`clientes-${new Date().toISOString().split('T')[0]}`}
                label="Exportar"
              />
              {userRole === 'admin' && (
                <>
                  <Button variant="outline" onClick={() => {
                    setImportWelcomeMode(false);
                    setImportModalOpen(true);
                  }}>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </Button>
                  <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-50" onClick={() => {
                    setImportWelcomeMode(true);
                    setImportModalOpen(true);
                  }}>
                    <Phone className="h-4 w-4 mr-2 text-green-600" />
                    Importar Nuevas
                  </Button>
                  <Button variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50" onClick={() => {
                    setImportSaldosOpen(true);
                  }}>
                    <DollarSign className="h-4 w-4 mr-2 text-amber-600" />
                    Saldos
                  </Button>
                </>
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
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Consolidado</label>
                  <Button 
                    variant={isConsolidated ? "default" : "outline"} 
                    size="sm"
                    className={`h-7 px-2 ${isConsolidated ? 'bg-blue-600' : ''}`}
                    onClick={() => setIsConsolidated(!isConsolidated)}
                  >
                    {isConsolidated ? "ON" : "OFF"}
                  </Button>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  Total: {pagination.total} {isConsolidated ? 'perfiles' : 'clientes'}
                </div>
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
            {clientes.map((cliente: any) => (
              <Card
                key={cliente.id}
                className={`animate-fade-in transition-all ${cliente.isGrouped ? 'border-l-4 border-l-blue-500 shadow-blue-50' : 'hover:shadow-md'}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {cliente.nombreCompleto}
                        {cliente.isGrouped && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">PERFIL</Badge>}
                      </CardTitle>
                      <CardDescription className="flex items-center space-x-2">
                        {cliente.isGrouped ? (
                          <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                            {cliente.cuentas.length} {cliente.cuentas.length === 1 ? 'Cuenta' : 'Cuentas'}
                          </span>
                        ) : (
                          <>
                            <span className="font-mono text-sm">{cliente.codigoCliente}</span>
                            {getStatusBadge(cliente.statusCuenta)}
                          </>
                        )}
                      </CardDescription>
                    </div>
                    {!cliente.isGrouped && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {userRole === 'cobrador' ? (
                            <>
                              <DropdownMenuItem onClick={() => handleViewClienteDetails(cliente)}>
                                <Users className="h-4 w-4 mr-2" />
                                Ver Detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.location.href = `/dashboard/pagos?search=${cliente.codigoCliente}`}>
                                <Receipt className="h-4 w-4 mr-2" />
                                Ver Pagos
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => handleEditCliente(cliente)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar Cliente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCobrar(cliente)}>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Registrar Pago
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.location.href = `/dashboard/pagos?search=${cliente.codigoCliente}`}>
                                <Receipt className="h-4 w-4 mr-2" />
                                Ver Pagos
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
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cliente.telefono && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{cliente.telefono}</span>
                    </div>
                  )}

                  {!cliente.isGrouped && (
                    <>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{cliente.direccionCompleta}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{getDayName(cliente.diaPago)} - {getPeriodicidadLabel(cliente.periodicidad)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        <span>Pago: {formatCurrency(cliente.montoPago)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between border-t pt-3 mt-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">
                        {cliente.isGrouped ? 'Deuda Consolidada' : 'Saldo de Cuenta'}
                      </p>
                      <p className={`text-lg font-bold ${cliente.isGrouped ? 'text-blue-700' : 'text-gray-900'}`}>
                        {formatCurrency(cliente.isGrouped ? cliente.saldoTotal : cliente.saldoActual)}
                      </p>
                    </div>
                    {!cliente.isGrouped && getSaldoBadge(cliente.saldoActual)}
                  </div>

                  {cliente.isGrouped && (
                    <div className="space-y-2 mt-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Detalle de Cuentas</p>
                      {cliente.cuentas?.map((cta: any) => (
                        <div key={cta.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border hover:border-blue-200 cursor-pointer group" onClick={() => handleViewClienteDetails(cta)}>
                          <div className="flex flex-col">
                            <span className="font-mono text-blue-600 font-bold">{cta.codigoCliente}</span>
                            <span className="text-slate-500 truncate max-w-[120px]">{cta.descripcionProducto}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(cta.saldoActual)}</p>
                            <Badge className="text-[8px] h-3 px-1" variant={cta.statusCuenta === 'activo' ? 'success' : 'secondary'}>{cta.statusCuenta}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!cliente.isGrouped && cliente.cobradorAsignado && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">Cobrador asignado:</p>
                      <p className="text-sm font-medium text-gray-900">{cliente.cobradorAsignado.name}</p>
                    </div>
                  )}

                  {!cliente.isGrouped && (
                    <div className="text-xs text-gray-500">Registrado: {formatDate(cliente.createdAt)}</div>
                  )}
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

      {userRole === 'admin' && (
        <>
          <ImportarClientesModal
            open={importModalOpen}
            onOpenChange={setImportModalOpen}
            onSuccess={handleModalSuccess}
            isWelcomeMode={importWelcomeMode}
          />
          <ImportarSaldosModal
            open={importSaldosOpen}
            onOpenChange={setImportSaldosOpen}
            onSuccess={handleModalSuccess}
          />
        </>
      )}

      {clienteParaCobrar && (
        <CobranzaModal
          cliente={clienteParaCobrar}
          isOpen={cobranzaModalOpen}
          onClose={() => setCobranzaModalOpen(false)}
          onSuccess={handleCobranzaSuccess}
        />
      )}
    </DashboardLayout>
  );
}
