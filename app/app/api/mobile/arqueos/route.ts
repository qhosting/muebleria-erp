import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { sistema, fisico, diferencia, observaciones } = body;

    const arqueo = await (prisma as any).arqueo.create({
      data: {
        cobradorId: userId,
        montoSistema: sistema,
        montoFisico: fisico,
        diferencia: diferencia,
        observaciones: observaciones || 'Arqueo de caja móvil'
      }
    });

    return NextResponse.json(arqueo);

  } catch (error) {
    console.error('Error al guardar arqueo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
