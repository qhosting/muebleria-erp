
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const isAdminOrSupervisor = ['admin', 'gestor_cobranza', 'reporte_cobranza'].includes(userRole);

    if (!isAdminOrSupervisor && userRole !== 'cobrador') {
      return NextResponse.json({ error: 'No autorizado para esta vista' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Lógica de ciclo semanal: Sábado a Viernes en horario de México (UTC-6)
    const nowUtc = new Date();
    const offsetMexico = -6 * 60 * 60 * 1000; // -6 horas en milisegundos
    const nowMexico = new Date(nowUtc.getTime() + offsetMexico);

    const inicioHoyMexico = new Date(nowMexico);
    inicioHoyMexico.setUTCHours(0, 0, 0, 0);

    const dayOfWeekMexico = nowMexico.getUTCDay(); // 0: Dom, 1: Lun, ..., 6: Sab
    const diffToSaturday = (dayOfWeekMexico + 1) % 7; 
    const inicioCicloMexico = new Date(inicioHoyMexico);
    inicioCicloMexico.setUTCDate(inicioCicloMexico.getUTCDate() - diffToSaturday);
    const inicioCiclo = new Date(inicioCicloMexico.getTime() - offsetMexico);

    const where: any = {
      cobradorAsignadoId: isAdminOrSupervisor ? undefined : userId,
      statusCuenta: 'activo',
    };

    if (search) {
      where.OR = [
        { nombreCompleto: { contains: search, mode: 'insensitive' } },
        { codigoCliente: { contains: search, mode: 'insensitive' } },
        { direccionCompleta: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, clientes] = await Promise.all([
      prisma.cliente.count({ where }),
      prisma.cliente.findMany({
        where,
        include: {
          pagos: {
            where: {
              fechaPago: { gte: inicioCiclo },
              tipoPago: 'regular'
            },
            take: 1
          },
          producto: true,
          vendedorRel: true,
          verificaciones: {
            select: { id: true },
            take: 1
          }
        },
        orderBy: {
          nombreCompleto: 'asc'
        },
        take: limit,
        skip: skip
      })
    ]);

    return NextResponse.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: clientes.map(c => ({
          id: c.id,
          codigoCliente: c.codigoCliente,
          nombre: c.nombreCompleto,
          direccion: c.direccionCompleta,
          saldo: parseFloat(c.saldoActual.toString()),
          saldoVencido: parseFloat(c.saldoVencido.toString()),
          diaPago: c.diaPago,
          periodicidad: c.periodicidad,
          pagoSemanal: parseFloat(c.montoPago.toString()),
          telefono: c.telefono,
          estatus: c.saldoVencido.toNumber() > 0 ? 'atrasado' : 'aldia',
          yaPagoEstaSemana: c.pagos.length > 0,
          vdStatus: c.verificaciones.length === 0 ? 'PENDIENTE' : 'REALIZADA',
          diasVencidos: c.diasVencidos,
          // Datos extendidos para el perfil
          descripcionProducto: c.descripcionProducto,
          vendedorNombre: c.vendedor || c.vendedorRel?.name || 'No asignado',
          empleado: c.ocupacion || 'No especificado',
          aval: c.avalId || 'No asignado',
          precios: {
              contado: c.importe1 ? Number(c.importe1) : 0,
              p6: c.importe3 ? Number(c.importe3) : 0,
              p12: c.importe4 ? Number(c.importe4) : 0
          },
          montoCredito: c.importe1 ? Number(c.importe1) : 0,
          vendidoEn: c.importe2 ? Number(c.importe2) : 0
      }))
    });

  } catch (error) {
    console.error('Error al obtener clientes del cobrador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
