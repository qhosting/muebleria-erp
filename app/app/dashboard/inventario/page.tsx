
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
    Store
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MovimientoModal } from '@/components/inventario/MovimientoModal';
import { NuevoProductoModal } from '@/components/inventario/NuevoProductoModal';
import { NuevaSucursalModal } from '@/components/inventario/NuevaSucursalModal';

export default function InventarioPage() {
    const { data: session } = useSession();
    const [productos, setProductos] = useState<any[]>([]);
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMovimientoOpen, setIsMovimientoOpen] = useState(false);
    const [isProductoOpen, setIsProductoOpen] = useState(false);
    const [isSucursalOpen, setIsSucursalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [resProductos, resSucursales] = await Promise.all([
                fetch('/api/inventario/productos'),
                fetch('/api/inventario/sucursales')
            ]);

            if (resProductos.ok && resSucursales.ok) {
                const dataProductos = await resProductos.json();
                const dataSucursales = await resSucursales.json();
                setProductos(dataProductos.productos || []);
                setSucursales(dataSucursales || []);
            }
        } catch (error) {
            console.error('Error cargando inventario:', error);
            toast.error('Error al cargar datos de inventario');
        } finally {
            setLoading(false);
        }
    };

    const filteredProductos = productos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const StockBadge = ({ cantidad, minimo }: { cantidad: number, minimo: number }) => {
        if (cantidad <= 0) return <Badge variant="destructive">Segotado</Badge>;
        if (cantidad <= minimo) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Bajo Stock</Badge>;
        return <Badge variant="default" className="bg-green-100 text-green-800">En Stock</Badge>;
    };

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
                        <Button onClick={() => setIsProductoOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nuevo Producto
                        </Button>
                        <Button onClick={() => setIsSucursalOpen(true)} variant="secondary" className="gap-2">
                            <Store className="h-4 w-4" />
                            Nueva Sucursal
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
                                {formatCurrency(productos.reduce((sum, p) => sum + (p.precioCompra * p.stockTotal), 0))}
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
                                                    <th className="p-3 font-medium text-gray-600 text-center">Total Stock</th>
                                                    <th className="p-3 font-medium text-gray-600">Estado</th>
                                                    <th className="p-3 font-medium text-gray-600">Distribución</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredProductos.map((producto) => (
                                                    <tr key={producto.id} className="border-b hover:bg-gray-50">
                                                        <td className="p-3 font-medium">{producto.codigo}</td>
                                                        <td className="p-3">
                                                            <div className="font-medium text-gray-900">{producto.nombre}</div>
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
                                                        <td className="p-3 text-center font-bold text-lg">
                                                            {producto.stockTotal}
                                                        </td>
                                                        <td className="p-3">
                                                            <StockBadge cantidad={producto.stockTotal} minimo={producto.stockMinimo} />
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="flex flex-wrap gap-1">
                                                                {producto.stockPorSucursal.map((s: any) => (
                                                                    s.cantidad > 0 && (
                                                                        <Badge key={s.sucursalId} variant="outline" className="text-xs">
                                                                            {s.sucursalNombre}: {s.cantidad}
                                                                        </Badge>
                                                                    )
                                                                ))}
                                                            </div>
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

                    <TabsContent value="movimientos">
                        <Card>
                            <CardContent className="py-8 text-center text-gray-500">
                                Funcionalidad de historial detallado en desarrollo...
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
                    onClose={() => setIsProductoOpen(false)}
                    onSuccess={fetchData}
                />

                <NuevaSucursalModal
                    isOpen={isSucursalOpen}
                    onClose={() => setIsSucursalOpen(false)}
                    onSuccess={fetchData}
                />
            </div>
        </DashboardLayout>
    );
}
