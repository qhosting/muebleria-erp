
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

    // Lógica de ciclo semanal: Sábado a Viernes
    const hoy = new Date();
    const dayOfWeek = hoy.getDay(); // 0: Dom, 1: Lun, ..., 6: Sab
    const diffToSaturday = (dayOfWeek + 1) % 7; 
    const inicioCiclo = new Date(hoy);
    inicioCiclo.setDate(hoy.getDate() - diffToSaturday);
    inicioCiclo.setHours(0, 0, 0, 0);

    const clientes = await prisma.cliente.findMany({
      where: {
        cobradorAsignadoId: isAdminOrSupervisor ? undefined : userId,
        statusCuenta: 'activo',
        OR: [
          { nombreCompleto: { contains: search, mode: 'insensitive' } },
          { codigoCliente: { contains: search, mode: 'insensitive' } },
          { direccionCompleta: { contains: search, mode: 'insensitive' } }
        ]
      },
      include: {
        pagos: {
          where: {
            fechaPago: { gte: inicioCiclo },
            tipoPago: 'regular'
          },
          take: 1
        },
        producto: true,
        vendedorRel: true
      },
      orderBy: {
        nombreCompleto: 'asc'
      }
    });

    return NextResponse.json(clientes.map(c => ({
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
        diasVencidos: c.diasVencidos,
        // Datos extendidos para el perfil
        descripcionProducto: c.descripcionProducto,
        vendedorNombre: c.vendedor || c.vendedorRel?.name || 'No asignado',
        empleado: c.ocupacion || 'No especificado',
        aval: c.avalId || 'No asignado',
        precios: {
            contado: c.importe1 ? Math.round(parseFloat(c.importe1.toString())) : 0,
            p6: c.importe3 ? Math.round(parseFloat(c.importe3.toString())) : 0,
            p12: c.importe4 ? Math.round(parseFloat(c.importe4.toString())) : 0
        },
        montoCredito: c.importe1 ? Math.round(parseFloat(c.importe1.toString())) : 0,
        vendidoEn: c.importe2 ? Math.round(parseFloat(c.importe2.toString())) : 0
    })));

  } catch (error) {
    console.error('Error al obtener clientes del cobrador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
