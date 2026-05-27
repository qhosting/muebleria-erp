'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle2, Loader2, AlertCircle, User, Phone, MapPin, Briefcase, DollarSign, Home, Building2, Users, ArrowRight, ArrowLeft } from 'lucide-react';
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
  const [step, setStep] = useState(1);
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
  useEffect(() => {
    if (productoInteres) setFormData(prev => ({ ...prev, interes: productoInteres }));
    if (montoSugerido) setFormData(prev => ({ ...prev, montoEstimado: montoSugerido.toString() }));
  }, [productoInteres, montoSugerido]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    let formatted = clean;
    if (clean.length > 6) {
      formatted = `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
    } else if (clean.length > 3) {
      formatted = `(${clean.slice(0, 3)}) ${clean.slice(3)}`;
    } else if (clean.length > 0) {
      formatted = `(${clean}`;
    }
    setFormData(prev => ({ ...prev, telefono: formatted }));
  };

  const isStepValid = () => {
    if (step === 1) {
      const cleanPhone = formData.telefono.replace(/\D/g, '');
      return formData.nombre.trim().length >= 3 && cleanPhone.length === 10;
    }
    if (step === 2) {
      return formData.ocupacion.trim().length >= 2 && formData.ingresosMensuales.trim() !== '';
    }
    if (step === 3) {
      return formData.interes.trim().length >= 2 && formData.montoEstimado.trim() !== '';
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid()) return;
    
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
    setStep(1);
    setErrorMsg('');
    setFormData({
      nombre: '', telefono: '', direccionArea: '', interes: '',
      montoEstimado: '', ocupacion: '', ingresosMensuales: '', tipoPropiedad: 'PROPIA', notas: '',
    });
    onClose();
  };

  if (!open) return null;

  const steps = [
    { id: 1, label: 'Contacto', icon: User },
    { id: 2, label: 'Perfil', icon: Briefcase },
    { id: 3, label: 'Crédito', icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay with blur effect */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" 
        onClick={handleClose} 
      />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-auto max-h-[95vh] overflow-hidden flex flex-col z-10 border border-slate-100 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md rounded-t-3xl border-b border-slate-100 px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 animate-pulse">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Solicitud de Crédito Directo</h2>
              <p className="text-[11px] text-slate-500 font-medium">Aprobación express sin tarjeta de banco</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-full transition-colors group">
            <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          
          {/* SUCCESS SCREEN */}
          {formState === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center px-2 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative mb-6">
                <div className="absolute -inset-4 bg-emerald-50 rounded-full animate-ping opacity-60 duration-1000" />
                <div className="absolute -inset-2 bg-emerald-100 rounded-full animate-pulse opacity-40" />
                <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                  <CheckCircle2 className="w-10 h-10 text-white animate-bounce" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Todo listo, {formData.nombre.split(' ')[0]}!</h3>
              <p className="text-slate-600 text-sm mb-6 max-w-sm leading-relaxed">
                Tu solicitud de crédito ha sido recibida con éxito y ha sido asignada a uno de nuestros asesores de cuenta.
              </p>
              
              {/* Summary Card */}
              <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-8 text-left space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumen de solicitud:</h4>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Teléfono registrado:</span>
                    <span className="text-slate-700 font-semibold">{formData.telefono}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Producto de interés:</span>
                    <span className="text-slate-700 font-semibold truncate block">{formData.interes || 'Crédito General'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Monto estimado:</span>
                    <span className="text-indigo-600 font-extrabold block">
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(parseFloat(formData.montoEstimado) || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estatus inicial:</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Pendiente de llamada
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <div className="text-xs text-slate-400 mb-4 leading-relaxed">
                  ⏰ Un asesor especializado te llamará en menos de **24 horas hábiles** al número telefónico ingresado.
                </div>
                <Button 
                  onClick={handleClose} 
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  Entendido y Cerrar
                </Button>
              </div>
            </div>
          )}

          {/* LOADING SCREEN */}
          {formState === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <Loader2 className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Procesando tu solicitud</h3>
              <p className="text-sm text-slate-500 text-center max-w-xs leading-relaxed">
                Estamos analizando tus datos para precalificar tu crédito. Esto tomará solo unos segundos...
              </p>
            </div>
          )}

          {/* ERROR SCREEN */}
          {formState === 'error' && (
            <div className="space-y-6 py-6 px-4 animate-in fade-in duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Hubo un problema</h3>
                <p className="text-sm text-slate-500 max-w-xs">{errorMsg || 'No pudimos procesar tu solicitud de crédito temporalmente.'}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleClose} variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 font-bold text-slate-600">
                  Cerrar
                </Button>
                <Button onClick={() => setFormState('form')} className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md">
                  Intentar de nuevo
                </Button>
              </div>
            </div>
          )}

          {/* FORM SCREEN */}
          {formState === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Progress Indicator */}
              <div className="mb-8 px-2">
                <div className="relative flex items-center justify-between">
                  {/* Background Line */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] w-full bg-slate-100 rounded-full z-0" />
                  {/* Dynamic Gradient Line */}
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full z-0 transition-all duration-500 ease-in-out" 
                    style={{ width: `${((step - 1) / 2) * 100}%` }}
                  />
                  
                  {steps.map((s) => {
                    const Icon = s.icon;
                    const isCompleted = step > s.id;
                    const isActive = step === s.id;
                    return (
                      <div key={s.id} className="relative z-10 flex flex-col items-center">
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-md ${
                            isCompleted 
                              ? 'bg-gradient-to-tr from-green-500 to-emerald-500 text-white scale-110' 
                              : isActive 
                                ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white ring-4 ring-indigo-100 scale-115' 
                                : 'bg-white text-slate-400 border-2 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                        <span 
                          className={`text-[10px] sm:text-xs font-bold mt-2 transition-colors duration-300 ${
                            isActive 
                              ? 'text-indigo-600 font-extrabold' 
                              : isCompleted 
                                ? 'text-emerald-600' 
                                : 'text-slate-400'
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contextual Badge (When custom interest exists) */}
              {formData.interes && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100/50 p-3 rounded-xl flex items-center justify-between text-xs mb-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Interés seleccionado:</span>
                      <span className="text-indigo-950 font-bold">{formData.interes}</span>
                    </div>
                  </div>
                  {formData.montoEstimado && (
                    <span className="bg-indigo-600 text-white font-bold px-2 py-1 rounded-md text-[10px]">
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(parseFloat(formData.montoEstimado))}
                    </span>
                  )}
                </div>
              )}

              {/* STEP 1: DATOS PERSONALES */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-slate-50 border border-slate-100/80 p-4 rounded-2xl mb-2">
                    <h4 className="text-sm font-semibold text-slate-800 mb-1">¡Comencemos con tus datos básicos!</h4>
                    <p className="text-xs text-slate-500">Ingresa tu información para que podamos identificarte y comunicarnos contigo.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre Completo *</label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <Input
                          placeholder="Ej. Juan Pérez López"
                          value={formData.nombre}
                          onChange={(e) => handleChange('nombre', e.target.value)}
                          required
                          className="pl-11 h-12 bg-slate-50/50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent rounded-xl transition-all"
                        />
                      </div>
                      {formData.nombre && formData.nombre.trim().length < 3 && (
                        <p className="text-red-500 text-[11px] mt-1 ml-1">Ingresa al menos 3 caracteres</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono de Contacto (10 dígitos) *</label>
                      <div className="relative group">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <Input
                          placeholder="Ej. (55) 1234-5678"
                          value={formData.telefono}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          required
                          type="tel"
                          className="pl-11 h-12 bg-slate-50/50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent rounded-xl transition-all font-mono tracking-wide"
                        />
                      </div>
                      {formData.telefono && formData.telefono.replace(/\D/g, '').length < 10 && (
                        <p className="text-amber-500 text-[11px] mt-1 ml-1">
                          Faltan {10 - formData.telefono.replace(/\D/g, '').length} dígitos
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Colonia / Zona / Ciudad</label>
                      <div className="relative group">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <Input
                          placeholder="Ej. Col. Centro, Guadalajara"
                          value={formData.direccionArea}
                          onChange={(e) => handleChange('direccionArea', e.target.value)}
                          className="pl-11 h-12 bg-slate-50/50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent rounded-xl transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: PERFIL SOCIOECONÓMICO */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-slate-50 border border-slate-100/80 p-4 rounded-2xl mb-2">
                    <h4 className="text-sm font-semibold text-slate-800 mb-1">Información socioeconómica</h4>
                    <p className="text-xs text-slate-500">Esta información nos ayuda a precalificar tu capacidad de crédito al instante.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ocupación o Profesión *</label>
                      <div className="relative group">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <Input
                          placeholder="Ej. Empleado, Comerciante, Independiente"
                          value={formData.ocupacion}
                          onChange={(e) => handleChange('ocupacion', e.target.value)}
                          required
                          className="pl-11 h-12 bg-slate-50/50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent rounded-xl transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ingresos Mensuales Aproximados ($ MXN) *</label>
                      <div className="relative group">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <Input
                          placeholder="Ej. 12000"
                          value={formData.ingresosMensuales}
                          onChange={(e) => handleChange('ingresosMensuales', e.target.value)}
                          type="number"
                          min={0}
                          required
                          className="pl-11 h-12 bg-slate-50/50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent rounded-xl transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Vivienda</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'PROPIA', label: 'Propia', desc: 'Casa propia', icon: Home, color: 'from-blue-500 to-indigo-500' },
                          { value: 'RENTA', label: 'Renta', desc: 'Pago alquiler', icon: Building2, color: 'from-purple-500 to-indigo-500' },
                          { value: 'FAMILIAR', label: 'Familiar', desc: 'Padres/fam.', icon: Users, color: 'from-pink-500 to-rose-500' },
                        ].map(opt => {
                          const Icon = opt.icon;
                          const isSelected = formData.tipoPropiedad === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleChange('tipoPropiedad', opt.value)}
                              className={`relative p-4 rounded-2xl flex flex-col items-center text-center justify-between border-2 transition-all duration-300 group hover:scale-[1.03] ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-50/30 shadow-md ring-1 ring-indigo-500'
                                  : 'border-slate-100 bg-slate-50/30 text-slate-600 hover:border-slate-200 hover:bg-slate-100/50'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-gradient-to-tr ' + opt.color + ' text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-600'
                              }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="mt-3">
                                <span className={`block text-xs sm:text-sm font-bold leading-tight ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                  {opt.label}
                                </span>
                                <span className="block text-[9px] text-slate-400 mt-1 leading-normal">
                                  {opt.desc}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: DETALLES DEL CRÉDITO */}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-slate-50 border border-slate-100/80 p-4 rounded-2xl mb-2">
                    <h4 className="text-sm font-semibold text-slate-800 mb-1">Detalles de tu compra</h4>
                    <p className="text-xs text-slate-500">¿Qué tienes en mente para redecorar o amueblar? Dinos y calcularemos tus plazos.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">¿Qué producto te interesa? *</label>
                      <Input
                        placeholder="Ej. Recámara, Comedor, Sala o Código"
                        value={formData.interes}
                        onChange={(e) => handleChange('interes', e.target.value)}
                        required
                        className="h-12 bg-slate-50/50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent rounded-xl transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monto estimado de compra ($ MXN) *</label>
                      <div className="relative group">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <Input
                          placeholder="Ej. 15000"
                          value={formData.montoEstimado}
                          onChange={(e) => handleChange('montoEstimado', e.target.value)}
                          type="number"
                          min={0}
                          required
                          className="pl-11 h-12 bg-slate-50/50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent rounded-xl transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Comentarios adicionales (Opcional)</label>
                      <Textarea
                        placeholder="Ej. Horario de contacto preferido, referencias, etc."
                        value={formData.notas}
                        onChange={(e) => handleChange('notas', e.target.value)}
                        rows={3}
                        className="resize-none bg-slate-50/50 border-slate-200 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent rounded-xl transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Al enviar esta solicitud, aceptas ser contactado por nuestro equipo de ventas. 
                Tu información será tratada de forma estrictamente confidencial.
              </p>

              {/* Navigation Controls */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                {step > 1 && (
                  <Button
                    type="button"
                    onClick={() => setStep(prev => prev - 1)}
                    variant="outline"
                    className="flex-1 h-12 text-slate-600 font-bold border-slate-200 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Atrás
                  </Button>
                )}
                
                <Button
                  type={step === 3 ? 'submit' : 'button'}
                  onClick={step === 3 ? undefined : () => setStep(prev => prev + 1)}
                  disabled={!isStepValid()}
                  className={`flex-[2] h-12 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    isStepValid()
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 shadow-md shadow-indigo-100 hover:scale-[1.01] active:scale-[0.99]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {step === 3 ? 'Enviar Solicitud' : 'Siguiente'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
