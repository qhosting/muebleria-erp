
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Requerido para output: 'export' — en la app nativa las llamadas van a erp.mueblesdaso.com
export const dynamic = 'force-dynamic';
export function generateStaticParams() { return []; }

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
