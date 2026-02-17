
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { clienteId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Verificar que el cobrador tenga acceso al cliente
    const userRole = (session.user as any).role;
    if (userRole === 'cobrador') {
      const cliente = await prisma.cliente.findUnique({
        where: { id: params.clienteId },
        select: { cobradorAsignadoId: true },
      });

      if (cliente?.cobradorAsignadoId !== (session.user as any).id) {
        return NextResponse.json({ error: 'No tienes acceso a este cliente' }, { status: 403 });
      }
    }

    const pagos = await prisma.pago.findMany({
      where: { clienteId: params.clienteId },
      include: {
        cobrador: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { fechaPago: 'desc' },
      take: limit,
    });

    return NextResponse.json(pagos);
  } catch (error) {
    console.error('Error al obtener pagos del cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
