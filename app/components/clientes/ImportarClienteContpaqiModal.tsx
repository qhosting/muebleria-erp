'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Building2, 
  UserCheck, 
  Calendar, 
  DollarSign, 
  Clock, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { User } from '@/lib/types';

interface ImportarClienteContpaqiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (codigo?: string) => void;
  cobradores?: User[];
}

export function ImportarClienteContpaqiModal({
  open,
  onOpenChange,
  onSuccess,
  cobradores = []
}: ImportarClienteContpaqiModalProps) {
  const [codigo, setCodigo] = useState('');
  const [empresa, setEmpresa] = useState('auto');
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states to customize upon import
  const [selectedCobrador, setSelectedCobrador] = useState<string>('none');
  const [diaPago, setDiaPago] = useState<string>('1');
  const [periodicidad, setPeriodicidad] = useState<string>('semanal');
  const [clasificacionCobranza, setClasificacionCobranza] = useState<string>('RUTA');

  const handleReset = () => {
    setCodigo('');
    setEmpresa('auto');
    setPreviewData(null);
    setErrorMsg(null);
    setSelectedCobrador('none');
    setDiaPago('1');
    setPeriodicidad('semanal');
    setClasificacionCobranza('RUTA');
  };

  const handleBuscar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCodigo = codigo.trim().toUpperCase();
    if (!cleanCodigo) {
      toast.error('Ingresa un código de cliente (ej. DQ2509105 o DP2604120)');
      return;
    }

    setSearching(true);
    setErrorMsg(null);
    setPreviewData(null);

    try {
      const empresaParam = empresa !== 'auto' ? `&empresaId=${encodeURIComponent(empresa)}` : '';
      const res = await fetch(`/api/contpaqi/importar-cliente?codigo=${encodeURIComponent(cleanCodigo)}${empresaParam}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.mensaje || 'Cliente no encontrado en ContPAQi');
      }

      setPreviewData(data);
      if (data.clienteLocal?.cobradorAsignadoId) {
        setSelectedCobrador(data.clienteLocal.cobradorAsignadoId);
      }
      if (data.clienteLocal?.diaPago) {
        setDiaPago(data.clienteLocal.diaPago);
      }
      if (data.clienteLocal?.periodicidad) {
        setPeriodicidad(data.clienteLocal.periodicidad);
      }
      if (data.clienteLocal?.clasificacionCobranza) {
        setClasificacionCobranza(data.clienteLocal.clasificacionCobranza);
      }
      toast.success(`Cliente ${cleanCodigo} encontrado en ContPAQi`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al buscar en ContPAQi');
      toast.error(err.message || 'No se pudo encontrar el cliente');
    } finally {
      setSearching(false);
    }
  };

  const handleImportar = async () => {
    if (!previewData?.preview?.codigoCliente) return;

    setImporting(true);
    const cleanCodigo = previewData.preview.codigoCliente;

    try {
      const res = await fetch('/api/contpaqi/importar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: cleanCodigo,
          empresaId: previewData.empresa,
          cobradorAsignadoId: selectedCobrador !== 'none' ? selectedCobrador : null,
          diaPago,
          periodicidad,
          clasificacionCobranza
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al importar cliente al ERP');
      }

      toast.success(data.message || `Cliente ${cleanCodigo} importado con éxito`);
      if (onSuccess) onSuccess(cleanCodigo);
      onOpenChange(false);
      handleReset();
    } catch (err: any) {
      toast.error(err.message || 'No se pudo guardar el cliente en el ERP');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) handleReset();
    }}>
      <DialogContent className="max-w-xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Importar Cliente desde ContPAQi
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Importa cualquier cliente por su código (DP o DQ) independientemente de su clasificación en ContPAQi.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formulario de Búsqueda */}
        <form onSubmit={handleBuscar} className="space-y-4 my-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-bold text-gray-700">Código de Cliente</Label>
              <div className="relative">
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="ej. DQ2509105 o DP2604120"
                  className="font-mono font-bold uppercase text-sm pr-10"
                  disabled={searching || importing}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={searching || !codigo.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-40"
                  title="Buscar"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-700">Empresa ContPAQi</Label>
              <Select value={empresa} onValueChange={setEmpresa} disabled={searching || importing}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Por prefijo)</SelectItem>
                  <SelectItem value="DQ">DQ - adGMD</SelectItem>
                  <SelectItem value="DP">DP - adDASOPLUS16</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={searching || !codigo.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 font-bold shadow-xs"
            >
              {searching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Buscando en ContPAQi...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  Consultar Cliente
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Mensaje de Error si no se encuentra */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No se pudo consultar el cliente</p>
              <p className="text-red-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Previsualización de Datos si fue encontrado */}
        {previewData?.preview && (
          <div className="space-y-4 border-t pt-4">
            <Card className="border-indigo-200 bg-indigo-50/20 shadow-none">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-indigo-600 text-white font-mono font-bold text-xs">
                        {previewData.preview.codigoCliente}
                      </Badge>
                      <Badge variant="outline" className="bg-white border-indigo-200 text-indigo-800 font-semibold text-xs">
                        Empresa: {previewData.empresa}
                      </Badge>
                      {previewData.yaExisteEnBd ? (
                        <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                          Ya existe en ERP (Se actualizará)
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          Nuevo en ERP
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-black text-gray-900 text-base mt-1.5 uppercase">
                      {previewData.preview.nombreCompleto}
                    </h3>
                  </div>

                  <div className="text-right sm:border-l sm:pl-4 border-indigo-100">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block">Saldo Actual</span>
                    <span className="font-mono font-black text-lg text-emerald-700 block">
                      {formatCurrency(previewData.preview.saldoActual)}
                    </span>
                  </div>
                </div>

                {/* Métricas clave */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 block">SALDO VENCIDO</span>
                    <span className="font-mono font-bold text-amber-700 text-xs">
                      {formatCurrency(previewData.preview.saldoVencido)}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 block">DÍAS VENCIDOS</span>
                    <span className="font-mono font-bold text-gray-800 text-xs">
                      {previewData.preview.diasVencidos} días
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-gray-200 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-gray-500 block">ESTATUS CONTPAQI</span>
                    <span className="font-bold text-emerald-600 text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Activo
                    </span>
                  </div>
                </div>

                {previewData.preview.direccion && (
                  <div className="text-[11px] text-gray-600 bg-white p-2 rounded border border-gray-200 truncate">
                    <strong className="text-gray-700">Dirección:</strong> {previewData.preview.direccion}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Configuración de Cartera / Cobranza al Importar */}
            <div className="space-y-3 bg-gray-50 p-3.5 rounded-lg border border-gray-200 text-xs">
              <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Asignación de Cartera en el ERP:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Cobrador Asignado</Label>
                  <Select value={selectedCobrador} onValueChange={setSelectedCobrador}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin cobrador asignado</SelectItem>
                      {cobradores.map((cob) => (
                        <SelectItem key={cob.id} value={cob.id}>
                          {cob.codigoGestor ? `[${cob.codigoGestor}] ` : ''}{cob.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Día de Cobro</Label>
                  <Select value={diaPago} onValueChange={setDiaPago}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Día" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Lunes (1)</SelectItem>
                      <SelectItem value="2">Martes (2)</SelectItem>
                      <SelectItem value="3">Miércoles (3)</SelectItem>
                      <SelectItem value="4">Jueves (4)</SelectItem>
                      <SelectItem value="5">Viernes (5)</SelectItem>
                      <SelectItem value="6">Sábado (6)</SelectItem>
                      <SelectItem value="7">Domingo (7)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Periodicidad</Label>
                  <Select value={periodicidad} onValueChange={setPeriodicidad}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Periodicidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-gray-700">Clasificación Cobranza</Label>
                  <Select value={clasificacionCobranza} onValueChange={setClasificacionCobranza}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="Clasificación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RUTA">RUTA (Cobranza Normal)</SelectItem>
                      <SelectItem value="VD">VD (Verificación Domiciliaria)</SelectItem>
                      <SelectItem value="PA">PA (Pago Anticipado)</SelectItem>
                      <SelectItem value="PE">PE (Pendiente Entrega)</SelectItem>
                      <SelectItem value="NC">NC (No Cobrable / Jurídico)</SelectItem>
                      <SelectItem value="FD">FD (Fuera de Domicilio)</SelectItem>
                      <SelectItem value="AD">AD (Aclaración Documental)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
            className="text-xs h-9"
          >
            Cancelar
          </Button>

          {previewData?.preview && (
            <Button
              type="button"
              onClick={handleImportar}
              disabled={importing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-sm"
            >
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Importando al ERP...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {previewData.yaExisteEnBd ? 'Actualizar Cliente' : 'Importar al ERP'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
