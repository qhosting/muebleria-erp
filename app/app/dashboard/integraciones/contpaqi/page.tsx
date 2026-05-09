'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCcw, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Trash2,
  Building2,
  Activity,
  Save,
  Link2,
  Users,
  Package,
  ArrowRight
} from 'lucide-react'; // Nota: corrigiendo a lucide-react si es necesario, pero asumo lucide-react
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// Re-importing icons correctly
import * as LucideIcons from 'lucide-react';

interface EmpresaContpaqi {
  id: string;
  nombre: string;
  apiUrl: string;
  apiKey: string;
  // Conceptos de Operación
  conceptoAbono: string;
  conceptoMoratorios: string;
  conceptoAbonoMoratorio: string;
  conceptoFacturacion: string;
  conceptoDevolucion: string;
  // Filtros de Sincronización
  syncConcepto: string;
  syncClasifTipo: string;
  syncClasifValor: string;
  syncClasifTipo2: string;
  syncClasifValor2: string;
  clasificacion: string; // Deprecated
  ruta: string; // Deprecated
  isActive: boolean;
  mapping?: {
    clientes?: Record<string, string>;
    productos?: Record<string, string>;
  };
}

const CLIENTE_FIELDS = [
  { key: 'codigoCliente', label: 'Código Cliente' },
  { key: 'nombreCompleto', label: 'Nombre Completo' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'calle', label: 'Calle' },
  { key: 'numeroExterior', label: 'Num. Exterior' },
  { key: 'numeroInterior', label: 'Num. Interior' },
  { key: 'colonia', label: 'Colonia' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'estado', label: 'Estado' },
  { key: 'codigoPostal', label: 'C.P.' },
  { key: 'direccionCompleta', label: 'Dirección Completa' },
  { key: 'saldoActual', label: 'Saldo Actual' },
  { key: 'montoPago', label: 'Monto Pago' },
  { key: 'periodicidad', label: 'Periodicidad' },
  { key: 'vendedor', label: 'Vendedor' },
  { key: 'codigoGestor', label: 'Código Gestor' },
  { key: 'fechaVenta', label: 'Fecha Venta' },
  { key: 'importe1', label: 'Precio Contado' },
  { key: 'importe2', label: 'Vendido En' },
  { key: 'importe3', label: 'Precio 6 Meses' },
  { key: 'importe4', label: 'Precio 12 Meses' },
];

const PRODUCTO_FIELDS = [
  { key: 'codigo', label: 'Código' },
  { key: 'nombre', label: 'Nombre Producto' },
  { key: 'precioVenta', label: 'Precio Venta' },
  { key: 'existencias', label: 'Existencias' },
];

