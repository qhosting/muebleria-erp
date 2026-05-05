
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const pagoId = params.id;

    // Obtener el pago antes de eliminarlo para saber el monto y el cliente
    const pago = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: { cliente: true }
    });

    if (!pago) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    // Ejecutar en una transacción
    await prisma.$transaction(async (tx) => {
      // 1. Si era un pago regular, devolver el saldo al cliente
      if (pago.tipoPago === 'regular') {
        await tx.cliente.update({
          where: { id: pago.clienteId },
          data: {
            saldoActual: {
              increment: pago.monto
            }
          }
        });
      }

      // 2. Eliminar el pago
      await tx.pago.delete({
        where: { id: pagoId }
      });
    });

    return NextResponse.json({ success: true, message: 'Pago cancelado y saldo restaurado' });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
