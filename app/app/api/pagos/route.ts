
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

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');
    const cobradorId = searchParams.get('cobradorId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const tipoPago = searchParams.get('tipoPago');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const skip = (page - 1) * limit;
    const where: any = {};

    if (clienteId) where.clienteId = clienteId;
    if (cobradorId) where.cobradorId = cobradorId;
    if (tipoPago) where.tipoPago = tipoPago;

    if (fechaDesde || fechaHasta) {
      where.fechaPago = {};
      if (fechaDesde) where.fechaPago.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaPago.lte = new Date(fechaHasta);
    }

    const userRole = (session.user as any).role;
    if (userRole === 'cobrador') {
      where.cobradorId = (session.user as any).id;
    }

    const [pagos, total, estadisticas] = await Promise.all([
      prisma.pago.findMany({
        where,
        include: {
          cliente: {
            select: {
              codigoCliente: true,
              nombreCompleto: true,
            },
          },
          cobrador: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { fechaPago: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pago.count({ where }),
      // Calcular estadísticas
      prisma.pago.groupBy({
        by: ['tipoPago'],
        where,
        _count: { id: true },
        _sum: { monto: true },
      }),
    ]);

    // Calcular estadísticas para el frontend
    const totalPagos = pagos.length;
    const montoTotal = pagos.reduce((sum: any, p: any) => sum + parseFloat(p.monto.toString()), 0);
    const pagosRegulares = pagos.filter((p: any) => p.tipoPago === 'regular').length;
    const pagosMoratorios = pagos.filter((p: any) => p.tipoPago === 'moratorio').length;
    const ticketsImpresos = pagos.filter((p: any) => p.ticketImpreso).length;

    // Convert Decimal fields to numbers for JSON serialization
    const pagosSerializados = pagos.map((pago: any) => ({
      ...pago,
      monto: parseFloat(pago.monto.toString()),
      saldoAnterior: parseFloat(pago.saldoAnterior.toString()),
      saldoNuevo: parseFloat(pago.saldoNuevo.toString()),
    }));

    return NextResponse.json({
      pagos: pagosSerializados,
      estadisticas: {
        totalPagos,
        montoTotal,
        pagosRegulares,
        pagosMoratorios,
        ticketsImpresos,
      },
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    const body = await request.json();
    const {
      clienteId,
      monto,
      concepto,
      tipoPago = 'regular',
      fechaPago,
      metodoPago = 'efectivo',
      numeroRecibo,
      localId
    } = body;

    console.log('Recibiendo pago:', { clienteId, monto, tipoPago, concepto, metodoPago, numeroRecibo, localId });

    if (!clienteId || !monto) {
      return NextResponse.json(
        { error: 'Cliente y monto son requeridos' },
        { status: 400 }
      );
    }

    // Obtener cliente para verificar permisos y calcular saldos
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Verificar permisos del cobrador
    if (userRole === 'cobrador' && cliente.cobradorAsignadoId !== userId) {
      return NextResponse.json({ error: 'No tienes acceso a este cliente' }, { status: 403 });
    }

    const montoNumerico = parseFloat(monto);
    const saldoAnterior = parseFloat(cliente.saldoActual.toString());
    let saldoNuevo = saldoAnterior;

    // Solo los pagos regulares afectan el saldo principal
    if (tipoPago === 'regular') {
      saldoNuevo = Math.max(0, saldoAnterior - montoNumerico);
    }

    // Crear el pago en una transacción
    const resultado = await prisma.$transaction(async (prisma: any) => {
      const pago = await prisma.pago.create({
        data: {
          clienteId,
          cobradorId: userRole === 'cobrador' ? userId : (body.cobradorId || userId),
          monto: montoNumerico,
          concepto: concepto || 'Pago de cuota',
          tipoPago,
          fechaPago: fechaPago ? new Date(fechaPago) : new Date(),
          metodoPago: metodoPago || 'efectivo',
          numeroRecibo: numeroRecibo || null,
          saldoAnterior,
          saldoNuevo,
          sincronizado: true,
        },
        include: {
          cliente: {
            select: {
              codigoCliente: true,
              nombreCompleto: true,
            },
          },
          cobrador: {
            select: {
              name: true,
            },
          },
        },
      });

      // Actualizar saldo del cliente si es pago regular
      if (tipoPago === 'regular') {
        await prisma.cliente.update({
          where: { id: clienteId },
          data: { saldoActual: saldoNuevo },
        });
      }

      return pago;
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
