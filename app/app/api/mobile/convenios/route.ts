import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const convenios = await (prisma as any).convenioPago.findMany({
      where: {
        gestorId: (session.user as any).id,
        status: 'PENDIENTE',
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombreCompleto: true,
            codigoCliente: true,
            telefono: true,
          },
        },
      },
      orderBy: {
        fecha: 'asc',
      },
    });

    return NextResponse.json({ convenios });
  } catch (error) {
    console.error('Error al obtener convenios móviles:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
