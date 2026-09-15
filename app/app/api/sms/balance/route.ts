
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLabsMobileBalance } from '@/lib/sms-utils';

// Conversión de créditos a pesos y cálculo de mensajes a $0.45 MNX:
// En la tarifa de México: 745.54 créditos equivalen a 2,672 SMS.
// Con costo de $0.45 por SMS, 745.54 créditos = $1,202.40 MXN => 1 crédito = $1.612788 MXN.
const PESOS_POR_CREDITO = (2672 * 0.45) / 745.54; // $1.612788 MXN por crédito
const COSTO_POR_SMS_MXN = 0.45; // $0.45 MNX por SMS

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Obtener balance de la API
    const apiResult = await getLabsMobileBalance();
    const rawCredits = Number(apiResult.balance) || 0;
    
    // 2. Conversión de créditos a monto en pesos (MXN)
    const montoEnPesos = Number((rawCredits * PESOS_POR_CREDITO).toFixed(2));
    
    // 3. Conteo de mensajes reales: Monto en Pesos / 0.45
    const smsDisponibles = Math.floor(montoEnPesos / COSTO_POR_SMS_MXN);
    
    // 4. Sincronizar tabla local SmsBalance con los SMS reales
    const localBalance = await prisma.smsBalance.upsert({
      where: { cuenta: 'DASO' },
      update: { saldo: smsDisponibles },
      create: { cuenta: 'DASO', saldo: smsDisponibles }
    });

    return NextResponse.json({
      localBalance: localBalance.saldo,
      smsDisponibles: smsDisponibles,
      montoEnPesos: montoEnPesos,
      saldoMxn: montoEnPesos,
      costoPorSmsMxn: COSTO_POR_SMS_MXN,
      apiBalance: smsDisponibles,
      error: apiResult.error
    });
  } catch (error) {
    // Si falla la conexión con la API, responder con el conteo local
    const local = await prisma.smsBalance.findUnique({ where: { cuenta: 'DASO' } });
    const localSms = local?.saldo || 0;
    const montoLocal = Number((localSms * COSTO_POR_SMS_MXN).toFixed(2));
    return NextResponse.json({ 
      localBalance: localSms,
      smsDisponibles: localSms,
      montoEnPesos: montoLocal,
      saldoMxn: montoLocal,
      costoPorSmsMxn: COSTO_POR_SMS_MXN,
      apiBalance: localSms,
      error: 'No se pudo sincronizar el saldo con el servidor de SMS' 
    });
  }
}
