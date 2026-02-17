
export const dynamic = 'force-dynamic';

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

    const userRole = (session.user as any).role;
    if (!['admin', 'gestor_cobranza', 'reporte_cobranza'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get('fechaDesde') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const fechaHasta = searchParams.get('fechaHasta') || new Date().toISOString();
    const cobradorId = searchParams.get('cobradorId');

    console.log('Parámetros recibidos:', { fechaDesde, fechaHasta, cobradorId });

    const where: any = {
      fechaPago: {
        gte: new Date(fechaDesde),
        lte: new Date(fechaHasta),
      },
    };

    if (cobradorId && cobradorId !== 'all') {
      where.cobradorId = cobradorId;
    }

    // Reporte general de cobranza
    const reporteGeneral = await prisma.pago.groupBy({
      by: ['cobradorId', 'tipoPago'],
      where,
      _sum: {
        monto: true,
      },
      _count: {
        _all: true,
      },
    });

    // Obtener información de cobradores
    let cobradoresQuery: any = {
      role: 'cobrador',
      isActive: true,
    };

    // Si se especifica un cobrador, solo obtener ese
    if (cobradorId && cobradorId !== 'all') {
      cobradoresQuery.id = cobradorId;
    }

    const cobradores = await prisma.user.findMany({
      where: cobradoresQuery,
      select: {
        id: true,
        name: true,
      },
    });

    // Organizar datos por cobrador
    const reportePorCobrador = cobradores.map((cobrador: any) => {
      const pagosRegulares = reporteGeneral.find(
        (r: any) => r.cobradorId === cobrador.id && r.tipoPago === 'regular'
      ) || { _sum: { monto: 0 }, _count: { _all: 0 } };

      const pagosMoratorios = reporteGeneral.find(
        (r: any) => r.cobradorId === cobrador.id && r.tipoPago === 'moratorio'
      ) || { _sum: { monto: 0 }, _count: { _all: 0 } };

      const totalCobrado = Number(pagosRegulares._sum.monto || 0) + Number(pagosMoratorios._sum.monto || 0);
      const cantidadPagos = pagosRegulares._count._all + pagosMoratorios._count._all;

      return {
        cobrador: cobrador.name,
        cobradorId: cobrador.id,
        totalCobrado,
        pagosRegulares: Number(pagosRegulares._sum.monto || 0),
        pagosMoratorios: Number(pagosMoratorios._sum.monto || 0),
        cantidadPagos,
      };
    }).filter((cobrador: any) => cobrador.totalCobrado > 0 || cobrador.cantidadPagos > 0);

    // Reporte por día
    let reportePorDia;
    if (cobradorId && cobradorId !== 'all') {
      reportePorDia = await prisma.$queryRaw`
        SELECT 
          DATE("fechaPago") as fecha,
          SUM(CASE WHEN "tipoPago" = 'regular' THEN "monto" ELSE 0 END) as pagos_regulares,
          SUM(CASE WHEN "tipoPago" = 'moratorio' THEN "monto" ELSE 0 END) as pagos_moratorios,
          COUNT(*) as total_pagos
        FROM "pagos" 
        WHERE "fechaPago" >= ${new Date(fechaDesde)} 
          AND "fechaPago" <= ${new Date(fechaHasta)}
          AND "cobradorId" = ${cobradorId}
        GROUP BY DATE("fechaPago")
        ORDER BY fecha DESC
      `;
    } else {
      reportePorDia = await prisma.$queryRaw`
        SELECT 
          DATE("fechaPago") as fecha,
          SUM(CASE WHEN "tipoPago" = 'regular' THEN "monto" ELSE 0 END) as pagos_regulares,
          SUM(CASE WHEN "tipoPago" = 'moratorio' THEN "monto" ELSE 0 END) as pagos_moratorios,
          COUNT(*) as total_pagos
        FROM "pagos" 
        WHERE "fechaPago" >= ${new Date(fechaDesde)} 
          AND "fechaPago" <= ${new Date(fechaHasta)}
        GROUP BY DATE("fechaPago")
        ORDER BY fecha DESC
      `;
    }

    const totales = {
      totalCobrado: reportePorCobrador.reduce((sum: any, r: any) => sum + r.totalCobrado, 0),
      pagosRegulares: reportePorCobrador.reduce((sum: any, r: any) => sum + r.pagosRegulares, 0),
      pagosMoratorios: reportePorCobrador.reduce((sum: any, r: any) => sum + r.pagosMoratorios, 0),
      totalPagos: reportePorCobrador.reduce((sum: any, r: any) => sum + r.cantidadPagos, 0),
    };

    // Convertir BigInt a Number para serialización JSON
    const reportePorDiaFormatted = (reportePorDia as any[]).map((row: any) => ({
      fecha: row.fecha,
      pagos_regulares: Number(row.pagos_regulares),
      pagos_moratorios: Number(row.pagos_moratorios),
      total_pagos: Number(row.total_pagos),
    }));

    return NextResponse.json({
      totales,
      reportePorCobrador,
      reportePorDia: reportePorDiaFormatted,
      periodo: {
        desde: fechaDesde,
        hasta: fechaHasta,
      },
    });
  } catch (error) {
    console.error('Error al generar reporte de cobranza:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
