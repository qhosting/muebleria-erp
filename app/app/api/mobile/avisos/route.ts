import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { clienteId, monto, saldoVencido, tipo } = await req.json();

    const aviso = await (prisma as any).avisoCobro.create({
      data: {
        clienteId,
        userId: (session.user as any).id,
        monto,
        saldoVencido,
        tipo: tipo || 'IMPRESO',
      },
    });

    return NextResponse.json({ success: true, aviso });
  } catch (error) {
    console.error('Error al registrar aviso de cobro:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get('clienteId');

    const avisos = await (prisma as any).avisoCobro.findMany({
      where: clienteId ? { clienteId } : { userId: (session.user as any).id },
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: {
          select: {
            nombreCompleto: true,
          },
        },
      },
    });

    return NextResponse.json({ avisos });
  } catch (error) {
    console.error('Error al obtener avisos de cobro:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
