
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { dia: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cobradorId = searchParams.get('cobradorId');

    const where: any = {
      diaPago: params.dia,
      statusCuenta: 'activo',
    };

    const userRole = (session.user as any).role;
    if (userRole === 'cobrador') {
      where.cobradorAsignadoId = (session.user as any).id;
    } else if (cobradorId) {
      where.cobradorAsignadoId = cobradorId;
    }

    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        cobradorAsignado: {
          select: {
            id: true,
            name: true,
          },
        },
        pagos: {
          orderBy: { fechaPago: 'desc' },
          take: 3,
        },
      },
      orderBy: { nombreCompleto: 'asc' },
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes por día:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
