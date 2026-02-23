
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Copy,
  Save,
  Printer,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

interface Plantilla {
  id: string;
  nombre: string;
  contenido: string;
  tipo: 'ticket' | 'bienvenida';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const VARIABLES_TICKET = [
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

const VARIABLES_BIENVENIDA = [
  { name: '{{cliente_nombre}}', description: 'Nombre completo del cliente' },
  { name: '{{cliente_codigo}}', description: 'Código único del cliente' },
  { name: '{{monto_pago}}', description: 'Monto de pago acordado' },
  { name: '{{periodicidad}}', description: 'Periodicidad de pago' },
  { name: '{{dia_pago}}', description: 'Día de pago asignado' },
  { name: '{{empresa_nombre}}', description: 'Nombre de la empresa' },
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
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlantilla, setEditingPlantilla] = useState<Plantilla | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [activeTab, setActiveTab] = useState('ticket');

  const [formData, setFormData] = useState({
    nombre: '',
    contenido: '',
    tipo: 'ticket',
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
        const err = await response.json();
        throw new Error(err.error || 'Error al guardar plantilla');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar plantilla');
    }
  };

  const handleEdit = (plantilla: Plantilla) => {
    setEditingPlantilla(plantilla);
    setFormData({
      nombre: plantilla.nombre,
      contenido: plantilla.contenido,
      tipo: plantilla.tipo,
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

  const handleToggleActive = async (plantilla: Plantilla) => {
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

  const resetForm = (tipo?: string) => {
    const targetTipo = tipo || activeTab;
    setFormData({
      nombre: '',
      contenido: targetTipo === 'ticket' ? PLANTILLA_PREDETERMINADA : '',
      tipo: targetTipo,
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

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 0);
    }
  };

  const previewPlantilla = (plantilla: Plantilla) => {
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
      '{{monto_pago}}': '$500.00',
      '{{periodicidad}}': 'Semanal',
      '{{dia_pago}}': 'Lunes',
    };

    let preview = plantilla.contenido;
    Object.entries(datosEjemplo).forEach(([variable, valor]) => {
      preview = preview.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), valor);
    });

    setPreviewContent(preview);
    setPreviewOpen(true);
  };

  if (!session) return null;

  const plantillasTicket = plantillas.filter(p => p.tipo === 'ticket');
  const plantillasBienvenida = plantillas.filter(p => p.tipo === 'bienvenida');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Plantillas</h1>
            <p className="text-gray-600">Configura los formatos para tickets y mensajes automáticos</p>
          </div>
          <Button onClick={() => {
            setEditingPlantilla(null);
            resetForm(activeTab);
            setIsDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        </div>

        <Tabs defaultValue="ticket" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="ticket" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Tickets de Pago
            </TabsTrigger>
            <TabsTrigger value="bienvenida" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mensajes de Bienvenida
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ticket" className="mt-6">
            <PlantillaList
              plantillas={plantillasTicket}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggleActive}
              onPreview={previewPlantilla}
              loading={loading}
              tipo="ticket"
            />
          </TabsContent>

          <TabsContent value="bienvenida" className="mt-6">
            <PlantillaList
              plantillas={plantillasBienvenida}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggleActive}
              onPreview={previewPlantilla}
              loading={loading}
              tipo="bienvenida"
            />
          </TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'} ({formData.tipo === 'ticket' ? 'Ticket' : 'Bienvenida'})
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Ticket Estándar"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contenido">Contenido</Label>
                    <Textarea
                      id="contenido"
                      value={formData.contenido}
                      onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                      className="min-h-[300px] font-mono text-sm"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isActive">Activa</Label>
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">Guardar</Button>
                  </div>
                </div>
                <div>
                  <Label>Variables Disponibles</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2 max-h-[400px] overflow-y-auto p-1">
                    {(formData.tipo === 'ticket' ? VARIABLES_TICKET : VARIABLES_BIENVENIDA).map((v) => (
                      <Button
                        key={v.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start text-left h-auto py-2"
                        onClick={() => insertVariable(v.name)}
                      >
                        <div className="flex flex-col items-start overflow-hidden">
                          <code className="text-blue-600 text-xs">{v.name}</code>
                          <span className="text-[10px] text-gray-500 truncate">{v.description}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Vista Previa</DialogTitle>
            </DialogHeader>
            <div className="bg-white border-2 border-dashed border-gray-300 p-4 rounded shadow-inner">
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

function PlantillaList({ plantillas, onEdit, onDelete, onToggle, onPreview, loading, tipo }: any) {
  if (loading) return <div className="text-center py-10">Cargando...</div>;
  if (plantillas.length === 0) return (
    <Card className="border-dashed bg-gray-50">
      <CardContent className="flex flex-col items-center justify-center py-10">
        <FileText className="h-10 w-10 text-gray-400 mb-2" />
        <p className="text-gray-500">No hay plantillas de {tipo === 'ticket' ? 'ticket' : 'bienvenida'}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plantillas.map((p: any) => (
        <Card key={p.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{p.nombre}</CardTitle>
                <CardDescription>Actualizado: {new Date(p.updatedAt).toLocaleDateString()}</CardDescription>
              </div>
              <Badge variant={p.isActive ? 'default' : 'secondary'}>{p.isActive ? 'Activa' : 'Inactiva'}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-3 rounded text-xs font-mono h-24 overflow-hidden mb-4 italic text-gray-600 border border-gray-200">
              {p.contenido}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(p)}><Edit className="h-4 w-4 mr-1" /> Editar</Button>
              <Button size="sm" variant="outline" onClick={() => onPreview(p)} title="Vista previa"><Eye className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50" onClick={() => onDelete(p.id)} title="Eliminar"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
