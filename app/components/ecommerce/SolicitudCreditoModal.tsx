
'use client';

import React, { useState } from 'react';
import { X, CreditCard, CheckCircle2, Loader2, AlertCircle, User, Phone, MapPin, Briefcase, DollarSign, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface SolicitudCreditoModalProps {
  open: boolean;
  onClose: () => void;
  montoSugerido?: number;
  productoInteres?: string;
}

type FormState = 'form' | 'loading' | 'success' | 'error';

export default function SolicitudCreditoModal({ open, onClose, montoSugerido, productoInteres }: SolicitudCreditoModalProps) {
  const [formState, setFormState] = useState<FormState>('form');
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    direccionArea: '',
    interes: productoInteres || '',
    montoEstimado: montoSugerido?.toString() || '',
    ocupacion: '',
    ingresosMensuales: '',
    tipoPropiedad: 'PROPIA',
    notas: '',
  });

  // Update interes/monto if props change
  React.useEffect(() => {
    if (productoInteres) setFormData(prev => ({ ...prev, interes: productoInteres }));
    if (montoSugerido) setFormData(prev => ({ ...prev, montoEstimado: montoSugerido.toString() }));
  }, [productoInteres, montoSugerido]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/tienda/solicitud-credito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Error al enviar la solicitud');
        setFormState('error');
        return;
      }

      setFormState('success');
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.');
      setFormState('error');
    }
  };

  const handleClose = () => {
    setFormState('form');
    setErrorMsg('');
    setFormData({
      nombre: '', telefono: '', direccionArea: '', interes: '',
      montoEstimado: '', ocupacion: '', ingresosMensuales: '', tipoPropiedad: 'PROPIA', notas: '',
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl border-b px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Solicitar Crédito</h2>
              <p className="text-xs text-slate-500">Completa tus datos y te contactaremos</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Estado: SUCCESS */}
          {formState === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Solicitud Enviada!</h3>
              <p className="text-slate-500 mb-8 max-w-sm">
                Tu solicitud de crédito ha sido recibida exitosamente. 
                Un asesor te contactará en las próximas 24 horas.
              </p>
              <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                Cerrar
              </Button>
            </div>
          )}

          {/* Estado: LOADING */}
          {formState === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-500 font-medium">Enviando tu solicitud...</p>
            </div>
          )}

          {/* Estado: ERROR */}
          {formState === 'error' && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 bg-red-50 p-4 rounded-xl border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-medium">Error al enviar</p>
                  <p className="text-red-600 text-sm">{errorMsg}</p>
                </div>
              </div>
              <Button onClick={() => setFormState('form')} variant="outline" className="w-full">
                Intentar de nuevo
              </Button>
            </div>
          )}

          {/* Estado: FORMULARIO */}
          {formState === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Datos personales */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Datos personales</p>
                
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Nombre completo *"
                    value={formData.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    required
                    className="pl-10 h-11"
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Teléfono (10 dígitos) *"
                    value={formData.telefono}
                    onChange={(e) => handleChange('telefono', e.target.value)}
                    required
                    type="tel"
                    maxLength={15}
                    className="pl-10 h-11"
                  />
                </div>

                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Colonia / Zona / Ciudad"
                    value={formData.direccionArea}
                    onChange={(e) => handleChange('direccionArea', e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              {/* Datos laborales */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Información laboral</p>

                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Ocupación / Oficio"
                    value={formData.ocupacion}
                    onChange={(e) => handleChange('ocupacion', e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>

                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Ingresos mensuales aprox."
                    value={formData.ingresosMensuales}
                    onChange={(e) => handleChange('ingresosMensuales', e.target.value)}
                    type="number"
                    min={0}
                    className="pl-10 h-11"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">Tipo de vivienda</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'PROPIA', label: 'Propia' },
                      { value: 'RENTA', label: 'Rentada' },
                      { value: 'FAMILIAR', label: 'Familiar' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleChange('tipoPropiedad', opt.value)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                          formData.tipoPropiedad === opt.value
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Datos del crédito */}
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sobre tu crédito</p>

                <Input
                  placeholder="¿Qué producto te interesa?"
                  value={formData.interes}
                  onChange={(e) => handleChange('interes', e.target.value)}
                  className="h-11"
                />

                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Monto estimado de compra"
                    value={formData.montoEstimado}
                    onChange={(e) => handleChange('montoEstimado', e.target.value)}
                    type="number"
                    min={0}
                    className="pl-10 h-11"
                  />
                </div>

                <Textarea
                  placeholder="Comentarios adicionales (opcional)"
                  value={formData.notas}
                  onChange={(e) => handleChange('notas', e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Al enviar esta solicitud, aceptas ser contactado por nuestro equipo de ventas. 
                Tu información será tratada de forma confidencial.
              </p>

              <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl">
                Enviar Solicitud
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
