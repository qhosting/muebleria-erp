
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== 'cobrador' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo para cobradores' }, { status: 403 });
    }

    let inicioRango: Date;
    let finRango: Date;

    if (fromParam && toParam) {
      inicioRango = new Date(fromParam);
      finRango = new Date(toParam);
    } else {
      const hoy = new Date();
      const day = hoy.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
      
      let daysToSubtract = 0;
      if (day === 6) {
        daysToSubtract = 0;
      } else {
        daysToSubtract = day + 1;
      }
      
      let daysToAdd = 0;
      if (day === 6) {
        daysToAdd = 6;
      } else {
        daysToAdd = 5 - day;
      }
      
      inicioRango = new Date(hoy);
      inicioRango.setDate(hoy.getDate() - daysToSubtract);
      inicioRango.setHours(0, 0, 0, 0);
      
      finRango = new Date(hoy);
      finRango.setDate(hoy.getDate() + daysToAdd);
      finRango.setHours(23, 59, 59, 999);
    }

    // Obtener todos los pagos del rango para este cobrador
    const pagos = await prisma.pago.findMany({
      where: {
        cobradorId: userId,
        fechaPago: { 
          gte: inicioRango,
          lte: finRango
        }
      },
      include: {
        cliente: {
          select: { 
            nombreCompleto: true,
            codigoCliente: true
          }
        }
      },
      orderBy: {
        fechaPago: 'desc'
      }
    });

    const normalize = (s: string) => (s || '').toLowerCase().trim();

    const pagosEfectivo = pagos.filter(p => {
      const m = normalize(p.metodoPago);
      return m === 'gestor' || m === 'efectivo' || m === 'contado';
    });
    const efectivo = pagosEfectivo.reduce((acc, p) => acc + parseFloat(p.monto.toString()), 0);
    const cuentasEfectivo = new Set(pagosEfectivo.map(p => p.clienteId)).size;

    const pagosBancarioManual = pagos.filter(p => {
      const m = normalize(p.metodoPago);
      return m === 'bancario' || m === 'transferencia' || m === 'deposito';
    });
    const bancarioManual = pagosBancarioManual.reduce((acc, p) => acc + parseFloat(p.monto.toString()), 0);
    const cuentasBancarioManual = new Set(pagosBancarioManual.map(p => p.clienteId)).size;

    const pagosBancarioBot = pagos.filter(p => {
      const m = normalize(p.metodoPago);
      return m === 'bancario_bot' || m === 'bot' || m === 'whatsapp' || m === 'bancos bot' || m === 'bancos_bot';
    });
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
        codigoCliente: p.cliente.codigoCliente,
        monto: parseFloat(p.monto.toString()),
        interesMoratorio: parseFloat(p.interesMoratorio.toString()) || 0,
        gastosCobranza: parseFloat(p.gastosCobranza.toString()) || 0,
        fecha: new Date(p.fechaPago).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora: new Date(p.fechaPago).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metodo: p.metodoPago
      }))
    });

  } catch (error) {
    console.error('Error al obtener caja de cobrador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
