
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/ecommerce/LandingPage';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';

const isCapacitor = process.env.BUILD_TARGET === 'capacitor';

export default async function HomePage() {
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
    if (userRole === 'cobrador') {
      redirect('/cobrador-app');
    }
    redirect('/dashboard');
  }

  // 🚀 MODO COBRADOR: Si la app está compilada específicamente para cobradores,
  // redirigir al entry-point de cobrador (el cual manejará el login si no hay sesión)
  if (process.env.NEXT_PUBLIC_APP_MODE === 'cobrador') {
    redirect('/cobrador-app');
  }

  if (isCapacitor) {
    return <LandingPage />;
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
