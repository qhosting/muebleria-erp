
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      hasSession: !!session,
      user: session?.user || null,
      role: (session?.user as any)?.role || null,
      isAdmin: (session?.user as any)?.role === 'admin',
      cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
