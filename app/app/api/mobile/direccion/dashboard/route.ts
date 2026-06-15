import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'direccion' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // Lógica de ciclo semanal: Sábado a Viernes en horario de México (UTC-6)
    const nowUtc = new Date();
    const offsetMexico = -6 * 60 * 60 * 1000;
    const nowMexico = new Date(nowUtc.getTime() + offsetMexico);

    const inicioHoyMexico = new Date(nowMexico);
    inicioHoyMexico.setUTCHours(0, 0, 0, 0);
    const inicioHoy = new Date(inicioHoyMexico.getTime() - offsetMexico);

    const dayOfWeekMexico = nowMexico.getUTCDay();
    const diffToSaturday = (dayOfWeekMexico + 1) % 7; 
    const inicioCicloMexico = new Date(inicioHoyMexico);
    inicioCicloMexico.setUTCDate(inicioCicloMexico.getUTCDate() - diffToSaturday);
    const inicioCiclo = new Date(inicioCicloMexico.getTime() - offsetMexico);

    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const [
      cobradoHoy,
      clientesPendientesCount,
      ventasHoyResult,
      leadsActivosCount,
      recentPayments,
      recentLeads
    ] = await Promise.all([
      // 1. Total cobrado hoy (global)
      prisma.pago.aggregate({
        where: { fechaPago: { gte: inicioHoy } },
        _sum: { monto: true },
        _count: { id: true }
      }),
      // 2. Clientes pendientes global este ciclo
      prisma.cliente.count({
        where: {
          statusCuenta: 'activo',
          pagos: {
            none: {
              fechaPago: { gte: inicioCiclo },
              tipoPago: 'regular'
            }
          }
        }
      }),
      // 3. Ventas hoy global (clientes con fecha de venta hoy)
      prisma.cliente.aggregate({
        where: { fechaVenta: { gte: inicioHoy } },
        _sum: { montoPago: true },
        _count: { id: true }
      }),
      // 4. Leads activos global
      prisma.lead.count({
        where: { estado: { not: 'convertido' } }
      }),
      // 5. Pagos recientes
      prisma.pago.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: { select: { nombreCompleto: true } }
        }
      }),
      // 6. Leads recientes
      prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Calcular avance de presupuesto global para el mes
    const presupuestos = await prisma.presupuestoVenta.findMany({
      where: {
        fechaInicio: { lte: now },
        fechaFin: { gte: now }
      }
    });

    const metaTotal = presupuestos.reduce((acc, p) => acc + Number(p.metaMonto), 0);
    let logradoTotal = 0;
    if (metaTotal > 0) {
      const ventasMes = await prisma.cliente.aggregate({
        where: {
          fechaVenta: {
            gte: start,
            lte: end
          }
        },
        _sum: { montoPago: true }
      });
      logradoTotal = ventasMes._sum.montoPago ? Number(ventasMes._sum.montoPago) : 0;
    }

    const totalCobrado = cobradoHoy._sum.monto ? parseFloat(cobradoHoy._sum.monto.toString()) : 0;
    const cuentasCobradas = cobradoHoy._count.id || 0;
    const clientesPendientes = clientesPendientesCount || 0;

    const totalVentasHoy = ventasHoyResult._sum.montoPago ? parseFloat(ventasHoyResult._sum.montoPago.toString()) : 0;
    const countVentasHoy = ventasHoyResult._count.id || 0;

    return NextResponse.json({
      stats: {
        totalCobrado,
        cuentasCobradas,
        clientesPendientes,
        efectividad: (cuentasCobradas + clientesPendientes) > 0 
          ? Math.round((cuentasCobradas / (cuentasCobradas + clientesPendientes)) * 100) 
          : 100,
        ventasHoy: totalVentasHoy,
        countVentasHoy,
        leadsActivos: leadsActivosCount,
        metaAlcanzada: metaTotal > 0 ? Math.round((logradoTotal / metaTotal) * 100) : 100
      },
      recentPayments: recentPayments.map((p: any) => ({
        id: p.id,
        cliente: p.cliente?.nombreCompleto || 'Cliente Desconocido',
        monto: parseFloat(p.monto.toString()),
        fecha: p.fechaPago.toISOString()
      })),
      recentLeads: recentLeads.map((l: any) => ({
        id: l.id,
        nombre: l.nombre,
        interes: l.interes,
        estado: l.estado,
        fecha: l.createdAt.toISOString()
      }))
    });
  } catch (error: any) {
    console.error('Error en direccion dashboard API:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
