'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  ShoppingBag, 
  Search, 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  FileSpreadsheet, 
  RefreshCw,
  Clock,
  UserCheck,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function VentasRegistradasPage() {
  const { data: session } = useSession();
  const [sales, setSales] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState('all');
  const [activeTab, setActiveTab] = useState('listado');
  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  // Agrupar ventas por día
  const getSalesByDay = () => {
    const dailyGroups: { [key: string]: { date: Date; sales: any[]; totalMonto: number; totalPiezas: number } } = {};
    
    sales.forEach((sale) => {
      if (!sale.fechaVenta) return;
      const dateKey = new Date(sale.fechaVenta).toISOString().split('T')[0];
      if (!dailyGroups[dateKey]) {
        dailyGroups[dateKey] = {
          date: new Date(sale.fechaVenta),
          sales: [],
          totalMonto: 0,
          totalPiezas: 0
        };
      }
      dailyGroups[dateKey].sales.push(sale);
      dailyGroups[dateKey].totalMonto += Number(sale.montoPago || 0);
      dailyGroups[dateKey].totalPiezas += Number(sale.piezas || 0);
    });

    return Object.entries(dailyGroups)
      .map(([dateStr, data]) => ({
        dateStr,
        ...data
      }))
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  };

  const salesByDay = getSalesByDay();

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nombreCompleto: '',
    numContrato: '',
    fechaVenta: '',
    vendedorId: '',
    piezas: 1,
    montoPago: 0
  });

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('q', searchTerm);
      if (selectedVendedor !== 'all') params.set('vendedorId', selectedVendedor);

      const response = await fetch(`/api/ventas/registradas?${params.toString()}`);
      if (response.ok) {
        setSales(await response.json());
      } else {
        toast.error('Error al cargar ventas registradas');
      }
    } catch (error) {
      console.error('Error loading registered sales:', error);
      toast.error('Error de red al cargar ventas');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedVendedor]);

  useEffect(() => {
    fetchSales();
  }, [selectedVendedor]);

  useEffect(() => {
    // Cargar la lista de vendedores para el selector de filtros y el formulario
    fetch('/api/users')
      .then(r => r.ok ? r.json() : [])
      .then(users => {
        setVendedores(users.filter((u: any) => ['vendedor', 'jefe_ventas', 'admin', 'direccion'].includes(u.role) && u.isActive));
      })
      .catch(() => {});
  }, []);

  const handleEditClick = (sale: any) => {
    setEditingSale(sale);
    setEditFormData({
      nombreCompleto: sale.nombreCompleto || '',
      numContrato: sale.numContrato || '',
      fechaVenta: sale.fechaVenta ? sale.fechaVenta.split('T')[0] : '',
      vendedorId: sale.vendedorId || '',
      piezas: sale.piezas || 1,
      montoPago: Number(sale.montoPago || 0)
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    setSavingEdit(true);
    try {
      const response = await fetch(`/api/ventas/registradas/${editingSale.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (response.ok) {
        toast.success('Venta actualizada correctamente');
        setEditOpen(false);
        setEditingSale(null);
        fetchSales();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Error al actualizar la venta');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de red al actualizar la venta');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteClick = async (saleId: string) => {
    if (!confirm('¿Está seguro de eliminar esta venta permanentemente?')) return;
    try {
      const response = await fetch(`/api/ventas/registradas/${saleId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('Venta eliminada correctamente');
        fetchSales();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Error al eliminar la venta');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error de red al eliminar la venta');
    }
  };

  const totalMonto = sales.reduce((acc, sale) => acc + Number(sale.montoPago || 0), 0);
  const totalPiezas = sales.reduce((acc, sale) => acc + (sale.piezas || 0), 0);

  const userRole = (session?.user as any)?.role;
  const isSupervisor = ['admin', 'jefe_ventas', 'direccion'].includes(userRole);
  const isAdminOrDireccion = ['admin', 'direccion'].includes(userRole);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-indigo-600" />
              Ventas Registradas
            </h1>
            <p className="text-slate-500 text-sm">
              Listado histórico y conciliación de contratos de venta directa.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSales} className="gap-2 self-stretch md:self-auto">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">Total Contratos</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{sales.length}</div>
              <p className="text-xs text-slate-500 mt-1">Contratos autorizados y registrados</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">Monto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalMonto)}</div>
              <p className="text-xs text-slate-500 mt-1">Valor acumulado de contratos</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">Piezas Totales</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalPiezas} Pzs</div>
              <p className="text-xs text-slate-500 mt-1">Volumen total de venta física</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por contrato, nombre o vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchSales()}
                  className="pl-10 border-slate-200"
                />
              </div>

              {isSupervisor && (
                <Select value={selectedVendedor} onValueChange={setSelectedVendedor}>
                  <SelectTrigger className="w-full sm:w-[240px] border-slate-200">
                    <SelectValue placeholder="Filtrar por vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los vendedores</SelectItem>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.codigoGestor || 'Sin Código'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Button onClick={fetchSales} className="bg-slate-900 text-white hover:bg-slate-800">
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-[320px] mb-6 bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="listado" className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 py-2">
              Listado de Ventas
            </TabsTrigger>
            <TabsTrigger value="pordia" className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500 py-2">
              Ventas por Día
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listado">
            {/* Sales Table */}
            <Card className="border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-slate-600 font-bold uppercase tracking-wider text-xs">
                      <th className="px-6 py-4">Contrato</th>
                      <th className="px-6 py-4">Nombre Cliente</th>
                      <th className="px-6 py-4">Fecha de Venta</th>
                      <th className="px-6 py-4">Vendedor</th>
                      <th className="px-6 py-4 text-center">Piezas</th>
                      <th className="px-6 py-4 text-right">Valor Contrato</th>
                      {isAdminOrDireccion && <th className="px-6 py-4 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                    {loading ? (
                      Array(6).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={isAdminOrDireccion ? 7 : 6} className="px-6 py-6 h-12 bg-slate-50/20"></td>
                        </tr>
                      ))
                    ) : sales.length === 0 ? (
                      <tr>
                        <td colSpan={isAdminOrDireccion ? 7 : 6} className="px-6 py-12 text-center text-slate-500">
                          No se encontraron ventas registradas.
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">
                            {sale.numContrato || '-'}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-800">
                            {sale.nombreCompleto}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            <span className="flex items-center gap-1.5 text-xs">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {new Date(sale.fechaVenta).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-800 text-xs">
                                {sale.vendedor || 'Sistema'}
                              </span>
                              {sale.vendedorRel?.codigoGestor && (
                                <span className="text-[10px] text-blue-600 font-mono font-bold">
                                  Código: {sale.vendedorRel.codigoGestor}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-900">
                            {sale.piezas}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 font-mono">
                            {formatCurrency(sale.montoPago)}
                          </td>
                          {isAdminOrDireccion && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title="Editar venta"
                                  onClick={() => handleEditClick(sale)}
                                >
                                  <Edit className="w-4 h-4 text-slate-600" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title="Eliminar venta" 
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={() => handleDeleteClick(sale.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                 </table>
               </div>
             </Card>
           </TabsContent>

           <TabsContent value="pordia">
             {/* Sales by Day Table */}
             <Card className="border-slate-200 overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-slate-50 border-b border-slate-200">
                     <tr className="text-slate-600 font-bold uppercase tracking-wider text-xs">
                       <th className="px-6 py-4 w-10"></th>
                       <th className="px-6 py-4">Fecha</th>
                       <th className="px-6 py-4 text-center">Contratos</th>
                       <th className="px-6 py-4 text-center">Piezas</th>
                       <th className="px-6 py-4 text-right">Valor Total</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                     {loading ? (
                       Array(4).fill(0).map((_, i) => (
                         <tr key={i} className="animate-pulse">
                           <td colSpan={5} className="px-6 py-6 h-12 bg-slate-50/20"></td>
                         </tr>
                       ))
                     ) : salesByDay.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                           No se encontraron ventas registradas.
                         </td>
                       </tr>
                     ) : (
                       salesByDay.map((group) => {
                         const isExpanded = expandedDates.includes(group.dateStr);
                         return (
                           <>
                             <tr 
                               key={group.dateStr} 
                               className="hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-100 font-medium"
                               onClick={() => {
                                 setExpandedDates(prev => 
                                   isExpanded ? prev.filter(d => d !== group.dateStr) : [...prev, group.dateStr]
                                 );
                               }}
                             >
                               <td className="px-6 py-4 text-center">
                                 {isExpanded ? (
                                   <ChevronUp className="h-4 w-4 text-slate-400" />
                                 ) : (
                                   <ChevronDown className="h-4 w-4 text-slate-400" />
                                 )}
                               </td>
                               <td className="px-6 py-4 font-semibold text-slate-900">
                                 <span className="flex items-center gap-2">
                                   <Calendar className="h-4 w-4 text-slate-400" />
                                   {group.date.toLocaleDateString('es-MX', {
                                     weekday: 'long',
                                     day: '2-digit',
                                     month: 'long',
                                     year: 'numeric'
                                   })}
                                 </span>
                               </td>
                               <td className="px-6 py-4 text-center font-bold text-slate-900">
                                 <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-700 font-bold">
                                   {group.sales.length}
                                 </span>
                               </td>
                               <td className="px-6 py-4 text-center font-bold text-slate-900">
                                 {group.totalPiezas}
                               </td>
                               <td className="px-6 py-4 text-right font-black text-emerald-600 font-mono">
                                 {formatCurrency(group.totalMonto)}
                               </td>
                             </tr>
                             
                             {isExpanded && (
                               <tr>
                                 <td colSpan={5} className="bg-slate-50/40 px-6 py-4">
                                   <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                     <table className="w-full text-left text-xs border-collapse">
                                       <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                         <tr>
                                           <th className="px-4 py-3">Contrato</th>
                                           <th className="px-4 py-3">Cliente</th>
                                           <th className="px-4 py-3">Vendedor</th>
                                           <th className="px-4 py-3 text-center">Piezas</th>
                                           <th className="px-4 py-3 text-right">Valor</th>
                                           {isAdminOrDireccion && <th className="px-4 py-3 text-right">Acciones</th>}
                                         </tr>
                                       </thead>
                                       <tbody className="divide-y divide-slate-100 text-slate-700">
                                         {group.sales.map((sale) => (
                                           <tr key={sale.id} className="hover:bg-slate-50/50">
                                             <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                                               {sale.numContrato || '-'}
                                             </td>
                                             <td className="px-4 py-2.5 font-semibold text-slate-800">
                                               {sale.nombreCompleto}
                                             </td>
                                             <td className="px-4 py-2.5">
                                               <div className="flex flex-col gap-0.5">
                                                 <span className="font-semibold text-slate-800 text-xs">
                                                   {sale.vendedor || 'Sistema'}
                                                 </span>
                                                 {sale.vendedorRel?.codigoGestor && (
                                                   <span className="text-[10px] text-blue-600 font-mono font-bold">
                                                     Código: {sale.vendedorRel.codigoGestor}
                                                   </span>
                                                 )}
                                               </div>
                                             </td>
                                             <td className="px-4 py-2.5 text-center font-bold text-slate-900">
                                               {sale.piezas}
                                             </td>
                                             <td className="px-4 py-2.5 text-right font-black text-slate-900 font-mono">
                                               {formatCurrency(sale.montoPago)}
                                             </td>
                                             {isAdminOrDireccion && (
                                               <td className="px-4 py-2.5 text-right">
                                                 <div className="flex justify-end gap-1.5">
                                                   <Button 
                                                     variant="ghost" 
                                                     size="icon" 
                                                     className="w-7 h-7"
                                                     title="Editar venta"
                                                     onClick={(e) => {
                                                       e.stopPropagation();
                                                       handleEditClick(sale);
                                                     }}
                                                   >
                                                     <Edit className="w-3.5 h-3.5 text-slate-600" />
                                                   </Button>
                                                   <Button 
                                                     variant="ghost" 
                                                     size="icon" 
                                                     className="w-7 h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                     title="Eliminar venta" 
                                                     onClick={(e) => {
                                                       e.stopPropagation();
                                                       handleDeleteClick(sale.id);
                                                     }}
                                                   >
                                                     <Trash2 className="w-3.5 h-3.5" />
                                                   </Button>
                                                 </div>
                                               </td>
                                             )}
                                           </tr>
                                         ))}
                                       </tbody>
                                     </table>
                                   </div>
                                 </td>
                               </tr>
                             )}
                           </>
                         );
                       })
                     )}
                   </tbody>
                 </table>
               </div>
             </Card>
           </TabsContent>
         </Tabs>
      </div>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Venta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <Label htmlFor="nombreCompleto">Nombre del Cliente</Label>
              <Input
                id="nombreCompleto"
                type="text"
                value={editFormData.nombreCompleto}
                onChange={(e) => setEditFormData({ ...editFormData, nombreCompleto: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="numContrato">Folio de Contrato</Label>
              <Input
                id="numContrato"
                type="text"
                value={editFormData.numContrato}
                onChange={(e) => setEditFormData({ ...editFormData, numContrato: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="fechaVenta">Fecha de Venta</Label>
              <Input
                id="fechaVenta"
                type="date"
                value={editFormData.fechaVenta}
                onChange={(e) => setEditFormData({ ...editFormData, fechaVenta: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="piezas">Piezas</Label>
              <Input
                id="piezas"
                type="number"
                min="1"
                value={editFormData.piezas}
                onChange={(e) => setEditFormData({ ...editFormData, piezas: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
            <div>
              <Label htmlFor="montoPago">Valor del Contrato ($)</Label>
              <Input
                id="montoPago"
                type="number"
                min="0"
                value={editFormData.montoPago}
                onChange={(e) => setEditFormData({ ...editFormData, montoPago: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <Label htmlFor="vendedorId">Vendedor</Label>
              <Select 
                value={editFormData.vendedorId} 
                onValueChange={(val) => setEditFormData({ ...editFormData, vendedorId: val })}
              >
                <SelectTrigger id="vendedorId">
                  <SelectValue placeholder="Seleccionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.codigoGestor || 'Sin Código'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
