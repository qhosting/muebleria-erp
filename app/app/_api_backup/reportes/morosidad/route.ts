
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
    const cobradorId = searchParams.get('cobradorId');

    const where: any = {
      statusCuenta: 'activo',
      saldoVencido: { gt: 0 }
    };

    if (cobradorId && cobradorId !== 'all') {
      where.cobradorAsignadoId = cobradorId;
    }

    const clientesMorosos = await prisma.cliente.findMany({
      where,
      select: {
        id: true,
        codigoCliente: true,
        nombreCompleto: true,
        saldoActual: true,
        saldoVencido: true,
        diasVencidos: true,
        periodicidad: true,
        cobradorAsignado: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        diasVencidos: 'desc'
      }
    });

    // Definición de bloques
    const bloques = {
      '1-7': { clientes: 0, monto: 0 },
      '8-15': { clientes: 0, monto: 0 },
      '16-30': { clientes: 0, monto: 0 },
      '31-60': { clientes: 0, monto: 0 },
      '61-90': { clientes: 0, monto: 0 },
      '90+': { clientes: 0, monto: 0 }
    };

    let totalSaldoVencido = 0;

    clientesMorosos.forEach(c => {
      const dias = c.diasVencidos;
      const monto = Number(c.saldoVencido);
      totalSaldoVencido += monto;

      if (dias >= 1 && dias <= 7) {
        bloques['1-7'].clientes++;
        bloques['1-7'].monto += monto;
      } else if (dias >= 8 && dias <= 15) {
        bloques['8-15'].clientes++;
        bloques['8-15'].monto += monto;
      } else if (dias >= 16 && dias <= 30) {
        bloques['16-30'].clientes++;
        bloques['16-30'].monto += monto;
      } else if (dias >= 31 && dias <= 60) {
        bloques['31-60'].clientes++;
        bloques['31-60'].monto += monto;
      } else if (dias >= 61 && dias <= 90) {
        bloques['61-90'].clientes++;
        bloques['61-90'].monto += monto;
      } else if (dias > 90) {
        bloques['90+'].clientes++;
        bloques['90+'].monto += monto;
      }
    });

    return NextResponse.json({
      resumen: {
        totalClientes: clientesMorosos.length,
        totalSaldoVencido
      },
      bloques,
      detalle: clientesMorosos
    });

  } catch (error) {
    console.error('Error en reporte de morosidad:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
