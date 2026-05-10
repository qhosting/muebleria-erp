import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    // 1. Cobrado Hoy
    const pagosHoy = await prisma.pago.findMany({
      where: {
        cobradorId: userId,
        fechaPago: {
          gte: start,
          lte: end,
        },
      },
      select: { monto: true },
    });
    const cobradoHoy = pagosHoy.reduce((acc, p) => acc + Number(p.monto), 0);

    // 2. Clientes para Hoy (basado en día de pago)
    // Obtenemos el nombre del día en español para filtrar
    const diasSemana = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const diaHoyNombre = diasSemana[today.getDay()];

    const clientesHoy = await prisma.cliente.findMany({
      where: {
        cobradorAsignadoId: userId,
        diaPago: diaHoyNombre,
        statusCuenta: 'activo',
      },
    });

    const metaMontoHoy = clientesHoy.reduce((acc, c) => acc + Number(c.montoPago), 0) || 5000; // Default 5000 si no hay ruta
    const totalClientesHoy = clientesHoy.length || 10; // Default 10

    // 3. Visitas Hoy (Pagos + Motararios)
    const motarariosHoy = await prisma.motarario.count({
      where: {
        cobradorId: userId,
        fecha: { gte: start, lte: end },
      },
    });
    const pagosCountHoy = pagosHoy.length;
    const visitasHoy = motarariosHoy + pagosCountHoy;

    // 4. Gamificación (Acumulado Histórico)
    const totalHistorico = await prisma.pago.aggregate({
      where: { cobradorId: userId },
      _sum: { monto: true },
    });
    const montoAcumulado = Number(totalHistorico._sum.monto || 0);
    
    // Calcular Nivel
    // Nivel = Math.floor(monto / 50000) + 1
    const nivel = Math.floor(montoAcumulado / 25000) + 1;
    const xpSiguienteNivel = 25000;
    const xpActual = montoAcumulado % 25000;

    // 5. Ranking (Top 3 cobradores del mes)
    const primerDiaMes = new Date(today.getFullYear(), today.getMonth(), 1);
    const rankingCobradores = await prisma.pago.groupBy({
      by: ['cobradorId'],
      where: {
        fechaPago: { gte: primerDiaMes },
      },
      _sum: { monto: true },
      orderBy: { _sum: { monto: 'desc' } },
      take: 5,
    });

    // Obtener nombres de los cobradores del ranking
    const rankingConNombres = await Promise.all(rankingCobradores.map(async (item, index) => {
        const user = await prisma.user.findUnique({
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

    return NextResponse.json({
      metas: {
        cobradoHoy,
        metaMontoHoy,
        visitasHoy,
        totalClientesHoy,
        porcentajeMonto: Math.min(Math.round((cobradoHoy / metaMontoHoy) * 100), 100),
        porcentajeVisitas: Math.min(Math.round((visitasHoy / totalClientesHoy) * 100), 100),
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

  } catch (error) {
    console.error('Error en API metas:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
