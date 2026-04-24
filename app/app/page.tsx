
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/ecommerce/LandingPage';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Si hay sesión activa, redirigir al área correspondiente
  if (session) {
    const userRole = (session.user as any)?.role;
    if (userRole === 'cobrador') {
      redirect('/cobrador-app');
    }
    redirect('/dashboard');
  }

  // Por defecto mostrar el Landing Page (Tienda)
  return <LandingPage />;
}
