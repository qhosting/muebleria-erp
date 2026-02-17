
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function NuevoProductoModal({ isOpen, onClose, onSuccess }: any) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        codigo: '',
        nombre: '',
        descripcion: '',
        categoria: '',
        unidadMedida: 'pieza',
        precioCompra: '',
        precioVenta: '',
        stockMinimo: '5'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/inventario/productos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Error al crear producto');
            }

            toast.success('Producto creado exitosamente');
            onSuccess();
            onClose();
            setFormData({
                codigo: '',
                nombre: '',
                descripcion: '',
                categoria: '',
                unidadMedida: 'pieza',
                precioCompra: '',
                precioVenta: '',
                stockMinimo: '5'
            });
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
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Registrar Nuevo Producto</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="codigo">Código</Label>
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
                            <Select onValueChange={(v) => handleSelectChange('categoria', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Muebles">Muebles</SelectItem>
                                    <SelectItem value="Electronica">Electrónica</SelectItem>
                                    <SelectItem value="Linea Blanca">Línea Blanca</SelectItem>
                                    <SelectItem value="Hogar">Hogar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

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
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea
                            id="descripcion"
                            name="descripcion"
                            placeholder="Detalles adicionales..."
                            value={formData.descripcion}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="unidadMedida">Unidad</Label>
                            <Select defaultValue="pieza" onValueChange={(v) => handleSelectChange('unidadMedida', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Unidad" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pieza">Pieza</SelectItem>
                                    <SelectItem value="juego">Juego</SelectItem>
                                    <SelectItem value="caja">Caja</SelectItem>
                                    <SelectItem value="metro">Metro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="precioCompra">Costo ($)</Label>
                            <Input
                                id="precioCompra"
                                name="precioCompra"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={formData.precioCompra}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="precioVenta">Venta ($)</Label>
                            <Input
                                id="precioVenta"
                                name="precioVenta"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={formData.precioVenta}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="stockMinimo">Stock Mínimo Alerta</Label>
                        <Input
                            id="stockMinimo"
                            name="stockMinimo"
                            type="number"
                            min="0"
                            value={formData.stockMinimo}
                            onChange={handleChange}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : 'Crear Producto'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
