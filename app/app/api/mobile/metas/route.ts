import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, format, startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = ((session.user as any).role || '').toLowerCase();
    const isVendedor = ['vendedor', 'jefe_ventas'].includes(userRole);

    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);
    const startMes = startOfMonth(today);
    const endMes = endOfMonth(today);

    if (isVendedor) {
      // ---------------------------------
      // LÓGICA DE VENDEDOR
      // ---------------------------------
      
      // Buscar presupuesto del mes actual
      const db = prisma as any;
      const presupuesto = await db.presupuestoVenta.findFirst({
        where: {
          vendedorId: userId,
          fechaInicio: { lte: today },
          fechaFin: { gte: today }
        }
      });

      // Si no tiene presupuesto, usar metas universales
      const metaMontoMes = presupuesto ? Number(presupuesto.metaMonto) : 30000;
      const metaLeadsDia = presupuesto ? (Number(presupuesto.metaLeads) > 0 ? Math.ceil(Number(presupuesto.metaLeads) / 30) : 1) : 2;

      // Ventas del mes (clientes creados este mes)
      const ventasMesRecords = await db.cliente.findMany({
        where: {
          vendedorId: userId,
          fechaVenta: { gte: startMes, lte: endMes }
        },
        select: { saldoActual: true }
      });
      const ventasMesMonto = ventasMesRecords.reduce((acc: number, c: any) => acc + Number(c.saldoActual || 0), 0);

      // Leads del día
      const leadsHoyCount = await db.lead.count({
        where: {
          vendedorId: userId,
          createdAt: { gte: start, lte: end }
        }
      });

      // Ranking de Ventas del mes (Top 5 vendedores)
      const rankingVendedores = await db.cliente.groupBy({
        by: ['vendedorId'],
        where: {
          fechaVenta: { gte: startMes, lte: endMes },
          vendedorId: { not: null }
        },
        _sum: { saldoActual: true },
        orderBy: { _sum: { saldoActual: 'desc' } },
        take: 5,
      });

      const rankingConNombres = await Promise.all(rankingVendedores.map(async (item: any, index: number) => {
        const user = await db.user.findUnique({
            where: { id: item.vendedorId },
            select: { name: true }
        });
        return {
            pos: index + 1,
            nombre: user?.name || 'Vendedor',
            monto: Number(item._sum.saldoActual),
            isMe: item.vendedorId === userId
        };
      }));

      // Gamificación
      const totalHistorico = await db.cliente.aggregate({
        where: { vendedorId: userId },
        _sum: { saldoActual: true },
      });
      const montoAcumulado = Number(totalHistorico._sum.saldoActual || 0);
      const nivel = Math.floor(montoAcumulado / 50000) + 1;
      const xpSiguienteNivel = 50000;
      const xpActual = montoAcumulado % 50000;

      const porcentajePrincipal = metaMontoMes > 0 ? Math.min(Math.round((ventasMesMonto / metaMontoMes) * 100), 100) : 100;
      const porcentajeSecundario = metaLeadsDia > 0 ? Math.min(Math.round((leadsHoyCount / metaLeadsDia) * 100), 100) : 100;

      return NextResponse.json({
        metas: {
          tituloPrincipal: "Ventas del Mes",
          tituloSecundario: "Leads del Día",
          valorPrincipal: ventasMesMonto,
          metaPrincipal: metaMontoMes,
          valorSecundario: leadsHoyCount,
          metaSecundaria: metaLeadsDia,
          porcentajeMonto: porcentajePrincipal,
          porcentajeVisitas: porcentajeSecundario,
        },
        gamificacion: {
          nivel,
          xpActual,
          xpSiguienteNivel,
          montoAcumulado,
          rango: nivel < 5 ? 'Bronce' : nivel < 10 ? 'Plata' : nivel < 20 ? 'Oro' : 'Diamante',
        },
        ranking: rankingConNombres
      });

    } else {
      // ---------------------------------
      // LÓGICA DE COBRADOR
      // ---------------------------------
      
      const db = prisma as any;
      // 1. Cobrado Hoy
      const pagosHoy = await db.pago.findMany({
        where: {
          cobradorId: userId,
          fechaPago: { gte: start, lte: end },
        },
        select: { monto: true },
      });
      const cobradoHoy = pagosHoy.reduce((acc: number, p: any) => acc + Number(p.monto), 0);

      // 2. Clientes para Hoy
      const diasSemana = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
      const diaHoyNombre = diasSemana[today.getDay()];

      const clientesHoy = await db.cliente.findMany({
        where: {
          cobradorAsignadoId: userId,
          diaPago: diaHoyNombre,
          statusCuenta: 'activo',
        },
      });

      // Metas Reales (sin fallbacks inventados)
      const metaMontoHoy = clientesHoy.reduce((acc: number, c: any) => acc + Number(c.montoPago), 0); 
      const totalClientesHoy = clientesHoy.length;

      // 3. Visitas Hoy
      const motarariosHoy = await db.motarario.count({
        where: {
          cobradorId: userId,
          fecha: { gte: start, lte: end },
        },
      });
      const visitasHoy = motarariosHoy + pagosHoy.length;

      // 4. Gamificación
      const totalHistorico = await db.pago.aggregate({
        where: { cobradorId: userId },
        _sum: { monto: true },
      });
      const montoAcumulado = Number(totalHistorico._sum.monto || 0);
      const nivel = Math.floor(montoAcumulado / 25000) + 1;
      const xpSiguienteNivel = 25000;
      const xpActual = montoAcumulado % 25000;

      // 5. Ranking
      const rankingCobradores = await db.pago.groupBy({
        by: ['cobradorId'],
        where: { fechaPago: { gte: startMes } },
        _sum: { monto: true },
        orderBy: { _sum: { monto: 'desc' } },
        take: 5,
      });

      const rankingConNombres = await Promise.all(rankingCobradores.map(async (item: any, index: number) => {
          const user = await db.user.findUnique({
              where: { id: item.cobradorId },
              select: { name: true }
          });
          return {
              pos: index + 1,
              nombre: user?.name || 'Cobrador',
              monto: Number(item._sum.monto),
              isMe: item.cobradorId === userId
          };
      }));

      // Evitar NaN
      const porcentajePrincipal = metaMontoHoy > 0 ? Math.min(Math.round((cobradoHoy / metaMontoHoy) * 100), 100) : 0;
      const porcentajeSecundario = totalClientesHoy > 0 ? Math.min(Math.round((visitasHoy / totalClientesHoy) * 100), 100) : 0;

      return NextResponse.json({
        metas: {
          tituloPrincipal: "Cobro del Día",
          tituloSecundario: "Visitas del Día",
          valorPrincipal: cobradoHoy,
          metaPrincipal: metaMontoHoy,
          valorSecundario: visitasHoy,
          metaSecundaria: totalClientesHoy,
          porcentajeMonto: porcentajePrincipal,
          porcentajeVisitas: porcentajeSecundario,
        },
        gamificacion: {
          nivel,
          xpActual,
          xpSiguienteNivel,
          montoAcumulado,
          rango: nivel < 5 ? 'Bronce' : nivel < 10 ? 'Plata' : nivel < 20 ? 'Oro' : 'Diamante',
        },
        ranking: rankingConNombres
      });
    }

  } catch (error) {
    console.error('Error en API metas:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
