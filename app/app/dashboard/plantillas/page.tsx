
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Copy,
  Save,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface PlantillaTicket {
  id: string;
  nombre: string;
  contenido: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const VARIABLES_DISPONIBLES = [
  { name: '{{cliente_nombre}}', description: 'Nombre completo del cliente' },
  { name: '{{cliente_codigo}}', description: 'Código único del cliente' },
  { name: '{{fecha}}', description: 'Fecha del pago' },
  { name: '{{concepto}}', description: 'Concepto del pago' },
  { name: '{{monto}}', description: 'Monto del pago' },
  { name: '{{saldo_anterior}}', description: 'Saldo antes del pago' },
  { name: '{{saldo_nuevo}}', description: 'Saldo después del pago' },
  { name: '{{cobrador}}', description: 'Nombre del cobrador' },
  { name: '{{empresa_nombre}}', description: 'Nombre de la empresa' },
  { name: '{{empresa_telefono}}', description: 'Teléfono de la empresa' },
  { name: '{{empresa_direccion}}', description: 'Dirección de la empresa' },
];

const PLANTILLA_PREDETERMINADA = `
================================
    {{empresa_nombre}}
================================
Cliente: {{cliente_nombre}}
Código: {{cliente_codigo}}
Fecha: {{fecha}}
--------------------------------
Concepto: {{concepto}}
Monto: {{monto}}
--------------------------------
Saldo Anterior: {{saldo_anterior}}
Saldo Nuevo: {{saldo_nuevo}}
--------------------------------
Cobrador: {{cobrador}}
================================
        ¡Gracias por su pago!
================================
`.trim();

export default function PlantillasPage() {
  const { data: session } = useSession();
  const [plantillas, setPlantillas] = useState<PlantillaTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaTicket | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    contenido: PLANTILLA_PREDETERMINADA,
    isActive: true
  });

  useEffect(() => {
    fetchPlantillas();
  }, []);

  const fetchPlantillas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/plantillas');
      const data = await response.json();
      setPlantillas(data.plantillas || []);
    } catch (error) {
      console.error('Error al cargar plantillas:', error);
      toast.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPlantilla ? `/api/plantillas/${editingPlantilla.id}` : '/api/plantillas';
      const method = editingPlantilla ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingPlantilla ? 'Plantilla actualizada' : 'Plantilla creada');
        setIsDialogOpen(false);
        setEditingPlantilla(null);
        resetForm();
        fetchPlantillas();
      } else {
        throw new Error('Error al guardar plantilla');
      }
    } catch (error) {
      toast.error('Error al guardar plantilla');
    }
  };

  const handleEdit = (plantilla: PlantillaTicket) => {
    setEditingPlantilla(plantilla);
    setFormData({
      nombre: plantilla.nombre,
      contenido: plantilla.contenido,
      isActive: plantilla.isActive
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (plantillaId: string) => {
    if (!confirm('¿Está seguro de eliminar esta plantilla?')) return;

    try {
      const response = await fetch(`/api/plantillas/${plantillaId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Plantilla eliminada');
        fetchPlantillas();
      } else {
        throw new Error('Error al eliminar plantilla');
      }
    } catch (error) {
      toast.error('Error al eliminar plantilla');
    }
  };

  const handleToggleActive = async (plantilla: PlantillaTicket) => {
    try {
      const response = await fetch(`/api/plantillas/${plantilla.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...plantilla,
          isActive: !plantilla.isActive
        }),
      });

      if (response.ok) {
        toast.success(plantilla.isActive ? 'Plantilla desactivada' : 'Plantilla activada');
        fetchPlantillas();
      } else {
        throw new Error('Error al cambiar estado');
      }
    } catch (error) {
      toast.error('Error al cambiar estado de la plantilla');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      contenido: PLANTILLA_PREDETERMINADA,
      isActive: true
    });
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('contenido') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.contenido;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newContent = before + variable + after;
      
      setFormData({ ...formData, contenido: newContent });
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 0);
    }
  };

  const previewPlantilla = (contenido: string) => {
    // Simular datos para la vista previa
    const datosEjemplo = {
      '{{cliente_nombre}}': 'Juan Pérez García',
      '{{cliente_codigo}}': 'CLI240001',
      '{{fecha}}': new Date().toLocaleDateString('es-MX'),
      '{{concepto}}': 'Pago semanal',
      '{{monto}}': '$500.00',
      '{{saldo_anterior}}': '$2,500.00',
      '{{saldo_nuevo}}': '$2,000.00',
      '{{cobrador}}': 'María González',
      '{{empresa_nombre}}': 'VertexERP Muebles',
      '{{empresa_telefono}}': '555-1234',
      '{{empresa_direccion}}': 'Av. Principal 123, Col. Centro',
    };

    let preview = contenido;
    Object.entries(datosEjemplo).forEach(([variable, valor]) => {
      preview = preview.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), valor);
    });

    setPreviewContent(preview);
    setPreviewOpen(true);
  };

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plantillas de Tickets</h1>
            <p className="text-gray-600">Gestión de plantillas para impresión de tickets</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingPlantilla(null);
                resetForm();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Plantilla
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Formulario */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nombre">Nombre de la plantilla</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Ej: Ticket Estándar"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="contenido">Contenido del ticket</Label>
                      <Textarea
                        id="contenido"
                        value={formData.contenido}
                        onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                        placeholder="Contenido del ticket..."
                        className="min-h-[300px] font-mono text-sm"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="isActive">Plantilla activa</Label>
                        <p className="text-sm text-gray-500">Disponible para usar en impresión</p>
                      </div>
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                    </div>
                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => previewPlantilla(formData.contenido)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Vista Previa
                      </Button>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit">
                          <Save className="h-4 w-4 mr-2" />
                          {editingPlantilla ? 'Actualizar' : 'Crear'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Variables disponibles */}
                  <div className="space-y-4">
                    <div>
                      <Label>Variables Disponibles</Label>
                      <p className="text-sm text-gray-500 mb-3">
                        Haz clic en una variable para insertarla en el ticket
                      </p>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-3 bg-gray-50">
                        {VARIABLES_DISPONIBLES.map((variable) => (
                          <div 
                            key={variable.name} 
                            className="flex items-center justify-between p-2 bg-white rounded border hover:bg-blue-50 cursor-pointer"
                            onClick={() => insertVariable(variable.name)}
                          >
                            <div>
                              <code className="text-sm font-mono text-blue-600">{variable.name}</code>
                              <p className="text-xs text-gray-500">{variable.description}</p>
                            </div>
                            <Copy className="h-4 w-4 text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de plantillas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              Cargando plantillas...
            </div>
          ) : plantillas.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay plantillas</h3>
              <p className="text-gray-600">Cree su primera plantilla de ticket.</p>
            </div>
          ) : (
            plantillas.map((plantilla) => (
              <Card key={plantilla.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plantilla.nombre}</CardTitle>
                    <Badge variant={plantilla.isActive ? "default" : "secondary"}>
                      {plantilla.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Modificada: {new Date(plantilla.updatedAt).toLocaleDateString('es-MX')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded text-xs font-mono max-h-32 overflow-hidden">
                      {plantilla.contenido.substring(0, 150)}
                      {plantilla.contenido.length > 150 && '...'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => previewPlantilla(plantilla.contenido)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(plantilla)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(plantilla)}
                        className={plantilla.isActive ? "text-red-600" : "text-green-600"}
                      >
                        {plantilla.isActive ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(plantilla.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Dialog de vista previa */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Vista Previa del Ticket</DialogTitle>
            </DialogHeader>
            <div className="bg-white border-2 border-dashed border-gray-300 p-4 rounded">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                {previewContent}
              </pre>
            </div>
            <div className="text-center">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
