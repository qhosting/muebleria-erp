
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLabsMobileBalance } from '@/lib/sms-utils';

// Tasa de conversión oficial del proveedor para SMS estándar en México:
// 745.54 créditos equivalen exactamente a 2,672 SMS México (~0.27902 créditos por SMS)
const CREDITOS_POR_SMS_MEXICO = 745.54 / 2672;
const COSTO_POR_SMS_MXN = 0.45; // Costo por SMS para el ERP en Pesos Mexicanos (MNX)

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Obtener balance real de créditos desde la API
    const apiResult = await getLabsMobileBalance();
    const rawCredits = Number(apiResult.balance) || 0;
    
    // 2. Convertir créditos brutos a SMS disponibles para México
    const smsDisponibles = Math.floor(rawCredits / CREDITOS_POR_SMS_MEXICO);
    const saldoMxn = Number((smsDisponibles * COSTO_POR_SMS_MXN).toFixed(2));
    
    // 3. Sincronizar con la tabla local SmsBalance (cuenta DASO) en unidades reales de SMS
    const localBalance = await prisma.smsBalance.upsert({
      where: { cuenta: 'DASO' },
      update: { saldo: smsDisponibles },
      create: { cuenta: 'DASO', saldo: smsDisponibles }
    });

    return NextResponse.json({
      localBalance: localBalance.saldo,
      smsDisponibles: smsDisponibles,
      credits: Number(rawCredits.toFixed(2)),
      rawCredits: rawCredits,
      costoPorSmsMxn: COSTO_POR_SMS_MXN,
      saldoMxn: saldoMxn,
      apiBalance: smsDisponibles, // Conteo de SMS disponibles para retrocompatibilidad
      error: apiResult.error
    });
  } catch (error) {
    // Si falla la conexión con la API, responder con el conteo local
    const local = await prisma.smsBalance.findUnique({ where: { cuenta: 'DASO' } });
    const localSms = local?.saldo || 0;
    return NextResponse.json({ 
      localBalance: localSms,
      smsDisponibles: localSms,
      credits: Number((localSms * CREDITOS_POR_SMS_MEXICO).toFixed(2)),
      rawCredits: localSms * CREDITOS_POR_SMS_MEXICO,
      costoPorSmsMxn: COSTO_POR_SMS_MXN,
      saldoMxn: Number((localSms * COSTO_POR_SMS_MXN).toFixed(2)),
      apiBalance: localSms,
      error: 'No se pudo sincronizar el saldo con el proveedor de SMS' 
    });
  }
}
