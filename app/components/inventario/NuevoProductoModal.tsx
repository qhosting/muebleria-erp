
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Sparkles, Package, Globe, FileText, Image as ImageIcon, Loader2, Plus } from 'lucide-react';

export function NuevoProductoModal({ isOpen, onClose, onSuccess, producto }: any) {
    const [loading, setLoading] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        codigo: '',
        nombre: '',
        descripcion: '',
        detalles: '',
        categoria: '',
        unidadMedida: 'pieza',
        existencias: '0',
        existenciaHoy: '0',
        stockMinimo: '5',
        marca: '',
        medida: '',
        precioCompra: '',
        precioVenta: '',
        precio6Meses: '',
        precio12Meses: '',
        numSemanas: '',
        enganche: '',
        abonoSemanal: '',
        garantia: '',
        enEcommerce: false,
        imagenes: [] as string[]
    });

    useEffect(() => {
        if (producto) {
            setFormData({
                id: producto.id || '',
                codigo: producto.codigo || '',
                nombre: producto.nombre || '',
                descripcion: producto.descripcion || '',
                detalles: producto.detalles || '',
                categoria: producto.categoria || '',
                unidadMedida: producto.unidadMedida || 'pieza',
                existencias: producto.existencias?.toString() || '0',
                existenciaHoy: producto.existenciaHoy?.toString() || producto.existencias?.toString() || '0',
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
                garantia: producto.garantia || '',
                enEcommerce: producto.enEcommerce || false,
                imagenes: producto.imagenes || []
            });
        } else {
            setFormData({
                id: '',
                codigo: '',
                nombre: '',
                descripcion: '',
                detalles: '',
                categoria: '',
                unidadMedida: 'pieza',
                existencias: '0',
                existenciaHoy: '0',
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
                garantia: '',
                enEcommerce: false,
                imagenes: []
            });
        }
    }, [producto, isOpen]);

    const generateAIDescription = async () => {
        if (!formData.nombre) {
            toast.error('Ingresa al menos el nombre del producto');
            return;
        }

        setGeneratingAI(true);
        try {
            // Reutilizamos el servicio de IA para generar descripción
            const prompt = `Genera una descripción profesional y atractiva para ecommerce del siguiente producto: ${formData.nombre} de la marca ${formData.marca || 'Genérica'}. Incluye detalles técnicos si es posible. No uses más de 150 palabras.`;
            
            const res = await fetch('/api/ai/ Sofia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, history: '' })
            });

            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({ ...prev, detalles: data.respuesta }));
                toast.success('Descripción generada por Sofía');
            }
        } catch (error) {
            toast.error('Error al contactar al asistente');
        } finally {
            setGeneratingAI(false);
        }
    };

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
                            <Label htmlFor="existencias" className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-blue-500" />
                                Existencias (Piezas)
                            </Label>
                            <Input
                                id="existencias"
                                name="existencias"
                                type="number"
                                placeholder="0"
                                value={formData.existencias}
                                onChange={handleChange}
                                className="border-blue-200 focus:border-blue-500"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="existenciaHoy" className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                Existencia Hoy
                            </Label>
                            <Input
                                id="existenciaHoy"
                                name="existenciaHoy"
                                type="number"
                                placeholder="0"
                                value={formData.existenciaHoy}
                                onChange={handleChange}
                                className="border-indigo-200 focus:border-indigo-500 bg-indigo-50/30"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-slate-500" />
                                Imágenes del Producto
                            </Label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.imagenes.map((img, idx) => (
                                    <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border bg-white group">
                                        <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                        <button 
                                            type="button"
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => setFormData(prev => ({ ...prev, imagenes: prev.imagenes.filter((_, i) => i !== idx) }))}
                                        >
                                            <span className="text-[10px] text-white font-bold">Quitar</span>
                                        </button>
                                    </div>
                                ))}
                                <label className="w-16 h-16 rounded-md border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                                    <Plus className="w-4 h-4 text-slate-400" />
                                    <span className="text-[8px] text-slate-400 uppercase font-bold mt-1">Subir</span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            const uploadFormData = new FormData();
                                            uploadFormData.append('file', file);

                                            toast.promise(
                                                fetch('/api/upload', {
                                                    method: 'POST',
                                                    body: uploadFormData
                                                }).then(async (res) => {
                                                    if (!res.ok) throw new Error('Error al subir');
                                                    const data = await res.json();
                                                    setFormData(prev => ({ ...prev, imagenes: [...prev.imagenes, data.url] }));
                                                    return data;
                                                }),
                                                {
                                                    loading: 'Subiendo imagen...',
                                                    success: 'Imagen subida correctamente',
                                                    error: 'Error al subir imagen'
                                                }
                                            );
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-emerald-600" />
                                <div>
                                    <Label className="text-sm font-bold">Mostrar en E-commerce</Label>
                                    <p className="text-xs text-slate-500">Habilita este producto en tu tienda en línea</p>
                                </div>
                            </div>
                            <Switch 
                                checked={formData.enEcommerce} 
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enEcommerce: checked }))}
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="detalles" className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-500" />
                                    Descripción Detallada
                                </Label>
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-2 text-xs font-bold"
                                    onClick={generateAIDescription}
                                    disabled={generatingAI}
                                >
                                    {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Asistente Sofía
                                </Button>
                            </div>
                            <Textarea
                                id="detalles"
                                name="detalles"
                                placeholder="Describe el producto para tus clientes (esto se verá en la web)..."
                                className="h-28 text-sm"
                                value={formData.detalles}
                                onChange={handleChange}
                            />
                        </div>
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
