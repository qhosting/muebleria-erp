
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/ecommerce/LandingPage';


export const dynamic = 'force-dynamic';

const isCapacitor = process.env.BUILD_TARGET === 'capacitor';

export default async function HomePage() {
  if (isCapacitor) {
    return <LandingPage />;
  }

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

  console.log('No session, showing LandingPage');
  // Por defecto mostrar el Landing Page (Tienda)
  return <LandingPage />;
}
