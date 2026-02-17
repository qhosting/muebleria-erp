
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Cliente, User } from '@/lib/types';
import { Loader2, Save, X } from 'lucide-react';

interface ClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: Cliente | null;
  cobradores: User[];
  productos?: any[];
  sucursales?: any[];
  onSuccess: () => void;
  readOnly?: boolean;
}

export function ClienteModal({
  open,
  onOpenChange,
  cliente,
  cobradores,
  productos = [],
  sucursales = [],
  onSuccess,
  readOnly = false
}: ClienteModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<any>({
    codigoCliente: '',
    nombreCompleto: '',
    telefono: '',
    vendedor: '',
    cobradorAsignadoId: 'sin-asignar',
    productoId: '',
    sucursalId: '',
    descripcionProducto: '',
    diaPago: '1',
    montoPago: '',
    periodicidad: 'semanal',
    saldoActual: '',
    importe1: '',
    importe2: '',
    importe3: '',
    importe4: '',
    fechaVenta: new Date().toISOString().split('T')[0],
    statusCuenta: 'activo',

    // Nuevos campos
    dni: '',
    email: '',
    calle: '',
    numeroExterior: '',
    numeroInterior: '',
    colonia: '',
    ciudad: '',
    estado: '',
    codigoPostal: '',
    referenciaDireccion: '',
    fechaNacimiento: '',
    estadoCivil: '',
    genero: '',
    ocupacion: '',
    empresaTrabajo: '',
    telefonoTrabajo: '',
    ingresosMensuales: '',
    limiteCredito: '',
    formaPago: '',
    observaciones: '',
    zona: ''
  });

  const isEditMode = !!cliente;

  useEffect(() => {
    if (cliente) {
      setFormData({
        codigoCliente: cliente.codigoCliente || '',
        nombreCompleto: cliente.nombreCompleto || '',
        telefono: cliente.telefono || '',
        vendedor: cliente.vendedor || '',
        cobradorAsignadoId: cliente.cobradorAsignadoId || 'sin-asignar',
        productoId: cliente.productoId || '',
        sucursalId: cliente.sucursalId || '',
        descripcionProducto: cliente.descripcionProducto || '',
        diaPago: cliente.diaPago.toString() || '1',
        montoPago: cliente.montoPago.toString() || '',
        periodicidad: cliente.periodicidad || 'semanal',
        saldoActual: cliente.saldoActual.toString() || '',
        importe1: cliente.importe1?.toString() || '',
        importe2: cliente.importe2?.toString() || '',
        importe3: cliente.importe3?.toString() || '',
        importe4: cliente.importe4?.toString() || '',
        fechaVenta: cliente.fechaVenta ? new Date(cliente.fechaVenta).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        statusCuenta: cliente.statusCuenta || 'activo',

        // Mapeo de nuevos campos
        dni: cliente.dni || '',
        email: cliente.email || '',
        calle: cliente.calle || '',
        numeroExterior: cliente.numeroExterior || '',
        numeroInterior: cliente.numeroInterior || '',
        colonia: cliente.colonia || '',
        ciudad: cliente.ciudad || '',
        estado: cliente.estado || '',
        codigoPostal: cliente.codigoPostal || '',
        referenciaDireccion: cliente.referenciaDireccion || '',
        fechaNacimiento: cliente.fechaNacimiento ? new Date(cliente.fechaNacimiento).toISOString().split('T')[0] : '',
        estadoCivil: cliente.estadoCivil || '',
        genero: cliente.genero || '',
        ocupacion: cliente.ocupacion || '',
        empresaTrabajo: cliente.empresaTrabajo || '',
        telefonoTrabajo: cliente.telefonoTrabajo || '',
        ingresosMensuales: cliente.ingresosMensuales?.toString() || '',
        limiteCredito: cliente.limiteCredito?.toString() || '',
        formaPago: cliente.formaPago || '',
        observaciones: cliente.observaciones || '',
        zona: cliente.zona || ''
      });
    } else {
      // Reset completo para nuevo cliente
      setFormData({
        codigoCliente: '',
        nombreCompleto: '',
        telefono: '',
        vendedor: '',
        cobradorAsignadoId: 'sin-asignar',
        productoId: '',
        sucursalId: '',
        descripcionProducto: '',
        diaPago: '1',
        montoPago: '',
        periodicidad: 'semanal',
        saldoActual: '',
        importe1: '',
        importe2: '',
        importe3: '',
        importe4: '',
        fechaVenta: new Date().toISOString().split('T')[0],
        statusCuenta: 'activo',
        dni: '',
        email: '',
        calle: '',
        numeroExterior: '',
        numeroInterior: '',
        colonia: '',
        ciudad: '',
        estado: '',
        codigoPostal: '',
        referenciaDireccion: '',
        fechaNacimiento: '',
        estadoCivil: '',
        genero: '',
        ocupacion: '',
        empresaTrabajo: '',
        telefonoTrabajo: '',
        ingresosMensuales: '',
        limiteCredito: '',
        formaPago: '',
        observaciones: '',
        zona: ''
      });
    }
  }, [cliente, open]);

  const handleProductChange = (prodId: string) => {
    const producto = productos.find(p => p.id === prodId);
    if (producto) {
      setFormData((prev: any) => ({
        ...prev,
        productoId: prodId,
        descripcionProducto: producto.nombre,
        montoPago: producto.precioVenta.toString(),
        saldoActual: producto.precioVenta.toString()
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, productoId: prodId }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditMode ? `/api/clientes/${cliente.id}` : '/api/clientes';
      const method = isEditMode ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        cobradorAsignadoId: formData.cobradorAsignadoId === 'sin-asignar' ? null : formData.cobradorAsignadoId
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        toast.success(isEditMode ? 'Cliente actualizado' : 'Cliente creado');
        onSuccess();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const periodicidadOptions = [
    { value: 'diario', label: 'Diario' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' },
  ];

  const diasSemana = [
    { value: '1', label: 'Lunes' }, { value: '2', label: 'Martes' },
    { value: '3', label: 'Miércoles' }, { value: '4', label: 'Jueves' },
    { value: '5', label: 'Viernes' }, { value: '6', label: 'Sábado' },
    { value: '7', label: 'Domingo' },
  ];

  // Helper para renderizar Inputs
  const renderInput = (id: string, label: string, type = 'text', required = false, placeholder = '', colSpan = 1) => (
    <div className={`space-y-2 ${colSpan > 1 ? `col-span-${colSpan}` : ''}`}>
      <Label htmlFor={id}>{label} {required && '*'}</Label>
      <Input
        id={id}
        type={type}
        value={formData[id]}
        onChange={(e) => setFormData({ ...formData, [id]: e.target.value })}
        required={!readOnly && required}
        placeholder={placeholder}
        disabled={readOnly}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? 'Detalles del Cliente' : (isEditMode ? 'Editar Cliente' : 'Nuevo Cliente')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={readOnly ? (e) => e.preventDefault() : handleSubmit} className="flex flex-col h-full">

          {/* TABS DE NAVEGACIÓN */}
          <div className="flex border-b mb-4 overflow-x-auto">
            {['general', 'direccion', 'personal', 'facturacion', 'observaciones'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="space-y-4 pb-4">

            {/* --- PESTAÑA GENERAL --- */}
            {activeTab === 'general' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="codigoCliente">Código {!isEditMode && '*'}</Label>
                  <Input
                    id="codigoCliente"
                    value={formData.codigoCliente}
                    onChange={(e) => setFormData({ ...formData, codigoCliente: e.target.value.toUpperCase() })}
                    required={!readOnly && !isEditMode}
                    placeholder="Auto-generado si vacío"
                    disabled={readOnly}
                  />
                  {!isEditMode && <p className="text-xs text-gray-500">Dejar vacío para auto-generar</p>}
                </div>

                {renderInput('nombreCompleto', 'Nombre Completo', 'text', true)}
                {renderInput('dni', 'DNI / INE / CURP')}
                {renderInput('telefono', 'Teléfono Celular')}
                {renderInput('email', 'Email', 'email')}

                <div className="space-y-2">
                  <Label>Cobrador Asignado</Label>
                  <Select
                    value={formData.cobradorAsignadoId}
                    onValueChange={(val) => setFormData({ ...formData, cobradorAsignadoId: val })}
                    disabled={readOnly}
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin-asignar">Sin asignar</SelectItem>
                      {cobradores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!isEditMode && !readOnly && (
                  <>
                    <div className="space-y-2">
                      <Label>Sucursal</Label>
                      <Select value={formData.sucursalId} onValueChange={(v) => setFormData({ ...formData, sucursalId: v })}>
                        <SelectTrigger><SelectValue placeholder="Sucursal..." /></SelectTrigger>
                        <SelectContent>
                          {sucursales.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Producto (Stock)</Label>
                      <Select value={formData.productoId} onValueChange={handleProductChange}>
                        <SelectTrigger><SelectValue placeholder="Buscar en inventario..." /></SelectTrigger>
                        <SelectContent>
                          {productos.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="md:col-span-2 space-y-2">
                  <Label>Descripción del Producto *</Label>
                  <Textarea
                    value={formData.descripcionProducto}
                    onChange={(e) => setFormData({ ...formData, descripcionProducto: e.target.value })}
                    required={!readOnly}
                    rows={2}
                    disabled={readOnly}
                  />
                </div>
              </div>
            )}

            {/* --- PESTAÑA DIRECCIÓN --- */}
            {activeTab === 'direccion' && (
              <div className="grid gap-4 md:grid-cols-2">
                {renderInput('calle', 'Calle')}
                <div className="grid grid-cols-2 gap-2">
                  {renderInput('numeroExterior', 'No. Exterior')}
                  {renderInput('numeroInterior', 'No. Interior')}
                </div>
                {renderInput('colonia', 'Colonia')}
                {renderInput('codigoPostal', 'Código Postal')}
                {renderInput('ciudad', 'Ciudad/Municipio')}
                {renderInput('estado', 'Estado')}
                {renderInput('zona', 'Zona/Ruta')}

                <div className="md:col-span-2 space-y-2">
                  <Label>Referencia / Entre calles</Label>
                  <Textarea
                    value={formData.referenciaDireccion}
                    onChange={(e) => setFormData({ ...formData, referenciaDireccion: e.target.value })}
                    rows={2}
                    disabled={readOnly}
                  />
                </div>
              </div>
            )}

            {/* --- PESTAÑA PERSONAL / LABORAL --- */}
            {activeTab === 'personal' && (
              <div className="grid gap-4 md:grid-cols-2">
                {renderInput('fechaNacimiento', 'Fecha de Nacimiento', 'date')}
                {renderInput('genero', 'Género')}
                {renderInput('estadoCivil', 'Estado Civil')}
                {renderInput('ocupacion', 'Ocupación')}
                {renderInput('empresaTrabajo', 'Empresa donde trabaja')}
                {renderInput('telefonoTrabajo', 'Teléfono Trabajo')}
                {renderInput('ingresosMensuales', 'Ingresos Mensuales Aprox.', 'number')}
              </div>
            )}

            {/* --- PESTAÑA FACTURACIÓN / CRÉDITO --- */}
            {activeTab === 'facturacion' && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Día de Pago *</Label>
                  <Select value={formData.diaPago} onValueChange={(v) => setFormData({ ...formData, diaPago: v })} disabled={readOnly}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {diasSemana.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Periodicidad *</Label>
                  <Select value={formData.periodicidad} onValueChange={(v) => setFormData({ ...formData, periodicidad: v })} disabled={readOnly}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {periodicidadOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {renderInput('montoPago', 'Monto de Pago *', 'number', true)}
                {renderInput('saldoActual', 'Saldo Actual', 'number')}
                {renderInput('limiteCredito', 'Límite de Crédito', 'number')}
                {renderInput('fechaVenta', 'Fecha Venta', 'date')}

                {renderInput('importe1', 'Importe Extra 1', 'number')}
                {renderInput('importe2', 'Importe Extra 2', 'number')}
                {renderInput('importe3', 'Importe Extra 3', 'number')}
                {renderInput('importe4', 'Importe Extra 4', 'number')}

                {isEditMode && (
                  <div className="space-y-2">
                    <Label>Estado de Cuenta</Label>
                    <Select value={formData.statusCuenta} onValueChange={(v) => setFormData({ ...formData, statusCuenta: v })} disabled={readOnly}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* --- PESTAÑA OBSERVACIONES --- */}
            {activeTab === 'observaciones' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Observaciones Generales</Label>
                  <Textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    rows={6}
                    disabled={readOnly}
                    placeholder="Notas internas sobre el cliente..."
                  />
                </div>
              </div>
            )}

          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t mt-auto">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              <X className="h-4 w-4 mr-2" /> {readOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isEditMode ? 'Guardar Cambios' : 'Registrar Cliente'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
