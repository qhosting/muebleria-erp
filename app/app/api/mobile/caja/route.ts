
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== 'cobrador' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo para cobradores' }, { status: 403 });
    }

    const hoy = new Date();
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    // Obtener todos los pagos del día para este cobrador
    const pagos = await prisma.pago.findMany({
      where: {
        cobradorId: userId,
        fechaPago: { gte: inicioDia }
      },
      include: {
        cliente: {
          select: { nombreCompleto: true }
        }
      },
      orderBy: {
        fechaPago: 'desc'
      }
    });

    const efectivo = pagos
      .filter(p => p.metodoPago === 'gestor' || p.metodoPago === 'efectivo')
      .reduce((acc, p) => acc + parseFloat(p.monto.toString()), 0);

    const transferencia = pagos
      .filter(p => p.metodoPago === 'transferencia' || p.metodoPago === 'banco')
      .reduce((acc, p) => acc + parseFloat(p.monto.toString()), 0);

    return NextResponse.json({
      stats: {
        cobradoHoy: efectivo + transferencia,
        pagosRegistrados: pagos.length,
        efectivo,
        transferencia
      },
      pagos: pagos.map(p => ({
        id: p.id,
        cliente: p.cliente.nombreCompleto,
        monto: parseFloat(p.monto.toString()),
        hora: new Date(p.fechaPago).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metodo: p.metodoPago
      }))
    });

  } catch (error) {
    console.error('Error al obtener caja de cobrador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
