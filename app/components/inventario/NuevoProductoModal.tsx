
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export function NuevoProductoModal({ isOpen, onClose, onSuccess, producto }: any) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        codigo: '',
        nombre: '',
        descripcion: '',
        categoria: '',
        unidadMedida: 'pieza',
        precioCompra: '',
        precioVenta: '',
        stockMinimo: '5',
        marca: '',
        medida: '',
        precio6Meses: '',
        precio12Meses: '',
        numSemanas: '',
        enganche: '',
        abonoSemanal: '',
        garantia: ''
    });

    useEffect(() => {
        if (producto) {
            setFormData({
                id: producto.id || '',
                codigo: producto.codigo || '',
                nombre: producto.nombre || '',
                descripcion: producto.descripcion || '',
                categoria: producto.categoria || '',
                unidadMedida: producto.unidadMedida || 'pieza',
                precioCompra: producto.precioCompra?.toString() || '',
                precioVenta: producto.precioVenta?.toString() || '',
                stockMinimo: producto.stockMinimo?.toString() || '5',
                marca: producto.marca || '',
                medida: producto.medida || '',
                precio6Meses: producto.precio6Meses?.toString() || '',
                precio12Meses: producto.precio12Meses?.toString() || '',
                numSemanas: producto.numSemanas?.toString() || '',
                enganche: producto.enganche?.toString() || '',
                abonoSemanal: producto.abonoSemanal?.toString() || '',
                garantia: producto.garantia || ''
            });
        } else {
            setFormData({
                id: '',
                codigo: '',
                nombre: '',
                descripcion: '',
                categoria: '',
                unidadMedida: 'pieza',
                precioCompra: '',
                precioVenta: '',
                stockMinimo: '5',
                marca: '',
                medida: '',
                precio6Meses: '',
                precio12Meses: '',
                numSemanas: '',
                enganche: '',
                abonoSemanal: '',
                garantia: ''
            });
        }
    }, [producto, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const method = producto ? 'PUT' : 'POST';
            const url = producto ? `/api/inventario/productos/${producto.id}` : '/api/inventario/productos';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Error al procesar producto');
            }

            toast.success(producto ? 'Producto actualizado' : 'Producto creado exitosamente');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{producto ? 'Editar Producto' : 'Registrar Nuevo Producto'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="codigo">Código (SKU)</Label>
                            <Input
                                id="codigo"
                                name="codigo"
                                placeholder="SKU-123"
                                required
                                value={formData.codigo}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="categoria">Categoría</Label>
                            <Select value={formData.categoria} onValueChange={(v) => handleSelectChange('categoria', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Muebles">Muebles</SelectItem>
                                    <SelectItem value="Electronica">Electrónica</SelectItem>
                                    <SelectItem value="Linea Blanca">Línea Blanca</SelectItem>
                                    <SelectItem value="Hogar">Hogar</SelectItem>
                                    <SelectItem value="Colchones">Colchones</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nombre">Nombre del Producto</Label>
                            <Input
                                id="nombre"
                                name="nombre"
                                placeholder="Ej. Sala Esquinera Chocolate"
                                required
                                value={formData.nombre}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="marca">Marca</Label>
                            <Input
                                id="marca"
                                name="marca"
                                placeholder="Ej. REZALT"
                                value={formData.marca}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="medida">Medida</Label>
                            <Input
                                id="medida"
                                name="medida"
                                placeholder="Ej. IND, MAT, QS, KS"
                                value={formData.medida}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="garantia">Garantía</Label>
                            <Input
                                id="garantia"
                                name="garantia"
                                placeholder="Ej. 5 años"
                                value={formData.garantia}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="descripcion">Descripción / Detalles para E-commerce</Label>
                        <Textarea
                            id="descripcion"
                            name="descripcion"
                            placeholder="Describe el producto para tus clientes..."
                            className="h-20"
                            value={formData.descripcion}
                            onChange={handleChange}
                        />
                    </div>

                    <Separator />
                    <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider">Precios y Crédito</h3>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="precioCompra">Costo Compra ($)</Label>
                            <Input
                                id="precioCompra"
                                name="precioCompra"
                                type="number"
                                step="0.01"
                                value={formData.precioCompra}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="precioVenta">Precio Contado ($)</Label>
                            <Input
                                id="precioVenta"
                                name="precioVenta"
                                type="number"
                                step="0.01"
                                required
                                value={formData.precioVenta}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="stockMinimo">Stock Mínimo</Label>
                            <Input
                                id="stockMinimo"
                                name="stockMinimo"
                                type="number"
                                value={formData.stockMinimo}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="precio6Meses">Precio 6 Meses ($)</Label>
                            <Input
                                id="precio6Meses"
                                name="precio6Meses"
                                type="number"
                                step="0.01"
                                value={formData.precio6Meses}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="precio12Meses">Precio 12 Meses ($)</Label>
                            <Input
                                id="precio12Meses"
                                name="precio12Meses"
                                type="number"
                                step="0.01"
                                value={formData.precio12Meses}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="numSemanas">Núm. Semanas</Label>
                            <Input
                                id="numSemanas"
                                name="numSemanas"
                                type="number"
                                value={formData.numSemanas}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="enganche">Enganche Sugerido ($)</Label>
                            <Input
                                id="enganche"
                                name="enganche"
                                type="number"
                                step="0.01"
                                value={formData.enganche}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="abonoSemanal">Abono Semanal ($)</Label>
                            <Input
                                id="abonoSemanal"
                                name="abonoSemanal"
                                type="number"
                                step="0.01"
                                value={formData.abonoSemanal}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold" disabled={loading}>
                            {loading ? 'Guardando...' : producto ? 'Guardar Cambios' : 'Crear Producto'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