export default function ContpaqiMultiPage() {
  const [empresas, setEmpresas] = useState<EmpresaContpaqi[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [fetchingMetadata, setFetchingMetadata] = useState<Record<string, boolean>>({});


  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/configuracion');
      if (response.ok) {
        const data = await response.json();
        if (data.contpaqi?.empresas) {
          setEmpresas(data.contpaqi.empresas);
        }
      }
    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmpresa = () => {
    const newEmpresa: EmpresaContpaqi = {
      id: Math.random().toString(36).substr(2, 9),
      nombre: 'Nueva Empresa',
      apiUrl: 'http://localhost:5000',
      apiKey: 'VortexContpaqiAPI2024',
      conceptoAbono: 'ABONO CLIENTE',
      conceptoMoratorios: 'INTERES MORATORIO',
      conceptoAbonoMoratorio: 'ABONO INTERES MORATORIO',
      conceptoFacturacion: 'FACTURA CONTADO',
      conceptoDevolucion: 'DEVOLUCION SOBRE VENTA',
      syncConcepto: 'Pagaré',
      syncClasifTipo: 'STATUS',
      syncClasifValor: 'COBRANZA NORMAL',
      syncClasifTipo2: 'RUTA',
      syncClasifValor2: '32',
      clasificacion: 'COBRANZA NORMAL',
      ruta: '',
      isActive: true,
      mapping: {
        clientes: {
          nombreCompleto: 'Nombre',
          codigoCliente: 'Codigo',
          saldoActual: 'Saldo',
          direccionCompleta: 'Direccion',
          telefono: 'Telefono',
          vendedor: 'Vendedor',
          codigoGestor: 'Gestor',
          montoPago: 'Pago',
          periodicidad: 'Periodo',
          fechaVenta: 'Fecha',
          importe1: 'Importe1',
          importe2: 'Importe2',
          importe3: 'Importe3',
          importe4: 'Importe4'
        },
        productos: {
          nombre: 'Nombre',
          codigo: 'Codigo',
          precioVenta: 'Precio',
          existencias: 'Existencias'
        }
      }
    };
    setEmpresas([...empresas, newEmpresa]);
  };

  const handleUpdateMapping = (empresaId: string, type: 'clientes' | 'productos', field: string, value: string) => {
    setEmpresas(empresas.map(e => {
      if (e.id === empresaId) {
        const mapping = e.mapping || {};
        const typeMapping = mapping[type] || {};
        return {
          ...e,
          mapping: {
            ...mapping,
            [type]: {
              ...typeMapping,
              [field]: value
            }
          }
        };
      }
      return e;
    }));
  };

  const handleRemoveEmpresa = (id: string) => {
    setEmpresas(empresas.filter(e => e.id !== id));
  };

  const handleUpdateEmpresa = (id: string, field: keyof EmpresaContpaqi, value: any) => {
    setEmpresas(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    
    if (field === 'nombre') {
      const currentEmpresa = empresas.find(e => e.id === id);
      if (currentEmpresa) {
        const updatedEmpresa = { ...currentEmpresa, [field]: value };
        handleFetchMetadata(updatedEmpresa, 'conceptos');
        handleFetchMetadata(updatedEmpresa, 'clasificaciones');
      }
    }

    if (field === 'syncClasifTipo' || field === 'syncClasifTipo2') {
      const currentEmpresa = empresas.find(e => e.id === id);
      if (currentEmpresa) {
        const clasifs = metadata[id]?.clasificaciones || [];
        const selectedClasif = clasifs.find((c: any) => 
          (c.nombre || c.Nombre || c.cNombre || c) === value
        );
        
        if (selectedClasif && typeof selectedClasif === 'object') {
          const clasifId = selectedClasif.id || selectedClasif.codigo || selectedClasif.cIdClasificacion;
          if (clasifId) {
            const metaType = field === 'syncClasifTipo' ? 'valores_clasificacion' : 'valores_clasificacion2';
            handleFetchMetadata({ ...currentEmpresa, [field]: value }, metaType, clasifId);
          }
        }
      }
    }
  };

  const handleFetchMetadata = async (empresa: EmpresaContpaqi, type: string, extraId?: any) => {
    const key = `${empresa.id}-${type}`;
    setFetchingMetadata(prev => ({ ...prev, [key]: true }));
    try {
      const response = await fetch('/api/contpaqi/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: empresa.apiUrl,
          apiKey: empresa.apiKey,
          type,
          empresa: empresa.nombre,
          id: extraId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al conectar con el servidor');
      }
      
      const data = await response.json();
      setMetadata(prev => ({
        ...prev,
        [empresa.id]: {
          ...(prev[empresa.id] || {}),
          [type]: data
        }
      }));
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} cargados correctamente`);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setFetchingMetadata(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveAll = async () => {
    try {
      const res = await fetch('/api/configuracion');
      const currentConfig = await res.json();

      const response = await fetch('/api/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentConfig,
          contpaqi: { empresas }
        })
      });

      if (response.ok) {
        toast.success('Configuración multi-empresa guardada');
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      toast.error('Error al persistir la configuración');
    }
  };

  const handleSync = async (empresa: EmpresaContpaqi, target: string) => {
    setSyncingId(`${empresa.id}-${target}`);
    setSyncProgress(20);
    try {
      // Pasamos los filtros específicos de la empresa
      let query = `?target=${target}`;
      if (empresa.clasificacion) query += `&clasificacion=${encodeURIComponent(empresa.clasificacion)}`;
      if (empresa.ruta) query += `&ruta=${encodeURIComponent(empresa.ruta)}`;
      
      // Enviamos también los datos de conexión dinámicamente si la API lo soporta
      // Para este MVP, el backend usará los datos guardados en la DB si coinciden con la empresa actual
      const url = `/api/contpaqi/sync${query}&empresaId=${empresa.id}`;
      
      const response = await fetch(url);
      setSyncProgress(60);
      const data = await response.json();
      
      if (response.ok) {
        setSyncProgress(100);
        toast.success(`Sincronización de ${empresa.nombre} (${target}) exitosa`);
      } else {
        throw new Error(data.error || 'Error en el servidor');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setTimeout(() => {
        setSyncingId(null);
        setSyncProgress(0);
      }, 1500);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <LucideIcons.RefreshCcw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-200">
                <LucideIcons.Link2 className="h-8 w-8 text-white" />
              </div>
              Contpaqi Multi-Empresa
            </h1>
            <p className="text-slate-500 text-lg">Gestiona múltiples conexiones y carteras de clientes de forma centralizada</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="lg" onClick={handleAddEmpresa} className="border-slate-200 hover:bg-slate-50">
              <LucideIcons.Plus className="h-5 w-5 mr-2 text-blue-600" />
              Añadir Empresa
            </Button>
            <Button size="lg" onClick={handleSaveAll} className="bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200">
              <LucideIcons.Save className="h-5 w-5 mr-2" />
              Guardar Todo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {empresas.map((empresa) => (
            <Card key={empresa.id} className="border-slate-200 shadow-lg overflow-hidden bg-white/40 backdrop-blur-md hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
              <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-4 flex flex-row justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                    <LucideIcons.Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-800">{empresa.nombre}</CardTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`h-2 w-2 rounded-full ${empresa.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                        {empresa.isActive ? 'Conexión Activa' : 'Deshabilitada'}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveEmpresa(empresa.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50">
                  <LucideIcons.Trash2 className="h-5 w-5" />
                </Button>
              </CardHeader>
              
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                      <LucideIcons.Settings className="h-4 w-4 text-blue-500" />
                      Parámetros de Conexión
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL Servidor</Label>
                        <Input 
                          value={empresa.apiUrl} 
                          onChange={(e) => handleUpdateEmpresa(empresa.id, 'apiUrl', e.target.value)}
                          className="bg-white/80 border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">API Key</Label>
                        <Input 
                          type="password"
                          value={empresa.apiKey} 
                          onChange={(e) => handleUpdateEmpresa(empresa.id, 'apiKey', e.target.value)}
                          className="bg-white/80 border-slate-200"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empresa en Contpaqi</Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-4 text-[9px] text-blue-600 p-0"
                            onClick={() => handleFetchMetadata(empresa, 'empresas')}
                          >
                            <LucideIcons.RefreshCcw className="h-2 w-2 mr-1" />
                            Cargar Lista
                          </Button>
                        </div>
                        {metadata[empresa.id]?.empresas ? (
                          <Select 
                            value={empresa.nombre} 
                            onValueChange={(val) => handleUpdateEmpresa(empresa.id, 'nombre', val)}
                          >
                            <SelectTrigger className="bg-white/80 border-slate-200">
                              <SelectValue placeholder="Seleccionar empresa" />
                            </SelectTrigger>
                            <SelectContent>
                              {metadata[empresa.id].empresas.map((e: any) => (
                                <SelectItem key={e.id || e.nombre} value={e.nombre}>{e.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={empresa.nombre} 
                            onChange={(e) => handleUpdateEmpresa(empresa.id, 'nombre', e.target.value)}
                            className="bg-white/80 border-slate-200"
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                        <LucideIcons.ArrowRight className="h-4 w-4 text-emerald-500" />
                        Conceptos de Operación
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { id: 'conceptoAbono', label: 'Concepto de Abono' },
                          { id: 'conceptoMoratorios', label: 'Concepto de Moratorios' },
                          { id: 'conceptoAbonoMoratorio', label: 'Concepto Abono Moratorio' },
                          { id: 'conceptoFacturacion', label: 'Concepto de Facturación' },
                          { id: 'conceptoDevolucion', label: 'Concepto Devolución Venta' },
                        ].map((item) => (
                          <div key={item.id} className="space-y-1.5">
                            <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</Label>
                            {metadata[empresa.id]?.conceptos ? (
                              <Select 
                                value={(empresa as any)[item.id] || ''} 
                                onValueChange={(val) => handleUpdateEmpresa(empresa.id, item.id as any, val)}
                              >
                                <SelectTrigger className="bg-white/80 h-9 text-xs border-slate-200">
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {metadata[empresa.id].conceptos.map((c: any, idx: number) => {
                                    const name = typeof c === 'string' ? c : (
                                      c.nombre || c.Nombre || c.cNombre || c.cNombreConcepto || 
                                      c.CNOMBRECONCEPTO || c.nombreConcepto || c.name || `Concepto ${idx + 1}`
                                    );
                                    return <SelectItem key={idx} value={String(name)}>{String(name)}</SelectItem>;
                                  })}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input 
                                value={(empresa as any)[item.id] || ''} 
                                onChange={(e) => handleUpdateEmpresa(empresa.id, item.id as any, e.target.value)}
                                className="bg-white/80 h-9 text-xs border-slate-200"
                                placeholder="Nombre del concepto"
                              />
                            )}
                          </div>
                        ))}
                        <div className="flex items-end">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full h-9 border-dashed text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleFetchMetadata(empresa, 'conceptos')}
                            disabled={fetchingMetadata[`${empresa.id}-conceptos`]}
                          >
                            <LucideIcons.RefreshCcw className={`h-3 w-3 mr-2 ${fetchingMetadata[`${empresa.id}-conceptos`] ? 'animate-spin' : ''}`} />
                            Cargar Conceptos desde API
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                        <LucideIcons.Activity className="h-4 w-4 text-indigo-500" />
                        Filtros de Sincronización
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Clasificación 1 (Tipo) */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clasificación 1</Label>
                            {empresa.nombre && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-4 text-[9px] text-blue-600 p-0"
                                onClick={() => handleFetchMetadata(empresa, 'clasificaciones')}
                              >
                                <LucideIcons.RefreshCcw className="h-2 w-2 mr-1" />
                                Cargar
                              </Button>
                            )}
                          </div>
                          {metadata[empresa.id]?.clasificaciones ? (
                            <Select 
                              value={empresa.syncClasifTipo || ''} 
                              onValueChange={(val) => handleUpdateEmpresa(empresa.id, 'syncClasifTipo', val)}
                            >
                              <SelectTrigger className="bg-white/80 h-9 text-sm border-slate-200">
                                <SelectValue placeholder="Tipo Clasif 1 (Ej: STATUS)" />
                              </SelectTrigger>
                              <SelectContent>
                                {metadata[empresa.id].clasificaciones.map((c: any, idx: number) => {
                                  const name = c.nombre || c.Nombre || c.cNombre || `Clasif ${idx+1}`;
                                  return <SelectItem key={idx} value={String(name)}>{String(name)}</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input 
                              placeholder="Ej: STATUS"
                              value={empresa.syncClasifTipo || ''} 
                              onChange={(e) => handleUpdateEmpresa(empresa.id, 'syncClasifTipo', e.target.value)}
                              className="bg-white/80 h-9 text-sm"
                            />
                          )}
                        </div>

                        {/* Valor de Clasificación 1 */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor 1</Label>
                            {empresa.syncClasifTipo && (
                              <div className="flex items-center gap-1">
                                {fetchingMetadata[`${empresa.id}-valores_clasificacion`] && (
                                  <LucideIcons.RefreshCcw className="h-2 w-2 animate-spin text-blue-500" />
                                )}
                              </div>
                            )}
                          </div>
                          {metadata[empresa.id]?.valores_clasificacion ? (
                            <Select 
                              value={empresa.syncClasifValor || ''} 
                              onValueChange={(val) => {
                                handleUpdateEmpresa(empresa.id, 'syncClasifValor', val);
                                handleUpdateEmpresa(empresa.id, 'clasificacion', val);
                              }}
                            >
                              <SelectTrigger className="bg-white/80 h-9 text-sm border-slate-200">
                                <SelectValue placeholder="Seleccionar Valor (Ej: COBRANZA NORMAL)" />
                              </SelectTrigger>
                              <SelectContent>
                                {metadata[empresa.id].valores_clasificacion.map((v: any, idx: number) => {
                                  const name = v.nombre || v.Nombre || v.cValorClasificacion || v.cNombreValor || `Valor ${idx+1}`;
                                  return <SelectItem key={idx} value={String(name)}>{String(name)}</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input 
                              placeholder="Ej: COBRANZA NORMAL"
                              value={empresa.syncClasifValor || empresa.clasificacion || ''} 
                              onChange={(e) => {
                                handleUpdateEmpresa(empresa.id, 'syncClasifValor', e.target.value);
                                handleUpdateEmpresa(empresa.id, 'clasificacion', e.target.value);
                              }}
                              className="bg-white/80 h-9 text-sm"
                            />
                          )}
                        </div>

                        {/* Clasificación 2 (Tipo) */}
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clasificación 2 (Opcional)</Label>
                          {metadata[empresa.id]?.clasificaciones ? (
                            <Select 
                              value={empresa.syncClasifTipo2 || ''} 
                              onValueChange={(val) => handleUpdateEmpresa(empresa.id, 'syncClasifTipo2', val)}
                            >
                              <SelectTrigger className="bg-white/80 h-9 text-sm border-slate-200">
                                <SelectValue placeholder="Tipo Clasif 2" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Ninguna</SelectItem>
                                {metadata[empresa.id].clasificaciones.map((c: any, idx: number) => {
                                  const name = c.nombre || c.Nombre || c.cNombre || `Clasif ${idx+1}`;
                                  return <SelectItem key={idx} value={String(name)}>{String(name)}</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input 
                              placeholder="Ej: RUTA"
                              value={empresa.syncClasifTipo2 || ''} 
                              onChange={(e) => handleUpdateEmpresa(empresa.id, 'syncClasifTipo2', e.target.value)}
                              className="bg-white/80 h-9 text-sm"
                            />
                          )}
                        </div>

                        {/* Valor de Clasificación 2 */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor 2 (Opcional)</Label>
                            {empresa.syncClasifTipo2 && (
                              <div className="flex items-center gap-1">
                                {fetchingMetadata[`${empresa.id}-valores_clasificacion2`] && (
                                  <LucideIcons.RefreshCcw className="h-2 w-2 animate-spin text-blue-500" />
                                )}
                              </div>
                            )}
                          </div>
                          {metadata[empresa.id]?.valores_clasificacion2 ? (
                            <Select 
                              value={empresa.syncClasifValor2 || ''} 
                              onValueChange={(val) => handleUpdateEmpresa(empresa.id, 'syncClasifValor2', val)}
                            >
                              <SelectTrigger className="bg-white/80 h-9 text-sm border-slate-200">
                                <SelectValue placeholder="Valor Clasif 2" />
                              </SelectTrigger>
                              <SelectContent>
                                {metadata[empresa.id].valores_clasificacion2.map((v: any, idx: number) => {
                                  const name = v.nombre || v.Nombre || v.cValorClasificacion || v.cNombreValor || `Valor ${idx+1}`;
                                  return <SelectItem key={idx} value={String(name)}>{String(name)}</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input 
                              placeholder="Ej: 32"
                              value={empresa.syncClasifValor2 || ''} 
                              onChange={(e) => handleUpdateEmpresa(empresa.id, 'syncClasifValor2', e.target.value)}
                              className="bg-white/80 h-9 text-sm"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                        <LucideIcons.Link2 className="h-4 w-4 text-emerald-500" />
                        Mapeo de Datos (VertexERP ← Contpaqi)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Clientes Mapping */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <LucideIcons.Users className="h-3 w-3" />
                              Catálogo Clientes
                            </h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] text-blue-600 hover:text-blue-700 p-0"
                              onClick={() => handleFetchMetadata(empresa, 'campos_clientes')}
                              disabled={fetchingMetadata[`${empresa.id}-campos_clientes`]}
                            >
                              <LucideIcons.RefreshCcw className={`h-3 w-3 mr-1 ${fetchingMetadata[`${empresa.id}-campos_clientes`] ? 'animate-spin' : ''}`} />
                              Campos
                            </Button>
                          </div>
                          <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 max-h-[400px] overflow-y-auto">
                            {CLIENTE_FIELDS.map((field) => (
                              <div key={field.key} className="grid grid-cols-2 gap-3 items-center border-b border-slate-100/50 pb-2 last:border-0 last:pb-0">
                                <Label className="text-[10px] text-slate-500">{field.label}</Label>
                                {metadata[empresa.id]?.campos_clientes && metadata[empresa.id].campos_clientes.length > 0 ? (
                                  <Select 
                                    value={empresa.mapping?.clientes?.[field.key] || ''} 
                                    onValueChange={(val) => handleUpdateMapping(empresa.id, 'clientes', field.key, val)}
                                  >
                                    <SelectTrigger className="h-8 text-[10px] bg-white border-slate-200">
                                      <SelectValue placeholder="Elegir campo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {metadata[empresa.id].campos_clientes.map((c: string) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input 
                                    value={empresa.mapping?.clientes?.[field.key] || ''} 
                                    onChange={(e) => handleUpdateMapping(empresa.id, 'clientes', field.key, e.target.value)}
                                    className="h-8 text-[10px] bg-white"
                                    placeholder="Campo en Contpaqi"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Productos Mapping */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <LucideIcons.Package className="h-3 w-3" />
                              Catálogo Productos
                            </h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] text-blue-600 hover:text-blue-700 p-0"
                              onClick={() => handleFetchMetadata(empresa, 'campos_productos')}
                              disabled={fetchingMetadata[`${empresa.id}-campos_productos`]}
                            >
                              <LucideIcons.RefreshCcw className={`h-3 w-3 mr-1 ${fetchingMetadata[`${empresa.id}-campos_productos`] ? 'animate-spin' : ''}`} />
                              Campos
                            </Button>
                          </div>
                          <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 max-h-[400px] overflow-y-auto">
                            {PRODUCTO_FIELDS.map((field) => (
                              <div key={field.key} className="grid grid-cols-2 gap-3 items-center border-b border-slate-100/50 pb-2 last:border-0 last:pb-0">
                                <Label className="text-[10px] text-slate-500">{field.label}</Label>
                                {metadata[empresa.id]?.campos_productos && metadata[empresa.id].campos_productos.length > 0 ? (
                                  <Select 
                                    value={empresa.mapping?.productos?.[field.key] || ''} 
                                    onValueChange={(val) => handleUpdateMapping(empresa.id, 'productos', field.key, val)}
                                  >
                                    <SelectTrigger className="h-8 text-[10px] bg-white border-slate-200">
                                      <SelectValue placeholder="Elegir campo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {metadata[empresa.id].campos_productos.map((c: string) => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input 
                                    value={empresa.mapping?.productos?.[field.key] || ''} 
                                    onChange={(e) => handleUpdateMapping(empresa.id, 'productos', field.key, e.target.value)}
                                    className="h-8 text-[10px] bg-white"
                                    placeholder="Campo en Contpaqi"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-between p-6 bg-slate-900 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <LucideIcons.RefreshCcw className="h-40 w-40" />
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        Acciones Rápidas
                        <LucideIcons.ArrowRight className="h-5 w-5 text-blue-400" />
                      </h3>
                      <p className="text-slate-400 text-sm">Dispara la sincronización manual para esta empresa.</p>
                      
                      <div className="grid grid-cols-2 gap-3 pt-4">
                        <Button 
                          onClick={() => handleSync(empresa, 'clientes')}
                          disabled={!!syncingId}
                          className="bg-white/10 hover:bg-white/20 border-white/10 text-white h-auto py-4 flex-col gap-2"
                        >
                          <LucideIcons.Users className="h-5 w-5" />
                          <span className="text-[10px] font-bold uppercase">Clientes</span>
                        </Button>
                        <Button 
                          onClick={() => handleSync(empresa, 'productos')}
                          disabled={!!syncingId}
                          className="bg-white/10 hover:bg-white/20 border-white/10 text-white h-auto py-4 flex-col gap-2"
                        >
                          <LucideIcons.Package className="h-5 w-5" />
                          <span className="text-[10px] font-bold uppercase">Productos</span>
                        </Button>
                      </div>
                    </div>

                    <div className="mt-8 space-y-4 relative z-10">
                      {syncingId?.startsWith(empresa.id) && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold text-blue-400">
                            <span>Sincronizando...</span>
                            <span>{syncProgress}%</span>
                          </div>
                          <Progress value={syncProgress} className="h-1 bg-white/10" />
                        </div>
                      )}
                      
                      <Button 
                        onClick={() => handleSync(empresa, 'all')}
                        disabled={!!syncingId}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-2xl"
                      >
                        <LucideIcons.RefreshCcw className={`h-5 w-5 mr-3 ${syncingId?.startsWith(empresa.id) ? 'animate-spin' : ''}`} />
                        Sincronización Total
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {empresas.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <LucideIcons.Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-600">No hay empresas configuradas</h3>
              <Button onClick={handleAddEmpresa} className="mt-6 bg-blue-600">
                <LucideIcons.Plus className="h-4 w-4 mr-2" />
                Configurar Ahora
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
