
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
    const codigoCliente = searchParams.get('codigoCliente');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!codigoCliente) {
      return NextResponse.json(
        { error: 'Código de cliente requerido' },
        { status: 400 }
      );
    }

    // Buscar el cliente
    const cliente = await prisma.cliente.findUnique({
      where: { codigoCliente }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener historial de ajustes y pagos
    const historial = await prisma.pago.findMany({
      where: {
        clienteId: cliente.id,
        metodoPago: 'ajuste'
      },
      include: {
        cobrador: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        fechaPago: 'desc'
      },
      take: limit
    });

    return NextResponse.json({
      success: true,
      cliente: {
        codigoCliente: cliente.codigoCliente,
        nombreCompleto: cliente.nombreCompleto,
        saldoActual: cliente.saldoActual.toString()
      },
      historial: historial.map((h: any) => ({
        id: h.id,
        fecha: h.fechaPago,
        saldoAnterior: h.saldoAnterior.toString(),
        saldoNuevo: h.saldoNuevo.toString(),
        diferencia: h.monto.toString(),
        motivo: h.concepto,
        realizadoPor: h.cobrador.name
      }))
    });

  } catch (error: any) {
    console.error('Error al obtener historial:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener historial' },
      { status: 500 }
    );
  }
}
