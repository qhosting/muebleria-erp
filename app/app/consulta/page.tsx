
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Smartphone, ShieldCheck, ArrowLeft, Loader2, CreditCard, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ConsultaSaldoPage() {
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Dashboard
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<any>(null);

  const handleRequestOtp = async () => {
    if (phone.length < 10) return toast.error('Ingresa un número de 10 dígitos');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Código enviado por WhatsApp');
        setStep(2);
      } else {
        toast.error(data.error || 'Error al enviar código');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return toast.error('Ingresa el código de 6 dígitos');
    setLoading(true);
    try {
      // 1. Primero verificar el código
      const verifyRes = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp })
      });
      const verifyData = await verifyRes.json();
      
      if (!verifyRes.ok) {
        toast.error(verifyData.error || 'Código incorrecto');
        return;
      }

      // 2. Si es cliente, obtener sus datos de la API pública de consulta
      if (verifyData.type === 'client') {
        const dataRes = await fetch('/api/tienda/consulta-saldo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code: otp })
        });
        const data = await dataRes.json();
        if (dataRes.ok) {
          setAccountStatus(data);
          setStep(3);
        } else {
          toast.error(data.error || 'Error al obtener datos');
        }
      } else {
        // Si es empleado, redirigir al login normal o dashboard
        toast.success('Acceso de empleado detectado. Iniciando sesión...');
        await signIn('credentials', { phone, code: otp, callbackUrl: '/dashboard' });
      }
    } catch (e) {
      toast.error('Error de verificación');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-800 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver al inicio
        </Link>

        {step === 1 && (
          <Card className="border-none shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-100">
                <Smartphone className="text-white w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-bold">Consulta de Saldo</CardTitle>
              <CardDescription>Ingresa tu número de teléfono registrado para recibir tu código de acceso por WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Número de Teléfono</label>
                <Input 
                  type="tel" 
                  placeholder="Ej. 5512345678" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="h-12 text-lg text-center tracking-[0.2em] font-bold"
                />
              </div>
              <Button 
                onClick={handleRequestOtp} 
                disabled={loading || phone.length < 10}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold text-lg rounded-xl"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Recibir Código'}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-none shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-100">
                <ShieldCheck className="text-white w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-bold">Verifica tu Identidad</CardTitle>
              <CardDescription>Hemos enviado un código de 6 dígitos a tu WhatsApp. Ingrésalo para continuar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center block">Código de Verificación</label>
                <Input 
                  type="text" 
                  placeholder="000000" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-16 text-3xl text-center tracking-[0.5em] font-black border-2 border-blue-100 focus:border-blue-600"
                />
              </div>
              <Button 
                onClick={handleVerifyOtp} 
                disabled={loading || otp.length < 6}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold text-lg rounded-xl"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Código'}
              </Button>
              <button 
                onClick={() => setStep(1)} 
                className="w-full text-sm text-slate-500 hover:text-blue-600 font-medium"
              >
                ¿No recibiste el código? Intentar de nuevo
              </button>
            </CardContent>
          </Card>
        )}

        {step === 3 && accountStatus && (
          <div className="space-y-4 w-full max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl mb-6">
              <p className="text-blue-100 text-sm font-medium mb-1">¡Bienvenido!</p>
              <h2 className="text-2xl font-bold mb-4">{accountStatus.nombreCompleto}</h2>
              <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                <div>
                  <p className="text-blue-100 text-[10px] uppercase font-bold tracking-tighter">Contrato</p>
                  <p className="text-lg font-mono">{accountStatus.codigoCliente}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-100 text-[10px] uppercase font-bold tracking-tighter">Estado</p>
                  <div className="flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="font-bold capitalize">{accountStatus.statusCuenta}</span>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                    <CreditCard className="text-amber-600 w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Saldo Actual</p>
                    <h3 className="text-3xl font-black text-slate-900">{formatCurrency(accountStatus.saldoActual)}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">Día de Pago</span>
                    </div>
                    <span className="font-bold text-slate-900">{accountStatus.diaPago}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-slate-700">Abono {accountStatus.periodicidad}</span>
                    </div>
                    <span className="font-bold text-slate-900">{formatCurrency(accountStatus.montoPago)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg overflow-hidden">
               <CardHeader className="bg-slate-50 py-4">
                 <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Últimos Pagos</CardTitle>
               </CardHeader>
               <CardContent className="p-0">
                 {accountStatus.pagos && accountStatus.pagos.length > 0 ? (
                   <div className="divide-y divide-slate-100">
                     {accountStatus.pagos.slice(0, 5).map((p: any) => (
                       <div key={p.id} className="p-4 flex items-center justify-between">
                         <div>
                           <p className="text-sm font-bold text-slate-900">{formatCurrency(p.monto)}</p>
                           <p className="text-[10px] text-slate-500">{formatDate(p.createdAt)}</p>
                         </div>
                         <Badge className="bg-green-100 text-green-700 border-none">Aplicado</Badge>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="p-8 text-center text-slate-400 text-sm">No hay pagos registrados recientemente.</div>
                 )}
               </CardContent>
            </Card>

            <div className="text-center py-8">
               <p className="text-xs text-slate-400 mb-4 italic">Si detectas alguna inconsistencia, contacta a tu sucursal.</p>
               <Button variant="outline" onClick={() => setStep(1)} className="rounded-full px-8">Cerrar Sesión</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${className}`}>
      {children}
    </span>
  );
}
