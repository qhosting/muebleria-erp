'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, ShieldCheck, Loader2, Landmark } from 'lucide-react';
import { toast } from 'sonner';

export default function PortalLoginPage() {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [curp, setCurp] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, curp }),
      });

      const data = await res.json();

      if (res.ok) {
        // Guardar sesión básica en sessionStorage
        sessionStorage.setItem('portal_session', JSON.stringify({
          customerName: data.customerName,
          phone,
          curp,
          clients: data.clients
        }));
        
        toast.success(`Bienvenido/a, ${data.customerName}`);
        router.push('/portal/dashboard');
      } else {
        toast.error(data.error || 'Error al ingresar');
      }
    } catch (error) {
      toast.error('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-slate-50">
      <Card className="w-full max-w-md border-none shadow-2xl backdrop-blur-sm bg-white/90">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-4 rotate-3 hover:rotate-0 transition-transform">
            <Landmark className="text-white h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tight text-slate-900">
            Portal del Cliente
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Ingresa para ver tus cuentas y estados de pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="10 dígitos (ej. 3312345678)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl bg-slate-50/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="curp" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-500" /> CURP
              </Label>
              <Input
                id="curp"
                type="text"
                placeholder="Tu CURP a 18 dígitos"
                value={curp}
                onChange={(e) => setCurp(e.target.value.toUpperCase())}
                required
                maxLength={18}
                className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl bg-slate-50/50 uppercase tracking-wider"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Ingresar al Portal'
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">
              VertexERP • Mueblería DASOPLUS
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
