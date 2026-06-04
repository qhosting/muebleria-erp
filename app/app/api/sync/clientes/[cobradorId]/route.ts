
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
        descripcionProducto: true,
        vendedor: true,
        vendedorRel: { select: { name: true } },
        ocupacion: true,
        avalId: true,
        importe1: true,
        importe2: true,
        importe3: true,
        importe4: true,
        saldoVencido: true,
        diasVencidos: true,
        numContrato: true,
        codigoCliente: true,
        verificaciones: {
          select: {
            id: true
          }
        },
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

    // Transformar datos para formato offline de forma segura e impecable
    const clientesOffline = clientes.map((cliente: any) => {
      const montoPago = cliente.montoPago ? parseFloat(cliente.montoPago.toString()) : 0;
      const saldoActual = cliente.saldoActual ? parseFloat(cliente.saldoActual.toString()) : 0;
      const saldoVencido = cliente.saldoVencido ? parseFloat(cliente.saldoVencido.toString()) : 0;
      
      let fechaUltimoPago = null;
      if (cliente.pagos && cliente.pagos[0]?.fechaPago) {
        try {
          fechaUltimoPago = new Date(cliente.pagos[0].fechaPago).toISOString();
        } catch (e) {
          console.error("Error formatting payment date:", e);
        }
      }

      return {
        id: cliente.id,
        nombreCompleto: cliente.nombreCompleto || 'Sin nombre',
        telefono: cliente.telefono || '',
        direccion: cliente.direccionCompleta || 'Sin dirección',
        diaPago: cliente.diaPago || 'No especificado',
        montoAcordado: montoPago,
        saldoPendiente: saldoActual,
        saldoConsolidado: (cliente.telefono ? sumMap.get(cliente.telefono) : null) || saldoActual,
        fechaUltimoPago,
        statusCuenta: cliente.statusCuenta || 'activo',
        cobradorAsignadoId: cliente.cobradorAsignadoId,
        notas: null,
        saldoVencido: saldoVencido,
        diasVencidos: cliente.diasVencidos || 0,
        descripcionProducto: cliente.descripcionProducto || '',
        vendedorNombre: cliente.vendedor || cliente.vendedorRel?.name || 'No asignado',
        empleado: cliente.ocupacion || 'No especificado',
        aval: cliente.avalId || 'No asignado',
        montoCredito: cliente.importe1 ? Number(cliente.importe1) : 0,
        vendidoEn: cliente.importe2 ? Number(cliente.importe2) : 0,
        precios: {
          contado: cliente.importe1 ? Number(cliente.importe1) : 0,
          p6: cliente.importe3 ? Number(cliente.importe3) : 0,
          p12: cliente.importe4 ? Number(cliente.importe4) : 0
        },
        numContrato: cliente.numContrato || '',
        codigoCliente: cliente.codigoCliente || '',
        vdStatus: cliente.verificaciones && cliente.verificaciones.length > 0 ? 'REALIZADA' : 'PENDIENTE'
      };
    });

    return NextResponse.json(clientesOffline);

  } catch (error) {
    console.error('Error en sincronización de clientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
