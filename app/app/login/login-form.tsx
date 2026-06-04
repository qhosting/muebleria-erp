
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn, useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, LogIn, Loader2, Smartphone, MessageSquare, ShieldCheck, ArrowLeft, ShieldAlert, Key } from 'lucide-react';
import { toast } from 'sonner';
import ClientDashboard from '@/components/ecommerce/ClientDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Capacitor } from '@capacitor/core';
import { VersionInfo } from '@/components/version-info';
import { obtenerDatoCobrador } from '@/lib/native/sync';

export default function LoginForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  
  // Login Mode
  const [loginMode, setLoginMode] = useState<'credentials' | 'otp'>('credentials');
  const [otpStep, setOtpStep] = useState(1); // 1: Phone, 2: Code

  // Credentials form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP form
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  
  // Device Security
  const [showDeviceLinking, setShowDeviceLinking] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [deviceLinkOtp, setDeviceLinkOtp] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/configuracion');
        if (response.ok) {
          const data = await response.json();
          if (data.empresa?.nombre) setCompanyName(data.empresa.nombre);
          if (data.empresa?.logoUrl) setCompanyLogo(data.empresa.logoUrl);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      } finally {
        setIsConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Ingrese sus credenciales');
    
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }

      handleSuccessfulLogin();
    } catch (error) {
      toast.error('Error al iniciar sesión');
      setIsLoading(false);
    }
  };

  const handleOtpRequest = async () => {
    if (phone.length < 10) return toast.error('Ingrese un teléfono de 10 dígitos');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Código enviado por WhatsApp');
        setOtpStep(2);
      } else {
        toast.error(data.error || 'Error al enviar código');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const [clientAccountStatus, setClientAccountStatus] = useState<any>(null);

  const handleOtpVerify = async () => {
    if (otpCode.length < 6) return toast.error('Ingrese el código de 6 dígitos');
    setIsLoading(true);
    try {
      // 1. Verificar el código en la base de datos primero (para marcarlo como verificado)
      const verifyRes = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode })
      });
      const verifyData = await verifyRes.json();
      
      if (!verifyRes.ok) {
        toast.error(verifyData.error || 'Código incorrecto');
        setIsLoading(false);
        return;
      }

      // 2. Si es un cliente, mostramos su estado de cuenta
      if (verifyData.type === 'client') {
        const dataRes = await fetch('/api/tienda/consulta-saldo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code: otpCode })
        });
        const data = await dataRes.json();
        if (dataRes.ok) {
          setClientAccountStatus(data);
        } else {
          toast.error(data.error || 'Error al obtener datos');
        }
        setIsLoading(false);
        return;
      }

      // 3. Iniciar sesión con NextAuth (Solo Empleados)
      const result = await signIn('credentials', {
        phone,
        code: otpCode,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      handleSuccessfulLogin();
    } catch (e) {
      toast.error('Error de autenticación');
      setIsLoading(false);
    }
  };

  const handleDeviceLink = async () => {
    if (deviceLinkOtp.length < 6) return toast.error('Ingrese el código de 6 dígitos');
    setIsLoading(true);
    try {
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      const userId = sessionData.user.id;

      const res = await fetch('/api/dispositivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          action: 'VERIFY_OTP',
          otp: deviceLinkOtp,
          userId
        })
      });

      if (res.ok) {
        toast.success('Dispositivo vinculado correctamente');
        setIsAuthorized(true);
        setShowDeviceLinking(false);
        handleSuccessfulLogin();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Código inválido');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessfulLogin = async () => {
    // Redirigir según el rol
    const res = await fetch('/api/auth/session');
    const session = await res.json();
    const userRole = session.user.role;
    const userId = session.user.id;

    // --- SEGURIDAD DE DISPOSITIVO (SOLO COBRADORES/VENDEDORES EN NATIVO) ---
    if (Capacitor.isNativePlatform() && ['cobrador', 'vendedor', 'jefe_ventas'].includes(userRole)) {
      try {
        const { Device } = await import('@capacitor/device');
        const idInfo = await Device.getId();
        const currentDeviceId = idInfo.identifier;
        setDeviceId(currentDeviceId);

        let nombre = 'Dispositivo Móvil';
        let modelo = 'Desconocido';
        let sistemaOperativo = 'Android/iOS';
        try {
          const info = await Device.getInfo();
          modelo = info.model || 'Device';
          nombre = `${info.manufacturer || ''} ${info.model || ''}`.trim() || 'Dispositivo Móvil';
          sistemaOperativo = `${info.operatingSystem || ''} ${info.osVersion || ''}`.trim() || 'Android/iOS';
        } catch (deviceError) {
          console.warn("No se pudo obtener información del dispositivo:", deviceError);
        }

        const hbRes = await fetch('/api/mobile/dispositivos/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            deviceId: currentDeviceId,
            nombre,
            modelo,
            sistemaOperativo
          })
        });
        const hbData = await hbRes.json();

        if (!hbData.authorized) {
          setIsAuthorized(false);
          setShowDeviceLinking(true);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error("Device check failed:", e);
      }
    }
    
    let redirectUrl = '/dashboard';
    
    // Detectar modo móvil/PWA en el cliente
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent) || window.innerWidth < 768;
    const isMobileMode = Capacitor.isNativePlatform() || isPWA || isMobileBrowser;

    if (isMobileMode) {
      if (['cobrador', 'vendedor', 'jefe_ventas', 'admin'].includes(userRole)) {
        redirectUrl = '/mobile/home';
      } else {
        redirectUrl = '/dashboard';
      }
    } else {
      if (userRole === 'cobrador') {
        redirectUrl = '/dashboard/cobranza-mobile';
      } else if (['vendedor', 'jefe_ventas'].includes(userRole)) {
        redirectUrl = '/dashboard';
      } else if (userRole === 'gestor_cobranza') {
        redirectUrl = '/dashboard/clientes';
      } else {
        redirectUrl = '/dashboard';
      }
    }

    window.location.href = redirectUrl;
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      {!Capacitor.isNativePlatform() && (
        <Link 
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group z-50"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium text-sm">Regresar al sitio</span>
        </Link>
      )}



      <div className="w-full max-w-md animate-fade-in relative">
        {!clientAccountStatus && (
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              {companyLogo ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-xl border-4 border-white/10">
                  <Image 
                    src={companyLogo} 
                    alt={companyName} 
                    fill 
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-xl border-4 border-white/10 bg-white/5 backdrop-blur-md">
                   <Image 
                    src="/icon-512x512.png" 
                    alt="VertexERP" 
                    fill 
                    className="object-contain p-2"
                  />
                </div>
              )}
            </div>
            {isConfigLoading ? (
              <div className="flex flex-col items-center space-y-2">
                <Skeleton className="h-8 w-64 bg-white/20" />
                <Skeleton className="h-4 w-48 bg-white/10" />
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-white mb-2 uppercase">{companyName || 'DASOPLUS'}</h1>
                <p className="text-blue-100 font-medium tracking-wide">VertexERP</p>
              </>
            )}
          </div>
        )}

        {clientAccountStatus ? (
          <ClientDashboard 
            accountStatus={clientAccountStatus} 
            onLogout={() => {
              setClientAccountStatus(null);
              setOtpStep(1);
              setPhone('');
              setOtpCode('');
            }} 
          />
        ) : showDeviceLinking ? (
          <Card className="shadow-2xl border-0 overflow-hidden border-t-4 border-amber-500">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8 text-amber-500" />
              </div>
              <CardTitle className="text-xl">Vincular Dispositivo</CardTitle>
              <CardDescription className="text-xs">
                Este equipo no está autorizado. Solicita un código al administrador para activarlo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ID del Dispositivo</p>
                <p className="text-xs font-mono text-slate-600 break-all">{deviceId}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase text-center block">Código de Activación</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="000000" 
                    value={deviceLinkOtp} 
                    onChange={(e) => setDeviceLinkOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                    className="h-14 pl-10 text-2xl font-black text-center tracking-[0.4em]" 
                  />
                </div>
              </div>

              <Button onClick={handleDeviceLink} className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold text-lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Activar Equipo Ahora'}
              </Button>

              <button 
                onClick={() => {
                   setShowDeviceLinking(false);
                   setIsLoading(false);
                   // Cerrar sesión para que pueda intentar con otro usuario si quiere
                   signOut({ redirect: false });
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-600"
              >
                Cancelar y cerrar sesión
              </button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-2xl border-0 overflow-hidden">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center gap-4 mb-4">
              <button 
                onClick={() => { setLoginMode('credentials'); setOtpStep(1); }}
                className={`text-sm font-bold pb-2 px-2 transition-all ${loginMode === 'credentials' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
              >
                Contraseña
              </button>
              <button 
                onClick={() => setLoginMode('otp')}
                className={`text-sm font-bold pb-2 px-2 transition-all ${loginMode === 'otp' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
              >
                WhatsApp OTP
              </button>
            </div>
            <CardTitle className="text-xl text-center">
              {loginMode === 'credentials' ? 'Iniciar Sesión' : 'Acceso por WhatsApp'}
            </CardTitle>
            <CardDescription className="text-center text-xs">
              {loginMode === 'credentials' ? 'Ingresa tus credenciales de empleado' : 'Accede usando tu teléfono registrado'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loginMode === 'credentials' ? (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
                  <Input type="email" placeholder="usuario@muebleria.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="h-11" />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={(c) => setRememberMe(c as boolean)} disabled={isLoading} />
                  <label htmlFor="remember-me" className="text-xs font-medium">Recordar inicio de sesión</label>
                </div>
                <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-bold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                {otpStep === 1 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Número de Teléfono</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          placeholder="5512345678" 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                          className="h-11 pl-10 text-lg font-bold tracking-widest" 
                        />
                      </div>
                    </div>
                    <Button onClick={handleOtpRequest} className="w-full h-11 bg-green-600 hover:bg-green-700 font-bold gap-2" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                      Recibir Código WhatsApp
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in zoom-in-95 duration-200">
                    <button onClick={() => setOtpStep(1)} className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-2">
                      <ArrowLeft className="h-3 w-3" /> Cambiar número
                    </button>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase text-center block">Código de 6 dígitos</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          placeholder="000000" 
                          value={otpCode} 
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                          className="h-14 pl-10 text-2xl font-black text-center tracking-[0.4em]" 
                        />
                      </div>
                    </div>
                    <Button onClick={handleOtpVerify} className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-bold" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar y Entrar'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        )}



        <div className="text-center mt-6">
          <div className="text-blue-200 text-[10px] uppercase tracking-widest mb-2">VertexERP - Gestión Inteligente</div>
          <VersionInfo showButton={false} />
        </div>
      </div>
    </div>
  );
}
