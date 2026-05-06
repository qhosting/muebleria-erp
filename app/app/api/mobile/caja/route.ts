
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

    const pagosEfectivo = pagos.filter(p => p.metodoPago === 'gestor' || p.metodoPago === 'efectivo');
    const efectivo = pagosEfectivo.reduce((acc, p) => acc + parseFloat(p.monto.toString()), 0);
    const cuentasEfectivo = new Set(pagosEfectivo.map(p => p.clienteId)).size;

    const pagosBancarioManual = pagos.filter(p => p.metodoPago === 'bancario' || p.metodoPago === 'transferencia');
    const bancarioManual = pagosBancarioManual.reduce((acc, p) => acc + parseFloat(p.monto.toString()), 0);
    const cuentasBancarioManual = new Set(pagosBancarioManual.map(p => p.clienteId)).size;

    const pagosBancarioBot = pagos.filter(p => p.metodoPago === 'bancario_bot' || p.metodoPago === 'bot');
    const bancarioBot = pagosBancarioBot.reduce((acc, p) => acc + parseFloat(p.monto.toString()), 0);
    const cuentasBancarioBot = new Set(pagosBancarioBot.map(p => p.clienteId)).size;

    const cuentasTotales = new Set(pagos.map(p => p.clienteId)).size;

    return NextResponse.json({
      stats: {
        cobradoHoy: efectivo + bancarioManual + bancarioBot,
        pagosRegistrados: pagos.length,
        cuentasTotales,
        efectivo,
        cuentasEfectivo,
        bancarioManual,
        cuentasBancarioManual,
        bancarioBot,
        cuentasBancarioBot
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
