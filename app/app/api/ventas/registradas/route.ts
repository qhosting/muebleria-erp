import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const vendedorId = searchParams.get('vendedorId');

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    const where: any = {
      statusAprobacion: 'AUTORIZADO'
    };

    // Si el rol es vendedor, forzar a ver solo sus ventas registradas
    if (userRole === 'vendedor') {
      where.vendedorId = userId;
    } else if (vendedorId) {
      where.vendedorId = vendedorId;
    } else if (!await checkPermission(userRole, 'ventas')) {
      where.vendedorId = userId;
    }

    // Filtro de búsqueda por texto (nombre, contrato o código cliente)
    if (q) {
      where.OR = [
        { nombreCompleto: { contains: q, mode: 'insensitive' } },
        { numContrato: { contains: q, mode: 'insensitive' } },
        { codigoCliente: { contains: q, mode: 'insensitive' } },
        { vendedor: { contains: q, mode: 'insensitive' } }
      ];
    }

    const sales = await prisma.cliente.findMany({
      where,
      include: {
        vendedorRel: {
          select: {
            id: true,
            name: true,
            codigoGestor: true
          }
        }
      },
      orderBy: {
        fechaVenta: 'desc'
      }
    });

    return NextResponse.json(sales);
  } catch (error: any) {
    console.error('Error fetching registered sales:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
