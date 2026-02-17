
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['admin', 'gestor_cobranza', 'reporte_cobranza'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    const [
      totalClientes,
      clientesActivos,
      totalCobradores,
      cobranzaHoy,
      cobranzaMes,
      clientesMorosos,
      saldosTotales,
    ] = await Promise.all([
      prisma.cliente.count(),
      prisma.cliente.count({ where: { statusCuenta: 'activo' } }),
      prisma.user.count({ where: { role: 'cobrador', isActive: true } }),
      prisma.pago.aggregate({
        _sum: { monto: true },
        where: {
          fechaPago: { gte: inicioDia },
          tipoPago: 'regular',
        },
      }),
      prisma.pago.aggregate({
        _sum: { monto: true },
        where: {
          fechaPago: { gte: inicioMes },
          tipoPago: 'regular',
        },
      }),
      prisma.cliente.count({
        where: {
          statusCuenta: 'activo',
          saldoActual: { gt: 0 },
        },
      }),
      prisma.cliente.aggregate({
        _sum: { saldoActual: true },
        where: { statusCuenta: 'activo' },
      }),
    ]);

    const stats = {
      totalClientes,
      clientesActivos,
      totalCobradores,
      cobranzaHoy: cobranzaHoy._sum.monto ? parseFloat(cobranzaHoy._sum.monto.toString()) : 0,
      cobranzaMes: cobranzaMes._sum.monto ? parseFloat(cobranzaMes._sum.monto.toString()) : 0,
      clientesMorosos,
      saldosTotales: saldosTotales._sum.saldoActual ? parseFloat(saldosTotales._sum.saldoActual.toString()) : 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
