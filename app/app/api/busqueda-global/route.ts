
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        clientes: [],
        usuarios: []
      });
    }

    // Buscar clientes
    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          { codigoCliente: { contains: query, mode: 'insensitive' } },
          { nombreCompleto: { contains: query, mode: 'insensitive' } },
          { telefono: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        cobradorAsignado: {
          select: {
            name: true
          }
        }
      },
      take: 10,
      orderBy: {
        nombreCompleto: 'asc'
      }
    });

    // Buscar usuarios (solo para admin y gestor)
    const user = session.user as any;
    let usuarios: any[] = [];
    if (user.role === 'admin' || user.role === 'gestor_cobranza') {
      usuarios = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true
        },
        take: 5
      });
    }

    return NextResponse.json({
      success: true,
      clientes: clientes.map((c: any) => ({
        id: c.id,
        codigoCliente: c.codigoCliente,
        nombreCompleto: c.nombreCompleto,
        telefono: c.telefono,
        saldoActual: c.saldoActual.toString(),
        statusCuenta: c.statusCuenta,
        cobrador: c.cobradorAsignado?.name
      })),
      usuarios
    });

  } catch (error: any) {
    console.error('Error en búsqueda global:', error);
    return NextResponse.json(
      { error: error.message || 'Error en búsqueda' },
      { status: 500 }
    );
  }
}
