
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { SmsDashboard } from '@/components/sms/sms-dashboard';

export default async function SmsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const userRole = (session?.user as any)?.role;
  if (!['admin', 'gestor_cobranza', 'reporte_cobranza'].includes(userRole)) {
    redirect('/dashboard');
  }

  return (
    <DashboardLayout>
      <SmsDashboard />
    </DashboardLayout>
  );
}
