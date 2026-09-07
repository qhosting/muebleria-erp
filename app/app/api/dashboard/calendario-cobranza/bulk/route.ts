import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calcularRangoSemanaSabadoViernes } from '@/lib/calendario-cobranza-utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'jefe_ventas', 'direccion'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { anio, semanas } = body;

    if (!anio || !semanas || !Array.isArray(semanas)) {
      return NextResponse.json({ error: 'Faltan campos requeridos o formato inválido' }, { status: 400 });
    }

    const db = prisma as any;

    const results = [];
    for (const s of semanas) {
      const semanaNum = parseInt(s.semana);
      if (isNaN(semanaNum) || semanaNum < 1 || semanaNum > 54) continue;

      const rango = calcularRangoSemanaSabadoViernes(semanaNum, parseInt(anio));
      const inicio = rango.inicio;
      const fin = rango.fin;
      
      const periodicidades = Array.isArray(s.periodicidades) 
        ? s.periodicidades 
        : (s.periodicidades?.toString().split(',').map((p: string) => p.trim().toLowerCase()) || []);

      const cal = await db.calendarioCobranza.upsert({
        where: {
          anio_semana: {
            anio: parseInt(anio),
            semana: semanaNum
          }
        },
        update: {
          fechaInicio: inicio,
          fechaFin: fin,
          periodicidadesActivas: periodicidades
        },
        create: {
          anio: parseInt(anio),
          semana: semanaNum,
          fechaInicio: inicio,
          fechaFin: fin,
          periodicidadesActivas: periodicidades
        }
      });
      results.push(cal);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error('Error in bulk calendar import:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
