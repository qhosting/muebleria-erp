const isCapacitor = process.env.BUILD_TARGET === 'capacitor';




import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginForm from './login-form';

export default async function LoginPage() {
  if (isCapacitor) {
    return <LoginForm />;
  }

  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return <LoginForm />;
}
