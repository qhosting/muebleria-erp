const isCapacitor = process.env.BUILD_TARGET === 'capacitor';

export const dynamic = isCapacitor ? 'force-static' : 'force-dynamic';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  if (isCapacitor) {
    return <DashboardClient session={null} />;
  }

  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return <DashboardClient session={session} />;
}
