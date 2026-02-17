'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Store } from 'lucide-react';
import { toast } from 'sonner';

interface NuevaSucursalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function NuevaSucursalModal({ isOpen, onClose, onSuccess }: NuevaSucursalModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        direccion: '',
        telefono: '',
        esBodega: false
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nombre) {
            toast.error('El nombre es requerido');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/inventario/sucursales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast.success('Sucursal creada exitosamente');
                setFormData({
                    nombre: '',
                    direccion: '',
                    telefono: '',
                    esBodega: false
                });
                onSuccess();
                onClose();
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Error al crear sucursal');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5" />
                        Nueva Sucursal / Bodega
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre *</Label>
                        <Input
                            id="nombre"
                            placeholder="Ej: Sucursal Centro"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input
                            id="direccion"
                            placeholder="Calle Principal #123"
                            value={formData.direccion}
                            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input
                            id="telefono"
                            placeholder="555-1234"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            disabled={loading}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg">
                        <div className="space-y-0.5">
                            <Label htmlFor="es-bodega">Es Bodega</Label>
                            <p className="text-xs text-muted-foreground">
                                Marcar si es una bodega de almacenamiento
                            </p>
                        </div>
                        <Switch
                            id="es-bodega"
                            checked={formData.esBodega}
                            onCheckedChange={(checked) => setFormData({ ...formData, esBodega: checked })}
                            disabled={loading}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear Sucursal
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
