import { redirect } from 'next/navigation';
import LandingPage from '@/components/ecommerce/LandingPage';

export const dynamic = 'force-dynamic';

const isCapacitor = process.env.BUILD_TARGET === 'capacitor';
const isCobradorMode = process.env.NEXT_PUBLIC_APP_MODE === 'cobrador';

export default async function HomePage() {
  // 🚀 En Capacitor / Modo Cobrador redirigir de inmediato sin usar Base de Datos ni Sesiones de Servidor
  if (isCapacitor || isCobradorMode) {
    redirect('/cobrador-app');
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

  // Si hay sesión activa, redirigir al área correspondiente
  if (session) {
    const userRole = (session.user as any)?.role;
    console.log('User session found, role:', userRole);
    const mobileRoles = ['cobrador', 'vendedor', 'jefe_ventas'];
    if (mobileRoles.includes(userRole)) {
      redirect('/cobrador-app');
    }
    redirect('/dashboard');
  }

  // Consultar configuración del sistema para ver si el landing page está habilitado
  const config = await prisma.configuracionSistema.findUnique({
    where: { clave: 'sistema' }
  });

  const empresaConfig = (config?.empresa as any) || {};
  const isLandingEnabled = empresaConfig.habilitarLandingPage !== false; // Por defecto true

  // Si no hay sesión y el landing está deshabilitado, redirigir a login
  if (!isLandingEnabled) {
    console.log('LandingPage disabled by config, redirecting to login');
    redirect('/login');
  }

  console.log('No session, showing LandingPage');
  // Por defecto mostrar el Landing Page (Tienda)
  return <LandingPage />;
}
