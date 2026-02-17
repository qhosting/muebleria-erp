
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { cobradorId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Verificar permisos
    if (userRole === 'cobrador' && userId !== params.cobradorId) {
      return NextResponse.json({ error: 'No puedes ver clientes de otros cobradores' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const diaPago = searchParams.get('diaPago');
    const statusCuenta = searchParams.get('statusCuenta') || 'activo';

    const where: any = {
      cobradorAsignadoId: params.cobradorId,
      statusCuenta,
    };

    if (diaPago) {
      where.diaPago = diaPago;
    }

    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        pagos: {
          orderBy: { fechaPago: 'desc' },
          take: 1,
        },
      },
      orderBy: { nombreCompleto: 'asc' },
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes del cobrador:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
