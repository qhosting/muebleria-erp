import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    const { anio, semana, fechaInicio, fechaFin, periodicidadesActivas } = body;

    if (!anio || !semana || !fechaInicio || !fechaFin || !periodicidadesActivas) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const db = prisma as any;
    
    // Upsert the calendar week
    const calendario = await db.calendarioCobranza.upsert({
      where: {
        anio_semana: {
          anio: parseInt(anio),
          semana: parseInt(semana)
        }
      },
      update: {
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        periodicidadesActivas
      },
      create: {
        anio: parseInt(anio),
        semana: parseInt(semana),
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        periodicidadesActivas
      }
    });

    return NextResponse.json(calendario);
  } catch (error: any) {
    console.error('Error saving calendario:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
