import LandingPage from '@/components/ecommerce/LandingPage';
import LoginForm from './login/login-form';

export const dynamic = 'force-dynamic';

const isCapacitor = process.env.BUILD_TARGET === 'capacitor';
const isCobradorMode = process.env.NEXT_PUBLIC_APP_MODE === 'cobrador';

export default async function HomePage() {
  // 🚀 En Capacitor / Modo Cobrador redirigir de inmediato sin usar Base de Datos ni Sesiones de Servidor
  if (isCapacitor || isCobradorMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <meta httpEquiv="refresh" content="0;url=/cobrador-app" />
        <script dangerouslySetInnerHTML={{ __html: `window.location.replace('/cobrador-app');` }} />
        <p className="text-sm text-slate-400">Cargando aplicación móvil...</p>
      </div>
    );
  }

  // Importar dinámicamente dependencias de servidor para evitar bails en build estático
  const { getServerSession } = await import('next-auth');
  const { authOptions } = await import('@/lib/auth');
  const { prisma } = await import('@/lib/db');

  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error('Error fetching session:', error);
  }

  // Si hay sesión activa, redirigir al área correspondiente de forma segura
  if (session) {
    const userRole = (session.user as any)?.role;
    const mobileRoles = ['cobrador', 'vendedor', 'jefe_ventas'];
    const target = mobileRoles.includes(userRole) ? '/cobrador-app' : '/dashboard';
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <meta httpEquiv="refresh" content={`0;url=${target}`} />
        <script dangerouslySetInnerHTML={{ __html: `window.location.replace('${target}');` }} />
        <p className="text-sm text-slate-400">Redirigiendo a tu panel...</p>
      </div>
    );
  }

  // Consultar configuración del sistema para ver si el landing page está habilitado
  let isLandingEnabled = true;
  try {
    const config = await prisma.configuracionSistema.findUnique({
      where: { clave: 'sistema' }
    });
    const empresaConfig = (config?.empresa as any) || {};
    isLandingEnabled = empresaConfig.habilitarLandingPage !== false;
  } catch (error) {
    console.error('Error reading configuracionSistema:', error);
  }

  // Si no hay sesión y el landing está deshabilitado, renderizar directamente el formulario de Login
  // Esto evita la excepción de Next.js NEXT_REDIRECT en renderizado streaming ('digest' of null)
  if (!isLandingEnabled) {
    return <LoginForm />;
  }

  // Por defecto mostrar el Landing Page (Tienda)
  return <LandingPage />;
}
