const isCapacitor = process.env.BUILD_TARGET === 'capacitor';

export const dynamic = isCapacitor ? 'force-static' : 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/ecommerce/LandingPage';

export default async function HomePage() {
  if (isCapacitor) {
    redirect('/login');
  }

  const session = await getServerSession(authOptions);

  if (session) {
    const userRole = (session.user as any)?.role;
    if (userRole === 'cobrador') {
      redirect('/cobrador-app');
    }
    redirect('/dashboard');
  }

  return <LandingPage />;
}
