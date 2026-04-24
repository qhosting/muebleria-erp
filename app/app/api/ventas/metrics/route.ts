
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = (session.user as any).id;
    const hoy = new Date();

    // 1. Obtener Presupuesto Activo (donde hoy esté entre fechaInicio y fechaFin)
    const presupuesto = await prisma.presupuestoVenta.findFirst({
      where: {
        AND: [
          { fechaInicio: { lte: hoy } },
          { fechaFin: { gte: hoy } },
          {
            OR: [
              { vendedorId: userId },
              { equipo: { miembros: { some: { id: userId } } } }
            ]
          }
        ]
      },
      include: {
        equipo: true
      },
      orderBy: { createdAt: 'desc' } // El más reciente si hay traslape
    });

    // 2. Obtener Ventas Reales del periodo del presupuesto
    const fechaInicio = presupuesto?.fechaInicio || startOfMonth(hoy);
    const fechaFin = presupuesto?.fechaFin || endOfMonth(hoy);

    const ventasPeriodo = await prisma.cliente.findMany({
      where: {
        vendedorId: userId,
        fechaVenta: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      select: {
        montoPago: true,
        piezas: true,
        id: true
      }
    });

    const logradoMonto = ventasPeriodo.reduce((acc, v) => acc + Number(v.montoPago), 0);
    const logradoPiezas = ventasPeriodo.reduce((acc, v) => acc + (v.piezas || 0), 0);

    // 2.1 Obtener Leads reales del periodo
    const logradoLeads = await prisma.lead.count({
      where: {
        vendedorId: userId,
        createdAt: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    });

    // 3. Ventas Diarias (Seguimiento hoy)
    const hoyInicio = startOfDay(new Date());
    const hoyFin = endOfDay(new Date());

    const ventasHoy = await prisma.cliente.findMany({
      where: {
        vendedorId: userId,
        fechaVenta: {
          gte: hoyInicio,
          lte: hoyFin,
        }
      },
      include: {
        producto: { select: { nombre: true } },
        equipo: { select: { nombre: true } }
      }
    });

    return NextResponse.json({
      presupuesto: presupuesto ? {
        metaMonto: Number(presupuesto.metaMonto),
        metaPiezas: presupuesto.metaPiezas,
        metaLeads: (presupuesto as any).metaLeads || 0,
        logradoMonto,
        logradoPiezas,
        logradoLeads,
        porcentajeMonto: Number(presupuesto.metaMonto) > 0 ? (logradoMonto / Number(presupuesto.metaMonto)) * 100 : 0,
        porcentajePiezas: presupuesto.metaPiezas > 0 ? (logradoPiezas / presupuesto.metaPiezas) * 100 : 0,
        porcentajeLeads: (presupuesto as any).metaLeads > 0 ? (logradoLeads / (presupuesto as any).metaLeads) * 100 : 0,
        equipo: presupuesto.equipo?.nombre
      } : null,
      ventasHoy: ventasHoy.map((v: any) => ({
        id: v.id,
        fecha: v.fechaVenta,
        contrato: v.codigoCliente,
        producto: v.producto?.nombre || v.descripcionProducto,
        monto: Number(v.montoPago),
        cliente: v.nombreCompleto,
        equipo: v.equipo?.nombre || 'Particular'
      }))
    });

  } catch (error: any) {
    console.error('Error en ventas-metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
