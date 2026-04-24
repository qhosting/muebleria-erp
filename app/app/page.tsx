const isCapacitor = process.env.BUILD_TARGET === 'capacitor';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import LandingPage from '@/components/ecommerce/LandingPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // Disable caching
  headers(); 
  
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
