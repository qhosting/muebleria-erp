
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLabsMobileBalance } from '@/lib/sms-utils';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Obtener balance real desde la API
    const apiResult = await getLabsMobileBalance();
    
    // 2. Sincronizar con la tabla local SmsBalance (cuenta DASO)
    const localBalance = await prisma.smsBalance.upsert({
      where: { cuenta: 'DASO' },
      update: { saldo: Math.floor(apiResult.balance) },
      create: { cuenta: 'DASO', saldo: Math.floor(apiResult.balance) }
    });

    return NextResponse.json({
      localBalance: localBalance.saldo,
      apiBalance: apiResult.balance,
      error: apiResult.error
    });
  } catch (error) {
    // Si falla la API, intentar devolver al menos el local
    const local = await prisma.smsBalance.findUnique({ where: { cuenta: 'DASO' } });
    return NextResponse.json({ 
      localBalance: local?.saldo || 0,
      error: 'Error syncing with LabsMobile API' 
    });
  }
}
