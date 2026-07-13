
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
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;
    const where: any = {};

    if (clienteId) where.clienteId = clienteId;
    if (cobradorId) where.cobradorId = cobradorId;
    if (tipoPago) where.tipoPago = tipoPago;

    if (search) {
      where.OR = [
        { concepto: { contains: search, mode: 'insensitive' } },
        { cliente: { nombreCompleto: { contains: search, mode: 'insensitive' } } },
        { cliente: { codigoCliente: { contains: search, mode: 'insensitive' } } },
        { numeroRecibo: { contains: search, mode: 'insensitive' } },
      ];
    }

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
    const montoTotal = pagos.reduce((sum: any, p: any) => sum + parseFloat(p.monto.toString()) + parseFloat(p.interesMoratorio?.toString() || '0') + parseFloat(p.gastosCobranza?.toString() || '0'), 0);
    const pagosRegulares = pagos.filter((p: any) => p.tipoPago === 'regular').length;
    const pagosMoratorios = pagos.filter((p: any) => p.tipoPago === 'moratorio').length;
    const ticketsImpresos = pagos.filter((p: any) => p.ticketImpreso).length;

    // Convert Decimal fields to numbers for JSON serialization
    const pagosSerializados = pagos.map((pago: any) => ({
      ...pago,
      monto: parseFloat(pago.monto.toString()),
      interesMoratorio: pago.interesMoratorio ? parseFloat(pago.interesMoratorio.toString()) : 0,
      gastosCobranza: pago.gastosCobranza ? parseFloat(pago.gastosCobranza.toString()) : 0,
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
      interesMoratorio = 0,
      gastosCobranza = 0,
      concepto,
      tipoPago = 'regular',
      fechaPago,
      metodoPago = 'gestor',
      numeroRecibo,
      localId,
      latitud,
      longitud
    } = body;

    console.log('Recibiendo pago:', { 
      clienteId, 
      monto, 
      interesMoratorio, 
      gastosCobranza, 
      tipoPago, 
      concepto, 
      metodoPago, 
      numeroRecibo, 
      localId,
      latitud,
      longitud
    });

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
    const interesNumerico = parseFloat(interesMoratorio.toString()) || 0;
    const gastosNumerico = parseFloat(gastosCobranza.toString()) || 0;
    
    const saldoAnterior = parseFloat(cliente.saldoActual.toString());
    let saldoNuevo = saldoAnterior;

    // Solo los pagos regulares, abonos y liquidaciones afectan el saldo principal (moratorios no)
    if (['regular', 'abono', 'liquidacion'].includes(tipoPago)) {
      saldoNuevo = Math.max(0, saldoAnterior - montoNumerico);
    }

    // Crear el pago en una transacción
    const resultado = await prisma.$transaction(async (prisma: any) => {
      let finalFechaPago = fechaPago ? new Date(fechaPago) : new Date();

      // --- LÓGICA DE ROLLOVER (CIERRE SEMANAL) ---
      // Si es viernes y pasan de las 12:00 PM, el pago se contabiliza contablemente el sábado
      const fechaActual = new Date();
      if (fechaActual.getDay() === 5 && fechaActual.getHours() >= 12 && !fechaPago) {
        finalFechaPago = new Date(fechaActual.getTime() + 24 * 60 * 60 * 1000);
        finalFechaPago.setHours(8, 0, 0, 0); // Inicio del sábado
      }

      const pago = await prisma.pago.create({
        data: {
          clienteId,
          cobradorId: userRole === 'cobrador' ? userId : (body.cobradorId || userId),
          monto: montoNumerico,
          interesMoratorio: interesNumerico,
          gastosCobranza: gastosNumerico,
          concepto: concepto || 'Pago de cuota',
          tipoPago,
          fechaPago: finalFechaPago,
          metodoPago: metodoPago || 'efectivo',
          numeroRecibo: numeroRecibo || null,
          localId: localId || null,
          saldoAnterior,
          saldoNuevo,
          sincronizado: true,
          latitud: latitud?.toString(),
          longitud: longitud?.toString(),
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

      // Actualizar saldo del cliente si es pago que afecta capital
      if (['regular', 'abono', 'liquidacion'].includes(tipoPago)) {
        await prisma.cliente.update({
          where: { id: clienteId },
          data: { saldoActual: saldoNuevo },
        });
      }

      return pago;
    });

    // NOTIFICAR A ADMINISTRADORES POR PUSH
    try {
        const { notifyByRole } = await import('@/lib/notifications');
        const totalRecibido = montoNumerico + interesNumerico + gastosNumerico;
        const formattedTotal = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalRecibido);
        
        notifyByRole(
            'admin', 
            '💰 Nuevo Depósito Recibido', 
            `${resultado.cobrador?.name} recibió ${formattedTotal} de ${resultado.cliente?.nombreCompleto}.`,
            '/dashboard/pagos'
        ).catch((err) => console.error('Error background notify:', err));
    } catch (nError) {
        console.error('Error enviando notificación de pago:', nError);
    }

    // CHECK FOR ACCOUNT LIQUIDATION (RECOMPRA OPPORTUNITY)
    if (saldoNuevo === 0 && ['regular', 'abono', 'liquidacion'].includes(tipoPago)) {
      try {
        const { RecomprasService } = await import('@/lib/recompras-service');
        RecomprasService.crearLeadPorLiquidacion(clienteId, 'El cliente liquidó su cuenta mediante un pago regular.')
            .catch(err => console.error('Error background recompra:', err));
      } catch (rError) {
        console.error('Error al crear lead de recompra:', rError);
      }
    }

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
