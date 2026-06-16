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
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  RefreshCcw,
  Link2,
  Plus,
  Save,
  Building2,
  Trash2,
  Settings,
  Activity,
  Users,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


// Removed redundant star import to prevent confusion and extra bundle size
// import * as LucideIcons from 'lucide-react';

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
  { key: 'numContrato', label: 'Número de Contrato' },
  { key: 'nombreCompleto', label: 'Nombre Completo' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'calle', label: 'Calle' },
  { key: 'numeroExterior', label: 'Num. Exterior' },
  { key: 'numeroInterior', label: 'Num. Interior' },
  { key: 'colonia', label: 'Colonia' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'estado', label: 'Estado' },
  { key: 'codigoPostal', label: 'C.P.' },
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
  { key: 'diaPago', label: 'Día de Cobro' },
  { key: 'referencia1', label: 'Referencia 1' },
  { key: 'referencia2', label: 'Referencia 2' },
  { key: 'aval', label: 'Aval' },
];

const PRODUCTO_FIELDS = [
  { key: 'codigo', label: 'Código' },
  { key: 'nombre', label: 'Nombre Producto' },
  { key: 'precioVenta', label: 'Precio Venta' },
  { key: 'existencias', label: 'Existencias (Total)' },
  { key: 'existenciaHoy', label: 'Existencia Hoy' },
];

