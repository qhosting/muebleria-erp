
// API para sincronización de clientes offline
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

    // Verificar permisos - el cobrador solo puede ver sus clientes
    if (userRole === 'cobrador' && userId !== params.cobradorId) {
      return NextResponse.json({ error: 'No puedes sincronizar clientes de otros cobradores' }, { status: 403 });
    }

    // Managers pueden ver clientes de sus cobradores asignados
    if (userRole === 'manager') {
      const manager = await prisma.user.findUnique({
        where: { id: userId },
        include: { clientesAsignados: true }
      });

      const hasAccess = manager?.clientesAsignados.some((c: any) => c.cobradorAsignadoId === params.cobradorId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'No puedes sincronizar clientes de este cobrador' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const full = searchParams.get('full') === 'true';
    const lastSync = searchParams.get('lastSync');

    let whereClause: any = {
      cobradorAsignadoId: params.cobradorId,
      statusCuenta: 'activo'
    };

    // Si no es sincronización completa, solo traer cambios desde lastSync
    if (!full && lastSync) {
      whereClause.updatedAt = {
        gte: new Date(parseInt(lastSync))
      };
    }

    const clientes = await prisma.cliente.findMany({
      where: whereClause,
      select: {
        id: true,
        nombreCompleto: true,
        telefono: true,
        direccionCompleta: true,
        diaPago: true,
        montoPago: true,
        saldoActual: true,
        statusCuenta: true,
        cobradorAsignadoId: true,
        updatedAt: true,
        pagos: {
          select: {
            fechaPago: true,
            monto: true
          },
          orderBy: { fechaPago: 'desc' },
          take: 1
        }
      },
      orderBy: [
        { diaPago: 'asc' },
        { nombreCompleto: 'asc' }
      ]
    });

    // Obtener sumas consolidadas por teléfono para estos clientes
    const phones = clientes.map((c: any) => c.telefono).filter(Boolean);
    const consolidadoSums = await prisma.cliente.groupBy({
      by: ['telefono'],
      where: {
        telefono: { in: phones },
        statusCuenta: 'activo'
      },
      _sum: {
        saldoActual: true
      }
    });

    const sumMap = new Map(consolidadoSums.map((s: any) => [s.telefono, parseFloat(s._sum.saldoActual?.toString() || '0')]));

    // Transformar datos para formato offline
    const clientesOffline = clientes.map((cliente: any) => ({
      id: cliente.id,
      nombreCompleto: cliente.nombreCompleto,
      telefono: cliente.telefono,
      direccion: cliente.direccionCompleta,
      diaPago: cliente.diaPago,
      montoAcordado: parseFloat(cliente.montoPago.toString()),
      saldoPendiente: parseFloat(cliente.saldoActual.toString()),
      saldoConsolidado: sumMap.get(cliente.telefono) || parseFloat(cliente.saldoActual.toString()),
      fechaUltimoPago: cliente.pagos[0]?.fechaPago?.toISOString(),
      statusCuenta: cliente.statusCuenta,
      cobradorAsignadoId: cliente.cobradorAsignadoId,
      notas: null
    }));

    return NextResponse.json(clientesOffline);

  } catch (error) {
    console.error('Error en sincronización de clientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
