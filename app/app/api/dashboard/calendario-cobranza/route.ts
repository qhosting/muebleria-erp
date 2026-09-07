import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calcularRangoSemanaSabadoViernes } from '@/lib/calendario-cobranza-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const anio = searchParams.get('anio');

    const db = prisma as any;
    const whereClause = anio ? { anio: parseInt(anio) } : {};

    const calendarios = await db.calendarioCobranza.findMany({
      where: whereClause,
      orderBy: [
        { anio: 'desc' },
        { semana: 'asc' }
      ]
    });

    return NextResponse.json(calendarios);
  } catch (error: any) {
    console.error('Error fetching calendarios:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin', 'jefe_ventas', 'direccion'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { anio, semana, periodicidadesActivas } = body;

    if (!anio || !semana || !periodicidadesActivas) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const anioNum = parseInt(anio, 10);
    const semanaNum = parseInt(semana, 10);
    const rango = calcularRangoSemanaSabadoViernes(semanaNum, anioNum);

    const fInicio = body.fechaInicio ? new Date(body.fechaInicio) : rango.inicio;
    const fFin = body.fechaFin ? new Date(body.fechaFin) : rango.fin;

    const db = prisma as any;
    
    // Upsert the calendar week
    const calendario = await db.calendarioCobranza.upsert({
      where: {
        anio_semana: {
          anio: anioNum,
          semana: semanaNum
        }
      },
      update: {
        fechaInicio: fInicio,
        fechaFin: fFin,
        periodicidadesActivas
      },
      create: {
        anio: anioNum,
        semana: semanaNum,
        fechaInicio: fInicio,
        fechaFin: fFin,
        periodicidadesActivas
      }
    });

    return NextResponse.json(calendario);
  } catch (error: any) {
    console.error('Error saving calendario:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