export default function ContpaqiMultiPage() {
  const [empresas, setEmpresas] = useState<EmpresaContpaqi[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [fetchingMetadata, setFetchingMetadata] = useState<Record<string, boolean>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const [isValidating, setIsValidating] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [showTestResultModal, setShowTestResultModal] = useState(false);
  const [confirmSync, setConfirmSync] = useState<{ empresa: EmpresaContpaqi, target: string } | null>(null);

  const toggleKeyVisibility = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };


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
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
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
      syncClasifValor2: '1',
      clasificacion: 'COBRANZA NORMAL',
      ruta: '',
      isActive: true,
      mapping: {
        clientes: {
          nombreCompleto: 'cNombreCliente',
          codigoCliente: 'cCodigoCliente',
          numContrato: 'cImporteExtra2',
          saldoActual: 'cSaldoActual',
          calle: 'cNombreCalle',
          numeroExterior: 'cNumeroExterior',
          colonia: 'cColonia',
          ciudad: 'cCiudad',
          estado: 'cEstado',
          codigoPostal: 'cCodigoPostal',
          telefono: 'cTelefono1',
          vendedor: 'cNombreAgente',
          montoPago: 'cImporteExtra1',
          periodicidad: 'cNombreClasificacion6',
          diaPago: 'cCuentaMensajeria',
          referencia1: 'cTextoExtra1',
          referencia2: 'cTextoExtra3',
          aval: 'cTextoExtra2'
        },
        productos: {
          nombre: 'cNombreProducto',
          codigo: 'cCodigoProducto',
          precioVenta: 'cPrecio1',
          existencias: 'cControlExistencia',
          existenciaHoy: 'cImporteExtra1'
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
    // Trim URL and Key to prevent hidden whitespace errors
    let finalValue = value;
    if ((field === 'apiUrl' || field === 'apiKey') && typeof value === 'string') {
      finalValue = value.trim();
    }

    setEmpresas(prev => {
      const newEmpresas = prev.map(e => e.id === id ? { ...e, [field]: finalValue } : e);
      
      // Lógica de efectos colaterales después de la actualización de estado
      if (field === 'nombre') {
        const updatedEmpresa = newEmpresas.find(e => e.id === id);
        if (updatedEmpresa) {
          handleFetchMetadata(updatedEmpresa, 'conceptos');
          handleFetchMetadata(updatedEmpresa, 'clasificaciones');
        }
      }

      if (field === 'syncClasifTipo' || field === 'syncClasifTipo2') {
        const currentEmpresa = newEmpresas.find(e => e.id === id);
        if (currentEmpresa) {
          const clasifs = metadata[id]?.clasificaciones || [];
          const selectedClasif = clasifs.find((c: any) => 
            (c.nombre || c.Nombre || c.cNombre || c) === finalValue
          );
          
          if (selectedClasif && typeof selectedClasif === 'object') {
            const clasifId = selectedClasif.id || selectedClasif.codigo || selectedClasif.cIdClasificacion;
            if (clasifId) {
              const metaType = field === 'syncClasifTipo' ? 'valores_clasificacion' : 'valores_clasificacion2';
              handleFetchMetadata({ ...currentEmpresa, [field]: finalValue }, metaType, clasifId);
            }
          }
        }
      }

      return newEmpresas;
    });
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
      // Manejo especial para error 403 de API Key
      if (error.message.includes('403')) {
        toast.error('Error 403: API Key inválida para este servidor. Verifique que sea correcta y no tenga espacios.');
      } else {
        toast.error(`Error: ${error.message}`);
      }
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

  const handleTestConnection = async (empresa: EmpresaContpaqi) => {
    setValidatingId(empresa.id);
    setIsValidating(true);
    setTestResult(null);
    try {
      const response = await fetch(`/api/contpaqi/test?empresaId=${empresa.id}`);
      const data = await response.json();
      setTestResult(data);
      setShowTestResultModal(true);
      if (response.ok && data.success) {
        toast.success(`Conexión exitosa con ${empresa.nombre}`);
      } else {
        toast.error(data.mensaje || `Error de conexión con ${empresa.nombre}`);
      }
    } catch (error: any) {
      toast.error(`Error al validar conexión: ${error.message}`);
      setTestResult({
        success: false,
        conexion: 'error',
        mensaje: 'Error al conectar con la API de Contpaqi.',
        error: error.message
      });
      setShowTestResultModal(true);
    } finally {
      setIsValidating(false);
      setValidatingId(null);
    }
  };

  const handleSync = async (empresa: EmpresaContpaqi, target: string, bypassConfirm = false) => {
    if (!bypassConfirm && (target === 'clientes' || target === 'all')) {
      setConfirmSync({ empresa, target });
      return;
    }

    setSyncingId(`${empresa.id}-${target}`);
    setSyncProgress(20);
    try {
      let query = `?target=${target}`;
      if (empresa.clasificacion) query += `&clasificacion=${encodeURIComponent(empresa.clasificacion)}`;
      if (empresa.ruta) query += `&ruta=${encodeURIComponent(empresa.ruta)}`;
      
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
          <RefreshCcw className="h-8 w-8 animate-spin text-blue-500" />
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
                <Link2 className="h-8 w-8 text-white" />
              </div>
              Contpaqi Multi-Empresa
            </h1>
            <p className="text-slate-500 text-lg">Gestiona múltiples conexiones y carteras de clientes de forma centralizada</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="lg" onClick={handleAddEmpresa} className="border-slate-200 hover:bg-slate-50">
              <Plus className="h-5 w-5 mr-2 text-blue-600" />
              Añadir Empresa
            </Button>
            <Button size="lg" onClick={handleSaveAll} className="bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200">
              <Save className="h-5 w-5 mr-2" />
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
                    <Building2 className="h-5 w-5 text-blue-600" />
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
                  <Trash2 className="h-5 w-5" />
                </Button>
              </CardHeader>
              
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-7 space-y-6">
                    <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                      <Settings className="h-4 w-4 text-blue-500" />
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
                        <div className="relative">
                          <Input 
                            type={showKeys[empresa.id] ? "text" : "password"}
                            value={empresa.apiKey} 
                            onChange={(e) => handleUpdateEmpresa(empresa.id, 'apiKey', e.target.value)}
                            className="bg-white/80 border-slate-200 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full w-10 text-slate-400 hover:text-slate-600"
                            onClick={() => toggleKeyVisibility(empresa.id)}
                          >
                            {showKeys[empresa.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
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
                            <RefreshCcw className="h-2 w-2 mr-1" />
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
                        <ArrowRight className="h-4 w-4 text-emerald-500" />
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
                            <RefreshCcw className={`h-3 w-3 mr-2 ${fetchingMetadata[`${empresa.id}-conceptos`] ? 'animate-spin' : ''}`} />
                            Cargar Conceptos desde API
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                        <Activity className="h-4 w-4 text-indigo-500" />
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
                                <RefreshCcw className="h-2 w-2 mr-1" />
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
                                  <RefreshCcw className="h-2 w-2 animate-spin text-blue-500" />
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
                                  <RefreshCcw className="h-2 w-2 animate-spin text-blue-500" />
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
                        <Link2 className="h-4 w-4 text-emerald-500" />
                        Mapeo de Datos (VertexERP ← Contpaqi)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Clientes Mapping */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Users className="h-3 w-3" />
                              Catálogo Clientes
                            </h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] text-blue-600 hover:text-blue-700 p-0"
                              onClick={() => handleFetchMetadata(empresa, 'campos_clientes')}
                              disabled={fetchingMetadata[`${empresa.id}-campos_clientes`]}
                            >
                              <RefreshCcw className={`h-3 w-3 mr-1 ${fetchingMetadata[`${empresa.id}-campos_clientes`] ? 'animate-spin' : ''}`} />
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
                              <Package className="h-3 w-3" />
                              Catálogo Productos
                            </h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] text-blue-600 hover:text-blue-700 p-0"
                              onClick={() => handleFetchMetadata(empresa, 'campos_productos')}
                              disabled={fetchingMetadata[`${empresa.id}-campos_productos`]}
                            >
                              <RefreshCcw className={`h-3 w-3 mr-1 ${fetchingMetadata[`${empresa.id}-campos_productos`] ? 'animate-spin' : ''}`} />
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
                      <RefreshCcw className="h-40 w-40" />
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        Acciones Rápidas
                        <ArrowRight className="h-5 w-5 text-blue-400" />
                      </h3>
                      <p className="text-slate-400 text-sm">Realiza pruebas o sincronizaciones controladas de tus catálogos.</p>

                      <div className="pt-2">
                        <Button 
                          onClick={() => handleTestConnection(empresa)}
                          disabled={!!syncingId || (isValidating && validatingId === empresa.id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2 border border-emerald-500/20"
                        >
                          {(isValidating && validatingId === empresa.id) ? (
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Activity className="h-4 w-4" />
                          )}
                          <span className="text-xs uppercase font-bold">Validar Conexión (Modo Seguro)</span>
                        </Button>
                      </div>

                      <div className="border-t border-white/10 my-4 pt-4">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sincronización Manual</span>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <Button 
                            onClick={() => handleSync(empresa, 'clientes')}
                            disabled={!!syncingId}
                            className="bg-white/5 hover:bg-white/15 border border-white/10 text-white h-auto py-4 flex-col gap-2 transition-all"
                          >
                            <Users className="h-5 w-5 text-amber-400" />
                            <span className="text-[10px] font-bold uppercase">Clientes (Manual)</span>
                          </Button>
                          <Button 
                            onClick={() => handleSync(empresa, 'productos')}
                            disabled={!!syncingId}
                            className="bg-white/5 hover:bg-white/15 border border-white/10 text-white h-auto py-4 flex-col gap-2 transition-all"
                          >
                            <Package className="h-5 w-5 text-blue-400" />
                            <span className="text-[10px] font-bold uppercase">Productos</span>
                          </Button>
                        </div>
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
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-2xl flex items-center justify-center gap-2"
                      >
                        <RefreshCcw className={`h-5 w-5 ${syncingId?.startsWith(empresa.id) ? 'animate-spin' : ''}`} />
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
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-600">No hay empresas configuradas</h3>
              <Button onClick={handleAddEmpresa} className="mt-6 bg-blue-600">
                <Plus className="h-4 w-4 mr-2" />
                Configurar Ahora
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Resultados de Validación */}
      <Dialog open={showTestResultModal} onOpenChange={setShowTestResultModal}>
        <DialogContent className="max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900">
              {testResult?.success ? (
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              ) : (
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <XCircle className="h-6 w-6" />
                </div>
              )}
              {testResult?.success ? 'Validación Exitosa' : 'Fallo en la Validación'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm">
              Se ha verificado la comunicación con la API de Contpaqi de forma segura. <span className="font-semibold text-slate-700">No se realizaron modificaciones en la base de datos local.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {testResult?.success ? (
              <>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Estado Conexión</span>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-none font-bold uppercase tracking-wider text-[9px]">ONLINE</Badge>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Servidor API</span>
                    <span className="font-mono text-slate-700">{testResult?.empresa || 'Empresa de Prueba'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Fecha de Validación</span>
                    <span className="text-slate-700">{testResult?.timestamp ? new Date(testResult.timestamp).toLocaleString() : ''}</span>
                  </div>
                </div>

                {/* Resultados Productos */}
                {testResult?.productos && (
                  <div className="border border-slate-100 p-4 rounded-2xl space-y-3 bg-white">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      Módulo Productos
                    </h4>
                    {testResult.productos.ok ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Total en Contpaqi:</span>
                          <span className="font-bold text-slate-900">{testResult.productos.total} productos</span>
                        </div>
                        <p className="text-xs text-emerald-600 font-semibold bg-emerald-50/50 p-2 rounded-lg">{testResult.productos.mensaje}</p>
                        {testResult.productos.muestra && (
                          <div className="mt-2 text-[10px] space-y-1">
                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Muestra de Campos Disponibles:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {testResult.productos.muestra.campos?.slice(0, 8).map((c: string) => (
                                <Badge key={c} variant="outline" className="text-slate-600 bg-slate-50 text-[9px] font-normal">{c}</Badge>
                              ))}
                              {testResult.productos.muestra.campos?.length > 8 && (
                                <span className="text-slate-400 text-[10px] self-center">+{testResult.productos.muestra.campos.length - 8} más</span>
                              )}
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg font-mono text-[9px] text-slate-500 mt-2 overflow-x-auto">
                              <div>Código: <span className="text-slate-800 font-bold">{testResult.productos.muestra.primerRegistro?.cCodigoProducto || testResult.productos.muestra.primerRegistro?.cCodigo || 'N/A'}</span></div>
                              <div>Nombre: <span className="text-slate-800">{testResult.productos.muestra.primerRegistro?.cNombreProducto || testResult.productos.muestra.primerRegistro?.cNombre || 'N/A'}</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Error: {testResult.productos.error}</p>
                    )}
                  </div>
                )}

                {/* Resultados Clientes */}
                {testResult?.clientes && (
                  <div className="border border-slate-100 p-4 rounded-2xl space-y-3 bg-white">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-500" />
                      Módulo Clientes
                    </h4>
                    {testResult.clientes.ok ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Total filtrados en Contpaqi:</span>
                          <span className="font-bold text-slate-900">{testResult.clientes.total} clientes</span>
                        </div>
                        <p className="text-xs text-emerald-600 font-semibold bg-emerald-50/50 p-2 rounded-lg">{testResult.clientes.mensaje}</p>
                        {testResult.clientes.muestra && (
                          <div className="mt-2 text-[10px] space-y-1">
                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Muestra de Campos Disponibles:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {testResult.clientes.muestra.campos?.slice(0, 8).map((c: string) => (
                                <Badge key={c} variant="outline" className="text-slate-600 bg-slate-50 text-[9px] font-normal">{c}</Badge>
                              ))}
                              {testResult.clientes.muestra.campos?.length > 8 && (
                                <span className="text-slate-400 text-[10px] self-center">+{testResult.clientes.muestra.campos.length - 8} más</span>
                              )}
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg font-mono text-[9px] text-slate-500 mt-2 overflow-x-auto">
                              <div>Código: <span className="text-slate-800 font-bold">{testResult.clientes.muestra.primerRegistro?.cCodigoCliente || testResult.clientes.muestra.primerRegistro?.cCodigo || 'N/A'}</span></div>
                              <div>Nombre: <span className="text-slate-800">{testResult.clientes.muestra.primerRegistro?.cNombreCliente || testResult.clientes.muestra.primerRegistro?.cNombre || 'N/A'}</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Error: {testResult.clientes.error}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl space-y-2">
                <p className="text-sm text-red-700 font-semibold">{testResult?.mensaje || 'No se pudo validar la conexión con el servidor de la API.'}</p>
                {testResult?.error && (
                  <pre className="text-xs bg-red-100/50 p-3 rounded-xl text-red-800 overflow-x-auto whitespace-pre-wrap font-mono">
                    {testResult.error}
                  </pre>
                )}
                <div className="pt-2 text-xs text-slate-500 flex items-start gap-1">
                  <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                  <span>Asegúrese de que el servidor API de Contpaqi en local esté encendido, que la URL sea accesible y que la API Key sea la misma en ambos extremos.</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowTestResultModal(false)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 rounded-xl">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para Confirmación de Sincronización */}
      <AlertDialog open={!!confirmSync} onOpenChange={(open) => !open && setConfirmSync(null)}>
        <AlertDialogContent className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-6">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-3 text-slate-900">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              Confirmar Sincronización Manual
            </AlertDialogTitle>
            <div className="text-slate-600 space-y-3 text-sm">
              {confirmSync?.target === 'clientes' ? (
                <>
                  <p>Está a punto de sincronizar <span className="font-semibold text-slate-950">todos los Clientes</span> para la empresa <span className="font-semibold text-slate-950">{confirmSync?.empresa.nombre}</span>.</p>
                  <p className="text-sm bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-100">
                    ⚠️ <strong>¡Cuidado!</strong> Esta acción importará nuevos clientes y modificará los saldos, direcciones, contratos y cobradores asignados de los clientes existentes en la base de datos de VertexERP de acuerdo a lo reportado por Contpaqi.
                  </p>
                </>
              ) : (
                <>
                  <p>Está a punto de realizar una <span className="font-semibold text-slate-950">Sincronización Total (Clientes y Productos)</span> para la empresa <span className="font-semibold text-slate-950">{confirmSync?.empresa.nombre}</span>.</p>
                  <p className="text-sm bg-red-50 text-red-800 p-3 rounded-xl border border-red-100">
                    ⚠️ <strong>Advertencia:</strong> Esto actualizará de forma masiva tanto el inventario (precios, existencias) como la cartera de clientes. Podría demorar varios minutos y no debe interrumpirse.
                  </p>
                </>
              )}
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-6 gap-2 sm:gap-0">
            <AlertDialogCancel className="border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl px-5">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (confirmSync) {
                  handleSync(confirmSync.empresa, confirmSync.target, true);
                  setConfirmSync(null);
                }
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl px-5"
            >
              Sí, Sincronizar Ahora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
