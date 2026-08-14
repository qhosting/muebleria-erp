
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Package,
    Search,
    MapPin,
    ArrowLeftRight,
    Plus,
    FileText,
    AlertTriangle,
    ShoppingBag,
    Store,
    Globe,
    RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MovimientoModal } from '@/components/inventario/MovimientoModal';
import { NuevoProductoModal } from '@/components/inventario/NuevoProductoModal';
import { NuevaSucursalModal } from '@/components/inventario/NuevaSucursalModal';
import { ImportarDesdeImagenModal } from '@/components/inventario/ImportarDesdeImagenModal';
import { Image as ImageIcon } from 'lucide-react';

const StockBadge = ({ cantidad, minimo }: { cantidad: number, minimo: number }) => {
    if (cantidad <= 0) return <Badge variant="destructive">Agotado</Badge>;
    if (cantidad <= minimo) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Bajo Stock</Badge>;
    return <Badge variant="default" className="bg-green-100 text-green-800">En Stock</Badge>;
};

export default function InventarioPage() {
    const { data: session } = useSession();
    const [productos, setProductos] = useState<any[]>([]);
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [movimientos, setMovimientos] = useState<any[]>([]);
    const [loadingMovimientos, setLoadingMovimientos] = useState(false);
    const [filtroTipoMovimiento, setFiltroTipoMovimiento] = useState('ALL');
    const [filtroSucursalMovimiento, setFiltroSucursalMovimiento] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMovimientoOpen, setIsMovimientoOpen] = useState(false);
    const [isProductoOpen, setIsProductoOpen] = useState(false);
    const [isSucursalOpen, setIsSucursalOpen] = useState(false);
    const [isImportImagenOpen, setIsImportImagenOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [syncing, setSyncing] = useState(false);
    const [contpaqiEmpresas, setContpaqiEmpresas] = useState<any[]>([]);
    const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('default');
    const [soloConExistencia, setSoloConExistencia] = useState(true);

    useEffect(() => {
        fetchData();
        fetchContpaqiConfig();
        fetchMovimientos();
    }, []);

    const fetchMovimientos = async () => {
        try {
            setLoadingMovimientos(true);
            const params = new URLSearchParams();
            if (filtroTipoMovimiento !== 'ALL') params.append('tipo', filtroTipoMovimiento);
            if (filtroSucursalMovimiento !== 'ALL') params.append('sucursalId', filtroSucursalMovimiento);
            params.append('limit', '100');

            const res = await fetch(`/api/inventario/movimientos?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setMovimientos(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error cargando movimientos:', error);
        } finally {
            setLoadingMovimientos(false);
        }
    };

    const fetchContpaqiConfig = async () => {
        try {
            const response = await fetch('/api/configuracion');
            if (response.ok) {
                const data = await response.json();
                if (data.contpaqi?.empresas) {
                    setContpaqiEmpresas(data.contpaqi.empresas);
                    if (data.contpaqi.empresas.length > 0) {
                        setSelectedEmpresaId(data.contpaqi.empresas[0].id);
                    }
                }
            }
        } catch (error) {
            console.error('Error cargando config Contpaqi:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            console.log('Fetching inventory data...');
            const [resProductos, resSucursales] = await Promise.all([
                fetch('/api/inventario/productos'),
                fetch('/api/inventario/sucursales')
            ]);

            if (!resProductos.ok) {
                const errorData = await resProductos.json().catch(() => ({}));
                throw new Error(errorData.error || `Error productos: ${resProductos.status}`);
            }

            if (!resSucursales.ok) {
                const errorData = await resSucursales.json().catch(() => ({}));
                throw new Error(errorData.error || `Error sucursales: ${resSucursales.status}`);
            }

            const dataProductos = await resProductos.json();
            const dataSucursales = await resSucursales.json();
            
            console.log(`Loaded ${dataProductos.productos?.length || 0} products and ${dataSucursales?.length || 0} branches`);
            
            setProductos(dataProductos.productos || []);
            setSucursales(dataSucursales || []);
        } catch (error: any) {
            console.error('Error cargando inventario:', error);
            toast.error(`Error: ${error.message || 'Error al cargar datos'}`);
            setProductos([]);
            setSucursales([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncContpaqi = async () => {
        try {
            setSyncing(true);
            const response = await fetch(`/api/contpaqi/sync?target=productos&empresaId=${selectedEmpresaId}&soloConExistencia=${soloConExistencia}`);
            const data = await response.json();

            if (response.ok) {
                toast.success(`Sincronización exitosa: ${data.results?.productosCount || 0} productos procesados`);
                fetchData(); // Recargar la lista
            } else {
                throw new Error(data.error || 'Error al sincronizar');
            }
        } catch (error: any) {
            console.error('Error en sync Contpaqi:', error);
            toast.error(`Error de sincronización: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const filteredProductos = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );


    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestión de Inventario</h1>
                        <p className="text-gray-600">Control de stock, productos y movimientos entre sucursales</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsMovimientoOpen(true)} variant="outline" className="gap-2">
                            <ArrowLeftRight className="h-4 w-4" />
                            Movimiento
                        </Button>
                        <Button onClick={() => {
                            setSelectedProduct(null);
                            setIsProductoOpen(true);
                        }} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nuevo Producto
                        </Button>
                        <Button onClick={() => setIsSucursalOpen(true)} variant="secondary" className="gap-2">
                            <Store className="h-4 w-4" />
                            Nueva Sucursal
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {contpaqiEmpresas.length > 1 && (
                            <div className="flex items-center gap-2">
                                <Label htmlFor="empresa-sync" className="text-xs font-bold text-slate-500 uppercase">Empresa:</Label>
                                <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                                    <SelectTrigger id="empresa-sync" className="w-[200px] h-9">
                                        <SelectValue placeholder="Seleccionar empresa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contpaqiEmpresas.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                            <Switch 
                                id="solo-existencia" 
                                checked={soloConExistencia} 
                                onCheckedChange={setSoloConExistencia}
                            />
                            <Label htmlFor="solo-existencia" className="text-xs font-medium cursor-pointer">Solo con existencias</Label>
                        </div>

                        <Button 
                            onClick={handleSyncContpaqi} 
                            variant="outline" 
                            disabled={syncing || loading}
                            className="gap-2 border-blue-500 text-blue-700 hover:bg-blue-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Sincronizar Contpaqi'}
                        </Button>
                        <Button onClick={() => setIsImportImagenOpen(true)} variant="outline" className="gap-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50">
                            <ImageIcon className="h-4 w-4" />
                            Importar Imagen
                        </Button>
                    </div>
                </div>

                {/* Resumen de Inventario */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Total Productos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{productos.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Valor Inventario</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(productos.reduce((sum, p) => sum + ((p.precioCompra || 0) * (p.existencias || p.stockTotal || 0)), 0))}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Bajo Stock</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">
                                {productos.filter(p => p.stockBajo).length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Sucursales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{sucursales.length}</div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="productos" className="w-full">
                    <TabsList>
                        <TabsTrigger value="productos">Productos</TabsTrigger>
                        <TabsTrigger value="movimientos">Historial Movimientos</TabsTrigger>
                        <TabsTrigger value="bodegas">Bodegas y Sucursales</TabsTrigger>
                    </TabsList>

                    <TabsContent value="productos" className="mt-4">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Catálogo de Productos</CardTitle>
                                    <div className="relative w-64">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Buscar producto..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="text-center py-8">Cargando inventario...</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-gray-50 text-left">
                                                    <th className="p-3 font-medium text-gray-600">Código</th>
                                                    <th className="p-3 font-medium text-gray-600">Producto</th>
                                                    <th className="p-3 font-medium text-gray-600">Categoría</th>
                                                    <th className="p-3 font-medium text-gray-600 text-right">Precio Venta</th>
                                                    <th className="p-3 font-medium text-gray-600 text-center">Existencias</th>
                                                    <th className="p-3 font-medium text-gray-600 text-center">Existencia Hoy</th>
                                                    <th className="p-3 font-medium text-gray-600 text-center">Tienda</th>
                                                    <th className="p-3 font-medium text-gray-600">Estado</th>
                                                    <th className="p-3 font-medium text-gray-600 text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredProductos.map((producto) => (
                                                    <tr key={producto.id} className="border-b hover:bg-gray-50">
                                                        <td className="p-3 font-medium text-blue-600">{producto.codigo}</td>
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="font-medium text-gray-900">{producto.nombre}</div>
                                                                {producto.marca && <Badge variant="outline" className="text-[10px] uppercase">{producto.marca}</Badge>}
                                                            </div>
                                                            {producto.descripcion && (
                                                                <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                                                    {producto.descripcion}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-gray-600">{producto.categoria || '-'}</td>
                                                        <td className="p-3 text-right font-medium">
                                                            {formatCurrency(producto.precioVenta)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-bold text-lg">{producto.existencias || 0}</span>
                                                                <span className="text-[10px] text-gray-400 uppercase">Total</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <div className="flex flex-col items-center bg-blue-50/50 rounded-lg py-1">
                                                                <span className="font-bold text-lg text-blue-700">{producto.existenciaHoy || 0}</span>
                                                                <span className="text-[10px] text-blue-400 uppercase">Hoy</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {producto.enEcommerce ? (
                                                                <div className="flex justify-center">
                                                                    <div className="bg-emerald-100 p-1.5 rounded-full" title="Visible en Ecommerce">
                                                                        <Globe className="h-4 w-4 text-emerald-600" />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-300 text-xs">Oculto</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            <StockBadge cantidad={producto.existencias || 0} minimo={producto.stockMinimo} />
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                                onClick={() => {
                                                                    setSelectedProduct(producto);
                                                                    setIsProductoOpen(true);
                                                                }}
                                                            >
                                                                Editar
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="movimientos" className="mt-4">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <CardTitle>Historial de Movimientos de Inventario</CardTitle>
                                        <CardDescription>Auditoría completa de entradas, salidas, traspasos y ventas</CardDescription>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Select 
                                            value={filtroTipoMovimiento} 
                                            onValueChange={(val) => {
                                                setFiltroTipoMovimiento(val);
                                                setTimeout(fetchMovimientos, 50);
                                            }}
                                        >
                                            <SelectTrigger className="w-[140px] h-9 text-xs">
                                                <SelectValue placeholder="Tipo de movimiento" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">Todos los tipos</SelectItem>
                                                <SelectItem value="entrada">Entradas</SelectItem>
                                                <SelectItem value="salida">Salidas</SelectItem>
                                                <SelectItem value="traspaso">Traspasos</SelectItem>
                                                <SelectItem value="venta">Ventas</SelectItem>
                                                <SelectItem value="ajuste">Ajustes</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Select 
                                            value={filtroSucursalMovimiento} 
                                            onValueChange={(val) => {
                                                setFiltroSucursalMovimiento(val);
                                                setTimeout(fetchMovimientos, 50);
                                            }}
                                        >
                                            <SelectTrigger className="w-[160px] h-9 text-xs">
                                                <SelectValue placeholder="Sucursal" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">Todas las sucursales</SelectItem>
                                                {sucursales.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={fetchMovimientos} 
                                            disabled={loadingMovimientos}
                                            className="h-9 px-2 text-xs"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${loadingMovimientos ? 'animate-spin' : ''}`} />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loadingMovimientos ? (
                                    <div className="text-center py-12 text-slate-500 text-sm">
                                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                                        Cargando historial de movimientos...
                                    </div>
                                ) : movimientos.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 text-sm">
                                        <ArrowLeftRight className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-50" />
                                        No hay movimientos registrados con los filtros seleccionados.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-600">
                                                    <th className="p-3">Fecha</th>
                                                    <th className="p-3">Tipo</th>
                                                    <th className="p-3">Producto</th>
                                                    <th className="p-3 text-center">Cantidad</th>
                                                    <th className="p-3">Origen</th>
                                                    <th className="p-3">Destino</th>
                                                    <th className="p-3">Motivo / Referencia</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {movimientos.map((mov: any) => {
                                                    const badgeVariant = 
                                                        mov.tipoMovimiento === 'entrada' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                        mov.tipoMovimiento === 'salida' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                                        mov.tipoMovimiento === 'venta' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                        mov.tipoMovimiento === 'traspaso' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                                        'bg-amber-100 text-amber-800 border-amber-200';

                                                    return (
                                                        <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-3 text-xs text-slate-600 font-mono">
                                                                {new Date(mov.createdAt).toLocaleDateString('es-MX', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </td>
                                                            <td className="p-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badgeVariant}`}>
                                                                    {mov.tipoMovimiento}
                                                                </span>
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="font-semibold text-slate-900">{mov.producto?.nombre || 'Producto'}</div>
                                                                <div className="text-[11px] font-mono text-slate-400">{mov.producto?.codigo}</div>
                                                            </td>
                                                            <td className="p-3 text-center font-bold font-mono text-base text-slate-800">
                                                                {mov.cantidad}
                                                            </td>
                                                            <td className="p-3 text-xs text-slate-600">
                                                                {mov.sucursalOrigen?.nombre || '-'}
                                                            </td>
                                                            <td className="p-3 text-xs text-slate-600">
                                                                {mov.sucursalDestino?.nombre || '-'}
                                                            </td>
                                                            <td className="p-3 text-xs text-slate-500">
                                                                <div>{mov.motivo || 'Sin motivo especificado'}</div>
                                                                {mov.referencia && (
                                                                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">Ref: {mov.referencia}</div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="bodegas">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sucursales.map((sucursal) => (
                                <Card key={sucursal.id}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg">{sucursal.nombre}</CardTitle>
                                                <CardDescription>{sucursal.direccion || 'Sin dirección'}</CardDescription>
                                            </div>
                                            <Badge variant={sucursal.esBodega ? "default" : "outline"}>
                                                {sucursal.esBodega ? 'Bodega' : 'Tienda'}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                            <MapPin className="h-4 w-4" />
                                            {sucursal.telefono || 'Sin teléfono'}
                                        </div>
                                        <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Productos distintos:</span>
                                            <span className="font-bold">{sucursal._count?.stocks || 0}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Modales */}
                <MovimientoModal
                    isOpen={isMovimientoOpen}
                    onClose={() => setIsMovimientoOpen(false)}
                    onSuccess={fetchData}
                    productos={productos}
                    sucursales={sucursales}
                />

                <NuevoProductoModal
                    isOpen={isProductoOpen}
                    onClose={() => {
                        setIsProductoOpen(false);
                        setSelectedProduct(null);
                    }}
                    onSuccess={fetchData}
                    producto={selectedProduct}
                />

                <NuevaSucursalModal
                    isOpen={isSucursalOpen}
                    onClose={() => setIsSucursalOpen(false)}
                    onSuccess={fetchData}
                />

                <ImportarDesdeImagenModal
                    isOpen={isImportImagenOpen}
                    onClose={() => setIsImportImagenOpen(false)}
                    onSuccess={fetchData}
                />
            </div>
        </DashboardLayout>
    );
}
