
// API para manejo de motararios (razones de no cobro)
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== 'cobrador' && userRole !== 'manager' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos para registrar motararios' }, { status: 403 });
    }

    const body = await request.json();
    const {
      clienteId,
      motivo,
      descripcion,
      fecha,
      proximaVisita,
      localId
    } = body;

    // Validar datos requeridos
    if (!clienteId || !motivo || !descripcion || !fecha) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Verificar que el cliente existe y el cobrador tiene acceso
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Si es cobrador, verificar que le pertenece el cliente
    if (userRole === 'cobrador' && cliente.cobradorAsignadoId !== userId) {
      return NextResponse.json({ error: 'No tienes acceso a este cliente' }, { status: 403 });
    }

    // Verificar que el cliente tenga cobrador asignado
    if (!cliente.cobradorAsignadoId) {
      return NextResponse.json({ error: 'Cliente sin cobrador asignado' }, { status: 400 });
    }

    // Crear el motarario
    const motarario = await prisma.motarario.create({
      data: {
        clienteId,
        cobradorId: cliente.cobradorAsignadoId,
        motivo,
        descripcion,
        fecha: new Date(fecha),
        proximaVisita: proximaVisita ? new Date(proximaVisita) : undefined,
        localId: localId || undefined
      }
    });

    return NextResponse.json(motarario);

  } catch (error) {
    console.error('Error creando motarario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');
    const cobradorId = searchParams.get('cobradorId');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    let whereClause: any = {};

    // Aplicar filtros
    if (clienteId) {
      whereClause.clienteId = clienteId;
    }

    if (cobradorId) {
      whereClause.cobradorId = cobradorId;
    }

    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin)
      };
    }

    // Filtrar por permisos
    if (userRole === 'cobrador') {
      whereClause.cobradorId = userId;
    } else if (userRole === 'manager') {
      // Managers solo ven motararios de sus cobradores asignados
      const manager = await prisma.user.findUnique({
        where: { id: userId },
        include: { clientesAsignados: true }
      });

      if (manager?.clientesAsignados) {
        const cobradorIds = manager.clientesAsignados.map((c: any) => c.cobradorAsignadoId).filter(Boolean);
        whereClause.cobradorId = { in: cobradorIds };
      }
    }

    const motararios = await prisma.motarario.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            nombreCompleto: true,
            telefono: true
          }
        },
        cobrador: {
          select: {
            name: true
          }
        }
      },
      orderBy: { fecha: 'desc' }
    });

    return NextResponse.json(motararios);

  } catch (error) {
    console.error('Error obteniendo motararios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
