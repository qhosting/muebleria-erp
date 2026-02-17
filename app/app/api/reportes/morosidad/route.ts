
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calcularDiasAtraso } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['admin', 'gestor_cobranza', 'reporte_cobranza'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cobradorId = searchParams.get('cobradorId');
    const diasAtraso = parseInt(searchParams.get('diasAtraso') || '0');

    // Obtener clientes con saldos pendientes
    const where: any = {
      statusCuenta: 'activo',
      saldoActual: { gt: 0 },
    };

    if (cobradorId) {
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
          where: { tipoPago: 'regular' },
          orderBy: { fechaPago: 'desc' },
          take: 1,
        },
      },
    });

    // Calcular días de atraso para cada cliente
    const clientesMorosos = clientes
      .map((cliente: any) => {
        const ultimoPago = cliente.pagos[0];
        const fechaUltimoPago = ultimoPago ? ultimoPago.fechaPago : cliente.fechaVenta;
        const diasAtrasoCalculados = calcularDiasAtraso(fechaUltimoPago, cliente.periodicidad);

        return {
          id: cliente.id,
          codigoCliente: cliente.codigoCliente,
          nombreCompleto: cliente.nombreCompleto,
          telefono: cliente.telefono,
          direccionCompleta: cliente.direccionCompleta,
          saldoActual: Number(cliente.saldoActual),
          montoPago: Number(cliente.montoPago),
          periodicidad: cliente.periodicidad,
          diaPago: cliente.diaPago,
          diasAtraso: diasAtrasoCalculados,
          ultimoPago: ultimoPago?.fechaPago?.toISOString() || null,
          cobrador: {
            name: cliente.cobradorAsignado?.name || 'Sin asignar',
          },
          cobradorId: cliente.cobradorAsignado?.id,
        };
      })
      .filter((cliente: any) => cliente.diasAtraso >= diasAtraso)
      .sort((a: any, b: any) => b.diasAtraso - a.diasAtraso);

    // Estadísticas de morosidad
    const totalMorosos = clientesMorosos.length;
    const totalDeudaMorosa = clientesMorosos.reduce((sum: any, c: any) => sum + c.saldoActual, 0);
    const promedioAtraso = totalMorosos > 0 
      ? Math.round(clientesMorosos.reduce((sum: any, c: any) => sum + c.diasAtraso, 0) / totalMorosos)
      : 0;

    // Morosidad por cobrador
    const morosidadPorCobrador = await prisma.user.findMany({
      where: { role: 'cobrador', isActive: true },
      select: {
        id: true,
        name: true,
        clientesAsignados: {
          where: {
            statusCuenta: 'activo',
            saldoActual: { gt: 0 },
          },
          select: {
            saldoActual: true,
          },
        },
      },
    });

    const reporteCobrador = morosidadPorCobrador.map((cobrador: any) => {
      const clientesMorososCobrador = clientesMorosos.filter((c: any) => c.cobradorId === cobrador.id);
      return {
        cobrador: cobrador.name,
        clientesMorosos: clientesMorososCobrador.length,
        totalDeuda: clientesMorososCobrador.reduce((sum: any, c: any) => sum + c.saldoActual, 0),
      };
    });

    return NextResponse.json({
      totalMorosos,
      totalDeudaMorosa,
      promedioAtraso,
      clientesMorosos,
      morosidadPorCobrador: reporteCobrador,
    });
  } catch (error) {
    console.error('Error al generar reporte de morosidad:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
